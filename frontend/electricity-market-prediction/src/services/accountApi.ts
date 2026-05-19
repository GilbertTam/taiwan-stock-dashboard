/**
 * @fileoverview Account Self-Service API
 *
 * Endpoints under `/account/*` — password change, OAuth link/unlink.
 * All require an authenticated session.
 */

import { createAuthenticatedApi } from './apiClient';
import { getApiBaseUrl } from '@/utils/apiConfig';

/**
 * Set or change the local password.
 *
 * `current_password` is required when the user already has a password (the
 * backend verifies); OAuth-only users (no password set) can omit it to set
 * their first password.
 */
export const setPassword = async (payload: {
    current_password?: string;
    new_password: string;
}): Promise<void> => {
    const api = createAuthenticatedApi();
    await api.post('/account/password', payload);
};

/**
 * Remove the local password, leaving OAuth as the only sign-in method.
 *
 * Backend enforces the login-method invariant: ≥1 linked OAuth provider
 * must remain afterwards, and the current password must verify (same
 * security posture as a change-password form). The UI is responsible for
 * disabling the button when no provider is linked; this call is the
 * server-side safety net.
 */
export const removePassword = async (currentPassword: string): Promise<void> => {
    const api = createAuthenticatedApi();
    await api.post('/account/password/remove', { current_password: currentPassword });
};

/**
 * Absolute URL to begin binding an OAuth provider to the current account.
 *
 * Like {@link oauthLoginUrl}, this is consumed via `window.location.href`,
 * not axios — the browser must follow the redirect itself so the eventual
 * callback's same-origin cookie reaches our app.
 */
export const oauthLinkStartUrl = (
    provider: 'google' | 'microsoft',
): string => `${getApiBaseUrl()}/account/oauth/${provider}/link/start`;

/**
 * Remove a previously-linked OAuth provider.
 *
 * Backend enforces the login-method invariant: removing the user's last
 * remaining login method (no password + this was their only provider) is
 * rejected with 400. The UI surfaces that error verbatim.
 */
export const unlinkProvider = async (
    provider: 'google' | 'microsoft',
): Promise<void> => {
    const api = createAuthenticatedApi();
    await api.delete(`/account/oauth/${provider}`);
};
