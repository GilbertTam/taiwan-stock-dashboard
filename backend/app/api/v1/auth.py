from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from jose import jwt, JWTError

from app.schemas import user as user_schema
from app.core import security
from app.config import settings
from app.db import get_db
from app.models.user import User

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/token", auto_error=False)

from fastapi import Cookie, Response

async def get_current_user(
    db: AsyncSession = Depends(get_db), 
    token: str = Depends(oauth2_scheme),
    access_token: str | None = Cookie(default=None) # Read from cookie
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Try Bearer token first (OAuth2PasswordBearer usually raises if missing, so this might need adjustment)
    # The OAuth2PasswordBearer(auto_error=True) raises 401 if missing.
    # To support cookie fallback, we need auto_error=False or handle it manually.
    # But for now, let's see. If the frontend sends Bearer, oauth2_scheme passes.
    # If Swagger (browser) sends no header, oauth2_scheme raises 401.
    # We need to change oauth2_scheme to auto_error=False.
    
    token_to_use = token
    if not token_to_use and access_token:
         # Cookie format might be "Bearer <token>" or just "<token>"
         # My login logic sets "Bearer <token>"
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
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

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

    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect email or password"
        )
    elif not user.is_active:
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
        secure=False, # Set to True in production with HTTPS
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
