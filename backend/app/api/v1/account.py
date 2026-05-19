"""Self-service account endpoints (mounted under /api/account).

This router lives under `/api/account` (not `/api/auth`) on purpose — see the
plan's nginx note: `/api/auth` is rate-limited to 5r/m which would kneecap
`/account/me` (called on every app mount + post-login + OAuth bridge). The
looser `/api` limiter (burst=60) is the right home for hydration and
self-service operations.

Every route requires an *active* session (`get_current_active_user`); pending
users cannot reach these endpoints because the dep returns 400 first.

The OAuth callback for the bind flow is shared with `oauth.py` —
`/account/oauth/{provider}/link/start` simply hands off to the same callback
URL by setting `mode=bind` in the signed state cookie.
"""
from __future__ import annotations

from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_active_user
from app.api.v1 import oauth as oauth_router
from app.config import settings
from app.core import security
from app.db import get_db
from app.models.user import User
from app.schemas import user as user_schema
from app.services import account_service

router = APIRouter()


# ---------------------------------------------------------------------------
# Hydration
# ---------------------------------------------------------------------------

@router.get("/me", response_model=user_schema.MeResponse)
async def me(
    response: Response,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Single hydration endpoint for the frontend AuthContext.

    Also REFRESHES the session: returns a fresh JWT both as the httponly
    cookie (so the session stays alive across the 8-day window) and in the
    body so the OAuth bridge can populate the legacy `auth_tokens`
    localStorage/js-cookie that the rest of the frontend already reads.
    """
    expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = security.create_access_token(current_user.username, ends_delta=expires)
    response.set_cookie(
        key="access_token",
        value=f"Bearer {token}",
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        expires=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=settings.is_production,
        path="/",
    )
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "is_superuser": bool(current_user.is_superuser),
        "is_active": bool(current_user.is_active),
        "is_pending": bool(current_user.is_pending),
        "has_password": current_user.hashed_password is not None,
        "linked_providers": account_service.serialize_linked_providers(current_user),
        "access_token": token,
        "token_type": "bearer",
    }


# ---------------------------------------------------------------------------
# Password set/change
# ---------------------------------------------------------------------------

@router.post("/password", status_code=status.HTTP_204_NO_CONTENT)
async def set_password(
    payload: user_schema.SetPasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Response:
    await account_service.set_password(
        db, current_user, payload.new_password, payload.current_password
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# Body-on-DELETE is poorly supported by some HTTP layers, so we use POST for
# the removal action. The service layer enforces the ≥1-linked-provider
# invariant — the route only translates payload + auth context.
@router.post("/password/remove", status_code=status.HTTP_204_NO_CONTENT)
async def remove_password(
    payload: user_schema.RemovePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Response:
    await account_service.remove_password(db, current_user, payload.current_password)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Link / unlink third-party provider
# ---------------------------------------------------------------------------

@router.get("/oauth/{provider}/link/start")
async def link_start(
    provider: str,
    request: Request,
    current_user: User = Depends(get_current_active_user),
) -> RedirectResponse:
    """Begin the OAuth bind flow; callback is shared with login/setup."""
    return await oauth_router._start_oauth(
        provider=provider, mode="bind", user_id=current_user.id, request=request
    )


@router.delete("/oauth/{provider}", status_code=status.HTTP_204_NO_CONTENT)
async def unlink_provider(
    provider: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Response:
    await account_service.unlink_oauth(db, current_user, provider)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
