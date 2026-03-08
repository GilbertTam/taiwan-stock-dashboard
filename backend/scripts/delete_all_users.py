"""
Delete all users from the users table.
Run from backend directory: python scripts/delete_all_users.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import delete
from app.db import AsyncSessionLocal
from app.models.user import User


async def delete_all_users():
    async with AsyncSessionLocal() as session:
        result = await session.execute(delete(User))
        count = result.rowcount
        await session.commit()
        return count


if __name__ == "__main__":
    async def _run():
        n = await delete_all_users()
        print(f"Deleted {n} user(s).")

    asyncio.run(_run())
