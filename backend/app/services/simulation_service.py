"""Translation between public API data and the thermal-engine dataclasses."""

from __future__ import annotations

from typing import Optional

import numpy as np

from app.models.schemas import SimulationRequest
from app.services.climate_service import fetch_forecast
from app.services.material_service import make_layer, make_custom_layer
from app.thermal.models import (
    DoorProperties, ShelterGeometry, ShelterMaterials, SimulationConfig,
    SimulationInput, SimulationOutput, WindowProperties,
)
from app.thermal.simulation import run_simulation


# ---------------------------------------------------------------------------
# Helpers — custom vs catalogue layer selection
# ---------------------------------------------------------------------------

def _wall_layer(request: SimulationRequest):
    """Return wall structural layer — custom if provided, else catalogue."""
    if getattr(request, "custom_wall", None):
        return make_custom_layer(request.custom_wall)
    return make_layer(request.materials.wall, 0.20)


def _insulation_layer(request: SimulationRequest):
    """Return insulation layer — custom if provided, else catalogue."""
    if getattr(request, "custom_insulation", None):
        return make_custom_layer(request.custom_insulation)
    return make_layer(request.materials.insulation, request.insulation_thickness, absorptivity=0.30)


def _floor_layer(request: SimulationRequest):
    """Return floor layer — custom if provided, else catalogue."""
    if getattr(request, "custom_floor", None):
        return make_custom_layer(request.custom_floor)
    return make_layer(request.materials.floor, 0.15)


# ---------------------------------------------------------------------------
# Theatre/Ground profile
# ---------------------------------------------------------------------------

def get_theatre_ground_profile(lat: float, lon: float, t_out_mean: float) -> dict:
    """
    Computes area-specific ground thermal boundary conditions:
    - Arctic Glacier (Siachen): Sub-zero permafrost ground (-5°C) & high snow albedo (0.80).
    - Mountain Cold Desert (Ladakh): Deep rocky loam (8°C) & mountain soil albedo (0.28).
    - Hot Arid Desert (Thar): Sun-baked sand (32°C) & desert silica albedo (0.38).
    - Temperate: Ambient-coupled ground temp & standard albedo (0.20).
    """
    if lat >= 35.0 or t_out_mean < -5.0:
        return {"ground_temp": -5.0, "ground_albedo": 0.80, "theatre": "siachen"}
    elif lat >= 33.0 or t_out_mean < 12.0:
        return {"ground_temp": 8.0, "ground_albedo": 0.28, "theatre": "ladakh"}
    elif lat < 30.0 and lon < 75.0:
        return {"ground_temp": 32.0, "ground_albedo": 0.38, "theatre": "thar"}
    else:
        return {"ground_temp": float(max(5.0, min(24.0, t_out_mean))), "ground_albedo": 0.22, "theatre": "temperate"}


# ---------------------------------------------------------------------------
# Build simulation input
# ---------------------------------------------------------------------------

def build_simulation_input(request: SimulationRequest, hours: int = 24, climate=None) -> SimulationInput:
    climate = climate or fetch_forecast(request.location.latitude, request.location.longitude, hours)
    geometry = ShelterGeometry(
        length=request.shelter.length, width=request.shelter.width, height=request.shelter.height,
        orientation=request.shelter.orientation, window_area=request.openings.window_area,
        door_area=request.openings.door_area,
    )
    # Layers are deliberately ordered interior → exterior, as required by the
    # capacitance model.  The exterior insulation is light-coloured by default.
    materials = ShelterMaterials(
        wall_layers=[
            _wall_layer(request),
            _insulation_layer(request),
        ],
        roof_layers=[
            make_layer(request.materials.roof, 0.15),
            _insulation_layer(request),
        ],
        floor_layers=[_floor_layer(request)],
        window=WindowProperties(u_value=5.7, shgc=0.82, area=request.openings.window_area),
        door=DoorProperties(u_value=3.5, area=request.openings.door_area),
    )
    t_mean = float(np.mean(climate.outdoor_temperature)) if len(climate.outdoor_temperature) > 0 else 15.0
    ground_profile = get_theatre_ground_profile(request.location.latitude, request.location.longitude, t_mean)
    config = SimulationConfig(
        n_occupants=request.shelter.occupants,
        ach=request.shelter.ach,
        ground_temperature=ground_profile["ground_temp"],
        ground_albedo=ground_profile["ground_albedo"],
    )
    return SimulationInput(geometry=geometry, materials=materials, climate=climate, config=config)


# ---------------------------------------------------------------------------
# Physics breakdown — for the formula explainer panel
# ---------------------------------------------------------------------------

def compute_physics_breakdown(sim_input: SimulationInput, output: SimulationOutput) -> dict:
    """
    Compute intermediate physics values for the Physics Formula Explainer panel.

    Returns all values needed to display the ISO 13790 / ASHRAE equations with
    real plugged-in numbers from this simulation run.
    """
    from app.thermal.properties import (
        composite_resistance, SURFACE_RESISTANCES, layer_resistance,
        shelter_thermal_capacitance,
    )
    from app.thermal.ventilation import ventilation_conductance

    geom = sim_input.geometry
    mats = sim_input.materials
    config = sim_input.config

    # U and R values per component
    R_wall = composite_resistance(mats.wall_layers, "wall")
    U_wall = 1.0 / R_wall
    R_roof = composite_resistance(mats.roof_layers, "roof")
    U_roof = 1.0 / R_roof
    R_floor = composite_resistance(mats.floor_layers, "floor")
    U_floor = 1.0 / R_floor

    # Layer-by-layer wall resistance breakdown (for the explainer card)
    surf = SURFACE_RESISTANCES["wall"]
    R_si = surf["R_si"]
    R_se = surf["R_se"]
    wall_layers_detail = [
        {
            "name": lyr.name,
            "thickness_mm": round(lyr.thickness * 1000),
            "k": lyr.thermal_conductivity,
            "r": round(layer_resistance(lyr.thickness, lyr.thermal_conductivity), 3),
        }
        for lyr in mats.wall_layers
    ]

    # Thermal mass
    C_eff = shelter_thermal_capacitance(geom, mats)  # J/K

    # Ventilation conductance (approximate density at reference condition)
    H_vent = ventilation_conductance(config.ach, geom.volume, 1.2)

    # Approximate overall UA (for time constant display)
    UA_env = (
        U_wall * geom.net_wall_area
        + U_roof * geom.roof_area
        + U_floor * geom.floor_area
        + mats.window.u_value * geom.window_area
        + mats.door.u_value * geom.door_area
    )
    tau_h = (C_eff / max(UA_env + H_vent, 1.0)) / 3600.0

    # Averages from hourly results
    rows = output.hourly_results
    n = max(len(rows), 1)
    avg_solar = round(sum(r.solar_gain_opaque + r.solar_gain_window for r in rows) / n, 1)
    peak_solar = round(max((r.solar_gain_opaque + r.solar_gain_window for r in rows), default=0), 1)
    avg_cond_loss = round(sum(r.conduction_loss for r in rows) / n, 1)
    avg_vent_loss = round(sum(r.ventilation_loss for r in rows) / n, 1)
    avg_internal = round(sum(r.internal_gain for r in rows) / n, 1)
    avg_delta_T = round(sum(abs(r.indoor_temperature - r.outdoor_temperature) for r in rows) / n, 1)

    return {
        # Component U and R values
        "u_wall": round(U_wall, 3),
        "r_wall": round(R_wall, 3),
        "u_roof": round(U_roof, 3),
        "r_roof": round(R_roof, 3),
        "u_floor": round(U_floor, 3),
        # Areas
        "wall_area_m2": round(geom.net_wall_area, 1),
        "roof_area_m2": round(geom.roof_area, 1),
        "floor_area_m2": round(geom.floor_area, 1),
        "window_area_m2": round(geom.window_area, 1),
        "volume_m3": round(geom.volume, 1),
        # Thermal mass and time constant
        "thermal_mass_kj_k": round(C_eff / 1000.0, 1),
        "thermal_time_constant_h": round(tau_h, 2),
        # Surface film resistances (ISO 6946)
        "r_si": R_si,
        "r_se": R_se,
        # Layer-by-layer wall breakdown
        "wall_layers": wall_layers_detail,
        # Glazing properties
        "window_u": mats.window.u_value,
        "window_shgc": mats.window.shgc,
        # Averages from simulation
        "avg_solar_gain_w": avg_solar,
        "peak_solar_gain_w": peak_solar,
        "avg_conduction_loss_w": avg_cond_loss,
        "avg_ventilation_loss_w": avg_vent_loss,
        "avg_internal_gain_w": avg_internal,
        "avg_delta_T_c": avg_delta_T,
        "ach": config.ach,
    }


# ---------------------------------------------------------------------------
# Serialise output
# ---------------------------------------------------------------------------

def serialize_output(output: SimulationOutput) -> dict:
    rows = output.hourly_results
    return {
        "summary": {
            "heating_requirement_kwh": output.total_heating_requirement_kwh,
            "cooling_requirement_kwh": output.total_cooling_requirement_kwh,
            "peak_heating_load_w": output.peak_heating_load_w,
            "peak_cooling_load_w": output.peak_cooling_load_w,
            "average_indoor_temperature_c": output.avg_indoor_temperature,
            "passive_comfort_hours": output.passive_comfort_hours,
            "total_hours": output.total_hours,
            "thermal_time_constant_hours": output.thermal_time_constant_hours,
        },
        "hourly": {
            "hour": [r.hour for r in rows],
            "indoor_temperature": [r.indoor_temperature for r in rows],
            "outdoor_temperature": [r.outdoor_temperature for r in rows],
            "solar_gain": [round(r.solar_gain_opaque + r.solar_gain_window, 1) for r in rows],
            "heat_loss": [round(r.conduction_loss + r.ventilation_loss, 1) for r in rows],
            "heating_demand": [r.heating_demand for r in rows],
            "cooling_demand": [r.cooling_demand for r in rows],
        },
    }


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def simulate(request: SimulationRequest, hours: Optional[int] = None, climate=None) -> dict:
    """
    Run a complete thermal simulation and return serialised output + physics breakdown.

    Args:
        request: Full simulation request (location, shelter, materials, etc.).
        hours:   Override simulation duration in hours. If None, uses request.hours (default 24).
        climate: Pre-fetched climate data (shared across candidates in optimization/sweep).

    Returns:
        Dict with 'summary', 'hourly', and 'physics' keys.
    """
    actual_hours = hours if hours is not None else getattr(request, "hours", 24)
    sim_input = build_simulation_input(request, actual_hours, climate)
    output = run_simulation(sim_input)
    result = serialize_output(output)
    result["physics"] = compute_physics_breakdown(sim_input, output)
    return result
