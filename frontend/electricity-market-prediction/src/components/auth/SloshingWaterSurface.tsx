'use client';

import { Box } from '@mui/material';

export function SloshingWaterSurface() {
  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {/* Water body with gradient */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '100%',
          background:
            'linear-gradient(180deg, rgba(59, 130, 246, 0.12), rgba(34, 197, 94, 0.06), rgba(59, 130, 246, 0.03))',
        }}
      />

      {/* SVG Wave - more realistic water surface */}
      <Box
        component="svg"
        viewBox="0 0 400 40"
        preserveAspectRatio="none"
        sx={{
          position: 'absolute',
          top: -15,
          left: 0,
          width: '200%',
          height: 40,
          animation: 'slosh 4s ease-in-out infinite',
          '@keyframes slosh': {
            '0%, 100%': { transform: 'translateX(0)' },
            '50%': { transform: 'translateX(-25%)' },
          },
        }}
      >
        <defs>
          <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(34, 197, 94, 0.25)" />
            <stop offset="50%" stopColor="rgba(59, 130, 246, 0.25)" />
            <stop offset="100%" stopColor="rgba(34, 197, 94, 0.25)" />
          </linearGradient>
        </defs>
        <path
          d="M0,20 Q25,10 50,20 T100,20 T150,20 T200,20 T250,20 T300,20 T350,20 T400,20 L400,40 L0,40 Z"
          fill="url(#waveGradient)"
        />
      </Box>

      {/* Second wave layer - offset */}
      <Box
        component="svg"
        viewBox="0 0 400 30"
        preserveAspectRatio="none"
        sx={{
          position: 'absolute',
          top: -8,
          left: 0,
          width: '200%',
          height: 30,
          animation: 'slosh2 3.5s ease-in-out infinite 0.5s',
          '@keyframes slosh2': {
            '0%, 100%': { transform: 'translateX(-25%)' },
            '50%': { transform: 'translateX(0)' },
          },
        }}
      >
        <path
          d="M0,15 Q20,8 40,15 T80,15 T120,15 T160,15 T200,15 T240,15 T280,15 T320,15 T360,15 T400,15 L400,30 L0,30 Z"
          fill="rgba(59, 130, 246, 0.15)"
        />
      </Box>

      {/* Sparkle highlights */}
      {[15, 35, 55, 75].map((left, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            top: 2,
            left: `${left}%`,
            width: 3,
            height: 3,
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.6)',
            animation: `sparkle 2s ease-in-out infinite ${i * 0.4}s`,
            '@keyframes sparkle': {
              '0%, 100%': { opacity: 0.3, transform: 'scale(0.8)' },
              '50%': { opacity: 1, transform: 'scale(1.2)' },
            },
          }}
        />
      ))}

      {/* Surface line glow */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background:
            'linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.4) 50%, transparent 90%)',
          animation: 'glow 3s ease-in-out infinite',
          '@keyframes glow': {
            '0%, 100%': { opacity: 0.4 },
            '50%': { opacity: 0.8 },
          },
        }}
      />
    </Box>
  );
}
