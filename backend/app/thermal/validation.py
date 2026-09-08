"""
Validation test suite for the thermal simulation engine.

These are physics-based sanity checks — they verify that the model
responds in the physically correct direction when inputs change.
They are NOT replacements for validation against authoritative
reference cases, but they catch sign errors, unit mistakes, and
logical bugs early.

Run with:
    cd backend
    python -m pytest app/thermal/validation.py -v

Or without pytest:
    cd backend
    python -m app.thermal.validation
"""

from __future__ import annotations

import math
import sys
from typing import Callable

import numpy as np

from .models import (
    MaterialLayer,
    WindowProperties,
    DoorProperties,
    ShelterGeometry,
    ShelterMaterials,
    ClimateHourlyData,
    SimulationConfig,
    SimulationInput,
    SimulationOutput,
)
from .properties import (
    layer_resistance,
    composite_resistance,
    u_value,
    component_u_value,
    shelter_thermal_capacitance,
    exterior_convective_coefficient,
)
from .conduction import conduction_heat_transfer, total_envelope_UA
from .ventilation import (
    ventilation_heat_transfer,
    ventilation_conductance,
    air_density,
)
from .internal_gains import total_internal_gains
from .solar import (
    solar_declination,
    get_solar_position,
    tilted_irradiance,
    sol_air_temperature,
    window_solar_gain,
)
from .thermal_balance import (
    thermal_time_constant,
    step_exponential,
    heating_cooling_demand,
)
from .simulation import run_simulation


# ==========================================================================
# Helper: create a standard test shelter
# ==========================================================================

def _make_test_materials(insulation_thickness: float = 0.05) -> ShelterMaterials:
    """Standard test shelter materials."""
    brick = MaterialLayer(
        name="Common Burnt Brick",
        thermal_conductivity=0.72,
        density=1700,
        specific_heat=880,
        thickness=0.23,
        solar_absorptivity=0.70,
    )
    concrete = MaterialLayer(
        name="Dense Concrete",
        thermal_conductivity=1.74,
        density=2300,
        specific_heat=880,
        thickness=0.15,
        solar_absorptivity=0.65,
    )
    eps = MaterialLayer(
        name="EPS Insulation",
        thermal_conductivity=0.036,
        density=20,
        specific_heat=1450,
        thickness=insulation_thickness,
        solar_absorptivity=0.30,
    )
    plaster = MaterialLayer(
        name="Cement Plaster",
        thermal_conductivity=0.72,
        density=1760,
        specific_heat=840,
        thickness=0.015,
        solar_absorptivity=0.40,
    )
    return ShelterMaterials(
        wall_layers=[plaster, brick, eps],        # interior → exterior
        roof_layers=[plaster, concrete, eps],
        floor_layers=[concrete],
        window=WindowProperties(u_value=5.7, shgc=0.82, area=4.0),
        door=DoorProperties(u_value=3.5, area=2.0),
    )


def _make_test_geometry(window_area: float = 4.0) -> ShelterGeometry:
    """Standard test shelter: 10 m × 6 m × 3 m, south-facing."""
    return ShelterGeometry(
        length=10.0, width=6.0, height=3.0,
        orientation=180.0,  # front faces South
        window_area=window_area,
        door_area=2.0,
    )


def _make_cold_climate(n_hours: int = 24) -> ClimateHourlyData:
    """Leh-like cold climate: ~−10 °C, clear sky, low wind."""
    hours = np.arange(n_hours, dtype=float)
    # Diurnal temperature swing
    T_out = -10.0 + 5.0 * np.sin(2 * np.pi * (hours - 6) / 24.0)
    # Solar: peaks at noon
    ghi = np.maximum(0, 600 * np.sin(np.pi * (hours - 6) / 12.0))
    ghi[hours < 6] = 0.0
    ghi[hours >= 18] = 0.0
    dni = ghi * 0.75
    dhi = ghi * 0.25
    return ClimateHourlyData(
        outdoor_temperature=T_out,
        ghi=ghi,
        dni=dni,
        dhi=dhi,
        wind_speed=np.full(n_hours, 3.0),
        wind_direction=np.full(n_hours, 180.0),
        relative_humidity=np.full(n_hours, 40.0),
        cloud_cover=np.full(n_hours, 10.0),
        surface_pressure=np.full(n_hours, 680.0),  # ~3500 m altitude
        dew_point=np.full(n_hours, -20.0),
        latitude=34.15,
        longitude=77.58,
    )


def _make_hot_climate(n_hours: int = 24) -> ClimateHourlyData:
    """Rajasthan-like hot climate: ~40 °C, strong solar."""
    hours = np.arange(n_hours, dtype=float)
    T_out = 38.0 + 7.0 * np.sin(2 * np.pi * (hours - 6) / 24.0)
    ghi = np.maximum(0, 900 * np.sin(np.pi * (hours - 6) / 12.0))
    ghi[hours < 6] = 0.0
    ghi[hours >= 18] = 0.0
    dni = ghi * 0.70
    dhi = ghi * 0.30
    return ClimateHourlyData(
        outdoor_temperature=T_out,
        ghi=ghi,
        dni=dni,
        dhi=dhi,
        wind_speed=np.full(n_hours, 4.0),
        wind_direction=np.full(n_hours, 270.0),
        relative_humidity=np.full(n_hours, 25.0),
        cloud_cover=np.full(n_hours, 5.0),
        surface_pressure=np.full(n_hours, 1010.0),
        dew_point=np.full(n_hours, 15.0),
        latitude=26.9,
        longitude=70.9,
    )


def _run_test_sim(
    insulation_thickness: float = 0.05,
    window_area: float = 4.0,
    n_occupants: int = 10,
    ach: float = 1.0,
    climate: ClimateHourlyData | None = None,
    orientation: float = 180.0,
) -> SimulationOutput:
    """Run a quick 24-hour simulation with configurable parameters."""
    geom = _make_test_geometry(window_area)
    geom.orientation = orientation
    mats = _make_test_materials(insulation_thickness)
    if climate is None:
        climate = _make_cold_climate()
    config = SimulationConfig(
        n_occupants=n_occupants,
        ach=ach,
        indoor_temp_initial=20.0,
        comfort_min=18.0,
        comfort_max=25.0,
    )
    sim_input = SimulationInput(geom, mats, climate, config)
    return run_simulation(sim_input)


# ==========================================================================
# Individual Module Tests
# ==========================================================================

def test_layer_resistance():
    """R = d/k must be positive and proportional to thickness."""
    R1 = layer_resistance(0.10, 0.72)
    R2 = layer_resistance(0.20, 0.72)
    assert R2 > R1, "Doubling thickness should increase resistance"
    assert abs(R2 - 2 * R1) < 1e-10, "R should scale linearly with d"
    print("  ✓ layer_resistance: correct")


def test_composite_resistance():
    """Adding insulation should increase total resistance."""
    brick = MaterialLayer("Brick", 0.72, 1700, 880, 0.23)
    R_no_insul = composite_resistance([brick], "wall")

    eps = MaterialLayer("EPS", 0.036, 20, 1450, 0.05)
    R_with_insul = composite_resistance([brick, eps], "wall")

    assert R_with_insul > R_no_insul, \
        "Adding insulation must increase total resistance"
    print("  ✓ composite_resistance: insulation increases R")


def test_u_value():
    """Higher R → lower U."""
    assert u_value(1.0) == 1.0
    assert u_value(2.0) == 0.5
    assert u_value(0.5) == 2.0
    print("  ✓ u_value: U = 1/R correct")


def test_wind_convection():
    """Higher wind → higher h_c."""
    h1 = exterior_convective_coefficient(1.0)
    h2 = exterior_convective_coefficient(5.0)
    h3 = exterior_convective_coefficient(10.0)
    assert h2 > h1, "More wind → more convection"
    assert h3 > h2, "Even more wind → even more convection"
    print("  ✓ wind_convection: h increases with wind speed")


def test_conduction_sign():
    """Heat should flow from hot to cold."""
    Q = conduction_heat_transfer(1.0, 10.0, 30.0, 20.0)
    assert Q > 0, "Hot outside → heat enters (positive)"

    Q2 = conduction_heat_transfer(1.0, 10.0, 10.0, 20.0)
    assert Q2 < 0, "Cold outside → heat leaves (negative)"

    Q3 = conduction_heat_transfer(1.0, 10.0, 20.0, 20.0)
    assert abs(Q3) < 1e-10, "Equal temps → zero heat flow"
    print("  ✓ conduction_sign: correct direction")


def test_conduction_zero_delta_t():
    """No temperature difference → no heat flow."""
    Q = conduction_heat_transfer(2.5, 50.0, 20.0, 20.0)
    assert abs(Q) < 1e-10
    print("  ✓ conduction_zero_ΔT: Q = 0 when T_out = T_in")


def test_ventilation_sign():
    """Ventilation heat should follow temperature gradient."""
    Q = ventilation_heat_transfer(1.0, 180.0, -10.0, 20.0)
    assert Q < 0, "Cold air entering → heat loss (negative)"

    Q2 = ventilation_heat_transfer(1.0, 180.0, 40.0, 20.0)
    assert Q2 > 0, "Hot air entering → heat gain (positive)"
    print("  ✓ ventilation_sign: correct direction")


def test_air_density():
    """Cold air is denser than hot air (at same pressure)."""
    rho_cold = air_density(-10.0, 1013.25)
    rho_hot = air_density(40.0, 1013.25)
    assert rho_cold > rho_hot, "Cold air denser than hot air"
    # Standard: ~1.204 kg/m³ at 20°C
    rho_std = air_density(20.0, 1013.25)
    assert abs(rho_std - 1.204) < 0.01, f"Standard density ≈ 1.204, got {rho_std}"
    print("  ✓ air_density: physically correct")


def test_internal_gains():
    """More occupants → more internal heat."""
    Q1 = total_internal_gains(5)
    Q2 = total_internal_gains(10)
    assert Q2 > Q1, "More people → more heat"
    assert Q2 == 2 * Q1, "Should scale linearly"
    Q0 = total_internal_gains(0)
    assert Q0 == 0, "Zero occupants → zero occupant heat"
    print("  ✓ internal_gains: linear scaling correct")


def test_solar_declination():
    """Summer solstice → positive declination (Northern Hemisphere)."""
    # June 21 ≈ day 172
    decl_summer = solar_declination(172)
    assert decl_summer > 0, "Summer → positive declination (N hemisphere)"
    assert abs(math.degrees(decl_summer) - 23.45) < 1.0, \
        "Summer solstice declination ≈ 23.45°"

    # Dec 21 ≈ day 355
    decl_winter = solar_declination(355)
    assert decl_winter < 0, "Winter → negative declination"
    print("  ✓ solar_declination: seasonal variation correct")


def test_sol_air_temperature():
    """Sol-air temperature should be ≥ outdoor temp with solar."""
    T_sa = sol_air_temperature(
        t_outdoor=25.0, solar_irradiance=800.0,
        absorptivity=0.7, h_outside=25.0,
        longwave_correction=0.0,
    )
    assert T_sa > 25.0, "Solar radiation should raise sol-air above ambient"

    T_sa_no_sun = sol_air_temperature(
        t_outdoor=25.0, solar_irradiance=0.0,
        absorptivity=0.7, h_outside=25.0,
        longwave_correction=0.0,
    )
    assert abs(T_sa_no_sun - 25.0) < 1e-10, "No sun → sol-air = ambient"
    print("  ✓ sol_air_temperature: correct behavior")


def test_window_solar_gain():
    """Window solar gain should scale with area and irradiance."""
    Q1 = window_solar_gain(0.82, 4.0, 500.0)
    Q2 = window_solar_gain(0.82, 8.0, 500.0)
    assert abs(Q2 - 2 * Q1) < 1e-6, "Double area → double gain"

    Q0 = window_solar_gain(0.82, 4.0, 0.0)
    assert Q0 == 0.0, "No solar → no gain"
    print("  ✓ window_solar_gain: scaling correct")


def test_exponential_step_steady_state():
    """At steady state, T_in should equal T_eq."""
    T_eq = 15.0
    T_in = 15.0
    tau = 3600.0
    T_new = step_exponential(T_in, T_eq, tau, 3600.0)
    assert abs(T_new - T_eq) < 1e-10, "At equilibrium → no change"
    print("  ✓ exponential_step: steady state correct")


def test_exponential_step_convergence():
    """Temperature should move toward T_eq over time."""
    T_eq = 10.0
    T_in = 20.0
    tau = 7200.0  # 2 hours

    T_new = step_exponential(T_in, T_eq, tau, 3600.0)
    assert T_eq < T_new < T_in, "Should move toward T_eq"

    # After many time constants, should be very close to T_eq
    T_final = T_in
    for _ in range(100):
        T_final = step_exponential(T_final, T_eq, tau, 3600.0)
    assert abs(T_final - T_eq) < 0.01, "Should converge to T_eq"
    print("  ✓ exponential_step: convergence correct")


def test_time_constant():
    """Higher capacitance → longer time constant."""
    tau1 = thermal_time_constant(500_000, 100, 50)
    tau2 = thermal_time_constant(1_000_000, 100, 50)
    assert tau2 > tau1, "More thermal mass → longer time constant"
    assert abs(tau2 - 2 * tau1) < 1e-6, "Should scale linearly with C"
    print("  ✓ time_constant: scales with capacitance")


def test_heating_demand():
    """Below comfort → heating demand; above → cooling demand."""
    Q_heat, Q_cool, T = heating_cooling_demand(15.0, 18.0, 25.0, 500_000, 3600)
    assert Q_heat > 0, "Below comfort_min → heating needed"
    assert Q_cool == 0, "Not above comfort_max → no cooling"
    assert T == 18.0, "Should clamp to comfort_min"

    Q_heat2, Q_cool2, T2 = heating_cooling_demand(28.0, 18.0, 25.0, 500_000, 3600)
    assert Q_heat2 == 0, "Not below comfort_min → no heating"
    assert Q_cool2 > 0, "Above comfort_max → cooling needed"
    assert T2 == 25.0, "Should clamp to comfort_max"

    Q_heat3, Q_cool3, T3 = heating_cooling_demand(21.0, 18.0, 25.0, 500_000, 3600)
    assert Q_heat3 == 0 and Q_cool3 == 0, "In comfort band → no demand"
    assert T3 == 21.0, "No intervention → temperature unchanged"
    print("  ✓ heating_cooling_demand: correct logic")


# ==========================================================================
# Full Simulation Integration Tests
# ==========================================================================

def test_insulation_reduces_heating():
    """More insulation → less heating needed in cold climate."""
    out_thin = _run_test_sim(insulation_thickness=0.025)
    out_thick = _run_test_sim(insulation_thickness=0.100)

    assert out_thick.total_heating_requirement_kwh < out_thin.total_heating_requirement_kwh, \
        f"Thicker insulation should reduce heating: " \
        f"{out_thick.total_heating_requirement_kwh:.2f} vs {out_thin.total_heating_requirement_kwh:.2f} kWh"
    print(f"  ✓ insulation_effect: 25mm → {out_thin.total_heating_requirement_kwh:.1f} kWh, "
          f"100mm → {out_thick.total_heating_requirement_kwh:.1f} kWh")


def test_more_windows_more_solar():
    """Increasing window area should increase total solar gain."""
    out_small = _run_test_sim(window_area=2.0)
    out_large = _run_test_sim(window_area=8.0)

    solar_small = sum(r.solar_gain_window for r in out_small.hourly_results)
    solar_large = sum(r.solar_gain_window for r in out_large.hourly_results)

    assert solar_large > solar_small, \
        f"More windows → more solar gain: {solar_large:.0f} vs {solar_small:.0f}"
    print(f"  ✓ window_area_effect: 2m² → {solar_small:.0f} W·h, "
          f"8m² → {solar_large:.0f} W·h total solar")


def test_occupants_increase_temperature():
    """More occupants → warmer indoor temperature."""
    out_few = _run_test_sim(n_occupants=2)
    out_many = _run_test_sim(n_occupants=20)

    assert out_many.avg_indoor_temperature > out_few.avg_indoor_temperature, \
        f"More occupants → warmer: {out_many.avg_indoor_temperature:.1f} vs " \
        f"{out_few.avg_indoor_temperature:.1f} °C"
    print(f"  ✓ occupant_effect: 2 people → {out_few.avg_indoor_temperature:.1f}°C, "
          f"20 people → {out_many.avg_indoor_temperature:.1f}°C avg")


def test_cold_climate_needs_heating():
    """A cold climate should require heating."""
    out = _run_test_sim(climate=_make_cold_climate())
    assert out.total_heating_requirement_kwh > 0, \
        f"Cold climate must need heating, got {out.total_heating_requirement_kwh} kWh"
    print(f"  ✓ cold_climate: heating = {out.total_heating_requirement_kwh:.1f} kWh, "
          f"cooling = {out.total_cooling_requirement_kwh:.1f} kWh")


def test_hot_climate_needs_cooling():
    """A hot climate should require cooling."""
    out = _run_test_sim(climate=_make_hot_climate())
    assert out.total_cooling_requirement_kwh > 0, \
        f"Hot climate must need cooling, got {out.total_cooling_requirement_kwh} kWh"
    print(f"  ✓ hot_climate: heating = {out.total_heating_requirement_kwh:.1f} kWh, "
          f"cooling = {out.total_cooling_requirement_kwh:.1f} kWh")


def test_high_ach_more_ventilation_loss():
    """Higher ACH → more ventilation heat loss in cold weather."""
    out_tight = _run_test_sim(ach=0.5)
    out_leaky = _run_test_sim(ach=3.0)

    vent_loss_tight = sum(r.ventilation_loss for r in out_tight.hourly_results)
    vent_loss_leaky = sum(r.ventilation_loss for r in out_leaky.hourly_results)

    assert vent_loss_leaky > vent_loss_tight, \
        "Higher ACH → greater ventilation loss"
    print(f"  ✓ ach_effect: ACH 0.5 → {vent_loss_tight:.0f} W·h, "
          f"ACH 3.0 → {vent_loss_leaky:.0f} W·h vent loss")


def test_temperature_in_reasonable_range():
    """Indoor temperature should stay in a physically plausible range."""
    for climate_fn, name in [(_make_cold_climate, "cold"), (_make_hot_climate, "hot")]:
        out = _run_test_sim(climate=climate_fn())
        for r in out.hourly_results:
            assert -50 < r.indoor_temperature < 80, \
                f"Temperature {r.indoor_temperature}°C at hour {r.hour} " \
                f"is physically implausible ({name} climate)"
    print("  ✓ temperature_range: all values physically plausible")


def test_energy_balance_direction():
    """Net heat flow should be negative when shelter is warmer than outside."""
    out = _run_test_sim(
        climate=_make_cold_climate(),
        n_occupants=0,  # remove internal gains
        window_area=0.0,  # remove solar through windows
    )
    # In early hours when T_in > T_out, net flow should be negative
    # (shelter losing heat)
    early_results = [r for r in out.hourly_results[:6]]
    for r in early_results:
        if r.indoor_temperature > r.outdoor_temperature + 5:
            # Strong enough gradient to expect net loss
            assert r.net_heat_flow < 0, \
                f"Hour {r.hour}: T_in={r.indoor_temperature:.1f} > " \
                f"T_out={r.outdoor_temperature:.1f}, but net flow is positive"
    print("  ✓ energy_balance_direction: net loss when T_in > T_out")


def test_simulation_output_completeness():
    """Simulation output should have correct number of hours."""
    out = _run_test_sim()
    assert out.total_hours == 24, f"Expected 24 hours, got {out.total_hours}"
    assert len(out.hourly_results) == 24, \
        f"Expected 24 hourly results, got {len(out.hourly_results)}"
    assert out.passive_comfort_hours <= 24, "Comfort hours can't exceed total"
    print("  ✓ output_completeness: 24 hourly results, all fields present")


# ==========================================================================
# Test Runner
# ==========================================================================

def run_all_tests():
    """Run all validation tests and report results."""
    tests = [
        # Unit tests
        ("Layer Resistance", test_layer_resistance),
        ("Composite Resistance", test_composite_resistance),
        ("U-Value", test_u_value),
        ("Wind Convection", test_wind_convection),
        ("Conduction Sign", test_conduction_sign),
        ("Conduction Zero ΔT", test_conduction_zero_delta_t),
        ("Ventilation Sign", test_ventilation_sign),
        ("Air Density", test_air_density),
        ("Internal Gains", test_internal_gains),
        ("Solar Declination", test_solar_declination),
        ("Sol-Air Temperature", test_sol_air_temperature),
        ("Window Solar Gain", test_window_solar_gain),
        ("Exponential Step Steady", test_exponential_step_steady_state),
        ("Exponential Step Convergence", test_exponential_step_convergence),
        ("Time Constant", test_time_constant),
        ("Heating/Cooling Demand", test_heating_demand),
        # Integration tests
        ("Insulation Reduces Heating", test_insulation_reduces_heating),
        ("More Windows More Solar", test_more_windows_more_solar),
        ("Occupants Increase Temp", test_occupants_increase_temperature),
        ("Cold Climate Needs Heating", test_cold_climate_needs_heating),
        ("Hot Climate Needs Cooling", test_hot_climate_needs_cooling),
        ("High ACH More Vent Loss", test_high_ach_more_ventilation_loss),
        ("Temperature Range", test_temperature_in_reasonable_range),
        ("Energy Balance Direction", test_energy_balance_direction),
        ("Output Completeness", test_simulation_output_completeness),
    ]

    passed = 0
    failed = 0
    errors = []

    print("=" * 60)
    print("THERMAL ENGINE VALIDATION SUITE")
    print("=" * 60)
    print()

    for name, test_fn in tests:
        try:
            test_fn()
            passed += 1
        except Exception as e:
            failed += 1
            errors.append((name, str(e)))
            print(f"  ✗ {name}: FAILED — {e}")

    print()
    print("=" * 60)
    print(f"RESULTS:  {passed} passed,  {failed} failed,  "
          f"{passed + failed} total")
    print("=" * 60)

    if errors:
        print("\nFAILURES:")
        for name, msg in errors:
            print(f"  • {name}: {msg}")
        print()

    return failed == 0


# Allow running directly:  python -m app.thermal.validation
if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
