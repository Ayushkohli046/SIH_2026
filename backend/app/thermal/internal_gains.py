"""
Internal heat gains from occupants and equipment.

Reference:
    ASHRAE Handbook — Fundamentals 2021, Ch. 18 Table 1
    ISO 7730:2005

Notes:
    - Sensible heat per person depends on activity level and ambient
      temperature.  At higher indoor temperatures, sweating increases
      latent heat and decreases sensible heat.
    - For a single-zone dry-bulb model, only *sensible* gains matter
      (latent gains affect humidity, not temperature directly).
"""

from __future__ import annotations


# ==========================================================================
# ASHRAE Metabolic Heat Rates  [W per person, sensible component]
# ==========================================================================

# Activity level → sensible heat output per person [W]
# ASHRAE Fundamentals 2021, Ch. 18 Table 1  &  Ch. 9
METABOLIC_HEAT_SENSIBLE = {
    "sleeping":         50.0,   # 0.7-0.8 met
    "seated_quiet":     70.0,   # 1.0 met  (resting, reading)
    "sedentary":        75.0,   # 1.2 met  (office work, eating)
    "standing_light":   85.0,   # 1.4-1.6 met  (cooking, cleaning)
    "moderate_work":   100.0,   # 2.0+ met  (physical tasks)
}

# Default: seated quiet / resting = 75 W sensible
DEFAULT_HEAT_PER_PERSON = 75.0  # W


# ==========================================================================
# Occupant Heat Gain
# ==========================================================================

def occupant_heat_gain(
    n_occupants: int,
    heat_per_person: float = DEFAULT_HEAT_PER_PERSON,
) -> float:
    """
    Total sensible heat gain from occupants.

        Q_occ = N · q_person   [W]

    Args:
        n_occupants: Number of people inside the shelter.
        heat_per_person: Sensible metabolic heat per person [W].
            Default 75 W  (seated quiet, ASHRAE Ch. 18 Table 1).

    Returns:
        Q_occ [W].  Always ≥ 0.

    Ref: ASHRAE Fundamentals 2021, Ch. 18 Table 1.
    """
    return max(0, n_occupants) * heat_per_person


# ==========================================================================
# Equipment Heat Gain
# ==========================================================================

def equipment_heat_gain(equipment_watts: float = 0.0) -> float:
    """
    Total sensible heat gain from electrical equipment.

    For a basic passive shelter the default is 0 W.
    Can be set to account for lighting, laptops, etc.

    Args:
        equipment_watts: Total equipment heat dissipation [W].

    Returns:
        Q_equip [W].  Always ≥ 0.
    """
    return max(0.0, equipment_watts)


# ==========================================================================
# Total Internal Gains
# ==========================================================================

def total_internal_gains(
    n_occupants: int,
    heat_per_person: float = DEFAULT_HEAT_PER_PERSON,
    equipment_watts: float = 0.0,
) -> float:
    """
    Combined sensible internal heat gains.

        Q_int = Q_occ + Q_equip   [W]

    Args:
        n_occupants: Number of people.
        heat_per_person: Sensible metabolic heat [W/person].
        equipment_watts: Equipment heat [W].

    Returns:
        Q_int [W].  Always ≥ 0.

    Ref: ASHRAE Fundamentals 2021, Ch. 18.
    """
    return (
        occupant_heat_gain(n_occupants, heat_per_person)
        + equipment_heat_gain(equipment_watts)
    )
