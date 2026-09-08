"""
Ventilation and infiltration heat transfer.

Models sensible heat exchange due to air movement through the shelter
envelope (both intentional ventilation and uncontrolled infiltration).

Reference:
    ASHRAE Handbook — Fundamentals 2021, Chapter 16
    CIBSE Guide A 2015, Section 4
"""

from __future__ import annotations


# ==========================================================================
# Standard Air Properties at 20 °C, 101.325 kPa
# ==========================================================================

RHO_AIR_STD = 1.204    # kg/m³
CP_AIR = 1006.0        # J/(kg·K)


# ==========================================================================
# Air Density
# ==========================================================================

def air_density(temperature_c: float, pressure_hpa: float = 1013.25) -> float:
    """
    Dry-air density from ideal gas law.

        ρ = P / (R_specific · T_K)

    where R_specific = 287.058 J/(kg·K) for dry air.

    Args:
        temperature_c: Outdoor dry-bulb temperature [°C].
        pressure_hpa: Surface atmospheric pressure [hPa].

    Returns:
        ρ_air [kg/m³].
    """
    R_SPECIFIC = 287.058  # J/(kg·K) for dry air
    T_kelvin = temperature_c + 273.15
    P_pascal = pressure_hpa * 100.0
    return P_pascal / (R_SPECIFIC * T_kelvin)


# ==========================================================================
# Volume & Mass Flow Rate
# ==========================================================================

def volume_flow_rate(ach: float, volume: float) -> float:
    """
    Volume flow rate from air changes per hour.

        V̇ = ACH · V / 3600   [m³/s]

    Args:
        ach: Air changes per hour [-].
        volume: Shelter interior volume [m³].

    Returns:
        V̇ [m³/s].

    Ref: ASHRAE Fundamentals Ch. 16, Eq. 27.
    """
    return ach * volume / 3600.0


def mass_flow_rate(
    ach: float,
    volume: float,
    rho_air: float = RHO_AIR_STD,
) -> float:
    """
    Mass flow rate of infiltrating / ventilating air.

        ṁ = ρ · V̇  [kg/s]

    Args:
        ach: Air changes per hour [-].
        volume: Shelter interior volume [m³].
        rho_air: Air density [kg/m³]. Default standard conditions.

    Returns:
        ṁ [kg/s].
    """
    return rho_air * volume_flow_rate(ach, volume)


# ==========================================================================
# Ventilation Heat Transfer
# ==========================================================================

def ventilation_heat_transfer(
    ach: float,
    volume: float,
    t_outdoor: float,
    t_indoor: float,
    rho_air: float = RHO_AIR_STD,
) -> float:
    """
    Sensible heat transfer due to ventilation / infiltration.

        Q_vent = ṁ · c_p · (T_out − T_in)   [W]

    Positive value → heat entering shelter (outdoor warmer).
    Negative value → heat leaving shelter (outdoor cooler).

    Args:
        ach: Air changes per hour [-].
        volume: Shelter volume [m³].
        t_outdoor: Outdoor dry-bulb temperature [°C].
        t_indoor: Indoor air temperature [°C].
        rho_air: Air density [kg/m³].

    Returns:
        Q_vent [W].  Positive = heat gain, negative = heat loss.

    Ref: ASHRAE Fundamentals Ch. 16;  Q = ṁ·cp·ΔT.
    """
    m_dot = mass_flow_rate(ach, volume, rho_air)
    return m_dot * CP_AIR * (t_outdoor - t_indoor)


def ventilation_conductance(
    ach: float,
    volume: float,
    rho_air: float = RHO_AIR_STD,
) -> float:
    """
    Ventilation thermal conductance (H_vent).

        H_vent = ṁ · c_p = ρ · c_p · ACH · V / 3600   [W/K]

    This is the coefficient such that:
        Q_vent = H_vent · (T_out − T_in)

    Args:
        ach: Air changes per hour [-].
        volume: Shelter volume [m³].
        rho_air: Air density [kg/m³].

    Returns:
        H_vent [W/K].
    """
    m_dot = mass_flow_rate(ach, volume, rho_air)
    return m_dot * CP_AIR


def simplified_ventilation_heat(
    ach: float,
    volume: float,
    t_outdoor: float,
    t_indoor: float,
) -> float:
    """
    Simplified ventilation heat transfer using the standard coefficient.

        Q ≈ 0.336 · ACH · V · (T_out − T_in)   [W]

    where 0.336 = ρ_air · c_p / 3600  at standard conditions.

    Args:
        ach: Air changes per hour [-].
        volume: Shelter volume [m³].
        t_outdoor: Outdoor temperature [°C].
        t_indoor: Indoor temperature [°C].

    Returns:
        Q_vent [W].

    Ref: ASHRAE Fundamentals Ch. 16.
    """
    COEFF = 0.336  # W·h/(m³·K)  =  ρ·cp / 3600
    return COEFF * ach * volume * (t_outdoor - t_indoor)
