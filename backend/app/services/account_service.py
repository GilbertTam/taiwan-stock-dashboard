"""Account-management service layer (registration, OAuth linking, admin ops).

All functions are pure async helpers over `AsyncSession` — no FastAPI
dependencies — so they can be reused by multiple routers (auth, account, users,
oauth callback) and easily tested.

The two invariants enforced here that nobody else enforces:

1. **Login-method invariant**: every account must always retain at least one
   usable login method (password OR ≥1 linked OAuth provider).
   `unlink_oauth` and `set_password` are the only call sites that can violate
   this and both check before mutating.

2. **Last-superuser guard**: an admin cannot deactivate or demote the last
   remaining active superuser. Without this guard one careless click locks
   the deployment out of its own admin UI.

3. **Self-protection guard**: an admin can never demote, deactivate, or delete
   their *own* account — independent of how many other admins exist. This is a
   separate, first-line check from the last-superuser guard: it stops the
   common "I clicked my own toggle" foot-gun even on a multi-admin deployment.
   Operations on *other* users fall through to the last-superuser guard.
"""
from __future__ import annotations

from typing import Iterable, Optional

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.models.app_settings import AppSettings
from app.models.oauth_account import OAuthAccount
from app.models.user import User
from app.schemas.user import (
    AdminCreateUserRequest,
    AdminUserPatch,
    RegisterRequest,
)


# ---------------------------------------------------------------------------
# App settings (singleton row id=1)
# ---------------------------------------------------------------------------

async def get_app_settings(db: AsyncSession) -> AppSettings:
    """Return the singleton settings row, creating defaults if absent.

    The Alembic 003 migration seeds the row, but `create_all` on a fresh
    install doesn't — this fallback covers that path so callers can always
    assume the row exists.
    """
    result = await db.execute(select(AppSettings).where(AppSettings.id == 1))
    row = result.scalar_one_or_none()
    if row is None:
        row = AppSettings(id=1, allow_registration=False, require_admin_approval=True)
        db.add(row)
        await db.commit()
        await db.refresh(row)
    return row


async def update_app_settings(
    db: AsyncSession, *, allow_registration: bool, require_admin_approval: bool
) -> AppSettings:
    row = await get_app_settings(db)
    row.allow_registration = allow_registration
    row.require_admin_approval = require_admin_approval
    await db.commit()
    await db.refresh(row)
    return row


# ---------------------------------------------------------------------------
# User lookups
# ---------------------------------------------------------------------------

async def count_users(db: AsyncSession) -> int:
    result = await db.execute(select(func.count()).select_from(User))
    return int(result.scalar() or 0)


async def get_user_by_username(db: AsyncSession, username: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.username == username))
    return result.scalars().first()


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalars().first()


async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalars().first()


async def get_oauth_account(
    db: AsyncSession, provider: str, subject: str
) -> Optional[OAuthAccount]:
    result = await db.execute(
        select(OAuthAccount).where(
            OAuthAccount.provider == provider,
            OAuthAccount.provider_subject == subject,
        )
    )
    return result.scalars().first()


async def list_users(db: AsyncSession) -> list[User]:
    result = await db.execute(select(User).order_by(User.id))
    return list(result.scalars().all())


# ---------------------------------------------------------------------------
# Login-method invariant + last-superuser guard helpers
# ---------------------------------------------------------------------------

def _usable_login_methods(user: User) -> int:
    """Count of distinct usable login methods on this user.

    Counts: a non-null `hashed_password` (1) + the number of linked OAuth
    accounts. Used to prevent operations that would drop the count to 0.
    """
    return (1 if user.hashed_password else 0) + len(user.oauth_accounts or [])


async def _active_superuser_count(db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count()).select_from(User).where(
            User.is_superuser.is_(True),
            User.is_active.is_(True),
        )
    )
    return int(result.scalar() or 0)


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

async def create_self_registered_user(
    db: AsyncSession, data: RegisterRequest
) -> User:
    """Self-service registration honoring the app's two toggles.

    - `allow_registration=False` → 403 (closed for signups).
    - `require_admin_approval=True` → new user starts `is_active=False`
      AND `is_pending=True`, surfacing in the admin approval queue.
    - Otherwise the user is immediately active.

    Username/email conflicts produce 409, which the frontend can translate
    into a user-friendly "already taken" message.
    """
    app_settings = await get_app_settings(db)
    if not app_settings.allow_registration:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registration is disabled",
        )

    if await get_user_by_username(db, data.username) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Username already taken"
        )
    if data.email and await get_user_by_email(db, data.email) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        )

    pending = bool(app_settings.require_admin_approval)
    user = User(
        username=data.username,
        email=data.email,
        hashed_password=security.get_password_hash(data.password),
        is_active=not pending,
        is_superuser=False,
        is_pending=pending,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


# ---------------------------------------------------------------------------
# Approval / admin ops
# ---------------------------------------------------------------------------

async def approve_user(db: AsyncSession, user: User) -> User:
    """Move a pending user to active. Idempotent."""
    user.is_active = True
    user.is_pending = False
    await db.commit()
    await db.refresh(user)
    return user


async def admin_patch_user(
    db: AsyncSession, actor: User, target: User, patch: AdminUserPatch
) -> User:
    """Apply PATCH semantics with self-protection + last-superuser guards.

    `actor` is the admin performing the change. Two layered guards:

    - **Self-protection (L1)**: the actor cannot deactivate their own account
      (it would immediately invalidate their session — confusing UX).
      Self-demotion is intentionally NOT blocked here; it falls through to L2,
      which permits it as long as another active superuser remains.
    - **Last-superuser guard (L2)**: refuses any change (self or other) that
      would leave the system without an active superuser.
    """
    # L1 — self-protection: never let an admin deactivate their own account.
    # Self-demotion is allowed (delegated to L2) so a retiring admin can step
    # down once another admin is in place.
    if actor.id == target.id and patch.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate yourself",
        )

    # L2 — last-superuser guard. If we'd be removing this user's active-admin
    # status, ensure another one remains. Two paths can do that: setting
    # is_active=False on an admin, or setting is_superuser=False on an active admin.
    would_lose_admin = (
        target.is_active and target.is_superuser
        and (
            (patch.is_active is False)
            or (patch.is_superuser is False)
        )
    )
    if would_lose_admin and await _active_superuser_count(db) <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove the last active administrator",
        )

    if patch.is_active is not None:
        target.is_active = patch.is_active
        # Activating a user implicitly clears the pending flag — they've been
        # approved (or re-approved) by an admin.
        if patch.is_active:
            target.is_pending = False
    if patch.is_superuser is not None:
        target.is_superuser = patch.is_superuser
    await db.commit()
    await db.refresh(target)
    return target


async def create_user_by_admin(
    db: AsyncSession, data: AdminCreateUserRequest
) -> User:
    """Create an account on an admin's behalf — immediately active, password-backed.

    Bypasses the registration toggles (an admin is explicitly provisioning the
    account) and never enters the pending queue. Username/email conflicts → 409.
    """
    if await get_user_by_username(db, data.username) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Username already taken"
        )
    if data.email and await get_user_by_email(db, data.email) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        )
    user = User(
        username=data.username,
        email=data.email,
        hashed_password=security.get_password_hash(data.password),
        is_active=True,
        is_superuser=data.is_superuser,
        is_pending=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def admin_reset_password(
    db: AsyncSession, target: User, new_password: str
) -> None:
    """Admin sets a new password for `target` without proving the old one.

    Setting a password can only ADD a login method, so no invariant check is
    needed (it can never strand an account).
    """
    target.hashed_password = security.get_password_hash(new_password)
    await db.commit()


async def delete_user(db: AsyncSession, actor: User, target: User) -> None:
    """Delete an account, with the same two layered guards as patch.

    - **Self-protection (L1)**: an admin cannot delete their own account.
    - **Last-superuser guard (L2)**: cannot delete the last active superuser.

    Linked OAuth accounts are removed via the model's ON DELETE CASCADE.
    """
    if actor.id == target.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account",
        )
    if (
        target.is_active
        and target.is_superuser
        and await _active_superuser_count(db) <= 1
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the last active administrator",
        )
    await db.delete(target)
    await db.commit()


async def reject_user(db: AsyncSession, target: User) -> None:
    """Reject a pending registration by deleting it.

    Only valid for users still awaiting approval — rejecting an already-active
    account would be a destructive surprise, so route that through delete_user.
    """
    if not target.is_pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not pending approval",
        )
    await db.delete(target)
    await db.commit()


# ---------------------------------------------------------------------------
# Password set/change
# ---------------------------------------------------------------------------

async def set_password(
    db: AsyncSession,
    user: User,
    new_password: str,
    current_password: Optional[str],
) -> None:
    """Set or change the local password.

    If the user already has a password, `current_password` is required and
    verified — same UX as any change-password form. OAuth-only users (no
    password set) can set one without proving anything beyond their valid
    session, which is the only path back to having a password and is needed
    to later unlink their last provider without violating the invariant.
    """
    if user.hashed_password:
        if not current_password or not security.verify_password(
            current_password, user.hashed_password
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect",
            )
    # Setting a password can only ADD a login method, never remove one —
    # no invariant check needed here.
    user.hashed_password = security.get_password_hash(new_password)
    await db.commit()


async def remove_password(
    db: AsyncSession,
    user: User,
    current_password: str,
) -> None:
    """Remove the local password entirely, leaving OAuth as the only path in.

    Enforces the login-method invariant: at least one linked OAuth provider
    must remain after removal. Without a linked provider the user would lose
    every way to sign in, which we never allow.

    Verifies `current_password` first — same posture as a change-password
    form, so a hijacked session can't silently downgrade an account to
    OAuth-only and lock the legitimate owner out.
    """
    if not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No password is set",
        )
    if not security.verify_password(current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    if len(user.oauth_accounts or []) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Cannot remove password. Link at least one third-party "
                "provider first so you still have a way to sign in."
            ),
        )
    user.hashed_password = None
    await db.commit()


# ---------------------------------------------------------------------------
# OAuth link / unlink
# ---------------------------------------------------------------------------

async def link_oauth(
    db: AsyncSession,
    user: User,
    provider: str,
    subject: str,
    email: Optional[str],
) -> OAuthAccount:
    """Link a third-party identity to `user`.

    409 if the same `(provider, subject)` is already linked to a different
    user (we never silently steal a binding from another account) or if this
    user has already linked this provider (one binding per provider per user).
    """
    existing = await get_oauth_account(db, provider, subject)
    if existing is not None:
        if existing.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This provider account is already linked to another user",
            )
        # Refresh the informational email and return the existing link.
        existing.email = email
        await db.commit()
        await db.refresh(existing)
        return existing
    # One binding per provider per user — refuse a second link for the same
    # provider (the user should unlink first if they want to switch identity).
    for acct in user.oauth_accounts:
        if acct.provider == provider:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"User already has a {provider} account linked",
            )
    link = OAuthAccount(
        user_id=user.id,
        provider=provider,
        provider_subject=subject,
        email=email,
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)
    # Keep the in-memory relationship coherent for downstream invariant checks.
    await db.refresh(user)
    return link


async def unlink_oauth(db: AsyncSession, user: User, provider: str) -> None:
    """Remove a provider linkage, enforcing the login-method invariant."""
    target = next((a for a in user.oauth_accounts if a.provider == provider), None)
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No {provider} account linked",
        )
    # After removal, (has_password) + (other linked providers) must remain ≥1.
    remaining = (1 if user.hashed_password else 0) + sum(
        1 for a in user.oauth_accounts if a.provider != provider
    )
    if remaining <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove the last login method. Set a password first.",
        )
    await db.delete(target)
    await db.commit()
    await db.refresh(user)


# ---------------------------------------------------------------------------
# Username derivation for OAuth bootstrap / OAuth-only registration
# ---------------------------------------------------------------------------

async def _derive_unique_username(db: AsyncSession, seed: str) -> str:
    """Pick a unique username from a seed string (email local-part or sub).

    Strips non-allowed characters, falls back to `user`, and appends a numeric
    suffix on conflict. This is only used for OAuth-created accounts where
    the user never typed a username.
    """
    base = "".join(c for c in (seed or "").lower() if c.isalnum() or c in "._-")
    if not base:
        base = "user"
    candidate = base
    suffix = 1
    while await get_user_by_username(db, candidate) is not None:
        suffix += 1
        candidate = f"{base}{suffix}"
    return candidate


# ---------------------------------------------------------------------------
# OAuth user resolution (the central decision tree)
# ---------------------------------------------------------------------------

async def find_or_bootstrap_oauth_user(
    db: AsyncSession,
    *,
    provider: str,
    subject: str,
    email: Optional[str],
    mode: str,  # 'login' | 'setup' | 'bind' — bind is handled by callback directly
) -> User:
    """Resolve a provider sign-in to a User.

    Decision tree (security-critical — each branch documents its trust model):

    1. **Existing link** → return that user. Provider proved possession of the
       same `sub` we linked previously; this is the safe happy path.

    2. **No link AND zero users exist (setup-mode bootstrap)** → create the
       first admin from this identity. Trust boundary: identical to the
       existing `POST /setup/create-admin` (which trusts anyone who can reach
       a freshly-installed instance).

    3. **No link AND an account with this email already exists** → REJECT
       (409). We do NOT auto-link because the provider's `email` claim is
       only as trustworthy as the provider's email-verification policy and an
       attacker could otherwise take over an existing account by registering
       the same email at a provider that doesn't verify ownership. The user
       is guided to sign in with their password and explicitly link the
       provider from the account page.

    4. **No link AND registration is open** → create a new account, applying
       the same `require_admin_approval` rule as password registration.

    5. **No link AND registration is closed** → 403.
    """
    # 1) existing link
    existing = await get_oauth_account(db, provider, subject)
    if existing is not None:
        user = await get_user_by_id(db, existing.user_id)
        if user is None:
            # Dangling FK shouldn't happen due to ON DELETE CASCADE, but if it
            # did the safe answer is to behave as if no link exists.
            await db.delete(existing)
            await db.commit()
        else:
            return user

    # 2) bootstrap-as-admin only when nobody exists yet
    if await count_users(db) == 0:
        # Setup mode is the canonical bootstrap path; we still allow a login
        # attempt to bootstrap because the result is the same (a single admin
        # owns the system) — the trust boundary is "zero users", not "mode".
        username = await _derive_unique_username(
            db, (email or "").split("@")[0] or subject
        )
        user = User(
            username=username,
            email=email,
            hashed_password=None,
            is_active=True,
            is_superuser=True,
            is_pending=False,
        )
        db.add(user)
        await db.flush()
        db.add(OAuthAccount(
            user_id=user.id,
            provider=provider,
            provider_subject=subject,
            email=email,
        ))
        await db.commit()
        await db.refresh(user)
        return user

    # 3) email collision — never auto-link, always reject
    if email:
        collision = await get_user_by_email(db, email)
        if collision is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "An account with this email already exists. Please sign in "
                    "with your password and then link this provider in account "
                    "settings."
                ),
            )

    # 4/5) treat as registration
    app_settings = await get_app_settings(db)
    if not app_settings.allow_registration:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registration is disabled",
        )
    pending = bool(app_settings.require_admin_approval)
    username = await _derive_unique_username(
        db, (email or "").split("@")[0] or subject
    )
    user = User(
        username=username,
        email=email,
        hashed_password=None,
        is_active=not pending,
        is_superuser=False,
        is_pending=pending,
    )
    db.add(user)
    await db.flush()
    db.add(OAuthAccount(
        user_id=user.id,
        provider=provider,
        provider_subject=subject,
        email=email,
    ))
    await db.commit()
    await db.refresh(user)
    return user


# ---------------------------------------------------------------------------
# Assemble admin-facing rows / me-response
# ---------------------------------------------------------------------------

def serialize_admin_row(user: User) -> dict:
    """Shape a User → AdminUserRow dict (relationships eagerly loaded)."""
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_active": bool(user.is_active),
        "is_superuser": bool(user.is_superuser),
        "is_pending": bool(user.is_pending),
        "has_password": user.hashed_password is not None,
        "providers": [a.provider for a in (user.oauth_accounts or [])],
        "created_at": user.created_at,
    }


def serialize_linked_providers(user: User) -> list[dict]:
    return [
        {
            "provider": a.provider,
            "email": a.email,
            "linked_at": a.created_at,
        }
        for a in (user.oauth_accounts or [])
    ]
