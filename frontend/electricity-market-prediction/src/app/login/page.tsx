'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress, useMediaQuery, useTheme } from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import { checkSetupStatus } from '@/services/authApi';
import {
  CircuitBoardWithRegions,
  LoginFormCard,
  DevToolSetupButton,
} from '@/components/auth';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));

  // null = loading, true = setup required, false = normal login
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    checkSetupStatus()
      .then((res) => setSetupRequired(res.setup_required))
      .catch(() => setSetupRequired(false)); // fallback to normal login on error
  }, []);

  const handleSetupComplete = () => {
    setSetupRequired(false);
  };

  // While checking setup status, show a centered spinner
  if (setupRequired === null) {
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
      mode={setupRequired ? 'setup' : 'login'}
      onSetupComplete={handleSetupComplete}
    />
  );

  const devButton = setupRequired ? (
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
      {/* Main content: desktop = circuit + form overlay; mobile = form on top + region strip below */}
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
