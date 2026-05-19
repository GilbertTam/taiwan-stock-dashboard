from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from jose import jwt, JWTError

from app.schemas import user as user_schema
from app.core import security
from app.config import settings
from app.db import get_db
from app.models.user import User
from app.services import account_service

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/token", auto_error=False)


# ---------------------------------------------------------------------------
# Auth dependencies (used across routers)
# ---------------------------------------------------------------------------

async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme),
    access_token: str | None = Cookie(default=None)  # Read from cookie
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # OAuth2PasswordBearer has auto_error=False so we can fall back to the
    # httponly cookie set by /auth/token and the OAuth callback. The cookie
    # value is "Bearer <token>" for parity with the Authorization header.
    token_to_use = token
    if not token_to_use and access_token:
        if access_token.startswith("Bearer "):
            token_to_use = access_token.split(" ")[1]
        else:
            token_to_use = access_token

    if not token_to_use:
        raise credentials_exception

    try:
        payload = jwt.decode(
            token_to_use, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.username == username))
    user = result.scalars().first()

    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        # Distinct messages so the frontend can render the correct UX:
        # pending users see an "awaiting approval" notice, deactivated users
        # see a "contact administrator" notice.
        if current_user.is_pending:
            raise HTTPException(status_code=400, detail="Account pending approval")
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


async def get_current_admin_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Require an active superuser. Other routers (users.py) inject this."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator privileges required",
        )
    return current_user


# ---------------------------------------------------------------------------
# Token endpoint (password grant)
# ---------------------------------------------------------------------------

@router.post("/token", response_model=user_schema.Token)
async def login_access_token(
    response: Response,
    db: AsyncSession = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    result = await db.execute(select(User).where(User.username == form_data.username))
    user = result.scalars().first()

    # `user.hashed_password` may be None for OAuth-only accounts — the guard
    # is what prevents `verify_password(None, ...)` from crashing. The error
    # message is intentionally the same as wrong-password to avoid leaking
    # which accounts exist with vs without local passwords.
    if (
        not user
        or not user.hashed_password
        or not security.verify_password(form_data.password, user.hashed_password)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect email or password"
        )
    if user.is_pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Account pending approval"
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = security.create_access_token(
        user.username, ends_delta=access_token_expires
    )

    # Set HttpOnly cookie for Swagger UI
    response.set_cookie(
        key="access_token",
        value=f"Bearer {token}",
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        expires=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=settings.is_production,
    )

    return {
        "access_token": token,
        "token_type": "bearer",
    }


@router.post("/test-token", response_model=user_schema.User)
async def test_token(current_user: User = Depends(get_current_user)) -> Any:
    """
    Test access token
    """
    return current_user


# ---------------------------------------------------------------------------
# Logout (clear httponly session cookie)
# ---------------------------------------------------------------------------

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response) -> Response:
    """Clear the httponly access_token cookie.

    Required because the frontend cannot clear an httponly cookie itself.
    Without this endpoint, after the user clicks "Logout" the JWT cookie
    survives and any subsequent `/account/me` call re-hydrates the previous
    session — most visibly when the user starts an OAuth login that fails
    (e.g. pending approval) and then navigates back: the still-valid admin
    cookie silently restores the admin session.

    Cookie params (path, samesite, secure) must match how it was set in
    /auth/token and the OAuth callback so the browser actually clears it.
    """
    response.delete_cookie(
        key="access_token",
        path="/",
        samesite="lax",
        secure=settings.is_production,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Self-service registration
# ---------------------------------------------------------------------------

@router.post(
    "/register",
    response_model=user_schema.RegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    payload: user_schema.RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Public self-service account creation.

    Gated by `app_settings.allow_registration`; produces a `pending` account
    when `require_admin_approval` is on so an admin can vet new signups
    before they can log in.
    """
    user = await account_service.create_self_registered_user(db, payload)
    return {
        "id": user.id,
        "username": user.username,
        "status": "pending" if user.is_pending else "active",
    }
