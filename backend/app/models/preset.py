from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.sql import func

from app.db import Base


class UserPreset(Base):
    """User preset for saving page-specific data selection configurations."""
    __tablename__ = "user_presets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    page_key = Column(String(32), nullable=False)
    name = Column(String(100), nullable=False)
    data = Column(Text, nullable=False)
    is_default = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('user_id', 'page_key', 'name', name='uq_user_page_preset_name'),
    )
