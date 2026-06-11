/**
 * @fileoverview Services Barrel Export — auth/account/admin only.
 */

// API Client utilities
export { createApiInstance, getAccessToken, createAuthenticatedApi } from './apiClient';

// Authentication
export {
    login,
    register,
    fetchMe,
    fetchOAuthProviders,
    oauthLoginUrl,
    checkSetupStatus,
    createAdminUser,
    createDefaultAdmin,
} from './authApi';

// Account self-service
export { setPassword, removePassword, oauthLinkStartUrl, unlinkProvider } from './accountApi';

// Admin user management
export {
    listUsers,
    patchUser,
    approveUser,
    getAdminSettings,
    updateAdminSettings,
} from './adminApi';
