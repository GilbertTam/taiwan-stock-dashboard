import json

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db import get_db
from app.models.user import User
from app.models.user_preference import UserPreference
from app.schemas.user_preference import UserPreferencesResponse, UserPreferencesUpdate
from app.api.v1.auth import get_current_active_user

router = APIRouter()


@router.get("/", response_model=UserPreferencesResponse)
async def get_preferences(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(UserPreference).where(UserPreference.user_id == current_user.id)
    )
    pref = result.scalars().first()
    if pref is None:
        return UserPreferencesResponse(data={})
    try:
        data = json.loads(pref.data) if pref.data else {}
    except json.JSONDecodeError:
        data = {}
    return UserPreferencesResponse(data=data)


@router.put("/", response_model=UserPreferencesResponse)
async def update_preferences(
    body: UserPreferencesUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    serialized = json.dumps(body.data)

    result = await db.execute(
        select(UserPreference).where(UserPreference.user_id == current_user.id)
    )
    pref = result.scalars().first()

    if pref is None:
        pref = UserPreference(user_id=current_user.id, data=serialized)
        db.add(pref)
    else:
        pref.data = serialized

    await db.commit()
    await db.refresh(pref)
    return UserPreferencesResponse(data=body.data)
