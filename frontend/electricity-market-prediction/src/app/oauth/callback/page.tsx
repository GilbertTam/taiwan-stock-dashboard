'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Box, Button, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/context/AuthContext';
import { LoadingOverlay } from '@/components/overlay/LoadingOverlay';

/**
 * OAuth bridge page (`/oauth/callback`).
 *
 * Sits at the top level (NOT under /dashboard, NOT under /login) so:
 *   - RouteGuard doesn't bounce it for being unauthenticated mid-handshake.
 *   - It is reachable both from successful sign-in (`?ok=1`), provider/state
 *     errors (`?error=<code>`), and bind-completion (`?linked=<provider>`).
 *
 * On success it calls `refreshProfile()` (which hits /account/me, cookie
 * auto-sent), populates AuthContext, and redirects to the final destination.
 * On error it surfaces a localized message and offers a way back to /login.
 *
 * The default export wraps the implementation in <Suspense> because Next.js 15
 * requires that of any page using `useSearchParams()` — otherwise the
 * production build's prerender pass errors with "missing-suspense-with-csr-bailout".
 * All hooks in the inner component are declared before any conditional return
 * per CLAUDE.md.
 */
export default function OAuthCallback() {
    return (
        <Suspense fallback={<LoadingOverlay />}>
            <OAuthCallbackInner />
        </Suspense>
    );
}

function OAuthCallbackInner() {
    const { t } = useTranslation('auth');
    const router = useRouter();
    const searchParams = useSearchParams();
    const { refreshProfile } = useAuth();

    const ok = searchParams?.get('ok');
    const linked = searchParams?.get('linked');
    const errorCode = searchParams?.get('error');

    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        if (errorCode) {
            // Localize the error code; the backend chose stable codes so the
            // mapping lives entirely in the i18n file.
            const key = `errors.${errorCode}`;
            const msg = t(key, { defaultValue: t('errors.oauthFailed') });
            if (!cancelled) setErrorMsg(msg);
            return;
        }
        (async () => {
            try {
                await refreshProfile();
                if (cancelled) return;
                if (linked) {
                    // Bind flow: route to /dashboard, but ask the dashboard
                    // layout to pop the Settings modal open on the Account
                    // tab so the user immediately sees their new link. We
                    // hand off via sessionStorage because the modal lives
                    // inside the dashboard layout's React tree and the
                    // bridge has already unmounted by then.
                    sessionStorage.setItem('hdjp-settings-tab-on-mount', 'account');
                    router.replace('/dashboard');
                } else if (ok) {
                    router.replace('/dashboard');
                } else {
                    // No params at all — probably a refresh after success;
                    // try hydration anyway, then go home.
                    router.replace('/dashboard');
                }
            } catch {
                if (!cancelled) {
                    setErrorMsg(t('errors.oauthFailed'));
                }
            }
        })();
        return () => { cancelled = true; };
    }, [errorCode, linked, ok, refreshProfile, router, t]);

    if (errorMsg) {
        return (
            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    px: 2,
                    backgroundColor: 'var(--background)',
                }}
            >
                <Alert severity="error" sx={{ maxWidth: 480 }}>
                    {errorMsg}
                </Alert>
                <Typography sx={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                    {t('callback.failedHint')}
                </Typography>
                <Button
                    variant="contained"
                    onClick={() => router.replace('/login')}
                    sx={{ textTransform: 'none' }}
                >
                    {t('callback.backToLogin')}
                </Button>
            </Box>
        );
    }

    return <LoadingOverlay />;
}
