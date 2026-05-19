'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

import { AuthTokens, LoginCredentials, UserProfile } from '@/types';
import { fetchMe, login as loginApi, logout as logoutApi } from '@/services/authApi';

interface AuthContextType {
    /** True once we have a valid session (Bearer + cookie). */
    isAuthenticated: boolean;
    /** Username — kept for back-compat with sidebar/UserMenu; prefer `profile`. */
    user: string | null;
    /** Hydrated profile (role, linked providers, etc.). Null until /account/me succeeds. */
    profile: UserProfile | null;
    /** Convenience getter for the admin guard / sidebar role label. */
    isSuperuser: boolean;
    /**
     * True while the very first hydration attempt is in flight.
     *
     * `RouteGuard` uses this to render a `<LoadingOverlay/>` instead of
     * immediately redirecting to `/login` — without it, every page reload
     * flashes the login page for a frame before AuthContext finishes
     * reading localStorage + calling /account/me.
     */
    isLoading: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    logout: () => void;
    /** Re-fetch /account/me — call after link/unlink, password change, OAuth bridge. */
    refreshProfile: () => Promise<void>;
    getAccessToken: () => string | null;
}

const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    user: null,
    profile: null,
    isSuperuser: false,
    isLoading: true,
    login: async () => { },
    logout: () => { },
    refreshProfile: async () => { },
    getAccessToken: () => null,
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
    children: ReactNode;
}

/**
 * Persist tokens to localStorage + js-cookie so the existing
 * `apiClient.getAccessToken()` reader (which checks both stores) keeps
 * working unchanged.
 */
function persistTokens(tokens: AuthTokens) {
    if (typeof window === 'undefined') return;
    const json = JSON.stringify(tokens);
    localStorage.setItem('auth_tokens', json);
    Cookies.set('auth_tokens', json, { expires: 7, path: '/' });
}

function clearTokens() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('auth_tokens');
    Cookies.remove('auth_tokens', { path: '/' });
}

function readStoredTokens(): AuthTokens | null {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('auth_tokens');
    if (!stored) return null;
    try {
        return JSON.parse(stored) as AuthTokens;
    } catch {
        clearTokens();
        return null;
    }
}

export function AuthProvider({ children }: AuthProviderProps) {
    // All hooks declared up front — CLAUDE.md: no hooks after early returns.
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<string | null>(null);
    const [tokens, setTokens] = useState<AuthTokens | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const clearSession = useCallback(() => {
        setTokens(null);
        setUser(null);
        setProfile(null);
        setIsAuthenticated(false);
        clearTokens();
    }, []);

    /**
     * Fetch /account/me and reconcile state.
     *
     * The endpoint returns a fresh access_token in the body so we can keep
     * `auth_tokens` localStorage/js-cookie aligned with the (also-refreshed)
     * httponly session cookie. On 401 we clear state but do NOT redirect —
     * RouteGuard owns redirects so the hydration flow stays UI-agnostic.
     */
    const refreshProfile = useCallback(async () => {
        try {
            const { profile: p, tokens: t } = await fetchMe();
            setProfile(p);
            setTokens(t);
            setUser(p.username);
            setIsAuthenticated(true);
            persistTokens(t);
        } catch {
            clearSession();
        }
    }, [clearSession]);

    // Boot-time hydration. Reads localStorage first so the UI knows
    // it MIGHT be authenticated, then asks the server for the truth. The
    // double-write is what makes OAuth (cookie-only) sessions seamlessly
    // join the standard Bearer-token flow on first reload.
    useEffect(() => {
        let cancelled = false;
        const stored = readStoredTokens();
        if (stored) {
            setTokens(stored);
            setUser(stored.username);
            setIsAuthenticated(true);
        }
        // Always try /account/me — even without localStorage we may have an
        // OAuth-set httponly cookie waiting to be honored.
        (async () => {
            try {
                const { profile: p, tokens: t } = await fetchMe();
                if (cancelled) return;
                setProfile(p);
                setTokens(t);
                setUser(p.username);
                setIsAuthenticated(true);
                persistTokens(t);
            } catch {
                if (cancelled) return;
                // No valid session — clear any optimistic state from localStorage.
                clearSession();
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const login = useCallback(async (credentials: LoginCredentials) => {
        const authTokens = await loginApi(credentials);
        setTokens(authTokens);
        setUser(authTokens.username);
        setIsAuthenticated(true);
        persistTokens(authTokens);
        // Hydrate the role BEFORE navigating so RouteGuard sees the correct
        // `isSuperuser` on first render and doesn't bounce admins around.
        try {
            const { profile: p, tokens: t } = await fetchMe();
            setProfile(p);
            setTokens(t);
            persistTokens(t);
        } catch {
            // Login succeeded but /account/me failed — leave authenticated
            // (token is good) and let the next refresh re-attempt.
        }
        sessionStorage.setItem('fromLogin', 'true');
        router.push('/dashboard');
    }, [router]);

    const logout = useCallback(() => {
        // Fire the backend call first so the httponly access_token cookie is
        // cleared. Without this, a stale cookie can silently re-hydrate the
        // session — most visibly when a failed OAuth attempt (e.g. pending
        // approval) redirects back to /login and the AuthProvider's mount
        // effect calls /account/me, which restores the previous user.
        // Best-effort: don't await — if the network call fails, local state
        // is still cleared and the user lands on /login.
        void logoutApi();
        clearSession();
        router.push('/login');
    }, [clearSession, router]);

    const getAccessToken = useCallback(
        () => tokens?.access_token ?? null,
        [tokens],
    );

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                user,
                profile,
                isSuperuser: !!profile?.isSuperuser,
                isLoading,
                login,
                logout,
                refreshProfile,
                getAccessToken,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
