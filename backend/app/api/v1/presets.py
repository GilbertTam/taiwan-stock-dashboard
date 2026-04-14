import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update

from app.db import get_db
from app.models.preset import UserPreset
from app.models.user import User
from app.schemas.preset import (
    PresetCreate,
    PresetUpdate,
    PresetResponse,
    PresetListResponse,
)
from app.api.v1.auth import get_current_active_user

router = APIRouter()

MAX_PRESETS_PER_PAGE = 10

VALID_PAGE_KEYS = {'forecast', 'weather', 'daily-compare'}


def _preset_to_response(preset: UserPreset) -> PresetResponse:
    return PresetResponse(
        id=preset.id,
        page_key=preset.page_key,
        name=preset.name,
        data=json.loads(preset.data),
        is_default=preset.is_default or False,
        created_at=preset.created_at.isoformat() if preset.created_at else None,
        updated_at=preset.updated_at.isoformat() if preset.updated_at else None,
    )


@router.get("/", response_model=PresetListResponse)
async def list_presets(
    page_key: str = Query(..., pattern=r'^(forecast|weather|daily-compare)$'),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(UserPreset)
        .where(UserPreset.user_id == current_user.id, UserPreset.page_key == page_key)
        .order_by(UserPreset.created_at)
    )
    presets = result.scalars().all()
    return PresetListResponse(
        presets=[_preset_to_response(p) for p in presets],
        count=len(presets),
    )


@router.post("/", response_model=PresetResponse, status_code=status.HTTP_201_CREATED)
async def create_preset(
    body: PresetCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # Check count limit
    result = await db.execute(
        select(UserPreset)
        .where(UserPreset.user_id == current_user.id, UserPreset.page_key == body.page_key)
    )
    existing = result.scalars().all()
    if len(existing) >= MAX_PRESETS_PER_PAGE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum {MAX_PRESETS_PER_PAGE} presets per page",
        )

    # If setting as default, clear other defaults
    if body.is_default:
        await db.execute(
            update(UserPreset)
            .where(
                UserPreset.user_id == current_user.id,
                UserPreset.page_key == body.page_key,
                UserPreset.is_default == True,
            )
            .values(is_default=False)
        )

    preset = UserPreset(
        user_id=current_user.id,
        page_key=body.page_key,
        name=body.name,
        data=json.dumps(body.data),
        is_default=body.is_default,
    )
    db.add(preset)
    try:
        await db.commit()
        await db.refresh(preset)
    except Exception:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A preset with this name already exists for this page",
        )
    return _preset_to_response(preset)


@router.put("/{preset_id}", response_model=PresetResponse)
async def update_preset(
    preset_id: int,
    body: PresetUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(UserPreset).where(UserPreset.id == preset_id)
    )
    preset = result.scalars().first()
    if not preset or preset.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Preset not found")

    # If setting as default, clear other defaults for same page
    if body.is_default is True:
        await db.execute(
            update(UserPreset)
            .where(
                UserPreset.user_id == current_user.id,
                UserPreset.page_key == preset.page_key,
                UserPreset.is_default == True,
                UserPreset.id != preset_id,
            )
            .values(is_default=False)
        )

    if body.name is not None:
        preset.name = body.name
    if body.data is not None:
        preset.data = json.dumps(body.data)
    if body.is_default is not None:
        preset.is_default = body.is_default

    try:
        await db.commit()
        await db.refresh(preset)
    except Exception:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A preset with this name already exists for this page",
        )
    return _preset_to_response(preset)


@router.delete("/{preset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_preset(
    preset_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(UserPreset).where(UserPreset.id == preset_id)
    )
    preset = result.scalars().first()
    if not preset or preset.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Preset not found")

    await db.delete(preset)
    await db.commit()
