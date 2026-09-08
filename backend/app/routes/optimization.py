from fastapi import APIRouter, HTTPException

from app.models.schemas import OptimizationRequest
from app.services.climate_service import fetch_forecast
from app.services.simulation_service import simulate

router = APIRouter(tags=["optimization"])


@router.post("/optimize")
def optimize(request: OptimizationRequest):
    candidates = []
    try:
        # Every candidate must see identical weather; this also avoids making a
        # network request per candidate.
        climate = fetch_forecast(request.location.latitude, request.location.longitude)
        for thickness in request.insulation_options:
            for orientation in request.orientations:
                candidate = request.model_copy(deep=True)
                candidate.insulation_thickness = thickness
                candidate.shelter.orientation = orientation
                result = simulate(candidate, climate=climate)
                summary = result["summary"]
                candidates.append({
                    "insulation_thickness_m": thickness, "orientation_degrees": orientation,
                    "heating_requirement_kwh": summary["heating_requirement_kwh"],
                    "cooling_requirement_kwh": summary["cooling_requirement_kwh"],
                    "total_conditioning_kwh": round(summary["heating_requirement_kwh"] + summary["cooling_requirement_kwh"], 2),
                })
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=422 if isinstance(exc, ValueError) else 503, detail=str(exc)) from exc
    candidates.sort(key=lambda item: item["total_conditioning_kwh"])
    return {"objective": "Minimize 24-hour heating plus cooling energy", "recommended_design": candidates[0], "candidates": candidates}
