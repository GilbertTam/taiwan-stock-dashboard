/**
 * @fileoverview Authentication API Service
 *
 * Handles user authentication including login and token management.
 */

import { createApiInstance } from './apiClient';
import { AuthTokens, LoginCredentials } from '@/types';

/**
 * Check whether initial setup is required (no users exist).
 */
export const checkSetupStatus = async (): Promise<{ setup_required: boolean }> => {
    const api = createApiInstance();
    const response = await api.get<{ setup_required: boolean }>('/setup/status');
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
