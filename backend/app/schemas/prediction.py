from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, ConfigDict

class PredictionResult(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    id: str
    model_name: str
    trade_date: str
    time_code: int
    calculating_date: str
    area_name: str
    area_name_ch: str
    area_name_jp: str
    price_5: Optional[float]
    price_50: float
    price_95: Optional[float]
    additional_data: Optional[Dict[str, Any]]

class PredictionResponse(BaseModel):
    result: List[Dict[str, str]]
    code: int
    count: Optional[int]
    data: List[PredictionResult]

class CalculatingDate(BaseModel):
    calculating_date: str

class AvailableModel(BaseModel):
    id: str
    name: str
    description: str
    created_at: str
    updated_at: str
