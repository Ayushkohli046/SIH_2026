"""Stable, unit-explicit API models for the shelter designer."""

from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator


class Location(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class Shelter(BaseModel):
    length: float = Field(gt=0, le=100, description="metres")
    width: float = Field(gt=0, le=100, description="metres")
    height: float = Field(gt=0, le=20, description="metres")
    orientation: float = Field(default=0, ge=0, lt=360, description="degrees clockwise from north")
    occupants: int = Field(default=4, ge=0, le=100)
    ach: float = Field(default=1.0, ge=0.05, le=20, description="air changes per hour")


class Materials(BaseModel):
    wall: str
    roof: str
    floor: str
    insulation: str


class Openings(BaseModel):
    window_area: float = Field(default=0, ge=0, description="square metres")
    door_area: float = Field(default=0, ge=0, description="square metres")


class CustomMaterialSpec(BaseModel):
    """
    User-defined material layer — allows DRDO engineers to input proprietary
    or experimental material properties without modifying the catalogue.

    Attributes:
        name: Descriptive label (e.g. "DRDO Aerogel-v2 Blanket").
        conductivity: Thermal conductivity k [W/(m·K)].
        density: Bulk density ρ [kg/m³].
        specific_heat: Specific heat capacity cp [J/(kg·K)].
        thickness: Layer thickness d [m].
        solar_absorptivity: α [-], fraction of solar radiation absorbed (0–1).
    """

    name: str = Field(max_length=120, description="Material label")
    conductivity: float = Field(gt=0, le=10.0, description="k [W/(m·K)]")
    density: float = Field(gt=0, le=12000.0, description="ρ [kg/m³]")
    specific_heat: float = Field(gt=0, le=5000.0, description="cp [J/(kg·K)]")
    thickness: float = Field(gt=0, le=2.0, description="d [m]")
    solar_absorptivity: float = Field(default=0.6, ge=0.0, le=1.0, description="α [-]")


class SimulationRequest(BaseModel):
    location: Location
    shelter: Shelter
    materials: Materials
    insulation_thickness: float = Field(default=0.05, ge=0, le=0.5, description="metres")
    openings: Openings = Field(default_factory=Openings)
    hours: int = Field(default=24, ge=1, le=168, description="Simulation duration (hours). 24=1 day, 72=3 days, 168=7 days.")

    # Optional custom material overrides — when set, these replace the corresponding
    # catalogue material with user-specified properties (e.g., proprietary DRDO materials).
    custom_wall: Optional[CustomMaterialSpec] = Field(default=None, description="Custom wall/structural material")
    custom_insulation: Optional[CustomMaterialSpec] = Field(default=None, description="Custom insulation material")
    custom_floor: Optional[CustomMaterialSpec] = Field(default=None, description="Custom floor material")

    @model_validator(mode="after")
    def openings_fit_on_walls(self):
        wall_area = 2 * (self.shelter.length + self.shelter.width) * self.shelter.height
        if self.openings.window_area + self.openings.door_area > wall_area:
            raise ValueError("Window and door area cannot exceed gross wall area")
        return self


class ClimateRequest(Location):
    hours: int = Field(default=24, ge=1, le=168)


class OptimizationRequest(SimulationRequest):
    insulation_options: list[float] = Field(default=[0.05, 0.075, 0.1], min_length=1, max_length=10)
    orientations: list[Literal[0, 90, 180, 270]] = Field(default=[0, 90, 180, 270], min_length=1)
