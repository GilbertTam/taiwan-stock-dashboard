from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel

class SpotTrade(BaseModel):
    id: str
    trade_date: str
    time_code: int
    name: str # area name (en)
    name_ch: str
    name_jp: str
    price: float
    sell_quantity: float
    buy_quantity: float
    contract_quantity: float
    system_price: float
    avoidable_cost: float

class Imbalance(BaseModel):
    datetime: str
    area: str
    # Add other fields as needed based on ES data
    class Config:
        extra = "allow"

class HjksOutage(BaseModel):
    start_datetime: str
    end_datetime: str
    area: str
    company_code: str
    company_name: str
    power_plant_name: str
    capacity: float
    reason: str
    class Config:
        extra = "allow"

class InterconnectionFlow(BaseModel):
    datetime: str
    interconnection_name: str
    flow: float
    limit: float
    margin: float
    class Config:
        extra = "allow"

class Intraday(BaseModel):
    datetime: str
    area: str
    price_open: float
    price_high: float
    price_low: float
    price_close: float
    volume: float
    class Config:
        extra = "allow"

class Earthquake(BaseModel):
    event_datetime: str
    location: str
    magnitude: float
    intensity: str
    class Config:
        extra = "allow"

class OcctoArea(BaseModel):
    datetime: str
    area: str
    generation: Dict[str, float]
    demand: float
    class Config:
        extra = "allow"

class OcctoInter(BaseModel):
    datetime: str
    interconnection_name: str
    flow: float
    class Config:
        extra = "allow"

class OcctoEvent(BaseModel):
    datetime: str
    event_type: str
    message: str
    class Config:
        extra = "allow"

class Tdgc(BaseModel):
    datetime: str
    price: float
    volume: float
    class Config:
        extra = "allow"

class Weather(BaseModel):
    weather_datetime: str
    region: str
    temperature: float
    solar_radiation: float
    wind_speed: float
    class Config:
        extra = "allow"

class BatteryData(BaseModel):
    event_time: str
    site_id: str
    spot_price: float
    class Config:
        extra = "allow"

class BidPlan(BaseModel):
    event_time: str
    site_id: str
    class Config:
        extra = "allow"

# Generic Response Wrapper
class APIResponse(BaseModel):
    result: Union[str, List[Dict[str, str]]]
    code: int = 0
    count: Optional[int] = None
    data: List[Any]
