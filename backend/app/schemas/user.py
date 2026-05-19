from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field

# ---------------------------------------------------------------------------
# Existing schemas (kept untouched for back-compat with current callers)
# ---------------------------------------------------------------------------

# Shared properties
class UserBase(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = True
    is_superuser: bool = False

# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str

# Properties to return to client
class User(UserBase):
    id: int

    class Config:
        from_attributes = True

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None


# ---------------------------------------------------------------------------
# Account-management schemas (new)
# ---------------------------------------------------------------------------

class LinkedProvider(BaseModel):
    """One row of a user's linked third-party identities."""
    provider: str
    email: Optional[str] = None
    linked_at: Optional[datetime] = None


class MeResponse(BaseModel):
    """Hydration payload for `GET /account/me`.

    Carries everything the frontend needs to populate AuthContext: identity,
    role, account-state flags, login-method status, linked providers, and a
    fresh JWT so the OAuth bridge can populate the existing `auth_tokens`
    localStorage/js-cookie that AuthContext already expects (the cookie is set
    by the server too, but the body copy keeps Bearer-token parity).
    """
    id: int
    username: str
    email: Optional[EmailStr] = None
    is_superuser: bool
    is_active: bool
    is_pending: bool
    has_password: bool
    linked_providers: List[LinkedProvider]
    access_token: str
    token_type: str = "bearer"


class RegisterRequest(BaseModel):
    """Self-service registration body (POST /auth/register)."""
    username: str = Field(min_length=3, max_length=64)
    email: Optional[EmailStr] = None
    password: str = Field(min_length=8, max_length=128)


class RegisterResponse(BaseModel):
    """Whether the new account is immediately usable or awaiting approval."""
    id: int
    username: str
    status: str  # "active" | "pending"


class AdminUserRow(BaseModel):
    """Row in the admin user table."""
    id: int
    username: str
    email: Optional[EmailStr] = None
    is_active: bool
    is_superuser: bool
    is_pending: bool
    has_password: bool
    providers: List[str]
    created_at: Optional[datetime] = None


class AdminUserPatch(BaseModel):
    """Partial-update for admin user editing. None = leave unchanged."""
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None


class AppSettingsSchema(BaseModel):
    """The two runtime registration toggles."""
    allow_registration: bool
    require_admin_approval: bool

    class Config:
        from_attributes = True


class SetPasswordRequest(BaseModel):
    """Set or change the user's local password.

    `current_password` is required only when the user already has a password
    (verified server-side); OAuth-only users without a password set it for the
    first time with `new_password` alone.
    """
    current_password: Optional[str] = None
    new_password: str = Field(min_length=8, max_length=128)


class RemovePasswordRequest(BaseModel):
    """Remove the user's local password (must keep ≥1 linked OAuth provider).

    `current_password` is always required even though the session is already
    authenticated — same security posture as the change-password form.
    """
    current_password: str = Field(min_length=1)


class ProvidersResponse(BaseModel):
    """Which third-party providers are configured / enabled on this server."""
    google: bool
    microsoft: bool


class SetupStatusResponse(BaseModel):
    """Public bootstrap status for the login page.

    Extended (additively) to also expose `allow_registration` and the OAuth
    provider availability so the login/setup form can render appropriately on
    first paint without a second round-trip.
    """
    setup_required: bool
    allow_registration: bool
    oauth_providers: ProvidersResponse
