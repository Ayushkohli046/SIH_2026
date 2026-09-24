"""
Area-specific passive shelter auto-design API router.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.area_design_service import generate_area_specific_design

router = APIRouter(tags=["area-design"])


class AreaDesignRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    elevation: Optional[float] = Field(default=None)
    occupants: int = Field(default=8, ge=1, le=100)
    hours: int = Field(default=24, ge=1, le=168)


@router.post("/area-design")
def get_area_specific_design(request: AreaDesignRequest):
    """
    Automated Area-Specific Shelter Synthesis:
    Analyzes input latitude & longitude, pulls real-time Open-Meteo weather telemetry,
    determines the microclimate zone (Glacial, Cold-Sunny, Alpine-Humid, Arid-Desert, Composite),
    synthesizes optimal passive architecture (Trombe, Pod, Quonset, Badgir, Stilted, etc.),
    and simulates thermal performance vs an uninsulated baseline.
    """
    try:
        return generate_area_specific_design(
            latitude=request.latitude,
            longitude=request.longitude,
            elevation=request.elevation,
            occupants=request.occupants,
            hours=request.hours,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Area-specific shelter generation failed: {str(exc)}",
        ) from exc


@router.get("/area-design")
def get_area_specific_design_get(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    elevation: Optional[float] = Query(default=None),
    occupants: int = Query(default=8, ge=1, le=100),
    hours: int = Query(default=24, ge=1, le=168),
):
    try:
        return generate_area_specific_design(
            latitude=latitude,
            longitude=longitude,
            elevation=elevation,
            occupants=occupants,
            hours=hours,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Area-specific shelter generation failed: {str(exc)}",
        ) from exc
