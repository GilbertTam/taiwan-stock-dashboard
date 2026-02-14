'use client';

import { Box } from '@mui/material';

export function FlowingWaterTop() {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 5,
        overflow: 'hidden',
        borderRadius: '6px 6px 0 0',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, #22c55e, #3b82f6, #8b5cf6, #22c55e)',
          backgroundSize: '200% 100%',
          animation: 'flowGradient 3s linear infinite',
          '@keyframes flowGradient': {
            '0%': { backgroundPosition: '0% 0%' },
            '100%': { backgroundPosition: '200% 0%' },
          },
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
          backgroundSize: '40% 100%',
          animation: 'shimmer 1.5s linear infinite',
          '@keyframes shimmer': {
            '0%': { backgroundPosition: '-40% 0%' },
            '100%': { backgroundPosition: '140% 0%' },
          },
        }}
      />
    </Box>
  );
}
