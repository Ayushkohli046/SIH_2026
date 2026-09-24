"""
Area-Specific Microclimate Intelligence and Automated Passive Shelter Synthesis Service.

Analyzes location coordinates, elevation, and real-time Open-Meteo meteorological telemetry
to classify the climate zone according to NBC / Indian Defense Standards and automatically
synthesizes the optimal passive architectural shelter design.
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional
import numpy as np

from app.models.schemas import SimulationRequest, Location, Shelter, Materials, Openings
from app.services.climate_service import fetch_forecast, climate_payload
from app.services.simulation_service import simulate
from app.routes.optimization import compute_logistics_and_fuel


def classify_microclimate(
    lat: float,
    lon: float,
    elevation: Optional[float],
    t_min: float,
    t_max: float,
    t_mean: float,
    peak_ghi: float,
    mean_rh: float,
    max_wind: float,
) -> Dict[str, Any]:
    """
    Classifies the microclimate into one of 5 distinct defense/civilian operational zones.
    """
    # 1. Extreme Arctic Glacier / Permafrost (Siachen, Karakoram, Dras winter, extreme high altitude)
    if (lat >= 35.0 and (elevation is None or elevation >= 3800)) or t_min <= -12.0 or (t_mean <= -3.0 and (elevation or 3000) >= 3200):
        return {
            "zone_id": "arctic_glacier",
            "zone_name": "Extreme High-Altitude Glacial & Permafrost Zone",
            "theatre": "siachen",
            "archetype": "arctic_pod",
            "archetype_title": "Siachen Aero-Ridge Composite Pod",
            "terrain_desc": "Sub-Zero Glacier Moraine & Permafrost Ground",
            "camo": "Arctic Snow White / Camo",
            "albedo": 0.80,
            "ground_temp": -5.0,
            "threats": ["Severe sub-zero blizzard (-20°C to -45°C)", "High katabatic wind chill", "Permafrost thermal sink"],
            "passive_principles": [
                "Aerodynamic low-drag cross section to divert 200+ km/h katabatic winds",
                "Stilted foundation with thermal-break pilings to eliminate permafrost thaw conduction",
                "Super-insulated 100mm Aerogel blanket + PUF composite sandwich (U < 0.16 W/m²K)",
                "55° steep bi-facial solar roof providing continuous self-clearing snow shedding and solar gain",
                "Airlock double-door vestibule to prevent cold air ingress during entry/exit",
            ],
            "defaults": {
                "length": 8.0,
                "width": 6.0,
                "height": 2.8,
                "orientation": 180,
                "wall": "pu_sandwich",
                "roof": "pu_sandwich",
                "floor": "concrete",
                "insulation": "aerogel",
                "insulation_thickness": 0.10,
                "window_area": 3.2,
                "door_area": 1.8,
                "ach": 0.35,
            },
        }

    # 2. High-Altitude Cold & Sunny Desert (Ladakh, Leh, Spiti, Chushul, Nyoma, Pangong, Kargil)
    elif (lat >= 32.5 and (elevation or 3000) >= 2800) or (t_mean <= 12.0 and peak_ghi >= 600 and mean_rh <= 50):
        return {
            "zone_id": "cold_sunny_desert",
            "zone_name": "High-Altitude Cold & High-Solar Desert",
            "theatre": "ladakh",
            "archetype": "trombe_wall",
            "archetype_title": "Ladakh Solaris Trombe Wall & Direct-Gain Solarium",
            "terrain_desc": "High-Altitude Cold Mountain Bedrock & Loose Loam",
            "camo": "Mountain Olive / Earth Khaki",
            "albedo": 0.28,
            "ground_temp": 6.0,
            "threats": ["Sub-zero nights (-10°C to -25°C)", "Extreme diurnal temperature swing (25°C+)", "Intense UV radiation"],
            "passive_principles": [
                "Heavy-mass South Trombe wall absorbing direct solar flux with 8-10 hour nighttime thermal lag",
                "Attached glazed solar greenhouse buffer space pre-heating incoming ventilation air",
                "High thermal mass structural envelope (Burnt Brick / Rammed Earth) storing daytime heat",
                "External 80mm EPS insulation envelope preventing nocturnal radiative cooling losses",
                "Optimized south-facing fenestration capturing 800+ W/m² peak solar irradiance",
            ],
            "defaults": {
                "length": 10.0,
                "width": 7.5,
                "height": 3.0,
                "orientation": 180,
                "wall": "burnt_brick",
                "roof": "concrete",
                "floor": "concrete",
                "insulation": "eps",
                "insulation_thickness": 0.08,
                "window_area": 6.5,
                "door_area": 2.0,
                "ach": 0.60,
            },
        }

    # 3. Alpine Cold & Humid / High Precipitation (Tawang, Bomdila, Kibithu, Sikkim, Eastern Himalayas)
    elif (lat >= 26.5 and lon >= 88.0 and (elevation or 1500) >= 1500) or (t_mean <= 15.0 and mean_rh >= 65):
        return {
            "zone_id": "alpine_humid",
            "zone_name": "Alpine Cold & High-Precipitation Cloud Zone",
            "theatre": "ladakh", # fallback visual asset group
            "archetype": "stilted_pavilion",
            "archetype_title": "Eastern Himalayan Stilted Alpine Pavilion",
            "terrain_desc": "Damp Alpine Slope, Saturated Loam & High Snow/Rainfall",
            "camo": "Jungle Camo / Alpine Green",
            "albedo": 0.20,
            "ground_temp": 10.0,
            "threats": ["High atmospheric moisture & condensation", "Frequent snow/rain accumulation", "Damp ground heat leakage"],
            "passive_principles": [
                "Raised stilted timber-composite pilings keeping shelter base above damp ground and snow drift",
                "Steep 45° dual-slope roof for rapid snow shedding and rainwater diversion",
                "Continuous internal vapor barrier preventing condensation inside insulated layers",
                "Rockwool / Mineral wool insulation (75mm) providing fire-resistance and acoustic damping",
                "Protected covered porch entry buffering driving alpine rain and wind",
            ],
            "defaults": {
                "length": 9.0,
                "width": 7.0,
                "height": 3.2,
                "orientation": 180,
                "wall": "pu_sandwich",
                "roof": "pu_sandwich",
                "floor": "concrete",
                "insulation": "mineral_wool",
                "insulation_thickness": 0.075,
                "window_area": 4.8,
                "door_area": 2.0,
                "ach": 0.75,
            },
        }

    # 4. Hot & Arid Desert (Thar Desert, Longewala, Jaisalmer, Tanot, Bikaner, Barmer)
    elif (lat <= 30.5 and lon <= 76.0 and t_max >= 34.0) or (t_mean >= 27.0 and mean_rh <= 45):
        return {
            "zone_id": "hot_arid_desert",
            "zone_name": "Hot & Arid Desert Thermal Radiation Zone",
            "theatre": "thar",
            "archetype": "badgir_windtower",
            "archetype_title": "Thar Badgir Wind-Master & Subterranean Earth Loop",
            "terrain_desc": "Scorching Silica Sand Dunes & High Solar Reflectance",
            "camo": "Desert Khaki / Sand Camo",
            "albedo": 0.38,
            "ground_temp": 30.0,
            "threats": ["Extreme daytime temperatures (42°C to 48°C)", "Intense solar radiation (>950 W/m²)", "Blowing dust & sand"],
            "passive_principles": [
                "Dual-catchment Badgir wind tower inducing natural convective night-purge air flushing",
                "Subterranean Earth-Air Heat Exchanger (EAHE) delivering cool air from 3m underground",
                "Double-skin ventilated solar shading canopy eliminating direct roof solar radiation",
                "High thermal inertia AAC block walls dampening daytime heat wave penetration",
                "Deeply recessed shaded windows oriented away from intense East/West low-angle sun",
            ],
            "defaults": {
                "length": 10.0,
                "width": 8.0,
                "height": 3.4,
                "orientation": 0,
                "wall": "aac_block",
                "roof": "concrete",
                "floor": "concrete",
                "insulation": "mineral_wool",
                "insulation_thickness": 0.05,
                "window_area": 3.0,
                "door_area": 2.0,
                "ach": 1.5,
            },
        }

    # 5. Composite / Temperate / Plains (Delhi, Punjab, Central India, Lower Foothills)
    else:
        return {
            "zone_id": "composite_plains",
            "zone_name": "Composite Multi-Season Variable Zone",
            "theatre": "temperate",
            "archetype": "solarium_sunspace",
            "archetype_title": "Multi-Season Dynamic Hybrid Passive Shelter",
            "terrain_desc": "Alluvial Plains & Moderate Soil Density",
            "camo": "Field Olive / Urban Khaki",
            "albedo": 0.22,
            "ground_temp": 20.0,
            "threats": ["Chilly winter nights (4°C–8°C)", "Hot summer afternoons (38°C–42°C)", "Seasonal variation"],
            "passive_principles": [
                "Engineered roof overhangs calculating seasonal solar zenith to shade summer sun while capturing low winter sun",
                "Operable cross-ventilation dampers enabling natural evening cooling in summer",
                "Balanced 50mm EPS envelope providing year-round thermal damping with low embodied mass",
                "Dual-aspect windows allowing natural daylighting while controlling peak glare",
            ],
            "defaults": {
                "length": 10.0,
                "width": 8.0,
                "height": 3.0,
                "orientation": 180,
                "wall": "aac_block",
                "roof": "concrete",
                "floor": "concrete",
                "insulation": "eps",
                "insulation_thickness": 0.05,
                "window_area": 5.0,
                "door_area": 2.0,
                "ach": 1.0,
            },
        }


def generate_area_specific_design(
    latitude: float,
    longitude: float,
    elevation: Optional[float] = None,
    occupants: int = 8,
    hours: int = 24,
) -> Dict[str, Any]:
    """
    Fetches real-time climate data for the given coordinates, classifies the climate,
    synthesizes the area-specific optimal shelter configuration, and runs a comprehensive
    simulation comparing the uninsulated baseline vs the recommended area-specific design.
    """
    climate = fetch_forecast(latitude, longitude, hours=hours)
    
    t_out = climate.outdoor_temperature
    ghi = climate.ghi
    rh = climate.relative_humidity
    wind = climate.wind_speed

    t_min = float(np.min(t_out))
    t_max = float(np.max(t_out))
    t_mean = float(np.mean(t_out))
    diurnal_range = float(t_max - t_min)
    peak_ghi = float(np.max(ghi))
    daily_solar_insolation = float(np.sum(ghi) / 1000.0) # kWh/m²
    mean_rh = float(np.mean(rh))
    max_wind = float(np.max(wind))

    classification = classify_microclimate(
        lat=latitude,
        lon=longitude,
        elevation=elevation,
        t_min=t_min,
        t_max=t_max,
        t_mean=t_mean,
        peak_ghi=peak_ghi,
        mean_rh=mean_rh,
        max_wind=max_wind,
    )

    defs = classification["defaults"]

    # 1. Build Recommended Area-Specific Design Request
    recommended_request = SimulationRequest(
        location=Location(latitude=latitude, longitude=longitude),
        shelter=Shelter(
            length=defs["length"],
            width=defs["width"],
            height=defs["height"],
            orientation=defs["orientation"],
            occupants=occupants,
            ach=defs["ach"],
        ),
        materials=Materials(
            wall=defs["wall"],
            roof=defs["roof"],
            floor=defs["floor"],
            insulation=defs["insulation"],
        ),
        insulation_thickness=defs["insulation_thickness"],
        openings=Openings(
            window_area=defs["window_area"],
            door_area=defs["door_area"],
        ),
        hours=hours,
    )

    # 2. Build Uninsulated / Sub-optimal Baseline Design Request for contrast
    baseline_request = SimulationRequest(
        location=Location(latitude=latitude, longitude=longitude),
        shelter=Shelter(
            length=defs["length"],
            width=defs["width"],
            height=defs["height"],
            orientation=0, # Non-optimized orientation
            occupants=occupants,
            ach=1.5, # Leaky baseline
        ),
        materials=Materials(
            wall="concrete" if classification["zone_id"] != "arctic_glacier" else "pu_sandwich",
            roof="concrete" if classification["zone_id"] != "arctic_glacier" else "pu_sandwich",
            floor="concrete",
            insulation="eps",
        ),
        insulation_thickness=0.01, # Minimal 10mm insulation
        openings=Openings(
            window_area=defs["window_area"],
            door_area=defs["door_area"],
        ),
        hours=hours,
    )

    # Run simulations
    rec_sim_output = simulate(recommended_request, climate=climate)
    base_sim_output = simulate(baseline_request, climate=climate)

    rec_summary = rec_sim_output["summary"]
    base_summary = base_sim_output["summary"]

    rec_indoor_temps = rec_sim_output.get("hourly", {}).get("indoor_temperature", [])
    base_indoor_temps = base_sim_output.get("hourly", {}).get("indoor_temperature", [])

    rec_min_temp = float(min(rec_indoor_temps)) if rec_indoor_temps else 0.0
    rec_max_temp = float(max(rec_indoor_temps)) if rec_indoor_temps else 0.0
    base_min_temp = float(min(base_indoor_temps)) if base_indoor_temps else 0.0
    base_max_temp = float(max(base_indoor_temps)) if base_indoor_temps else 0.0

    rec_total_kwh = float(rec_summary["heating_requirement_kwh"] + rec_summary["cooling_requirement_kwh"])
    base_total_kwh = float(base_summary["heating_requirement_kwh"] + base_summary["cooling_requirement_kwh"])

    logistics = compute_logistics_and_fuel(recommended_request, rec_total_kwh, base_total_kwh)
    base_logistics = compute_logistics_and_fuel(baseline_request, base_total_kwh, base_total_kwh)

    energy_reduction_pct = (
        round(((base_total_kwh - rec_total_kwh) / max(0.01, base_total_kwh)) * 100, 1)
        if base_total_kwh > 0 else 0.0
    )

    return {
        "location": {
            "latitude": latitude,
            "longitude": longitude,
            "elevation": elevation or 0,
        },
        "climate_telemetry": {
            "t_min_c": round(t_min, 1),
            "t_max_c": round(t_max, 1),
            "t_mean_c": round(t_mean, 1),
            "diurnal_range_c": round(diurnal_range, 1),
            "peak_solar_ghi_w_m2": round(peak_ghi, 1),
            "daily_solar_insolation_kwh_m2": round(daily_solar_insolation, 2),
            "mean_rh_pct": round(mean_rh, 1),
            "max_wind_km_h": round(max_wind, 1),
        },
        "classification": classification,
        "recommended_design": {
            "shelter_dimensions": {
                "length_m": defs["length"],
                "width_m": defs["width"],
                "height_m": defs["height"],
                "floor_area_m2": round(defs["length"] * defs["width"], 1),
                "volume_m3": round(defs["length"] * defs["width"] * defs["height"], 1),
            },
            "orientation_deg": defs["orientation"],
            "materials": {
                "wall": defs["wall"],
                "roof": defs["roof"],
                "floor": defs["floor"],
                "insulation": defs["insulation"],
                "insulation_thickness_mm": int(defs["insulation_thickness"] * 1000),
            },
            "openings": {
                "window_area_m2": defs["window_area"],
                "door_area_m2": defs["door_area"],
            },
            "ach": defs["ach"],
            "occupants": occupants,
        },
        "performance_comparison": {
            "energy_reduction_percent": energy_reduction_pct,
            "recommended": {
                "heating_kwh": round(rec_summary["heating_requirement_kwh"], 2),
                "cooling_kwh": round(rec_summary["cooling_requirement_kwh"], 2),
                "comfort_hours": rec_summary["passive_comfort_hours"],
                "total_hours": rec_summary["total_hours"],
                "avg_indoor_temp_c": round(rec_summary["average_indoor_temperature_c"], 1),
                "min_indoor_temp_c": round(rec_min_temp, 1),
                "max_indoor_temp_c": round(rec_max_temp, 1),
                "u_wall": rec_sim_output["physics"]["u_wall"],
                "u_roof": rec_sim_output["physics"]["u_roof"],
                "logistics": logistics,
            },
            "baseline": {
                "heating_kwh": round(base_summary["heating_requirement_kwh"], 2),
                "cooling_kwh": round(base_summary["cooling_requirement_kwh"], 2),
                "comfort_hours": base_summary["passive_comfort_hours"],
                "total_hours": base_summary["total_hours"],
                "avg_indoor_temp_c": round(base_summary["average_indoor_temperature_c"], 1),
                "min_indoor_temp_c": round(base_min_temp, 1),
                "max_indoor_temp_c": round(base_max_temp, 1),
                "u_wall": base_sim_output["physics"]["u_wall"],
                "u_roof": base_sim_output["physics"]["u_roof"],
                "logistics": base_logistics,
            },
        },
        "simulation_hourly": rec_sim_output["hourly"],
        "simulation_physics": rec_sim_output["physics"],
    }
