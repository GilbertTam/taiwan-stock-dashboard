'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Box, CircularProgress, Snackbar, useMediaQuery, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/context/AuthContext';
import { checkSetupStatus } from '@/services/authApi';
import {
  CircuitBoardWithRegions,
  LoginFormCard,
  DevToolSetupButton,
} from '@/components/auth';
import type { OAuthProviders, SetupStatus } from '@/types';

const DEFAULT_PROVIDERS: OAuthProviders = { google: false, microsoft: false };

// Next.js 15 requires `useSearchParams()` to live below a <Suspense> boundary
// because the page would otherwise bail out of static rendering during the
// `next build` prerender. The inner component is the real implementation;
// the default export just wraps it in Suspense + a loading fallback that
// mirrors the spinner used while we fetch /setup/status.
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageFallback() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--background)',
      }}
    >
      <CircularProgress size={32} sx={{ color: 'var(--primary)' }} />
    </Box>
  );
}

function LoginPageInner() {
  // CLAUDE.md: all hooks before any conditional return.
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
  const { t } = useTranslation('auth');

  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  // Surface errors carried by ?error=... when the OAuth bridge redirects here.
  const oauthError = searchParams?.get('error') ?? null;
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    checkSetupStatus()
      .then((res) => setStatus(res))
      .catch(() => setStatus({
        // Fall back to a normal-login posture if the public config endpoint
        // is unreachable — surface the error UX but don't strand the user.
        setup_required: false,
        allow_registration: false,
        oauth_providers: DEFAULT_PROVIDERS,
      }));
  }, []);

  useEffect(() => {
    if (!oauthError) return;
    const key = `errors.${oauthError}`;
    // Fall back to the generic OAuth-failed message if the specific code
    // doesn't have a localized string (e.g. provider-side weirdness).
    const translated = t(key, { defaultValue: t('errors.oauthFailed') });
    setErrorMsg(translated);
  }, [oauthError, t]);

  const handleSetupComplete = () => {
    if (status) setStatus({ ...status, setup_required: false });
  };

  const oauthProviders = status?.oauth_providers ?? DEFAULT_PROVIDERS;
  const cardMode: 'login' | 'register' | 'setup' = useMemo(() => {
    if (!status) return 'login';
    if (status.setup_required) return 'setup';
    return mode;
  }, [status, mode]);

  if (status === null) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--background)',
        }}
      >
        <CircularProgress size={32} sx={{ color: 'var(--primary)' }} />
      </Box>
    );
  }

  const formCard = (
    <LoginFormCard
      onSubmit={login}
      mode={cardMode}
      onSetupComplete={handleSetupComplete}
      onSwitchMode={(next) => setMode(next)}
      oauthProviders={oauthProviders}
      allowRegistration={status.allow_registration}
    />
  );

  const devButton = status.setup_required ? (
    <DevToolSetupButton onSetupComplete={handleSetupComplete} />
  ) : null;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        backgroundColor: 'var(--background)',
        overflow: 'hidden',
      }}
    >
      <Snackbar
        open={!!errorMsg}
        autoHideDuration={6000}
        onClose={() => setErrorMsg(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={() => setErrorMsg(null)}
          sx={{ maxWidth: 480 }}
        >
          {errorMsg}
        </Alert>
      </Snackbar>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: isCompact ? 'column' : undefined,
          alignItems: isCompact ? 'stretch' : 'center',
          justifyContent: isCompact ? 'flex-start' : 'center',
          position: 'relative',
          overflow: 'hidden',
          px: { xs: 1.5, sm: 2, md: 2, lg: 3 },
          py: isCompact ? { xs: 1.5, sm: 2 } : 0,
        }}
      >
        {isCompact ? (
          <>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minHeight: 0 }}>
              {formCard}
              {devButton}
            </Box>
            <CircuitBoardWithRegions />
          </>
        ) : (
          <>
            <CircuitBoardWithRegions />
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {formCard}
              {devButton}
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
