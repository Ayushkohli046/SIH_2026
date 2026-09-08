"""
Data models for the thermal simulation engine.

All inputs and outputs are plain Python dataclasses with numpy arrays
for time-series data.  No web framework dependency.

Units Convention (SI throughout):
    Temperature     °C
    Length          m
    Area            m²
    Volume          m³
    Energy          J or W (power)
    Conductivity    W/(m·K)
    Density         kg/m³
    Specific heat   J/(kg·K)
    Resistance      m²·K/W
    Time            s (internal) or hours (user-facing)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

import numpy as np


# ---------------------------------------------------------------------------
# Material / Component Definitions
# ---------------------------------------------------------------------------

@dataclass
class MaterialLayer:
    """
    A single homogeneous material layer in a building component.

    Attributes:
        name: Human-readable material name (e.g. "Common Burnt Brick").
        thermal_conductivity: k [W/(m·K)].
        density: ρ [kg/m³].
        specific_heat: cp [J/(kg·K)].
        thickness: d [m].
        solar_absorptivity: α [-], fraction of incident solar radiation
            absorbed by the exterior surface (only relevant for the
            outermost layer). Default 0.5.
    """

    name: str
    thermal_conductivity: float  # W/(m·K)
    density: float               # kg/m³
    specific_heat: float         # J/(kg·K)
    thickness: float             # m
    solar_absorptivity: float = 0.5


@dataclass
class WindowProperties:
    """
    Thermal and optical properties of a window / transparent opening.

    Attributes:
        u_value: Ufenestration [W/(m²·K)].  Includes frame.
        shgc: Solar Heat Gain Coefficient at normal incidence [-].
        area: Total fenestration area [m²].

    Reference: ASHRAE Fundamentals Ch. 15 (Fenestration).
    """

    u_value: float  # W/(m²·K)
    shgc: float     # dimensionless 0-1
    area: float     # m²


@dataclass
class DoorProperties:
    """
    Thermal properties of a door.

    Attributes:
        u_value: Overall U-value [W/(m²·K)].
        area: Door area [m²].
    """

    u_value: float  # W/(m²·K)
    area: float     # m²


# ---------------------------------------------------------------------------
# Shelter Description
# ---------------------------------------------------------------------------

@dataclass
class ShelterGeometry:
    """
    Physical dimensions and orientation of the shelter.

    The shelter is modelled as a rectangular box.

    Attributes:
        length: Along the longer axis [m].
        width: Along the shorter axis [m].
        height: Floor-to-ceiling [m].
        orientation: Azimuth of the *front wall* measured clockwise
            from geographic North [degrees].  0 = front faces North,
            90 = front faces East, 180 = front faces South, etc.
        window_area: Total glazed area [m²].
        door_area: Total door area [m²].
    """

    length: float  # m
    width: float   # m
    height: float  # m
    orientation: float = 0.0  # degrees from North, clockwise
    window_area: float = 0.0  # m²
    door_area: float = 0.0    # m²

    # ----- derived helpers (not stored, computed on access) -----

    @property
    def floor_area(self) -> float:
        """Floor area [m²]."""
        return self.length * self.width

    @property
    def volume(self) -> float:
        """Interior volume [m³]."""
        return self.length * self.width * self.height

    @property
    def roof_area(self) -> float:
        """Roof area [m²] (flat roof assumed)."""
        return self.length * self.width

    @property
    def gross_wall_area(self) -> float:
        """Total gross wall area (all 4 walls) [m²]."""
        perimeter = 2 * (self.length + self.width)
        return perimeter * self.height

    @property
    def net_wall_area(self) -> float:
        """Wall area minus windows and doors [m²]."""
        return max(0.0, self.gross_wall_area - self.window_area - self.door_area)

    def wall_areas_by_orientation(self) -> dict:
        """
        Return opaque wall area for each cardinal face.

        Returns dict with keys 'north', 'east', 'south', 'west',
        each containing the opaque wall area [m²] for that face.

        Windows and doors are subtracted proportionally from all faces.
        """
        front = self.length * self.height
        side = self.width * self.height
        gross_total = self.gross_wall_area
        opening_fraction = (
            (self.window_area + self.door_area) / gross_total
            if gross_total > 0 else 0.0
        )

        # Front wall faces self.orientation degrees from North
        # Walls in order: front, right, back, left
        azimuths = [
            self.orientation % 360,
            (self.orientation + 90) % 360,
            (self.orientation + 180) % 360,
            (self.orientation + 270) % 360,
        ]
        areas = [front, side, front, side]

        def _cardinal(azimuth: float) -> str:
            """Map azimuth to nearest cardinal direction."""
            if azimuth < 45 or azimuth >= 315:
                return "north"
            elif azimuth < 135:
                return "east"
            elif azimuth < 225:
                return "south"
            else:
                return "west"

        result = {"north": 0.0, "east": 0.0, "south": 0.0, "west": 0.0}
        for az, area in zip(azimuths, areas):
            direction = _cardinal(az)
            result[direction] += area * (1 - opening_fraction)

        return result


@dataclass
class ShelterMaterials:
    """
    Material stack-ups for each shelter component.

    Each component is a list of MaterialLayer ordered from
    **interior surface to exterior surface**.

    Attributes:
        wall_layers: Layer stack for opaque walls.
        roof_layers: Layer stack for the roof.
        floor_layers: Layer stack for the floor.
        window: Window thermal/optical properties.
        door: Door thermal properties.
    """

    wall_layers: List[MaterialLayer] = field(default_factory=list)
    roof_layers: List[MaterialLayer] = field(default_factory=list)
    floor_layers: List[MaterialLayer] = field(default_factory=list)
    window: WindowProperties = field(
        default_factory=lambda: WindowProperties(u_value=5.7, shgc=0.82, area=0.0)
    )
    door: DoorProperties = field(
        default_factory=lambda: DoorProperties(u_value=3.5, area=0.0)
    )


# ---------------------------------------------------------------------------
# Climate Data
# ---------------------------------------------------------------------------

@dataclass
class ClimateHourlyData:
    """
    Hourly climate arrays for a simulation period.

    All arrays must have the same length (n_hours).
    Radiation values are backward averages over the preceding hour
    (consistent with Open-Meteo convention).

    Attributes:
        outdoor_temperature: Tₒᵤₜ [°C].
        ghi: Global Horizontal Irradiance [W/m²].
        dni: Direct Normal Irradiance [W/m²].
        dhi: Diffuse Horizontal Irradiance [W/m²].
        wind_speed: At 10 m height [m/s].
        wind_direction: Azimuth [degrees], 0 = North.
        relative_humidity: [%].
        cloud_cover: [%], 0-100.
        surface_pressure: [hPa].
        dew_point: [°C].
        latitude: Site latitude [degrees].
        longitude: Site longitude [degrees].
    """

    outdoor_temperature: np.ndarray  # °C
    ghi: np.ndarray                  # W/m²
    dni: np.ndarray                  # W/m²
    dhi: np.ndarray                  # W/m²
    wind_speed: np.ndarray           # m/s
    wind_direction: np.ndarray       # degrees
    relative_humidity: np.ndarray    # %
    cloud_cover: np.ndarray          # %
    surface_pressure: np.ndarray     # hPa
    dew_point: np.ndarray            # °C
    latitude: float = 0.0           # degrees
    longitude: float = 0.0          # degrees

    @property
    def n_hours(self) -> int:
        """Number of simulation hours."""
        return len(self.outdoor_temperature)

    def validate(self) -> None:
        """Check that all arrays have consistent length."""
        n = self.n_hours
        arrays = [
            self.ghi, self.dni, self.dhi, self.wind_speed,
            self.wind_direction, self.relative_humidity,
            self.cloud_cover, self.surface_pressure, self.dew_point,
        ]
        for arr in arrays:
            if len(arr) != n:
                raise ValueError(
                    f"All climate arrays must have length {n}, "
                    f"but found array with length {len(arr)}"
                )


# ---------------------------------------------------------------------------
# Simulation Configuration
# ---------------------------------------------------------------------------

@dataclass
class SimulationConfig:
    """
    Tunable parameters for the simulation.

    Attributes:
        n_occupants: Number of people inside.
        heat_per_person: Sensible metabolic heat [W]. Default 75 W
            (ASHRAE Fundamentals Ch. 18, seated quiet / resting).
        ach: Air changes per hour [-]. Default 1.0 for a standard
            sealed modular shelter.
        indoor_temp_initial: Starting indoor temperature [°C].
        comfort_min: Lower bound of thermal comfort band [°C].
        comfort_max: Upper bound of thermal comfort band [°C].
        timestep_seconds: Simulation time step [s]. Default 3600 (1 h).
        ground_temperature: Simplified constant ground temp [°C].
            Used for floor conduction in Phase 1.
        ground_albedo: Ground reflectance [-]. Default 0.2.
        equipment_watts: Total equipment heat dissipation [W].
    """

    n_occupants: int = 10
    heat_per_person: float = 75.0      # W (sensible, ASHRAE)
    ach: float = 1.0                   # air changes per hour
    indoor_temp_initial: float = 20.0  # °C
    comfort_min: float = 18.0          # °C
    comfort_max: float = 25.0          # °C
    timestep_seconds: int = 3600       # s
    ground_temperature: float = 18.0   # °C
    ground_albedo: float = 0.20        # dimensionless
    equipment_watts: float = 0.0       # W


# ---------------------------------------------------------------------------
# Bundled Simulation Input
# ---------------------------------------------------------------------------

@dataclass
class SimulationInput:
    """Everything needed to run a simulation."""

    geometry: ShelterGeometry
    materials: ShelterMaterials
    climate: ClimateHourlyData
    config: SimulationConfig


# ---------------------------------------------------------------------------
# Simulation Output
# ---------------------------------------------------------------------------

@dataclass
class HourlyResult:
    """
    Thermal results for a single simulation hour.

    Sign convention:
        Gains  → positive (heat entering the shelter)
        Losses → positive in their own fields (heat leaving)
        net_heat_flow = (total gains) − (total losses)
    """

    hour: int
    indoor_temperature: float   # °C  — at end of this hour
    outdoor_temperature: float  # °C
    sol_air_temp_roof: float    # °C  — effective for roof
    sol_air_temp_wall: float    # °C  — average across walls
    solar_gain_opaque: float    # W   — via sol-air on walls/roof
    solar_gain_window: float    # W   — transmitted through glazing
    conduction_loss: float      # W   — through envelope (positive = leaving)
    ventilation_loss: float     # W   — air exchange (positive = leaving)
    internal_gain: float        # W   — occupants + equipment
    net_heat_flow: float        # W   — total into air node
    heating_demand: float       # W   — required to reach comfort_min
    cooling_demand: float       # W   — required to reach comfort_max


@dataclass
class SimulationOutput:
    """
    Complete output of an hourly simulation run.
    """

    hourly_results: List[HourlyResult]
    total_heating_requirement_kwh: float
    total_cooling_requirement_kwh: float
    peak_heating_load_w: float
    peak_cooling_load_w: float
    avg_indoor_temperature: float   # °C
    min_indoor_temperature: float   # °C
    max_indoor_temperature: float   # °C
    passive_comfort_hours: int      # hours within comfort band
    total_hours: int
    thermal_time_constant_hours: float  # τ in hours — for insight
