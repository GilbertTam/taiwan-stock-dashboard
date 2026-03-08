"""
Delete all users and optionally create a fresh admin user.
Run from backend directory:
  python scripts/reset_users.py
  python scripts/reset_users.py <username> <email> <password> [is_superuser]
Examples:
  python scripts/reset_users.py
  python scripts/reset_users.py admin admin@example.com mypassword true
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import delete
from app.db import AsyncSessionLocal
from app.models.user import User
from app.core.security import get_password_hash


async def delete_all_users():
    async with AsyncSessionLocal() as session:
        result = await session.execute(delete(User))
        count = result.rowcount
        await session.commit()
        return count


async def create_user(username: str, email: str, password: str, is_superuser: bool = False):
    async with AsyncSessionLocal() as session:
        hashed = get_password_hash(password)
        user = User(
            username=username,
            email=email,
            hashed_password=hashed,
            is_active=True,
            is_superuser=is_superuser,
        )
        session.add(user)
        await session.commit()
        print(f"Created user: {username} (superuser={is_superuser})")


async def main():
    deleted = await delete_all_users()
    print(f"Deleted {deleted} user(s).")

    if len(sys.argv) >= 4:
        username = sys.argv[1]
        email = sys.argv[2]
        password = sys.argv[3]
        is_superuser = len(sys.argv) > 4 and sys.argv[4].lower() in ("true", "1", "yes")
        await create_user(username, email, password, is_superuser)
    else:
        # Default: create admin (username=admin, password=1234)
        await create_user("admin", "admin@example.com", "1234", is_superuser=True)
        print("Default admin created: username=admin, password=1234.")


if __name__ == "__main__":
    asyncio.run(main())
