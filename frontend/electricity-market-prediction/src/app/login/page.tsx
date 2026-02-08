'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box } from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import {
  TickerMarquee,
  WaveBarBackground,
  LoginFormCard,
} from '@/components/features/auth/login';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

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
      {/* Top ticker */}
      <Box
        sx={{
          borderBottom: '1px solid var(--card-border)',
          backgroundColor: 'var(--card-bg)',
          flexShrink: 0,
        }}
      >
        <TickerMarquee direction="left" speed={40} />
      </Box>

      {/* Main content */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          px: 2,
        }}
      >
        <WaveBarBackground />
        <LoginFormCard onSubmit={login} />
      </Box>

      {/* Bottom ticker */}
      <Box
        sx={{
          borderTop: '1px solid var(--card-border)',
          backgroundColor: 'var(--card-bg)',
          flexShrink: 0,
        }}
      >
        <TickerMarquee direction="right" speed={35} />
      </Box>
    </Box>
  );
}
