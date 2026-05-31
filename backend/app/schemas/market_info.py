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
    area_demand: Optional[float] = 0.0
    nuclear_power: Optional[float] = 0.0
    thermal: Optional[float] = 0.0
    hydropower: Optional[float] = 0.0
    geothermal_power: Optional[float] = 0.0
    biomass: Optional[float] = 0.0
    solar_power_generation_actual: Optional[float] = 0.0
    solar_power_output_control: Optional[float] = 0.0
    wind_power_generation_actual: Optional[float] = 0.0
    wind_power_output_control: Optional[float] = 0.0
    pumped_storage: Optional[float] = 0.0
    battery_storage: Optional[float] = 0.0
    interconnection_line: Optional[float] = 0.0
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

class HjksUnit(BaseModel):
    """A generator unit from the hjks_unit master registry.

    ``max_capacity`` is the raw kW value from ES; ``max_capacity_mw`` is the
    normalized MW value injected by ESService.get_hjks_units.
    """
    plantcd: Optional[str] = None
    unitcd: Optional[str] = None
    unit_name: Optional[str] = None
    name: Optional[str] = None
    company: Optional[str] = None
    area: Optional[str] = None
    format: Optional[str] = None
    max_capacity_mw: float = 0.0
    is_active: Optional[bool] = None
    class Config:
        extra = "allow"

class UnitAvailabilityDataPoint(BaseModel):
    total_capacity_mw: float
    stopped_capacity_mw: float
    available_capacity_mw: float
    unit_count: int = 0
    stopped_unit_count: int = 0

class UnitAvailabilityTimestamp(BaseModel):
    datetime: str
    data: Dict[str, UnitAvailabilityDataPoint]

class UnitAvailabilityTimeline(BaseModel):
    start_date: str
    end_date: str
    interval_minutes: int
    # Area scope (lowercase EN code) the timeline was computed for; null = all areas.
    area: Optional[str] = None
    # Fuel-category keys present, ordered to match the frontend GEN_SOURCES.
    keys: List[str]
    timeline: List[UnitAvailabilityTimestamp]
    meta: Dict[str, Any] = {}

class UnitAvailabilityResponse(BaseModel):
    result: Union[str, List[Dict[str, str]]]
    code: int = 0
    count: Optional[int] = None
    data: UnitAvailabilityTimeline

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
