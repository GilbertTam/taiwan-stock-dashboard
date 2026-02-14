/**
 * @fileoverview Authentication API Service
 *
 * Handles user authentication including login and token management.
 */

import { createApiInstance } from './apiClient';
import { AuthTokens, LoginCredentials } from '@/types';

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
