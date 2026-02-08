/**
 * @fileoverview Authentication Types
 */

/**
 * Authentication tokens returned after login.
 */
export interface AuthTokens {
    /** JWT refresh token for obtaining new access tokens */
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
