"""
Smart Passive Shelter — Thermal Simulation Engine

A physics-based, hourly thermal simulation for passive shelters.
Every equation is sourced from ASHRAE Fundamentals, ISO 6946/13790,
or peer-reviewed engineering references.

Public API:
    run_simulation(input: SimulationInput) -> SimulationOutput
"""

from .models import (
    MaterialLayer,
    WindowProperties,
    ShelterGeometry,
    ShelterMaterials,
    ClimateHourlyData,
    SimulationConfig,
    SimulationInput,
    HourlyResult,
    SimulationOutput,
)

from .simulation import run_simulation

__all__ = [
    # Data models
    "MaterialLayer",
    "WindowProperties",
    "ShelterGeometry",
    "ShelterMaterials",
    "ClimateHourlyData",
    "SimulationConfig",
    "SimulationInput",
    "HourlyResult",
    "SimulationOutput",
    # Public API
    "run_simulation",
]
