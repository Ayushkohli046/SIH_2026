"""
Dynamic thermal balance — analytical exponential ODE integrator.

This is the core solver that advances the indoor temperature through time.
Uses the exact analytical solution of the single-node lumped capacitance
model, which is **unconditionally stable** for any timestep.

The governing ODE:

    C · dT_in/dt = Σ Q_in − Σ Q_out

Rearranged as a first-order linear ODE with constant coefficients over
each time step:

    dT_in/dt + (1/τ) · T_in = T_eq / τ

The exact discrete solution:

    T_in(t+Δt) = T_eq + (T_in(t) − T_eq) · exp(−Δt / τ)

where:
    τ   = C / ((UA)_tot + H_vent)           [s]  thermal time constant
    T_eq = driving equilibrium temperature   [°C]

References:
    ISO 13790:2008, Annex G (Simple hourly method)
    Incropera & DeWitt, "Fundamentals of Heat and Mass Transfer"
"""

from __future__ import annotations

import math


# ==========================================================================
# Equilibrium Temperature & Time Constant
# ==========================================================================

def thermal_time_constant(
    C_eff: float,
    UA_total: float,
    H_vent: float,
) -> float:
    """
    Shelter thermal time constant.

        τ = C_eff / ((UA)_total + H_vent)   [seconds]

    Args:
        C_eff: Effective thermal capacitance [J/K].
        UA_total: Total envelope conductance Σ(U·A) [W/K].
        H_vent: Ventilation conductance ṁ·cp [W/K].

    Returns:
        τ [seconds].

    Ref: ISO 13790:2008, Annex G.
    """
    total_conductance = UA_total + H_vent
    if total_conductance <= 0:
        return float("inf")  # perfectly insulated → never reaches equilibrium
    return C_eff / total_conductance


def equilibrium_temperature(
    UA_opaque_terms: list,
    UA_window: float,
    t_outdoor: float,
    H_vent: float,
    Q_solar_window: float,
    Q_internal: float,
    UA_floor: float = 0.0,
    t_ground: float = 18.0,
) -> float:
    """
    Asymptotic equilibrium temperature T_eq.

    This is the indoor temperature the shelter would reach if conditions
    stayed constant forever.

        T_eq = (Σ (UA)_k · T_sol-air,k + (UA)_win · T_out + (UA)_floor · T_ground
                + H_vent · T_out + Q_solar_win + Q_int)
               / ((UA)_total + H_vent)

    Args:
        UA_opaque_terms: List of (UA, T_sol-air) tuples for opaque
            components (walls, roof) — excluding floor.
            Each is (conductance [W/K], sol-air temperature [°C]).
        UA_window: Window conductance U_win · A_win [W/K].
        t_outdoor: Outdoor dry-bulb temperature [°C].
        H_vent: Ventilation conductance [W/K].
        Q_solar_window: Solar gain through windows [W].
        Q_internal: Total internal sensible gains [W].
        UA_floor: Floor conductance U_floor · A_floor [W/K].
        t_ground: Ground temperature [°C].

    Returns:
        T_eq [°C].
    """
    # Numerator: sum of heat source terms
    numerator = 0.0

    # Opaque: each drives toward its sol-air temperature
    total_conductance = 0.0
    for UA_k, T_sa_k in UA_opaque_terms:
        numerator += UA_k * T_sa_k
        total_conductance += UA_k

    # Window: conductive drives toward T_outdoor
    numerator += UA_window * t_outdoor
    total_conductance += UA_window

    # Floor: drives toward T_ground
    numerator += UA_floor * t_ground
    total_conductance += UA_floor

    # Ventilation: drives toward T_outdoor
    numerator += H_vent * t_outdoor
    total_conductance += H_vent

    # Direct heat inputs (not conductance-driven)
    numerator += Q_solar_window + Q_internal

    if total_conductance <= 0:
        return t_outdoor  # fallback
    return numerator / total_conductance


# ==========================================================================
# Analytical Exponential Time-Stepping
# ==========================================================================

def step_exponential(
    T_in: float,
    T_eq: float,
    tau: float,
    dt: float,
) -> float:
    """
    Advance indoor temperature by one time step using the exact
    analytical solution of the lumped capacitance ODE.

        T_in(t+Δt) = T_eq + (T_in(t) − T_eq) · exp(−Δt / τ)

    This is **unconditionally stable** for any Δt.

    Args:
        T_in: Current indoor temperature [°C].
        T_eq: Equilibrium temperature for this time step [°C].
        tau: Thermal time constant [seconds].
        dt: Time step [seconds].

    Returns:
        New indoor temperature [°C].

    Ref: ISO 13790:2008, Annex G; Incropera & DeWitt, lumped capacitance.
    """
    if tau <= 0 or math.isinf(tau):
        # No thermal mass → instant equilibrium, or
        # Perfect insulation → no change
        return T_eq if tau <= 0 else T_in

    decay = math.exp(-dt / tau)
    return T_eq + (T_in - T_eq) * decay


# ==========================================================================
# Heating / Cooling Demand
# ==========================================================================

def heating_cooling_demand(
    T_in_passive: float,
    comfort_min: float,
    comfort_max: float,
    C_eff: float,
    dt: float,
) -> tuple:
    """
    Calculate the instantaneous heating or cooling power needed
    to maintain indoor temperature within the comfort band.

    If T_in_passive < comfort_min  →  heating is needed.
    If T_in_passive > comfort_max  →  cooling is needed.
    Otherwise  →  passive comfort achieved, no active system.

    The demand is the power required to bring T_in from its passive
    value to the nearest comfort boundary over the time step:

        Q_demand = C · (T_target − T_passive) / Δt   [W]

    Args:
        T_in_passive: Indoor temperature without active systems [°C].
        comfort_min: Lower comfort bound [°C].
        comfort_max: Upper comfort bound [°C].
        C_eff: Thermal capacitance [J/K].
        dt: Time step [seconds].

    Returns:
        (heating_demand_W, cooling_demand_W, T_in_actual):
            heating_demand: Power needed for heating [W], ≥ 0.
            cooling_demand: Power needed for cooling [W], ≥ 0.
            T_in_actual: Actual indoor temperature after any active
                intervention [°C].
    """
    if T_in_passive < comfort_min:
        # Need heating to reach comfort_min
        Q_heat = C_eff * (comfort_min - T_in_passive) / dt
        return (Q_heat, 0.0, comfort_min)
    elif T_in_passive > comfort_max:
        # Need cooling to reach comfort_max
        Q_cool = C_eff * (T_in_passive - comfort_max) / dt
        return (0.0, Q_cool, comfort_max)
    else:
        # Passive comfort — no active system needed
        return (0.0, 0.0, T_in_passive)
