"""
Simulation orchestrator — ties every module into an hourly loop.

This is the main entry point for the thermal engine.

    from app.thermal.simulation import run_simulation
    output = run_simulation(input)

Flow per hour:
    1.  Read outdoor conditions (T_out, solar components, wind)
    2.  Compute solar position (zenith, azimuth)
    3.  Compute irradiance on each oriented surface
    4.  Compute sol-air temperatures → conduction
    5.  Compute solar gain through windows
    6.  Compute ventilation / infiltration loss
    7.  Compute internal gains (occupants + equipment)
    8.  Compute equilibrium temperature & time constant
    9.  Advance indoor temperature via analytical exponential step
    10. Compute heating / cooling demand if outside comfort band
    11. Store hourly results

References:
    ISO 13790:2008, Annex G (Simple hourly method)
    ASHRAE Handbook — Fundamentals 2021
"""

from __future__ import annotations

from typing import List

from .models import (
    SimulationInput,
    SimulationOutput,
    HourlyResult,
)
from .properties import (
    component_u_value,
    shelter_thermal_capacitance,
    exterior_combined_coefficient,
)
from .conduction import (
    envelope_conduction,
    total_envelope_UA,
)
from .solar import (
    get_solar_position,
    compute_wall_irradiances,
    window_solar_gain,
)
from .ventilation import (
    ventilation_heat_transfer,
    ventilation_conductance,
    air_density,
)
from .internal_gains import total_internal_gains
from .thermal_balance import (
    thermal_time_constant,
    equilibrium_temperature,
    step_exponential,
    heating_cooling_demand,
)


def run_simulation(sim_input: SimulationInput) -> SimulationOutput:
    """
    Run an hourly thermal simulation for a passive shelter.

    Args:
        sim_input: Complete simulation input bundle.

    Returns:
        SimulationOutput with hourly results and summary statistics.

    Raises:
        ValueError: If climate data arrays have inconsistent lengths.
    """
    geom = sim_input.geometry
    mats = sim_input.materials
    climate = sim_input.climate
    config = sim_input.config

    # Validate climate data
    climate.validate()
    n_hours = climate.n_hours
    dt = config.timestep_seconds  # seconds per step

    # ---- Pre-compute shelter-level constants ----
    C_eff = shelter_thermal_capacitance(geom, mats)
    UA_total = total_envelope_UA(geom, mats)

    # Component U-values
    U_wall = component_u_value(mats.wall_layers, "wall")
    U_roof = component_u_value(mats.roof_layers, "roof")
    U_floor = component_u_value(mats.floor_layers, "floor")
    U_win = mats.window.u_value
    U_door = mats.door.u_value
    # ShelterGeometry owns opening dimensions.  Window/DoorProperties hold
    # material properties only; using geometry here prevents a silent mismatch
    # between the envelope areas and the solar/conduction calculations.
    window_area = geom.window_area
    door_area = geom.door_area

    # Component UA products
    wall_areas = geom.wall_areas_by_orientation()
    UA_wall_total = U_wall * geom.net_wall_area
    UA_roof = U_roof * geom.roof_area
    UA_floor = U_floor * geom.floor_area
    UA_win = U_win * window_area
    UA_door = U_door * door_area

    # Solar absorptivity of exterior surfaces
    alpha_wall = (
        mats.wall_layers[-1].solar_absorptivity
        if mats.wall_layers else 0.5
    )
    alpha_roof = (
        mats.roof_layers[-1].solar_absorptivity
        if mats.roof_layers else 0.5
    )

    # Assume day 1 starts on Jan 1 unless we add date info later
    # For now, use a fixed representative day or cycle through
    # We'll use day_number = 1 + (hour // 24) for multi-day sims
    lat = climate.latitude
    lon = climate.longitude

    # ---- Initial state ----
    T_in = config.indoor_temp_initial
    hourly_results: List[HourlyResult] = []

    # ---- Main hourly loop ----
    for h in range(n_hours):
        # --- 1. Outdoor conditions ---
        T_out = float(climate.outdoor_temperature[h])
        ghi = float(climate.ghi[h])
        dni = float(climate.dni[h])
        dhi = float(climate.dhi[h])
        v_wind = float(climate.wind_speed[h])
        pressure = float(climate.surface_pressure[h])

        # --- 2. Solar position ---
        day_num = 1 + (h // 24)  # day of year
        hour_utc = h % 24         # hour within day (approx as UTC)
        zenith, solar_az = get_solar_position(lat, lon, day_num, hour_utc)

        # --- 3. Irradiance on each surface ---
        wall_irr = compute_wall_irradiances(
            ghi, dni, dhi, zenith, solar_az, config.ground_albedo,
        )
        roof_irr = wall_irr["roof"]

        # --- 4. Conduction through envelope ---
        h_o = exterior_combined_coefficient(v_wind)
        cond = envelope_conduction(
            geom, mats, T_in, T_out,
            wall_irradiances=wall_irr,
            roof_irradiance=roof_irr,
            wind_speed=v_wind,
        )
        # Override floor: use ground temperature
        Q_floor = U_floor * geom.floor_area * (config.ground_temperature - T_in)
        cond["floor"] = Q_floor
        Q_cond = cond["walls"] + cond["roof"] + Q_floor + cond["windows"] + cond["doors"]

        # --- 5. Solar gain through windows ---
        # Use average irradiance across all walls for window (simplified:
        # windows distributed equally on all faces)
        avg_wall_irr = sum(
            wall_irr[d] for d in ("north", "east", "south", "west")
        ) / 4.0
        Q_solar_win = window_solar_gain(
            mats.window.shgc, window_area, avg_wall_irr,
        )

        # Solar gain via opaque surfaces is already embedded in
        # sol-air temperature → captured in Q_cond.
        # For reporting, estimate the solar contribution:
        # Q_solar_opaque ≈ conduction_with_solar − conduction_without_solar
        Q_cond_no_solar = (
            U_wall * geom.net_wall_area * (T_out - T_in)
            + U_roof * geom.roof_area * (T_out - T_in)
            + Q_floor
            + U_win * window_area * (T_out - T_in)
            + U_door * door_area * (T_out - T_in)
        )
        Q_solar_opaque = Q_cond - Q_cond_no_solar

        # --- 6. Ventilation ---
        rho = air_density(T_out, pressure)
        Q_vent = ventilation_heat_transfer(
            config.ach, geom.volume, T_out, T_in, rho,
        )
        H_vent = ventilation_conductance(config.ach, geom.volume, rho)

        # --- 7. Internal gains ---
        Q_int = total_internal_gains(
            config.n_occupants, config.heat_per_person,
            config.equipment_watts,
        )

        # --- 8. Equilibrium temperature & time constant ---
        # Build UA/T_sa pairs for opaque components (excluding floor)
        from .solar import sol_air_temperature as _sol_air
        UA_opaque_terms = []

        # Walls by direction
        for direction in ("north", "east", "south", "west"):
            area_d = wall_areas[direction]
            if area_d > 0:
                T_sa_d = _sol_air(
                    T_out, wall_irr[direction], alpha_wall, h_o,
                    longwave_correction=0.0,
                )
                UA_opaque_terms.append((U_wall * area_d, T_sa_d))

        # Roof
        T_sa_roof = _sol_air(
            T_out, roof_irr, alpha_roof, h_o,
            longwave_correction=4.0,
        )
        UA_opaque_terms.append((UA_roof, T_sa_roof))

        # Doors (treated like opaque wall, no solar for simplicity)
        if UA_door > 0:
            UA_opaque_terms.append((UA_door, T_out))

        T_eq = equilibrium_temperature(
            UA_opaque_terms=UA_opaque_terms,
            UA_window=UA_win,
            t_outdoor=T_out,
            H_vent=H_vent,
            Q_solar_window=Q_solar_win,
            Q_internal=Q_int,
            UA_floor=UA_floor,
            t_ground=config.ground_temperature,
        )

        tau = thermal_time_constant(C_eff, UA_total, H_vent)

        # --- 9. Advance temperature ---
        T_in_passive = step_exponential(T_in, T_eq, tau, dt)

        # --- 10. Heating / cooling demand ---
        Q_heat, Q_cool, T_in_actual = heating_cooling_demand(
            T_in_passive, config.comfort_min, config.comfort_max,
            C_eff, dt,
        )

        # Net heat flow into the air node (before active intervention)
        Q_net = Q_cond + Q_solar_win + Q_int + Q_vent

        # --- 11. Store result ---
        hourly_results.append(HourlyResult(
            hour=h,
            indoor_temperature=round(T_in_passive, 2),
            outdoor_temperature=round(T_out, 2),
            sol_air_temp_roof=round(cond["sol_air_roof"], 2),
            sol_air_temp_wall=round(cond["sol_air_wall_avg"], 2),
            solar_gain_opaque=round(Q_solar_opaque, 1),
            solar_gain_window=round(Q_solar_win, 1),
            conduction_loss=round(-Q_cond, 1),  # positive = heat leaving
            ventilation_loss=round(-Q_vent, 1),  # positive = heat leaving
            internal_gain=round(Q_int, 1),
            net_heat_flow=round(Q_net, 1),
            heating_demand=round(Q_heat, 1),
            cooling_demand=round(Q_cool, 1),
        ))

        # Advance state (use passive T for free-running; actual for
        # controlled scenario — we report passive temperature but
        # track the passive trajectory for physics accuracy)
        T_in = T_in_passive

    # ---- Summary statistics ----
    temps = [r.indoor_temperature for r in hourly_results]
    total_heating_kwh = sum(r.heating_demand for r in hourly_results) * dt / 3_600_000
    total_cooling_kwh = sum(r.cooling_demand for r in hourly_results) * dt / 3_600_000
    passive_hours = sum(
        1 for r in hourly_results
        if config.comfort_min <= r.indoor_temperature <= config.comfort_max
    )
    tau_hours = tau / 3600.0 if tau != float("inf") else float("inf")

    return SimulationOutput(
        hourly_results=hourly_results,
        total_heating_requirement_kwh=round(total_heating_kwh, 2),
        total_cooling_requirement_kwh=round(total_cooling_kwh, 2),
        peak_heating_load_w=round(max(r.heating_demand for r in hourly_results), 1),
        peak_cooling_load_w=round(max(r.cooling_demand for r in hourly_results), 1),
        avg_indoor_temperature=round(sum(temps) / len(temps), 2),
        min_indoor_temperature=round(min(temps), 2),
        max_indoor_temperature=round(max(temps), 2),
        passive_comfort_hours=passive_hours,
        total_hours=n_hours,
        thermal_time_constant_hours=round(tau_hours, 2),
    )
