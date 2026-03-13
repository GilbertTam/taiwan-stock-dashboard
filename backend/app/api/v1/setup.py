from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db import get_db
from app.models.user import User
from app.schemas import user as user_schema
from app.core.security import get_password_hash

router = APIRouter()

DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_EMAIL = "admin@example.com"
DEFAULT_ADMIN_PASSWORD = "1234"


async def _has_users(db: AsyncSession) -> bool:
    result = await db.execute(select(User).limit(1))
    return result.scalars().first() is not None


@router.get("/status")
async def get_setup_status(db: AsyncSession = Depends(get_db)):
    """
    Check if initial setup is required.
    Returns setup_required=true when no users exist in the database.
    """
    return {"setup_required": not await _has_users(db)}


@router.post("/create-admin", response_model=user_schema.User, status_code=status.HTTP_201_CREATED)
async def create_admin(
    user_in: user_schema.UserCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Create the first admin user. Only works when no users exist.
    Returns HTTP 403 if any user already exists.
    """
    if await _has_users(db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Setup already completed",
        )

    new_user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        is_active=True,
        is_superuser=True,
    )
    db.add(new_user)
    try:
        await db.commit()
        await db.refresh(new_user)
    except Exception:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username or email already exists",
        )
    return new_user


@router.post("/create-default-admin", response_model=user_schema.User, status_code=status.HTTP_201_CREATED)
async def create_default_admin(db: AsyncSession = Depends(get_db)):
    """
    Dev convenience endpoint: creates admin/1234 when no users exist.
    Only works when no users exist. Password should be changed after first login.
    Returns HTTP 403 if any user already exists.
    """
    if await _has_users(db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Setup already completed",
        )

    new_user = User(
        username=DEFAULT_ADMIN_USERNAME,
        email=DEFAULT_ADMIN_EMAIL,
        hashed_password=get_password_hash(DEFAULT_ADMIN_PASSWORD),
        is_active=True,
        is_superuser=True,
    )
    db.add(new_user)
    try:
        await db.commit()
        await db.refresh(new_user)
    except Exception:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Default admin already exists",
        )
    return new_user
