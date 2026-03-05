import asyncio
import sys
import os

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import AsyncSessionLocal
from app.models.user import User
from app.core.security import get_password_hash
from sqlalchemy.future import select

async def create_user(username, email, password, is_superuser=False):
    async with AsyncSessionLocal() as session:
        # Check if user exists
        result = await session.execute(select(User).where(User.username == username))
        existing_user = result.scalars().first()
        if existing_user:
            print(f"User {username} already exists. Skipping password update.")
            existing_user.email = email
            existing_user.is_superuser = is_superuser
            existing_user.is_active = True
            session.add(existing_user)
            try:
                await session.commit()
                print(f"User {username} permissions and status confirmed.")
            except Exception as e:
                await session.rollback()
                print(f"Error updating user: {e}")
            return

        hashed_password = get_password_hash(password)
        new_user = User(
            username=username,
            email=email,
            hashed_password=hashed_password,
            is_active=True,
            is_superuser=is_superuser
        )
        session.add(new_user)
        try:
            await session.commit()
            print(f"User {username} created successfully.")
        except Exception as e:
            await session.rollback()
            print(f"Error creating user: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python create_user.py <username> <email> <password> [is_superuser]")
        sys.exit(1)
    
    username = sys.argv[1]
    email = sys.argv[2]
    password = sys.argv[3]
    is_superuser = len(sys.argv) > 4 and sys.argv[4].lower() == 'true'

    asyncio.run(create_user(username, email, password, is_superuser))
