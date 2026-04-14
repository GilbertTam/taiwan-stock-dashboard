from fastapi import APIRouter
from app.api.v1 import auth, area, market_info, revenue, prediction, setup, data_status, presets

api_router = APIRouter()

api_router.include_router(setup.router, prefix="/setup", tags=["setup"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(area.router, prefix="/area", tags=["area"])
api_router.include_router(market_info.router, prefix="/market-info", tags=["market-info"])
api_router.include_router(revenue.router, prefix="/optimization", tags=["optimization"])
api_router.include_router(prediction.router, prefix="/custom-spot-market-predict", tags=["prediction"])
api_router.include_router(data_status.router, prefix="/data-status", tags=["data-status"])
api_router.include_router(presets.router, prefix="/presets", tags=["presets"])
