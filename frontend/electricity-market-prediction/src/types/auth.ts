/**
 * @fileoverview Authentication Types
 */

/**
 * Authentication tokens returned after login (legacy shape kept for the
 * existing `auth_tokens` localStorage/cookie). `refresh_token` is unused but
 * preserved so consumers reading the stored JSON don't break.
 */
export interface AuthTokens {
    /** JWT refresh token for obtaining new access tokens (currently unused) */
    refresh_token: string;
    /** JWT access token for API authentication */
    access_token: string;
    /** Authenticated username */
    username: string;
}

/**
 * Login request credentials.
 */
export interface LoginCredentials {
    /** User's username */
    username: string;
    /** User's password */
    password: string;
}

/**
 * Self-service registration credentials.
 */
export interface RegisterCredentials {
    username: string;
    email?: string;
    password: string;
}

/**
 * Linked third-party identity attached to a user account.
 */
export interface LinkedProvider {
    /** 'google' | 'microsoft' */
    provider: 'google' | 'microsoft';
    /** Email reported by the provider at link time (informational) */
    email?: string;
    /** When this linkage was created */
    linked_at?: string;
}

/**
 * Hydrated user profile from `GET /account/me`.
 *
 * Camel-cased at the service-layer boundary; snake_case never leaks past
 * `services/`. `AuthContext` derives `isSuperuser` etc. from this shape.
 */
export interface UserProfile {
    id: number;
    username: string;
    email?: string;
    isSuperuser: boolean;
    isActive: boolean;
    isPending: boolean;
    hasPassword: boolean;
    linkedProviders: LinkedProvider[];
}

/**
 * Which OAuth providers are configured server-side.
 */
export interface OAuthProviders {
    google: boolean;
    microsoft: boolean;
}

/**
 * Public bootstrap info returned by `GET /setup/status`.
 *
 * Extended (additively) to also carry `allow_registration` and the OAuth
 * provider availability so the login page can render the correct buttons +
 * "create account" link on first paint.
 */
export interface SetupStatus {
    setup_required: boolean;
    allow_registration: boolean;
    oauth_providers: OAuthProviders;
}

/**
 * Row in the admin user-management table.
 */
export interface AdminUserRow {
    id: number;
    username: string;
    email?: string;
    is_active: boolean;
    is_superuser: boolean;
    is_pending: boolean;
    has_password: boolean;
    providers: string[];
    created_at?: string;
}

/**
 * Partial update for `PATCH /users/{id}`. `undefined` = leave unchanged.
 */
export interface AdminUserPatch {
    is_active?: boolean;
    is_superuser?: boolean;
}

/**
 * The two runtime registration toggles.
 */
export interface AppSettings {
    allow_registration: boolean;
    require_admin_approval: boolean;
}
