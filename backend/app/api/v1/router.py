from fastapi import APIRouter
from app.api.v1 import (
    account,
    area,
    auth,
    data_status,
    market_info,
    oauth,
    prediction,
    presets,
    revenue,
    setup,
    users,
)

api_router = APIRouter()

api_router.include_router(setup.router, prefix="/setup", tags=["setup"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
# OAuth routes live under /auth/oauth so nginx's longest-prefix match can
# give them their own (looser) rate limit without disturbing /api/auth.
api_router.include_router(oauth.router, prefix="/auth/oauth", tags=["oauth"])
api_router.include_router(account.router, prefix="/account", tags=["account"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(area.router, prefix="/area", tags=["area"])
api_router.include_router(market_info.router, prefix="/market-info", tags=["market-info"])
api_router.include_router(revenue.router, prefix="/optimization", tags=["optimization"])
api_router.include_router(prediction.router, prefix="/custom-spot-market-predict", tags=["prediction"])
api_router.include_router(data_status.router, prefix="/data-status", tags=["data-status"])
api_router.include_router(presets.router, prefix="/presets", tags=["presets"])
