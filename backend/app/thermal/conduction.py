"""
Conduction heat transfer through the building envelope.

Combines:
    - Composite U-values  (from properties.py)
    - Sol-air temperatures  (from solar.py)
    - Area-weighted heat flow for each component

Sign convention:
    Positive Q  →  heat entering the shelter  (outdoor/sol-air warmer)
    Negative Q  →  heat leaving the shelter  (outdoor/sol-air cooler)

References:
    ISO 6946:2017
    ASHRAE Handbook — Fundamentals 2021, Ch. 18
"""

from __future__ import annotations

from typing import List, Dict

from .models import (
    MaterialLayer,
    ShelterGeometry,
    ShelterMaterials,
)
from .properties import (
    component_u_value,
    exterior_combined_coefficient,
)
from .solar import sol_air_temperature


# ==========================================================================
# Single-Component Conduction
# ==========================================================================

def conduction_heat_transfer(
    u_value: float,
    area: float,
    t_outside: float,
    t_inside: float,
) -> float:
    """
    Steady-state conduction heat transfer through a building component.

        Q = U · A · (T_outside − T_inside)   [W]

    Positive → heat entering shelter.
    Negative → heat leaving shelter.

    Args:
        u_value: U [W/(m²·K)].
        area: Surface area [m²].
        t_outside: Exterior driving temperature [°C].
            (Use sol-air temperature for opaque surfaces with solar.)
        t_inside: Indoor air temperature [°C].

    Returns:
        Q [W].

    Ref: ISO 6946:2017, §6.
    """
    return u_value * area * (t_outside - t_inside)


# ==========================================================================
# Total Envelope Conduction
# ==========================================================================

def envelope_conduction(
    geometry: ShelterGeometry,
    materials: ShelterMaterials,
    t_indoor: float,
    t_outdoor: float,
    wall_irradiances: Dict[str, float],
    roof_irradiance: float,
    wind_speed: float = 3.0,
) -> dict:
    """
    Total conduction heat transfer through all envelope components.

    For opaque components, uses sol-air temperature to account for
    solar radiation absorbed by exterior surfaces.

    For windows and doors, uses T_outdoor directly (solar gain through
    windows is handled separately via SHGC in solar.py).

    Args:
        geometry: Shelter dimensions and orientation.
        materials: Layer stackups and window/door properties.
        t_indoor: Indoor air temperature [°C].
        t_outdoor: Outdoor dry-bulb temperature [°C].
        wall_irradiances: Solar irradiance on each cardinal wall face
            [W/m²] — dict with keys 'north', 'east', 'south', 'west'.
        roof_irradiance: Solar irradiance on roof [W/m²].
        wind_speed: Wind speed [m/s] for h_o calculation.

    Returns:
        Dict with keys:
            'walls'    : Q through opaque walls [W]
            'roof'     : Q through roof [W]
            'floor'    : Q through floor [W]
            'windows'  : Q through windows [W]
            'doors'    : Q through doors [W]
            'total'    : Sum of all [W]
            'sol_air_roof' : Sol-air temp for roof [°C]
            'sol_air_wall_avg' : Area-weighted avg sol-air for walls [°C]

    Ref: ASHRAE Fundamentals Ch. 18; ISO 6946:2017.
    """
    h_o = exterior_combined_coefficient(wind_speed)

    # --- Opaque walls (per cardinal direction) ---
    U_wall = component_u_value(materials.wall_layers, "wall")
    wall_areas = geometry.wall_areas_by_orientation()

    # Solar absorptivity of the outermost wall layer
    alpha_wall = 0.5
    if materials.wall_layers:
        alpha_wall = materials.wall_layers[-1].solar_absorptivity  # last = exterior

    Q_walls = 0.0
    sol_air_wall_num = 0.0  # numerator for area-weighted average
    sol_air_wall_den = 0.0
    for direction in ("north", "east", "south", "west"):
        area = wall_areas[direction]
        if area <= 0:
            continue
        I_wall = wall_irradiances.get(direction, 0.0)
        T_sa = sol_air_temperature(
            t_outdoor, I_wall, alpha_wall, h_o,
            longwave_correction=0.0,  # vertical → 0 K correction
        )
        Q_walls += conduction_heat_transfer(U_wall, area, T_sa, t_indoor)
        sol_air_wall_num += T_sa * area
        sol_air_wall_den += area

    sol_air_wall_avg = (
        sol_air_wall_num / sol_air_wall_den
        if sol_air_wall_den > 0 else t_outdoor
    )

    # --- Roof ---
    U_roof = component_u_value(materials.roof_layers, "roof")
    alpha_roof = 0.5
    if materials.roof_layers:
        alpha_roof = materials.roof_layers[-1].solar_absorptivity

    T_sa_roof = sol_air_temperature(
        t_outdoor, roof_irradiance, alpha_roof, h_o,
        longwave_correction=4.0,  # horizontal surface → ~4 K correction
    )
    Q_roof = conduction_heat_transfer(
        U_roof, geometry.roof_area, T_sa_roof, t_indoor
    )

    # --- Floor ---
    # Simplified: floor loses/gains heat to a constant ground temperature.
    # The ground temperature is passed via t_outdoor for the floor,
    # but the caller should supply config.ground_temperature.
    # For now, we compute against t_outdoor and let simulation.py
    # override the temperature when calling this.
    U_floor = component_u_value(materials.floor_layers, "floor")
    Q_floor = conduction_heat_transfer(
        U_floor, geometry.floor_area, t_outdoor, t_indoor
    )

    # --- Windows ---
    # Conductive component only (no solar — that's in solar.py)
    U_win = materials.window.u_value
    A_win = materials.window.area
    Q_windows = conduction_heat_transfer(U_win, A_win, t_outdoor, t_indoor)

    # --- Doors ---
    U_door = materials.door.u_value
    A_door = materials.door.area
    Q_doors = conduction_heat_transfer(U_door, A_door, t_outdoor, t_indoor)

    # --- Total ---
    Q_total = Q_walls + Q_roof + Q_floor + Q_windows + Q_doors

    return {
        "walls": Q_walls,
        "roof": Q_roof,
        "floor": Q_floor,
        "windows": Q_windows,
        "doors": Q_doors,
        "total": Q_total,
        "sol_air_roof": T_sa_roof,
        "sol_air_wall_avg": sol_air_wall_avg,
    }


def total_envelope_UA(
    geometry: ShelterGeometry,
    materials: ShelterMaterials,
) -> float:
    """
    Total envelope thermal conductance  (UA)_total  [W/K].

    Sum of U·A for all components.  Used for thermal time constant
    calculation.

    Returns:
        (UA)_total [W/K].
    """
    U_wall = component_u_value(materials.wall_layers, "wall")
    U_roof = component_u_value(materials.roof_layers, "roof")
    U_floor = component_u_value(materials.floor_layers, "floor")

    UA = (
        U_wall * geometry.net_wall_area
        + U_roof * geometry.roof_area
        + U_floor * geometry.floor_area
        + materials.window.u_value * materials.window.area
        + materials.door.u_value * materials.door.area
    )
    return UA
