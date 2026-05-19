from sqlalchemy import Boolean, Column, Integer, DateTime, text
from sqlalchemy.sql import func

from app.db import Base


class AppSettings(Base):
    """Singleton row holding runtime-mutable application settings.

    The two registration toggles can be changed by an admin at runtime via
    `PUT /users/settings`. There is exactly one row with `id=1`; the row is
    created by Alembic migration 003's `bulk_insert` and by
    `account_service.get_app_settings()` as a fallback for the `create_all`
    fresh-install path.
    """
    __tablename__ = "app_settings"

    id = Column(Integer, primary_key=True)
    # Closed by default — admin must opt in to public sign-up.
    allow_registration = Column(
        Boolean, nullable=False, default=False, server_default=text('0')
    )
    # Approval-by-default when registration is opened, so opening signups
    # doesn't accidentally hand out access.
    require_admin_approval = Column(
        Boolean, nullable=False, default=True, server_default=text('1')
    )

    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
