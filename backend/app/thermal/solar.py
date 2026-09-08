"""
Solar position, tilted-surface irradiance, and solar heat gain.

Covers:
    1. Solar geometry  (declination, hour angle, zenith, azimuth)
    2. Irradiance on tilted surfaces  (Liu & Jordan isotropic model)
    3. Sol-air temperature contribution  (opaque surfaces)
    4. Window solar heat gain  (SHGC method)

References:
    ASHRAE Handbook — Fundamentals 2021, Ch. 14 (Climatic Design Info)
    ASHRAE Handbook — Fundamentals 2021, Ch. 15 (Fenestration)
    ASHRAE Handbook — Fundamentals 2021, Ch. 18 (Nonresidential Load Calc)
    Duffie & Beckman, "Solar Engineering of Thermal Processes", 4th ed.
    Liu & Jordan (1963), "The Long-term Average Performance of Flat-Plate
        Solar-Energy Collectors"
"""

from __future__ import annotations

import math
from typing import Tuple

import numpy as np


# ==========================================================================
# Solar Position (Geometric)
# ==========================================================================

def day_of_year(month: int, day: int) -> int:
    """Return day-of-year (1-365) for a given month/day (non-leap)."""
    days_in_month = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    return sum(days_in_month[:month]) + day


def solar_declination(day_number: int) -> float:
    """
    Solar declination angle δ [radians].

    Cooper equation:
        δ = 23.45 · sin(360/365 · (284 + n))

    Args:
        day_number: Day of year (1-365).

    Returns:
        Declination [radians].

    Ref: Duffie & Beckman Eq. 1.6.1.
    """
    return math.radians(
        23.45 * math.sin(math.radians(360.0 / 365.0 * (284 + day_number)))
    )


def equation_of_time(day_number: int) -> float:
    """
    Equation of time correction [minutes].

    Spencer (1971) approximation.

    Args:
        day_number: Day of year (1-365).

    Returns:
        EoT [minutes].

    Ref: Duffie & Beckman Eq. 1.5.3.
    """
    B = math.radians(360.0 / 365.0 * (day_number - 81))
    return 9.87 * math.sin(2 * B) - 7.53 * math.cos(B) - 1.5 * math.sin(B)


def solar_hour_angle(
    hour_utc: float,
    longitude: float,
    day_number: int,
) -> float:
    """
    Solar hour angle ω [radians].

        ω = 15° · (solar_time - 12)

    Args:
        hour_utc: Hour of the day in UTC (0.0 - 23.99).
        longitude: Site longitude [degrees], East positive.
        day_number: Day of year (1-365).

    Returns:
        Hour angle [radians].  Negative = morning, Positive = afternoon.

    Ref: Duffie & Beckman Eq. 1.5.2.
    """
    # Local solar time
    eot = equation_of_time(day_number)
    # Time correction = 4 min per degree of longitude + EoT
    solar_time = hour_utc + (longitude / 15.0) + (eot / 60.0)
    omega = 15.0 * (solar_time - 12.0)
    return math.radians(omega)


def solar_zenith_angle(
    latitude: float,
    declination: float,
    hour_angle: float,
) -> float:
    """
    Solar zenith angle θ_z [radians].

        cos(θ_z) = sin(φ)·sin(δ) + cos(φ)·cos(δ)·cos(ω)

    Args:
        latitude: φ [radians].
        declination: δ [radians].
        hour_angle: ω [radians].

    Returns:
        Zenith angle [radians].  0 = directly overhead.

    Ref: Duffie & Beckman Eq. 1.6.5.
    """
    cos_zenith = (
        math.sin(latitude) * math.sin(declination)
        + math.cos(latitude) * math.cos(declination) * math.cos(hour_angle)
    )
    cos_zenith = max(-1.0, min(1.0, cos_zenith))
    return math.acos(cos_zenith)


def solar_azimuth_angle(
    latitude: float,
    declination: float,
    hour_angle: float,
    zenith: float,
) -> float:
    """
    Solar azimuth angle γ_s [radians].

    Convention: 0 = South,  +ve = West,  -ve = East.
    (ASHRAE / Duffie & Beckman solar convention.)

    To convert to compass bearing (0 = North, clockwise):
        compass = 180 + degrees(γ_s)

    Args:
        latitude: φ [radians].
        declination: δ [radians].
        hour_angle: ω [radians].
        zenith: θ_z [radians].

    Returns:
        Solar azimuth [radians].

    Ref: Duffie & Beckman Eq. 1.6.6.
    """
    sin_zenith = math.sin(zenith)
    if sin_zenith < 1e-6:
        return 0.0  # Sun at zenith — azimuth undefined

    cos_azimuth = (
        (math.sin(declination) - math.cos(zenith) * math.sin(latitude))
        / (sin_zenith * math.cos(latitude))
    )
    cos_azimuth = max(-1.0, min(1.0, cos_azimuth))
    azimuth = math.acos(cos_azimuth)

    # Sign: afternoon (ω > 0) → positive (West)
    if hour_angle > 0:
        azimuth = abs(azimuth)
    else:
        azimuth = -abs(azimuth)

    return azimuth


def get_solar_position(
    latitude_deg: float,
    longitude_deg: float,
    day_number: int,
    hour_utc: float,
) -> Tuple[float, float]:
    """
    Compute solar zenith and azimuth for a given location and time.

    Args:
        latitude_deg: Site latitude [degrees].
        longitude_deg: Site longitude [degrees].
        day_number: Day of year (1-365).
        hour_utc: Hour in UTC (0-23.99).

    Returns:
        (zenith_rad, azimuth_rad):
            zenith in [0, π], azimuth in solar convention
            (0=South, +West, -East).
    """
    lat_rad = math.radians(latitude_deg)
    decl = solar_declination(day_number)
    omega = solar_hour_angle(hour_utc, longitude_deg, day_number)
    zenith = solar_zenith_angle(lat_rad, decl, omega)
    azimuth = solar_azimuth_angle(lat_rad, decl, omega, zenith)
    return zenith, azimuth


# ==========================================================================
# Irradiance on Tilted Surfaces  (Liu & Jordan Isotropic Model)
# ==========================================================================

def incidence_angle(
    zenith: float,
    solar_azimuth: float,
    surface_tilt: float,
    surface_azimuth: float,
) -> float:
    """
    Angle of incidence θ between solar beam and a tilted surface normal.

        cos(θ) = cos(θ_z)·cos(β) + sin(θ_z)·sin(β)·cos(γ_s − γ)

    Args:
        zenith: Solar zenith angle θ_z [radians].
        solar_azimuth: Solar azimuth γ_s [radians]  (0=South convention).
        surface_tilt: Surface tilt β from horizontal [radians].
            0 = flat (horizontal), π/2 = vertical wall.
        surface_azimuth: Surface azimuth γ [radians]  (0=South convention).
            South-facing wall = 0, West-facing = π/2, North = π, East = -π/2.

    Returns:
        Incidence angle [radians].

    Ref: Duffie & Beckman Eq. 1.6.3.
    """
    cos_theta = (
        math.cos(zenith) * math.cos(surface_tilt)
        + math.sin(zenith) * math.sin(surface_tilt)
        * math.cos(solar_azimuth - surface_azimuth)
    )
    cos_theta = max(-1.0, min(1.0, cos_theta))
    return math.acos(cos_theta)


def tilted_irradiance(
    ghi: float,
    dni: float,
    dhi: float,
    zenith: float,
    solar_azimuth: float,
    surface_tilt: float,
    surface_azimuth: float,
    ground_albedo: float = 0.20,
) -> float:
    """
    Total solar irradiance on a tilted surface.

    Liu & Jordan (1963) isotropic diffuse model:

        I_t = I_beam + I_diffuse + I_ground_reflected

        I_beam    = DNI · max(0, cos θ)
        I_diffuse = DHI · (1 + cos β) / 2
        I_ground  = GHI · ρ_g · (1 − cos β) / 2

    Args:
        ghi: Global Horizontal Irradiance [W/m²].
        dni: Direct Normal Irradiance [W/m²].
        dhi: Diffuse Horizontal Irradiance [W/m²].
        zenith: Solar zenith angle [radians].
        solar_azimuth: Solar azimuth [radians] (0=South).
        surface_tilt: Surface tilt from horizontal [radians].
        surface_azimuth: Surface azimuth [radians] (0=South).
        ground_albedo: Ground reflectance [-]. Default 0.20.

    Returns:
        Total irradiance on the tilted surface [W/m²].

    Ref: Liu & Jordan (1963); Duffie & Beckman Ch. 2.
    """
    # Sun below horizon
    if zenith >= math.pi / 2:
        # Only diffuse + ground-reflected
        I_beam = 0.0
    else:
        theta = incidence_angle(
            zenith, solar_azimuth, surface_tilt, surface_azimuth
        )
        cos_theta = math.cos(theta)
        I_beam = dni * max(0.0, cos_theta)

    # Isotropic diffuse
    I_diffuse = dhi * (1.0 + math.cos(surface_tilt)) / 2.0

    # Ground-reflected
    I_ground = ghi * ground_albedo * (1.0 - math.cos(surface_tilt)) / 2.0

    return I_beam + I_diffuse + I_ground


def orientation_to_solar_azimuth(compass_deg: float) -> float:
    """
    Convert compass bearing (0=North, clockwise) to solar convention
    (0=South, +West, -East).

    Args:
        compass_deg: Compass bearing [degrees].  0=N, 90=E, 180=S, 270=W.

    Returns:
        Solar-convention azimuth [radians].
    """
    # Solar convention: South=0, West=+90, East=-90
    solar_deg = compass_deg - 180.0
    return math.radians(solar_deg)


# ==========================================================================
# Sol-Air Temperature  (for opaque surfaces)
# ==========================================================================

def sol_air_temperature(
    t_outdoor: float,
    solar_irradiance: float,
    absorptivity: float,
    h_outside: float,
    longwave_correction: float = 0.0,
) -> float:
    """
    Sol-air temperature for an opaque surface.

        T_sol-air = T_out + α·I_t/h_o − ε·ΔR/h_o

    Args:
        t_outdoor: Ambient outdoor dry-bulb temperature [°C].
        solar_irradiance: Total incident solar radiation I_t [W/m²].
        absorptivity: Surface solar absorptivity α [-].
        h_outside: Combined exterior heat transfer coefficient h_o [W/(m²·K)].
        longwave_correction: ε·ΔR/h_o [K].
            ≈ 4.0 for horizontal surfaces (roofs).
            ≈ 0.0 for vertical surfaces (walls).
            For tilted surfaces: ≈ 4.0 · cos(tilt).

    Returns:
        T_sol-air [°C].

    Ref: ASHRAE Fundamentals Ch. 18, Sol-Air Temperature.
    """
    return t_outdoor + (absorptivity * solar_irradiance / h_outside) - longwave_correction


# ==========================================================================
# Window Solar Heat Gain  (SHGC Method)
# ==========================================================================

def window_solar_gain(
    shgc: float,
    window_area: float,
    solar_irradiance: float,
    shading_factor: float = 1.0,
) -> float:
    """
    Solar heat gain transmitted through windows.

        Q_solar = SHGC · A_window · I_t · f_shade   [W]

    Args:
        shgc: Solar Heat Gain Coefficient at normal incidence [-].
        window_area: Total window area [m²].
        solar_irradiance: Total irradiance on window plane [W/m²].
        shading_factor: Shading reduction factor [-], 1.0 = no shading.

    Returns:
        Q_solar [W].  Always ≥ 0.

    Ref: ASHRAE Fundamentals Ch. 15.
    """
    return max(0.0, shgc * window_area * solar_irradiance * shading_factor)


def compute_wall_irradiances(
    ghi: float,
    dni: float,
    dhi: float,
    zenith: float,
    solar_azimuth: float,
    ground_albedo: float = 0.20,
) -> dict:
    """
    Compute solar irradiance on each cardinal wall face + roof.

    Walls are vertical (tilt = 90°), roof is horizontal (tilt = 0°).
    Azimuths in solar convention: South=0, West=+π/2, North=π, East=-π/2.

    Returns:
        dict with keys 'north', 'east', 'south', 'west', 'roof',
        each a float [W/m²].
    """
    WALL_TILT = math.pi / 2.0  # 90° = vertical
    ROOF_TILT = 0.0             # 0° = horizontal

    wall_azimuths = {
        "south": 0.0,
        "west":  math.pi / 2.0,
        "north": math.pi,
        "east": -math.pi / 2.0,
    }

    result = {}
    for direction, surf_az in wall_azimuths.items():
        result[direction] = tilted_irradiance(
            ghi, dni, dhi, zenith, solar_azimuth,
            WALL_TILT, surf_az, ground_albedo,
        )

    result["roof"] = tilted_irradiance(
        ghi, dni, dhi, zenith, solar_azimuth,
        ROOF_TILT, 0.0, ground_albedo,
    )

    return result
