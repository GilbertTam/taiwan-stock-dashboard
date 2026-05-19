from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db import Base


class OAuthAccount(Base):
    """A linked third-party identity (Google / Microsoft) for a user.

    `provider` is a short string ('google' | 'microsoft') validated at the
    application layer — SQLite has no native enum and the rest of this codebase
    uses plain String columns for the same reason.

    `provider_subject` is the OIDC `sub` claim returned by the provider; the
    `(provider, provider_subject)` pair is globally unique and is what links a
    provider sign-in back to a user. `email` is informational only (the email
    the provider reported at link time); it is NOT used for lookup because
    email can change at the provider while `sub` is stable.
    """
    __tablename__ = "oauth_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    provider = Column(String(20), nullable=False)
    provider_subject = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="oauth_accounts")

    __table_args__ = (
        UniqueConstraint('provider', 'provider_subject', name='uq_oauth_provider_subject'),
    )
