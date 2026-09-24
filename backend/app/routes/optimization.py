import math
from fastapi import APIRouter, HTTPException

from app.models.schemas import OptimizationRequest
from app.services.climate_service import fetch_forecast
from app.services.material_service import MATERIALS
from app.services.simulation_service import simulate

router = APIRouter(tags=["optimization"])


def compute_logistics_and_fuel(shelter_req, total_conditioning_kwh: float, baseline_total_kwh: float) -> dict:
    """
    Computes real-life high-altitude military defense metrics:
    1. Envelope Mass (kg) based on material layers & areas.
    2. Helicopter Airlift Sorties (Cheetah / Dhruv ALH payload limit ~400 kg at 15,000+ ft).
    3. Annual heating fuel saved (K-2 kerosene / diesel in military Bukhari stoves).
    4. Defense logistics cost saved (airdropped fuel to Siachen/Ladakh ~ ₹1,800/liter).
    5. CO2 emissions avoided.
    """
    L = shelter_req.shelter.length
    W = shelter_req.shelter.width
    H = shelter_req.shelter.height
    A_win = shelter_req.openings.window_area
    A_door = shelter_req.openings.door_area
    A_wall = max(0.0, 2 * (L + W) * H - (A_win + A_door))
    A_roof = L * W
    A_floor = L * W

    rho_wall = MATERIALS.get(shelter_req.materials.wall, {}).get("density", 1700)
    rho_roof = MATERIALS.get(shelter_req.materials.roof, {}).get("density", 2300)
    rho_floor = MATERIALS.get(shelter_req.materials.floor, {}).get("density", 2300)
    rho_ins = MATERIALS.get(shelter_req.materials.insulation, {}).get("density", 30)

    t_wall = 0.20
    t_roof = 0.15
    t_floor = 0.15
    t_ins = shelter_req.insulation_thickness

    m_wall = A_wall * (t_wall * rho_wall + t_ins * rho_ins)
    m_roof = A_roof * (t_roof * rho_roof + t_ins * rho_ins)
    m_floor = A_floor * (t_floor * rho_floor)
    total_mass_kg = round(m_wall + m_roof + m_floor, 1)

    heli_sorties = math.ceil(total_mass_kg / 400.0)

    # Cold military theatres face ~180 active heating days per year.
    # 1 L diesel / K-2 kerosene delivers ~7.0 kWh effective heat in military stoves.
    daily_saved_kwh = max(0.0, baseline_total_kwh - total_conditioning_kwh)
    annual_diesel_saved_liters = round((daily_saved_kwh * 180.0) / 7.0, 1)
    
    # High-altitude airdrop fuel logistics cost ≈ ₹1,800/L (aviation turbine fuel + recovery)
    annual_inr_saved = round(annual_diesel_saved_liters * 1800.0, 2)
    co2_tons_avoided = round((annual_diesel_saved_liters * 2.68) / 1000.0, 2)

    return {
        "envelope_mass_kg": total_mass_kg,
        "helicopter_sorties": heli_sorties,
        "annual_diesel_saved_liters": annual_diesel_saved_liters,
        "annual_cost_saved_inr": annual_inr_saved,
        "annual_cost_saved_lakhs": round(annual_inr_saved / 100000.0, 2),
        "co2_tons_avoided": co2_tons_avoided,
    }


@router.post("/optimize")
def optimize(request: OptimizationRequest):
    """
    Engineering-Based Optimization and Design Comparison (Person 4).
    Evaluates multiple valid shelter configurations (orientation, insulation)
    against identical weather forecast to find the configuration that best
    minimizes 24-hour total conditioning energy and logistical mass.
    Compares recommended design against the baseline design.
    """
    candidates = []
    try:
        # Fetch weather once so every candidate sees identical weather
        climate = fetch_forecast(request.location.latitude, request.location.longitude)

        # 1. Simulate the user's initial baseline design for engineering comparison
        baseline_result = simulate(request, climate=climate)
        baseline_summary = baseline_result["summary"]
        baseline_total_kwh = round(
            baseline_summary["heating_requirement_kwh"] + baseline_summary["cooling_requirement_kwh"], 2
        )
        baseline_logistics = compute_logistics_and_fuel(request, baseline_total_kwh, baseline_total_kwh)

        # 2. Evaluate all candidate engineering configurations
        for thickness in request.insulation_options:
            for orientation in request.orientations:
                candidate = request.model_copy(deep=True)
                candidate.insulation_thickness = thickness
                candidate.shelter.orientation = orientation
                result = simulate(candidate, climate=climate)
                summary = result["summary"]
                total_cond_kwh = round(summary["heating_requirement_kwh"] + summary["cooling_requirement_kwh"], 2)
                
                logistics = compute_logistics_and_fuel(candidate, total_cond_kwh, baseline_total_kwh)

                candidates.append({
                    "insulation_thickness_m": thickness,
                    "orientation_degrees": orientation,
                    "heating_requirement_kwh": summary["heating_requirement_kwh"],
                    "cooling_requirement_kwh": summary["cooling_requirement_kwh"],
                    "total_conditioning_kwh": total_cond_kwh,
                    "hourly": result["hourly"],
                    **logistics,
                })
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=422 if isinstance(exc, ValueError) else 503, detail=str(exc)) from exc

    # Rank candidates by lowest energy consumption
    candidates.sort(key=lambda item: item["total_conditioning_kwh"])
    recommended = candidates[0]
    recommended_total_kwh = recommended["total_conditioning_kwh"]

    # 3. Engineering Design Comparison: calculate energy savings
    if baseline_total_kwh > 0:
        energy_saved_kwh = round(baseline_total_kwh - recommended_total_kwh, 2)
        energy_saved_percentage = round((energy_saved_kwh / baseline_total_kwh) * 100, 2)
    else:
        energy_saved_kwh = 0.0
        energy_saved_percentage = 0.0

    return {
        "objective": "Minimize 24-hour heating/cooling energy subject to high-altitude logistics payload",
        "comparison": {
            "baseline_total_kwh": baseline_total_kwh,
            "recommended_total_kwh": recommended_total_kwh,
            "energy_saved_kwh": energy_saved_kwh,
            "energy_saved_percentage": energy_saved_percentage,
            "is_improved": recommended_total_kwh < baseline_total_kwh,
            "baseline_logistics": baseline_logistics,
            "recommended_logistics": {
                "envelope_mass_kg": recommended["envelope_mass_kg"],
                "helicopter_sorties": recommended["helicopter_sorties"],
                "annual_diesel_saved_liters": recommended["annual_diesel_saved_liters"],
                "annual_cost_saved_lakhs": recommended["annual_cost_saved_lakhs"],
                "co2_tons_avoided": recommended["co2_tons_avoided"],
            },
            "baseline_hourly": baseline_result["hourly"],
            "recommended_hourly": recommended["hourly"],
        },
        "recommended_design": recommended,
        "candidates": [
            {k: v for k, v in c.items() if k != "hourly"} for c in candidates
        ]
    }
