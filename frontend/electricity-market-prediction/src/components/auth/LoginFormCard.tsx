'use client';

import { Box } from '@mui/material';
import { FlowingWaterTop } from './FlowingWaterTop';
import { SloshingWaterSurface } from './SloshingWaterSurface';
import { LoginForm } from './LoginForm';
import type { LoginCredentials } from '@/types';

interface LoginFormCardProps {
  onSubmit: (credentials: LoginCredentials) => Promise<void>;
}

export function LoginFormCard({ onSubmit }: LoginFormCardProps) {
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: 360,
        p: 3,
        backgroundColor: 'var(--card-bg)',
        borderRadius: 2,
        border: '2px solid var(--card-border)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden',
        zIndex: 1,
        // Battery terminal
        '&::before': {
          content: '""',
          position: 'absolute',
          top: -10,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 60,
          height: 12,
          backgroundColor: 'var(--card-bg)',
          border: '2px solid var(--card-border)',
          borderBottom: 'none',
          borderRadius: '6px 6px 0 0',
        },
      }}
    >
      <FlowingWaterTop />
      <SloshingWaterSurface />
      <LoginForm onSubmit={onSubmit} />
    </Box>
  );
}
