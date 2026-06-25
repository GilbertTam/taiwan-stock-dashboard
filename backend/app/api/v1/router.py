from fastapi import APIRouter
from app.api.v1 import (
    account,
    auth,
    oauth,
    preferences,
    setup,
    users,
    stock,
    podcast,
)

api_router = APIRouter()

api_router.include_router(setup.router, prefix="/setup", tags=["setup"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
# OAuth routes live under /auth/oauth so nginx's longest-prefix match can
# give them their own (looser) rate limit without disturbing /api/auth.
api_router.include_router(oauth.router, prefix="/auth/oauth", tags=["oauth"])
api_router.include_router(account.router, prefix="/account", tags=["account"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(preferences.router, prefix="/preferences", tags=["preferences"])
api_router.include_router(stock.router, prefix="/stock", tags=["stock"])
api_router.include_router(podcast.router, prefix="/podcast", tags=["podcast"])
