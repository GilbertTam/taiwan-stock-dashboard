from typing import Any, Dict
from pydantic import BaseModel


class UserPreferencesResponse(BaseModel):
    data: Dict[str, Any]


class UserPreferencesUpdate(BaseModel):
    data: Dict[str, Any]
