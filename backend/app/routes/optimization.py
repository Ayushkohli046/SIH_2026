from fastapi import APIRouter, HTTPException

from app.models.schemas import OptimizationRequest
from app.services.climate_service import fetch_forecast
from app.services.simulation_service import simulate

router = APIRouter(tags=["optimization"])


@router.post("/optimize")
def optimize(request: OptimizationRequest):
    """
    Engineering-Based Optimization and Design Comparison (Person 4).
    Evaluates multiple valid shelter configurations (orientation, insulation)
    against identical weather forecast to find the configuration that best
    minimizes 24-hour total conditioning energy.
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

        # 2. Evaluate all candidate engineering configurations
        for thickness in request.insulation_options:
            for orientation in request.orientations:
                candidate = request.model_copy(deep=True)
                candidate.insulation_thickness = thickness
                candidate.shelter.orientation = orientation
                result = simulate(candidate, climate=climate)
                summary = result["summary"]
                candidates.append({
                    "insulation_thickness_m": thickness,
                    "orientation_degrees": orientation,
                    "heating_requirement_kwh": summary["heating_requirement_kwh"],
                    "cooling_requirement_kwh": summary["cooling_requirement_kwh"],
                    "total_conditioning_kwh": round(summary["heating_requirement_kwh"] + summary["cooling_requirement_kwh"], 2),
                    "hourly": result["hourly"],
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
        "objective": "Minimize 24-hour heating plus cooling energy",
        "comparison": {
            "baseline_total_kwh": baseline_total_kwh,
            "recommended_total_kwh": recommended_total_kwh,
            "energy_saved_kwh": energy_saved_kwh,
            "energy_saved_percentage": energy_saved_percentage,
            "is_improved": recommended_total_kwh < baseline_total_kwh,
            "baseline_hourly": baseline_result["hourly"],
            "recommended_hourly": recommended["hourly"]
        },
        "recommended_design": recommended,
        "candidates": [
            {k: v for k, v in c.items() if k != "hourly"} for c in candidates
        ]
    }
