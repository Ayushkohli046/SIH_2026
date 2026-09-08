from fastapi import APIRouter, HTTPException

from app.models.schemas import ClimateRequest
from app.services.climate_service import climate_payload, fetch_forecast

router = APIRouter(tags=["climate"])


@router.get("/climate")
def get_climate(latitude: float, longitude: float, hours: int = 24):
    request = ClimateRequest(latitude=latitude, longitude=longitude, hours=hours)
    try:
        return climate_payload(fetch_forecast(request.latitude, request.longitude, request.hours))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
