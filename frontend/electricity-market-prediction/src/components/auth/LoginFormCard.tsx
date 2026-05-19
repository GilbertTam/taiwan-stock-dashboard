'use client';

import { Box } from '@mui/material';
import { CircuitFlowBar } from './CircuitFlowBar';
import { CircuitCardTraces } from './CircuitCardTraces';
import { LoginForm } from './LoginForm';
import { SetupForm } from './SetupForm';
import { RegisterForm } from './RegisterForm';
import type { LoginCredentials, OAuthProviders } from '@/types';

interface LoginFormCardProps {
  onSubmit: (credentials: LoginCredentials) => Promise<void>;
  mode?: 'login' | 'setup' | 'register';
  onSetupComplete?: () => void;
  /** Toggle between login and register modes from inside the form. */
  onSwitchMode?: (next: 'login' | 'register') => void;
  oauthProviders?: OAuthProviders;
  /** Show the "create account" link below the login form. */
  allowRegistration?: boolean;
}

export function LoginFormCard({
  onSubmit,
  mode = 'login',
  onSetupComplete,
  onSwitchMode,
  oauthProviders = { google: false, microsoft: false },
  allowRegistration = false,
}: LoginFormCardProps) {
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: 380,
        p: 3,
        backgroundColor: 'var(--card-bg)',
        backdropFilter: 'blur(16px)',
        borderRadius: 1.5,
        border: '1px solid var(--card-border)',
        boxShadow: 'var(--elevated-shadow)',
        overflow: 'hidden',
        zIndex: 1,
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        '&:focus-within': {
          borderColor: 'var(--primary)',
          boxShadow: 'var(--elevated-shadow), 0 0 0 1px var(--primary)',
        },
      }}
    >
      <CircuitFlowBar />
      <CircuitCardTraces />
      {mode === 'setup' && (
        <SetupForm
          onSetupComplete={onSetupComplete ?? (() => {})}
          oauthProviders={oauthProviders}
        />
      )}
      {mode === 'register' && (
        <RegisterForm
          onSubmit={onSubmit}
          onSwitchToLogin={() => onSwitchMode?.('login')}
          oauthProviders={oauthProviders}
        />
      )}
      {mode === 'login' && (
        <LoginForm
          onSubmit={onSubmit}
          oauthProviders={oauthProviders}
          allowRegistration={allowRegistration}
          onSwitchToRegister={onSwitchMode ? () => onSwitchMode('register') : undefined}
        />
      )}
    </Box>
  );
}
