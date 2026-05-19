"""Third-party login: Google / Microsoft via OAuth 2.0 + OIDC.

Route layout (all relative to API_V1_STR + /auth/oauth):

  GET  /providers                         — public; which providers are on
  GET  /{provider}/login?mode=login|setup — public; 307 to provider authorize
  GET  /{provider}/link/start             — REGISTERED ON ACCOUNT ROUTER (auth required)
  GET  /{provider}/callback               — public; both login AND bind land here

The callback distinguishes login/setup/bind via the signed `oauth_state`
cookie's `mode` field (set by whichever start endpoint kicked off the flow).
On every error we redirect to the SPA `/oauth/callback?error=<code>` so the
browser never sees a JSON 4xx page mid-redirect.
"""
from __future__ import annotations

import logging
import secrets
from typing import Any

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core import oauth as oauth_core
from app.core import security
from app.db import get_db
from app.schemas import user as user_schema
from app.services import account_service

router = APIRouter()

logger = logging.getLogger(__name__)


def _frontend_redirect(params: str) -> RedirectResponse:
    """Compose a 307 redirect to the frontend OAuth bridge page."""
    return RedirectResponse(
        url=oauth_core.frontend_callback_url(f"/oauth/callback{params}"),
        status_code=status.HTTP_307_TEMPORARY_REDIRECT,
    )


def _set_state_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=oauth_core.STATE_COOKIE_NAME,
        value=token,
        httponly=True,
        max_age=oauth_core.STATE_TTL_SECONDS,
        expires=oauth_core.STATE_TTL_SECONDS,
        samesite="lax",
        secure=settings.is_production,
        path="/",
    )


def _clear_state_cookie(response: Response) -> None:
    response.delete_cookie(oauth_core.STATE_COOKIE_NAME, path="/")


def _set_session_cookie(response: Response, token: str) -> None:
    """Mint the app session cookie — identical params to auth.py /token."""
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


def _check_provider_enabled(provider: str) -> None:
    if provider not in ("google", "microsoft") or not oauth_core.is_provider_enabled(provider):
        # Defense in depth: even if a stale frontend renders the button, the
        # server refuses to start the flow when not configured.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not enabled")


@router.get("/providers", response_model=user_schema.ProvidersResponse)
async def providers() -> Any:
    """Public: which providers the frontend should render buttons for."""
    return {
        "google": settings.google_oauth_enabled,
        "microsoft": settings.microsoft_oauth_enabled,
    }


async def _start_oauth(
    *, provider: str, mode: str, user_id: int | None, request: Request
) -> RedirectResponse:
    """Shared start-flow logic for both unauthenticated login/setup and bind."""
    _check_provider_enabled(provider)
    if mode not in ("login", "setup", "bind"):
        raise HTTPException(status_code=400, detail="Invalid OAuth mode")

    verifier, challenge = oauth_core.generate_pkce_pair()
    nonce = secrets.token_urlsafe(16)
    state_payload: dict[str, Any] = {
        "mode": mode,
        "nonce": nonce,
        "code_verifier": verifier,
    }
    if mode == "bind":
        if user_id is None:
            raise HTTPException(status_code=400, detail="bind mode requires auth")
        state_payload["user_id"] = user_id

    state_token = oauth_core.make_state_token(state_payload)
    redirect_uri = oauth_core.derive_redirect_uri(request, provider)
    authorize_url = await oauth_core.build_authorize_url(
        provider, redirect_uri=redirect_uri, state=nonce, code_challenge=challenge
    )

    response = RedirectResponse(url=authorize_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
    _set_state_cookie(response, state_token)
    return response


@router.get("/{provider}/login")
async def oauth_login_redirect(
    provider: str,
    request: Request,
    mode: str = "login",
) -> RedirectResponse:
    """Kick off login or setup flow (no auth required)."""
    if mode == "bind":
        # bind needs an authenticated user — done via the account router instead.
        raise HTTPException(status_code=400, detail="Use /account/oauth/{provider}/link/start for bind")
    return await _start_oauth(provider=provider, mode=mode, user_id=None, request=request)


@router.get("/{provider}/callback", name="oauth_callback")
async def oauth_callback(
    provider: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    oauth_state: str | None = Cookie(default=None),
) -> RedirectResponse:
    """Provider redirects here after consent.

    Every error path lands on `/oauth/callback?error=<code>` so the SPA can
    render a localized message. We never raise a 4xx JSON response from this
    endpoint because the browser is in the middle of a redirect flow and a
    raw JSON error page is a confusing dead end.
    """
    if provider not in ("google", "microsoft"):
        return _frontend_redirect("?error=unknown_provider")
    if not oauth_core.is_provider_enabled(provider):
        return _frontend_redirect("?error=provider_disabled")
    if error:
        # Provider-side denial (user clicked Cancel, etc.)
        logger.info("OAuth provider returned error: %s", error)
        return _frontend_redirect(f"?error=provider_{error}")
    if not code or not state or not oauth_state:
        return _frontend_redirect("?error=missing_params")

    # 1) Verify state cookie signature and cross-check the nonce against the
    #    `state` query param — defense in depth against CSRF/replay.
    try:
        state_data = oauth_core.parse_state_token(oauth_state)
    except ValueError:
        return _frontend_redirect("?error=invalid_state")
    if state_data.get("nonce") != state:
        return _frontend_redirect("?error=state_mismatch")

    mode = state_data.get("mode", "login")
    verifier = state_data.get("code_verifier")
    bind_user_id = state_data.get("user_id") if mode == "bind" else None
    if not verifier:
        return _frontend_redirect("?error=invalid_state")

    # 2) Exchange code → tokens → verified identity.
    redirect_uri = oauth_core.derive_redirect_uri(request, provider)
    try:
        tokens = await oauth_core.exchange_code(
            provider, code=code, redirect_uri=redirect_uri, code_verifier=verifier
        )
        identity = await oauth_core.fetch_userinfo(provider, tokens)
    except Exception:  # noqa: BLE001 — log + redirect with generic error
        logger.exception("OAuth code exchange / userinfo failed")
        return _frontend_redirect("?error=oauth_failed")

    subject = identity["sub"]
    email = identity.get("email")

    # 3) Mode-specific resolution.
    if mode == "bind":
        user = await account_service.get_user_by_id(db, bind_user_id)
        if user is None:
            return _frontend_redirect("?error=session_expired")
        try:
            await account_service.link_oauth(db, user, provider, subject, email)
        except HTTPException as exc:
            code_map = {409: "already_linked"}
            return _frontend_redirect(f"?error={code_map.get(exc.status_code, 'link_failed')}")
        response = _frontend_redirect(f"?linked={provider}")
        _clear_state_cookie(response)
        return response

    # login / setup
    try:
        user = await account_service.find_or_bootstrap_oauth_user(
            db, provider=provider, subject=subject, email=email, mode=mode
        )
    except HTTPException as exc:
        if exc.status_code == 409:
            return _frontend_redirect("?error=email_collision")
        if exc.status_code == 403:
            return _frontend_redirect("?error=registration_closed")
        return _frontend_redirect("?error=oauth_failed")

    if user.is_pending:
        return _frontend_redirect("?error=pending")
    if not user.is_active:
        return _frontend_redirect("?error=inactive")

    # 4) Issue app JWT, set the same access_token cookie auth.py uses.
    access_token = security.create_access_token(user.username)
    response = _frontend_redirect("?ok=1")
    _set_session_cookie(response, access_token)
    _clear_state_cookie(response)
    return response
