"""
Material sweep: evaluate all wall × insulation combinations under identical weather.

Answers the problem statement requirement:
    "comparative analysis with different materials under same ambient condition
     to predict the most efficient combination of materials"

Wall candidates:  burnt_brick, concrete, aac_block, pu_sandwich
Insulation candidates: eps, mineral_wool, aerogel

Total: 4 × 3 = 12 combinations evaluated against the same live weather forecast.
"""

from fastapi import APIRouter, HTTPException

from app.models.schemas import SimulationRequest
from app.services.climate_service import fetch_forecast
from app.services.material_service import MATERIALS
from app.services.simulation_service import simulate

router = APIRouter(tags=["material_sweep"])

WALL_CANDIDATES = ["burnt_brick", "concrete", "aac_block", "pu_sandwich"]
INSULATION_CANDIDATES = ["eps", "mineral_wool", "aerogel"]


@router.post("/material-sweep")
def material_sweep(request: SimulationRequest):
    """
    Run all wall × insulation material combinations against identical weather
    and return results ranked by minimum conditioning energy.

    Ensures fair comparison: every candidate sees the same live weather forecast.
    """
    results = []
    hours = getattr(request, "hours", 24)

    try:
        # Fetch weather once — all 12 candidates see the same forecast
        climate = fetch_forecast(request.location.latitude, request.location.longitude, hours)

        for wall_id in WALL_CANDIDATES:
            for ins_id in INSULATION_CANDIDATES:
                candidate = request.model_copy(deep=True)
                candidate.materials.wall = wall_id
                candidate.materials.roof = wall_id  # symmetric: roof = wall material
                candidate.materials.insulation = ins_id
                # Clear any custom material overrides so we compare catalogue materials
                candidate.custom_wall = None       # type: ignore[attr-defined]
                candidate.custom_insulation = None  # type: ignore[attr-defined]

                result = simulate(candidate, climate=climate)
                summary = result["summary"]
                physics = result.get("physics", {})

                total_kwh = round(
                    summary["heating_requirement_kwh"] + summary["cooling_requirement_kwh"], 2
                )

                results.append(
                    {
                        "wall_id": wall_id,
                        "wall_name": MATERIALS[wall_id]["name"],
                        "insulation_id": ins_id,
                        "insulation_name": MATERIALS[ins_id]["name"],
                        "insulation_k": MATERIALS[ins_id]["conductivity"],
                        "u_wall": physics.get("u_wall"),
                        "r_wall": physics.get("r_wall"),
                        "u_roof": physics.get("u_roof"),
                        "thermal_mass_kj_k": physics.get("thermal_mass_kj_k"),
                        "heating_kwh": summary["heating_requirement_kwh"],
                        "cooling_kwh": summary["cooling_requirement_kwh"],
                        "total_kwh": total_kwh,
                        "passive_comfort_hours": summary["passive_comfort_hours"],
                        "avg_indoor_temp_c": summary["average_indoor_temperature_c"],
                        "thermal_time_constant_h": physics.get("thermal_time_constant_h"),
                    }
                )

    except (RuntimeError, ValueError) as exc:
        raise HTTPException(
            status_code=422 if isinstance(exc, ValueError) else 503,
            detail=str(exc),
        ) from exc

    # Rank by minimum total conditioning energy
    results.sort(key=lambda x: x["total_kwh"])
    for i, r in enumerate(results):
        r["rank"] = i + 1

    max_kwh = results[-1]["total_kwh"] if results else 1.0
    for r in results:
        r["bar_pct"] = round(r["total_kwh"] / max(max_kwh, 0.001) * 100, 1)

    return {
        "sweep_count": len(results),
        "wall_candidates": WALL_CANDIDATES,
        "insulation_candidates": INSULATION_CANDIDATES,
        "hours_simulated": hours,
        "winner": results[0] if results else None,
        "results": results,
    }
