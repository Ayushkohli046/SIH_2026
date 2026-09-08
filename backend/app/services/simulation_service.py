"""Translation between public API data and the thermal-engine dataclasses."""

from app.models.schemas import SimulationRequest
from app.services.climate_service import fetch_forecast
from app.services.material_service import make_layer
from app.thermal.models import (
    DoorProperties, ShelterGeometry, ShelterMaterials, SimulationConfig,
    SimulationInput, WindowProperties,
)
from app.thermal.simulation import run_simulation


def build_simulation_input(request: SimulationRequest, hours: int = 24, climate=None) -> SimulationInput:
    climate = climate or fetch_forecast(request.location.latitude, request.location.longitude, hours)
    geometry = ShelterGeometry(
        length=request.shelter.length, width=request.shelter.width, height=request.shelter.height,
        orientation=request.shelter.orientation, window_area=request.openings.window_area,
        door_area=request.openings.door_area,
    )
    # Layers are deliberately ordered interior -> exterior, as required by the
    # capacitance model. The exterior insulation is light-coloured by default.
    materials = ShelterMaterials(
        wall_layers=[make_layer(request.materials.wall, 0.20),
                     make_layer(request.materials.insulation, request.insulation_thickness, absorptivity=0.30)],
        roof_layers=[make_layer(request.materials.roof, 0.15),
                     make_layer(request.materials.insulation, request.insulation_thickness, absorptivity=0.30)],
        floor_layers=[make_layer(request.materials.floor, 0.15)],
        window=WindowProperties(u_value=5.7, shgc=0.82, area=request.openings.window_area),
        door=DoorProperties(u_value=3.5, area=request.openings.door_area),
    )
    config = SimulationConfig(n_occupants=request.shelter.occupants, ach=request.shelter.ach)
    return SimulationInput(geometry=geometry, materials=materials, climate=climate, config=config)


def serialize_output(output) -> dict:
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


def simulate(request: SimulationRequest, hours: int = 24, climate=None) -> dict:
    return serialize_output(run_simulation(build_simulation_input(request, hours, climate)))
