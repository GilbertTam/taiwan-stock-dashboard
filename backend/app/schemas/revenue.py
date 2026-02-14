from typing import Any, Dict, List, Optional
from pydantic import BaseModel

class OptimizationConfig(BaseModel):
    T: Optional[int] = 48
    P_max_ch: Optional[float] = 0
    P_max_dis: Optional[float] = 0
    E_cap: Optional[float] = 0
    SoC_min_pct: Optional[float] = 0
    SoC_max_pct: Optional[float] = 1
    SoC_init_pct: Optional[float] = 0
    SoC_end_pct: Optional[float] = 0
    dt: Optional[float] = 0.5
    eff_ch: Optional[float] = 0.95
    eff_dis: Optional[float] = 0.95
    beta_bal: Optional[float] = 1.0
    Cost_cycle: Optional[float] = 0
    E_loss: Optional[float] = 0
    Cycle_limit: Optional[float] = 100
    Min_bid: Optional[float] = 0
    class Config:
        extra = "allow"

class OptimizationDataRow(BaseModel):
    Spot_Price: float
    Bal_Price: Optional[float] = 0
    Mask_Ch: Optional[float] = 1
    Mask_Dis: Optional[float] = 1
    class Config:
        extra = "allow"

class OptimizationRequest(BaseModel):
    config: OptimizationConfig
    data: List[OptimizationDataRow]

class OptimizationResultRow(BaseModel):
    time_step: int
    price_spot: float
    price_bal: float
    action: str
    direction: Optional[str]
    commodity_category: Optional[str]
    power_ch: float
    power_spot: float
    power_bal: float
    soc_mwh: float
    soc_pct: float
    revenue: float

class OptimizationSummary(BaseModel):
    total_revenue: float

class OptimizationResponse(BaseModel):
    status: str
    summary: OptimizationSummary
    results: List[OptimizationResultRow]
