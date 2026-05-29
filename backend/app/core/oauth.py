"""OAuth 2.0 / OIDC helpers for Google + Microsoft sign-in.

Why this is hand-rolled instead of using Authlib's framework integrations
------------------------------------------------------------------------
Authlib's `starlette_client.OAuth` integration relies on Starlette's
`SessionMiddleware` to stash state and PKCE between the authorize redirect
and the callback. This app has no `SessionMiddleware` (and adding one solely
for OAuth would be a much larger change), so we instead encode the state +
PKCE verifier into a short-lived `SECRET_KEY`-signed cookie (`oauth_state`,
httponly, 10-min exp) — the same key + algo already used for the app JWT.
That keeps the client_secret server-side, preserves PKCE, and matches the
existing cookie security model used by `auth.py`.

This module exposes:

  * is_provider_enabled / build_authorize_url / exchange_code / fetch_userinfo
    — the OAuth wire protocol bits (uses `httpx`).
  * make_state_token / parse_state_token — the signed cookie payload.
  * verify_id_token — JWKS-validated id_token decoding (critical: never trust
    an id_token whose signature has not been verified against the provider's
    JWKS plus iss/aud/exp checks).
"""
from __future__ import annotations

import base64
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, Optional
from urllib.parse import urlencode

import httpx
from fastapi import Request
from jose import jwt, JWTError

from app.config import settings


# ---------------------------------------------------------------------------
# Provider metadata
# ---------------------------------------------------------------------------

# Discovery URL is the OIDC well-known endpoint; everything else (auth/token
# /userinfo/jwks URIs, supported algorithms) is derived from it.
PROVIDERS: Dict[str, Dict[str, Any]] = {
    "google": {
        "discovery_url": "https://accounts.google.com/.well-known/openid-configuration",
        "scopes": ["openid", "email", "profile"],
    },
    # Microsoft tenant is resolved lazily so MICROSOFT_TENANT can be set after
    # this module is imported (e.g. by tests).
    "microsoft": {
        "discovery_url_template": (
            "https://login.microsoftonline.com/{tenant}/v2.0/.well-known/openid-configuration"
        ),
        "scopes": ["openid", "email", "profile"],
    },
}

# Tiny in-process caches. OIDC metadata changes very rarely, and JWKS only
# rotate on the scale of months/years. These do not need eviction for the
# request load this app sees; restart the process to refresh.
_metadata_cache: Dict[str, Dict[str, Any]] = {}
_jwks_cache: Dict[str, Dict[str, Any]] = {}


def is_provider_enabled(provider: str) -> bool:
    if provider == "google":
        return settings.google_oauth_enabled
    if provider == "microsoft":
        return settings.microsoft_oauth_enabled
    return False


def _client_credentials(provider: str) -> tuple[str, str]:
    if provider == "google":
        return settings.GOOGLE_CLIENT_ID, settings.GOOGLE_CLIENT_SECRET
    if provider == "microsoft":
        return settings.MICROSOFT_CLIENT_ID, settings.MICROSOFT_CLIENT_SECRET
    raise ValueError(f"Unknown OAuth provider: {provider}")


def _discovery_url(provider: str) -> str:
    cfg = PROVIDERS[provider]
    if "discovery_url" in cfg:
        return cfg["discovery_url"]
    return cfg["discovery_url_template"].format(tenant=settings.MICROSOFT_TENANT)


async def fetch_oidc_metadata(provider: str) -> Dict[str, Any]:
    """Fetch and cache the provider's OIDC discovery document."""
    cached = _metadata_cache.get(provider)
    if cached is not None:
        return cached
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(_discovery_url(provider))
        resp.raise_for_status()
        data = resp.json()
    _metadata_cache[provider] = data
    return data


async def _fetch_jwks(provider: str, jwks_uri: str) -> Dict[str, Any]:
    cached = _jwks_cache.get(provider)
    if cached is not None:
        return cached
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(jwks_uri)
        resp.raise_for_status()
        data = resp.json()
    _jwks_cache[provider] = data
    return data


# ---------------------------------------------------------------------------
# PKCE helpers
# ---------------------------------------------------------------------------

def generate_pkce_pair() -> tuple[str, str]:
    """Return (code_verifier, code_challenge) per RFC 7636 S256."""
    verifier = secrets.token_urlsafe(64)[:96]  # 43–128 chars, URL-safe
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
    return verifier, challenge


# ---------------------------------------------------------------------------
# Signed state cookie (carries mode + nonce + PKCE verifier across the redirect)
# ---------------------------------------------------------------------------

STATE_COOKIE_NAME = "oauth_state"
STATE_TTL_SECONDS = 600  # 10 minutes — Google/Microsoft consent UX rarely exceeds this.


def make_state_token(payload: Dict[str, Any]) -> str:
    """Sign `payload` with SECRET_KEY (same algo as the app JWT)."""
    body = {**payload, "exp": datetime.utcnow() + timedelta(seconds=STATE_TTL_SECONDS)}
    return jwt.encode(body, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def parse_state_token(token: str) -> Dict[str, Any]:
    """Verify signature + exp; raise ValueError on any failure."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError as exc:
        raise ValueError(f"Invalid or expired OAuth state: {exc}")


# ---------------------------------------------------------------------------
# Authorize URL
# ---------------------------------------------------------------------------

async def build_authorize_url(
    provider: str,
    redirect_uri: str,
    state: str,
    code_challenge: str,
) -> str:
    """Compose the provider's authorize URL with PKCE + state."""
    metadata = await fetch_oidc_metadata(provider)
    client_id, _ = _client_credentials(provider)
    params = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "scope": " ".join(PROVIDERS[provider]["scopes"]),
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
        # Provider-specific niceties:
        # - Google: prompt=select_account so the user can pick when multiple
        #   accounts are signed into the browser.
        # - Microsoft: prompt=select_account ditto; no tenant override needed
        #   because the discovery URL already encodes MICROSOFT_TENANT.
        "prompt": "select_account",
    }
    return f"{metadata['authorization_endpoint']}?{urlencode(params)}"


# ---------------------------------------------------------------------------
# Token exchange + id_token verification + userinfo
# ---------------------------------------------------------------------------

async def exchange_code(
    provider: str,
    code: str,
    redirect_uri: str,
    code_verifier: str,
) -> Dict[str, Any]:
    """Exchange an authorization code for tokens (client_secret stays here)."""
    metadata = await fetch_oidc_metadata(provider)
    client_id, client_secret = _client_credentials(provider)
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
        "client_id": client_id,
        "client_secret": client_secret,
        "code_verifier": code_verifier,
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            metadata["token_endpoint"],
            data=data,
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        return resp.json()


async def verify_id_token(
    provider: str,
    id_token: str,
    access_token: Optional[str] = None,
) -> Dict[str, Any]:
    """Verify id_token signature against JWKS + iss/aud/exp + at_hash.

    This is the security-critical step. Without JWKS verification an attacker
    could craft an id_token with any `sub`/`email` they want and impersonate
    any user.

    `access_token` must be passed when the id_token carries an `at_hash`
    claim (which Google's authorization-code flow always includes). jose
    refuses to skip at_hash validation when the claim is present, raising
    "No access_token provided to compare against at_hash claim." otherwise.
    Passing the access_token from the token exchange lets jose verify that
    the id_token and access_token were minted as a pair, defending against
    token-substitution attacks where a stolen id_token is paired with an
    attacker's access_token.
    """
    metadata = await fetch_oidc_metadata(provider)
    jwks = await _fetch_jwks(provider, metadata["jwks_uri"])
    client_id, _ = _client_credentials(provider)
    # Locate the JWK matching the token's kid; jose accepts a JWKS dict
    # directly but matching by kid yields a clearer error if the key set has
    # rotated and the cached copy is stale.
    try:
        unverified_header = jwt.get_unverified_header(id_token)
    except JWTError as exc:
        raise ValueError(f"Malformed id_token header: {exc}")
    kid = unverified_header.get("kid")
    keys = jwks.get("keys", [])
    matching = next((k for k in keys if k.get("kid") == kid), None)
    if matching is None:
        # Cached JWKS may be stale after a key rotation. Refresh once.
        _jwks_cache.pop(provider, None)
        jwks = await _fetch_jwks(provider, metadata["jwks_uri"])
        keys = jwks.get("keys", [])
        matching = next((k for k in keys if k.get("kid") == kid), None)
        if matching is None:
            raise ValueError(f"No JWK found for kid={kid}")
    # Microsoft's `common` / `organizations` / `consumers` discovery
    # documents return a TEMPLATED issuer:
    #     "https://login.microsoftonline.com/{tenantid}/v2.0"
    # but the id_token's actual `iss` claim has `{tenantid}` resolved to
    # the real tenant GUID. Naively passing the templated string to jose
    # makes every Microsoft sign-in fail with "Invalid issuer".
    #
    # The fix: peek at the unverified `tid` claim, substitute it into the
    # template, and use the resolved issuer for the strict check. `tid` is
    # signed alongside `iss`, so substitution can't be tampered with — once
    # the signature passes, the iss/tid pair was minted by Microsoft.
    expected_issuer = metadata["issuer"]
    if "{tenantid}" in expected_issuer:
        try:
            unverified_claims = jwt.get_unverified_claims(id_token)
        except JWTError as exc:
            raise ValueError(f"Malformed id_token claims: {exc}")
        tid = unverified_claims.get("tid")
        if not tid:
            raise ValueError("id_token missing `tid` for templated issuer")
        expected_issuer = expected_issuer.replace("{tenantid}", tid)
    try:
        return jwt.decode(
            id_token,
            matching,
            algorithms=[matching.get("alg", "RS256")],
            audience=client_id,
            issuer=expected_issuer,
            access_token=access_token,
        )
    except JWTError as exc:
        raise ValueError(f"id_token verification failed: {exc}")


async def fetch_userinfo(provider: str, tokens: Dict[str, Any]) -> Dict[str, Any]:
    """Return normalized `{sub, email}` for the authenticated identity.

    Prefers the verified id_token claims (no extra round trip, no userinfo
    request to spoof). Falls back to the userinfo endpoint only if id_token
    lacks an `email` claim — Microsoft sometimes omits email from the
    id_token depending on scope/tenant config.
    """
    id_token = tokens.get("id_token")
    if not id_token:
        raise ValueError("Provider response missing id_token")
    # Pass access_token through so jose can validate the at_hash claim that
    # Google (and Microsoft in some flows) include in the id_token. Without
    # this, jose refuses to skip the check and raises.
    claims = await verify_id_token(provider, id_token, tokens.get("access_token"))
    sub = claims.get("sub")
    if not sub:
        raise ValueError("id_token missing sub claim")

    # Email resolution order:
    #   1. `email`            — Google always; Microsoft sometimes.
    #   2. `upn`              — Microsoft work/school: User Principal Name
    #                           (typically the email shape).
    #   3. `preferred_username` — Microsoft fallback; for personal MSAs this
    #                             is the email the user signed in with.
    #   4. userinfo endpoint  — last resort if the access_token is available
    #                           and none of the claims carried an address.
    email = (
        claims.get("email")
        or claims.get("upn")
        or claims.get("preferred_username")
    )
    if not email and tokens.get("access_token"):
        metadata = await fetch_oidc_metadata(provider)
        userinfo_endpoint = metadata.get("userinfo_endpoint")
        if userinfo_endpoint:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    userinfo_endpoint,
                    headers={"Authorization": f"Bearer {tokens['access_token']}"},
                )
                if resp.status_code == 200:
                    info = resp.json()
                    email = (
                        info.get("email")
                        or info.get("mail")
                        or info.get("upn")
                        or info.get("preferred_username")
                    )
    return {"sub": str(sub), "email": email}


# ---------------------------------------------------------------------------
# Redirect URI helper
# ---------------------------------------------------------------------------

def derive_redirect_uri(request: Request, provider: str) -> str:
    """Build the callback URL the OAuth provider redirects the browser to.

    Host is taken from the request so multiple public hostnames work without
    config changes (each one just needs to be registered in the provider's
    redirect URI allowlist). Scheme is forced to `https` for everything except
    localhost — relying on `X-Forwarded-Proto` is brittle when an outer proxy
    (e.g. AWS ALB) doesn't forward it, and OAuth providers do exact-match on
    the registered redirect URIs so an attacker-supplied `Host` can't produce
    a working redirect to an unregistered domain.
    """
    url = request.url_for("oauth_callback", provider=provider)
    if url.hostname not in ("localhost", "127.0.0.1"):
        url = url.replace(scheme="https")
    return str(url)


def frontend_callback_url(path_with_query: str) -> str:
    """Build the post-callback browser redirect URL.

    Defaults to a same-origin relative path so we don't have to know our own
    public origin in dev/prod (nginx serves frontend + backend same-origin).
    """
    base = settings.FRONTEND_BASE_URL.rstrip("/")
    return f"{base}{path_with_query}" if base else path_with_query
