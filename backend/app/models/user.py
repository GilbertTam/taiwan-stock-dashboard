from sqlalchemy import Boolean, Column, Integer, String, DateTime, text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base

class User(Base):
    """
    User model for authentication.

    `hashed_password` is nullable to support OAuth-only accounts (no local
    password). The login-method invariant — every account must always retain
    at least one usable method (password OR ≥1 linked OAuth provider) — is
    enforced in `services/account_service.py`, not at the DB level.

    `is_pending` distinguishes self-registered users awaiting admin approval
    from users actively deactivated by an admin: both have `is_active=False`,
    but a pending user has `is_pending=True` and appears in the approvals
    queue; a deactivated user has `is_pending=False`.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    # Nullable to allow OAuth-only accounts. See module docstring.
    hashed_password = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    # server_default keeps existing rows valid after batch migration in 003.
    is_pending = Column(Boolean, default=False, nullable=False, server_default=text('0'))

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # selectin so /account/me can serialize linked providers without lazy-loads
    # firing after the AsyncSession's commit boundary.
    oauth_accounts = relationship(
        "OAuthAccount",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
