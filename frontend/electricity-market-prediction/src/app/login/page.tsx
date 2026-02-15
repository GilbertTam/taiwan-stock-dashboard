'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import {
  CircuitBoardWithRegions,
  LoginFormCard,
} from '@/components/auth';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

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
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 0 }}>
              <LoginFormCard onSubmit={login} />
            </Box>
            <CircuitBoardWithRegions />
          </>
        ) : (
          <>
            <CircuitBoardWithRegions />
            <LoginFormCard onSubmit={login} />
          </>
        )}
      </Box>
    </Box>
  );
}
