"""
Thermal resistance, U-value, and thermal capacitance calculations.

Every equation is referenced to ISO 6946:2017 or ASHRAE Fundamentals 2021.

Sign convention:
    R = thermal resistance [m²·K/W]  (higher = more insulating)
    U = thermal transmittance [W/(m²·K)]  (higher = more heat transfer)
    C = thermal capacitance [J/K]  (higher = more thermal mass)
"""

from __future__ import annotations

import math
from typing import List

from .models import MaterialLayer, ShelterGeometry, ShelterMaterials


# ==========================================================================
# ISO 6946:2017 Table 7 — Surface Film Resistances  [m²·K/W]
# ==========================================================================

SURFACE_RESISTANCES = {
    #                          R_si    R_se
    "wall":         {"R_si": 0.13, "R_se": 0.04},   # horizontal heat flow
    "roof":         {"R_si": 0.10, "R_se": 0.04},   # upward heat flow (winter)
    "roof_summer":  {"R_si": 0.17, "R_se": 0.04},   # downward heat flow (summer)
    "floor":        {"R_si": 0.17, "R_se": 0.04},   # downward (floor over ground)
}


# ==========================================================================
# ISO 13790 — Thermal Capacitance per Floor Area  [kJ/(m²·K)]
# Used as fallback if detailed layer data is unavailable.
# ==========================================================================

THERMAL_MASS_CLASS = {
    "very_light":  80.0,   # Canvas tent, thin metal shell
    "light":      110.0,   # Timber frame, sandwich panels
    "medium":     165.0,   # AAC blocks, hollow brick
    "heavy":      260.0,   # Solid brick, dense concrete
    "very_heavy": 370.0,   # Rammed earth, stone masonry
}


# ==========================================================================
# Layer & Composite Resistance
# ==========================================================================

def layer_resistance(thickness: float, conductivity: float) -> float:
    """
    Thermal resistance of a single homogeneous material layer.

        R = d / k   [m²·K/W]

    Args:
        thickness: d [m].
        conductivity: k [W/(m·K)].

    Returns:
        Thermal resistance R [m²·K/W].

    Ref: ISO 6946:2017, §6.1.
    """
    if conductivity <= 0:
        raise ValueError(
            f"Thermal conductivity must be > 0, got {conductivity} W/(m·K)"
        )
    return thickness / conductivity


def composite_resistance(
    layers: List[MaterialLayer],
    component_type: str = "wall",
) -> float:
    """
    Total air-to-air thermal resistance of a composite building element.

        R_total = R_si  +  Σ (d_i / k_i)  +  R_se   [m²·K/W]

    Layers are in any order — each contributes d/k in series.

    Args:
        layers: Material layers making up the element.
        component_type: One of 'wall', 'roof', 'roof_summer', 'floor'.
            Selects the appropriate surface film resistances.

    Returns:
        R_total [m²·K/W].

    Ref: ISO 6946:2017, §6.
    """
    surf = SURFACE_RESISTANCES.get(component_type, SURFACE_RESISTANCES["wall"])
    R_total = surf["R_si"] + surf["R_se"]
    for lyr in layers:
        R_total += layer_resistance(lyr.thickness, lyr.thermal_conductivity)
    return R_total


def u_value(R_total: float) -> float:
    """
    Overall thermal transmittance (U-value).

        U = 1 / R_total   [W/(m²·K)]

    Args:
        R_total: Total thermal resistance [m²·K/W].

    Returns:
        U-value [W/(m²·K)].

    Ref: ISO 6946:2017, §6.
    """
    if R_total <= 0:
        raise ValueError(f"R_total must be > 0, got {R_total} m²·K/W")
    return 1.0 / R_total


def component_u_value(
    layers: List[MaterialLayer],
    component_type: str = "wall",
) -> float:
    """
    Convenience: U-value from raw layers + component type.

    Returns:
        U [W/(m²·K)].
    """
    return u_value(composite_resistance(layers, component_type))


# ==========================================================================
# External Surface Coefficients  (Wind-Dependent)
# ==========================================================================

def exterior_convective_coefficient(wind_speed: float) -> float:
    """
    Wind-dependent external convective heat transfer coefficient.

    Jurges / McAdams correlation:
        h_c = 5.7 + 3.8 · v       for v ≤ 5 m/s
        h_c = 7.2 · v^0.78        for v > 5 m/s

    Args:
        wind_speed: v [m/s] at reference height (typically 10 m).

    Returns:
        h_c,out [W/(m²·K)].

    Ref: ASHRAE Fundamentals 2021 Ch. 26; Jurges 1924; McAdams 1954.
    """
    v = max(0.0, wind_speed)
    if v <= 5.0:
        return 5.7 + 3.8 * v
    else:
        return 7.2 * v ** 0.78


def exterior_combined_coefficient(wind_speed: float, h_rad: float = 4.5) -> float:
    """
    Combined external heat transfer coefficient (convection + radiation).

        h_o = h_c,out + h_r,out

    Args:
        wind_speed: v [m/s].
        h_rad: Linearised longwave radiative coefficient [W/(m²·K)].
            Default 4.5 W/(m²·K)  ≈  4·ε·σ·T̄³  for ε ≈ 0.9, T̄ ≈ 290 K.

    Returns:
        h_o [W/(m²·K)].

    Ref: ISO 6946:2017, §C.2.
    """
    return exterior_convective_coefficient(wind_speed) + h_rad


def wind_dependent_R_se(wind_speed: float) -> float:
    """
    Wind-dependent external surface resistance.

        R_se = 1 / h_o

    Args:
        wind_speed: v [m/s].

    Returns:
        R_se [m²·K/W].
    """
    h_o = exterior_combined_coefficient(wind_speed)
    return 1.0 / h_o


# ==========================================================================
# Thermal Capacitance (Effective Thermal Mass)
# ==========================================================================

def layer_effective_capacitance(
    layer: MaterialLayer,
    area: float,
    remaining_depth: float,
) -> float:
    """
    Effective thermal capacitance contributed by one layer.

    Only the portion within *remaining_depth* from the interior surface
    actively participates in the diurnal cycle.

        C_layer = A · d_eff · ρ · c_p   [J/K]

    Args:
        layer: Material layer.
        area: Surface area of the component [m²].
        remaining_depth: How much of the 10 cm active depth is still
            unused by layers closer to the interior [m].

    Returns:
        Capacitance contribution [J/K].

    Ref: ISO 13790:2008, Annex G; ISO 13786:2017.
    """
    d_eff = min(layer.thickness, max(0.0, remaining_depth))
    return area * d_eff * layer.density * layer.specific_heat


def component_thermal_capacitance(
    layers: List[MaterialLayer],
    area: float,
    max_active_depth: float = 0.10,
) -> float:
    """
    Total effective thermal capacitance of one building component.

    Layers must be ordered **interior → exterior**.
    Only the first `max_active_depth` metres (default 10 cm, per
    ISO 13790) from the interior boundary participate in the
    24-hour diurnal thermal cycle.

        C = Σ  A · min(d_i, remaining) · ρ_i · c_p,i   [J/K]

    Args:
        layers: Ordered interior-to-exterior.
        area: Component surface area [m²].
        max_active_depth: Active thermal penetration depth [m].

    Returns:
        Effective capacitance C [J/K].

    Ref: ISO 13790:2008, Annex G.
    """
    C = 0.0
    depth_used = 0.0
    for lyr in layers:
        remaining = max_active_depth - depth_used
        if remaining <= 0:
            break
        C += layer_effective_capacitance(lyr, area, remaining)
        depth_used += min(lyr.thickness, remaining)
    return C


def shelter_thermal_capacitance(
    geometry: ShelterGeometry,
    materials: ShelterMaterials,
) -> float:
    """
    Total effective thermal capacitance of the entire shelter envelope
    plus indoor air.

        C_total = C_air + C_walls + C_roof + C_floor   [J/K]

    The air capacitance is:
        C_air = ρ_air · c_p,air · V  ≈  1210 · V   [J/K]

    Args:
        geometry: Shelter geometry.
        materials: Shelter materials.

    Returns:
        C_total [J/K].
    """
    # Indoor air
    RHO_AIR = 1.204     # kg/m³  at 20 °C, 101.325 kPa
    CP_AIR = 1006.0     # J/(kg·K)
    C_air = RHO_AIR * CP_AIR * geometry.volume

    # Envelope components  (layers ordered interior → exterior)
    C_walls = component_thermal_capacitance(
        materials.wall_layers, geometry.net_wall_area
    )
    C_roof = component_thermal_capacitance(
        materials.roof_layers, geometry.roof_area
    )
    C_floor = component_thermal_capacitance(
        materials.floor_layers, geometry.floor_area
    )

    return C_air + C_walls + C_roof + C_floor
