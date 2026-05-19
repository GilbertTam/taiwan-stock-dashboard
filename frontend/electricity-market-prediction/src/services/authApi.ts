/**
 * @fileoverview Authentication API Service
 *
 * Handles user authentication including login, registration, profile
 * hydration, and OAuth provider discovery / redirect URLs.
 */

import { createApiInstance, createAuthenticatedApi } from './apiClient';
import { getApiBaseUrl } from '@/utils/apiConfig';
import type {
    AuthTokens,
    LoginCredentials,
    OAuthProviders,
    RegisterCredentials,
    SetupStatus,
    UserProfile,
} from '@/types';

/**
 * Check whether initial setup is required and read public app config.
 *
 * Returns the OAuth provider availability and the `allow_registration`
 * flag in the same call so the login page can render correctly on first
 * paint without a second round-trip.
 */
export const checkSetupStatus = async (): Promise<SetupStatus> => {
    const api = createApiInstance();
    const response = await api.get<SetupStatus>('/setup/status');
    return response.data;
};

/**
 * Create the first admin user during initial setup.
 * Only works when no users exist in the database.
 */
export const createAdminUser = async (data: {
    username: string;
    email: string;
    password: string;
}): Promise<void> => {
    const api = createApiInstance();
    await api.post('/setup/create-admin', {
        username: data.username,
        email: data.email || null,
        password: data.password,
    });
};

/**
 * Dev convenience: create default admin/1234 user.
 * Only works when no users exist in the database.
 */
export const createDefaultAdmin = async (): Promise<void> => {
    const api = createApiInstance();
    await api.post('/setup/create-default-admin');
};

/**
 * Authenticate user and retrieve tokens.
 *
 * @param credentials - Username and password
 * @returns Auth tokens including access_token and refresh_token
 * @throws Error if authentication fails
 */
export const login = async (credentials: LoginCredentials): Promise<AuthTokens> => {
    const api = createApiInstance();
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    // Auth token endpoint expects x-www-form-urlencoded
    const response = await api.post<AuthTokens>('/auth/token', formData, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });
    return response.data;
};

/**
 * Tell the backend to clear the httponly `access_token` cookie.
 *
 * The frontend can't delete an httponly cookie itself, so without this call
 * the cookie outlives `logout()`. That lets a subsequent `/account/me`
 * (e.g. after a failed OAuth attempt redirects back to /login) silently
 * re-hydrate the previous session.
 *
 * Best-effort: swallow errors so the client always proceeds to clear
 * local state and redirect to /login — a stale cookie is bad, but a stuck
 * logout button is worse.
 */
export const logout = async (): Promise<void> => {
    const api = createApiInstance();
    try {
        await api.post('/auth/logout');
    } catch {
        // Intentionally ignored — local state cleanup still runs.
    }
};

/**
 * Self-service registration. Returns the status that gates how the UI
 * proceeds — `pending` means the account exists but requires admin approval
 * before the user can log in; `active` means they can log in immediately.
 */
export const register = async (
    creds: RegisterCredentials,
): Promise<{ id: number; username: string; status: 'pending' | 'active' }> => {
    const api = createApiInstance();
    const response = await api.post('/auth/register', {
        username: creds.username,
        email: creds.email || null,
        password: creds.password,
    });
    return response.data;
};

/**
 * Hydrate the current user.
 *
 * Uses the httponly cookie when present (via `withCredentials`) so this
 * works in three cases:
 *   1. Standard post-login (Bearer + cookie both present).
 *   2. Direct app mount with only the localStorage Bearer token.
 *   3. OAuth bridge after callback (only the cookie is set).
 *
 * The backend response carries a FRESH access_token in the body so the
 * frontend can rewrite the existing `auth_tokens` storage and keep Bearer
 * + cookie in sync.
 */
export const fetchMe = async (): Promise<{
    profile: UserProfile;
    tokens: AuthTokens;
}> => {
    // Try Bearer header if we already have a token; otherwise fall back to
    // the httponly cookie alone (apiClient sets withCredentials).
    let api;
    try {
        api = createAuthenticatedApi();
    } catch {
        api = createApiInstance();
    }
    const response = await api.get('/account/me');
    const data = response.data;
    const profile: UserProfile = {
        id: data.id,
        username: data.username,
        email: data.email ?? undefined,
        isSuperuser: !!data.is_superuser,
        isActive: !!data.is_active,
        isPending: !!data.is_pending,
        hasPassword: !!data.has_password,
        linkedProviders: data.linked_providers ?? [],
    };
    const tokens: AuthTokens = {
        access_token: data.access_token,
        refresh_token: '',
        username: data.username,
    };
    return { profile, tokens };
};

/**
 * Public: which OAuth provider buttons should render.
 */
export const fetchOAuthProviders = async (): Promise<OAuthProviders> => {
    const api = createApiInstance();
    const response = await api.get<OAuthProviders>('/auth/oauth/providers');
    return response.data;
};

/**
 * Build the absolute URL to start an OAuth login or setup flow.
 *
 * NOTE: this is consumed by `window.location.href = ...` — it is a full-page
 * redirect, NOT an axios call. The browser must visit this URL itself so
 * the cookie set by the eventual callback lands on the same origin.
 */
export const oauthLoginUrl = (
    provider: 'google' | 'microsoft',
    mode: 'login' | 'setup' = 'login',
): string => `${getApiBaseUrl()}/auth/oauth/${provider}/login?mode=${mode}`;
