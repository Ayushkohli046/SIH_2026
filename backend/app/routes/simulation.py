from fastapi import APIRouter, HTTPException

from app.models.schemas import SimulationRequest
from app.services.simulation_service import simulate

router = APIRouter(tags=["simulation"])


@router.post("/simulate")
def run(request: SimulationRequest):
    try:
        return {"simulation": simulate(request)}
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=422 if isinstance(exc, ValueError) else 503, detail=str(exc)) from exc
