from fastapi import APIRouter

from app.services.material_service import list_materials

router = APIRouter(tags=["materials"])


@router.get("/materials")
def get_materials():
    return {"materials": list_materials()}
