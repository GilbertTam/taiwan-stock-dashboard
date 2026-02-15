/**
 * @fileoverview API Client Configuration
 *
 * Shared utilities for creating API instances and managing authentication tokens.
 * Used by all feature-specific API modules.
 */

import axios, { AxiosInstance } from 'axios';
import Cookies from 'js-cookie';
import { getApiBaseUrl } from '@/utils/apiConfig';
import { AuthTokens } from '@/types';

const API_BASE_URL = getApiBaseUrl();

/**
 * Create an axios instance configured for API requests.
 *
 * @param token - Optional JWT access token for authenticated requests
 * @returns Configured axios instance
 */
export const createApiInstance = (token?: string): AxiosInstance => {
    const instance = axios.create({
        baseURL: API_BASE_URL,
        withCredentials: true,
    });

    if (token) {
        instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    return instance;
};

/**
 * Retrieve the access token from storage.
 *
 * Checks cookies first (for SSR compatibility), then falls back to
 * localStorage. Returns null if no token is found or parsing fails.
 *
 * @returns Access token string or null if not found
 */
export const getAccessToken = (): string | null => {
    // Guard for SSR environment where window is undefined
    if (typeof window === 'undefined') return null;

    // Try cookie first (preferred for SSR)
    const cookieTokens = Cookies.get('auth_tokens');
    if (cookieTokens) {
        try {
            const tokens = JSON.parse(cookieTokens) as AuthTokens;
            return tokens.access_token;
        } catch (error) {
            console.error('Failed to parse access token from cookie', error);
        }
    }

    // Fallback to localStorage
    const storedTokens = localStorage.getItem('auth_tokens');
    if (storedTokens) {
        try {
            const tokens = JSON.parse(storedTokens) as AuthTokens;
            return tokens.access_token;
        } catch (error) {
            console.error('Failed to parse access token from localStorage', error);
        }
    }

    return null;
};

/**
 * Create an authenticated API instance.
 * Throws if no access token is available.
 */
export const createAuthenticatedApi = (): AxiosInstance => {
    const token = getAccessToken();
    if (!token) throw new Error('No access token available');
    return createApiInstance(token);
};
