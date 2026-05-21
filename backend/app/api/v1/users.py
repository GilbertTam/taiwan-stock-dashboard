"""Admin-only user management (mounted under /api/users).

Every route requires `get_current_admin_user` (active superuser). The
last-superuser guard is enforced inside `account_service.admin_patch_user`
rather than here so the business rule lives in one place.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_admin_user
from app.db import get_db
from app.models.user import User
from app.schemas import user as user_schema
from app.services import account_service

router = APIRouter()


# ---------------------------------------------------------------------------
# App-wide registration toggles (the "admin settings" surface)
# ---------------------------------------------------------------------------
# Defined BEFORE /{user_id} so the path is matched first and not consumed
# by the dynamic int converter (FastAPI matches in declaration order).

@router.get("/settings", response_model=user_schema.AppSettingsSchema)
async def get_settings(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
) -> Any:
    return await account_service.get_app_settings(db)


@router.put("/settings", response_model=user_schema.AppSettingsSchema)
async def update_settings(
    payload: user_schema.AppSettingsSchema,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
) -> Any:
    return await account_service.update_app_settings(
        db,
        allow_registration=payload.allow_registration,
        require_admin_approval=payload.require_admin_approval,
    )


# ---------------------------------------------------------------------------
# User listing + per-user mutation
# ---------------------------------------------------------------------------

@router.get("", response_model=list[user_schema.AdminUserRow])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
) -> Any:
    users = await account_service.list_users(db)
    return [account_service.serialize_admin_row(u) for u in users]


async def _load_target(db: AsyncSession, user_id: int) -> User:
    user = await account_service.get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.post("", response_model=user_schema.AdminUserRow, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: user_schema.AdminCreateUserRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
) -> Any:
    created = await account_service.create_user_by_admin(db, payload)
    return account_service.serialize_admin_row(created)


@router.patch("/{user_id}", response_model=user_schema.AdminUserRow)
async def patch_user(
    user_id: int,
    patch: user_schema.AdminUserPatch,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_admin_user),
) -> Any:
    target = await _load_target(db, user_id)
    updated = await account_service.admin_patch_user(db, actor, target, patch)
    return account_service.serialize_admin_row(updated)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_admin_user),
) -> Response:
    target = await _load_target(db, user_id)
    await account_service.delete_user(db, actor, target)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{user_id}/reset-password", status_code=status.HTTP_204_NO_CONTENT)
async def reset_password(
    user_id: int,
    payload: user_schema.AdminResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
) -> Response:
    target = await _load_target(db, user_id)
    await account_service.admin_reset_password(db, target, payload.new_password)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{user_id}/approve", response_model=user_schema.AdminUserRow)
async def approve_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
) -> Any:
    target = await _load_target(db, user_id)
    approved = await account_service.approve_user(db, target)
    return account_service.serialize_admin_row(approved)


@router.post("/{user_id}/reject", status_code=status.HTTP_204_NO_CONTENT)
async def reject_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
) -> Response:
    target = await _load_target(db, user_id)
    await account_service.reject_user(db, target)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
