from typing import Any
from fastapi import APIRouter, Depends
from app.core.constants import AREA_ORDER, AREA_EN_CH_MAP, AREA_EN_JP_MAP
from app.api.v1.auth import get_current_active_user

router = APIRouter()

@router.get("", response_model=Any)
async def list_areas(current_user: Any = Depends(get_current_active_user)):
    """
    Get list of electricity areas.
    """
    areas = []
    for idx, area_en in enumerate(AREA_ORDER):
        areas.append({
            "id": idx + 1,
            "name": area_en,
            "name_ch": AREA_EN_CH_MAP.get(area_en, ""),
            "name_jp": AREA_EN_JP_MAP.get(area_en, "")
        })
    return {
        "result": "Success",
        "code": 0,
        "data": areas
    }
