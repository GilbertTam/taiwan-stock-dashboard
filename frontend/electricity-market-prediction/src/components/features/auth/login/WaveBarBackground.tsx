'use client';

import { Box } from '@mui/material';

export function WaveBarBackground() {
  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        px: 2,
        opacity: 0.3,
        pointerEvents: 'none',
        '@keyframes wave': {
          '0%, 100%': { transform: 'scaleY(0.7)' },
          '50%': { transform: 'scaleY(1)' },
        },
      }}
    >
      {Array.from({ length: 80 }).map((_, i) => (
        <Box
          key={i}
          sx={{
            width: 8,
            height: '22%',
            backgroundColor:
              i % 3 === 0 ? '#22c55e' : i % 3 === 1 ? '#3b82f6' : '#8b5cf6',
            borderRadius: '3px 3px 0 0',
            transformOrigin: 'bottom',
            animation: 'wave 6s ease-in-out infinite',
            animationDelay: `${i * 0.06}s`,
          }}
        />
      ))}
    </Box>
  );
}
