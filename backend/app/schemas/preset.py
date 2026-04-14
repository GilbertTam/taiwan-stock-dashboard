from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class PresetCreate(BaseModel):
    page_key: str = Field(..., pattern=r'^(forecast|weather|daily-compare)$')
    name: str = Field(..., min_length=1, max_length=100)
    data: Dict[str, Any]
    is_default: bool = False


class PresetUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    data: Optional[Dict[str, Any]] = None
    is_default: Optional[bool] = None


class PresetResponse(BaseModel):
    id: int
    page_key: str
    name: str
    data: Dict[str, Any]
    is_default: bool
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class PresetListResponse(BaseModel):
    presets: List[PresetResponse]
    count: int
