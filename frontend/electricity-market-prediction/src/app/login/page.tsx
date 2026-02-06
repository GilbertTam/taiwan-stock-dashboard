'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, TextField, Button, Alert, CircularProgress, InputAdornment, IconButton } from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import BoltIcon from '@mui/icons-material/Bolt';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

// Mock ticker data
const TICKER_DATA = [
  { area: '北海道', price: 12.45, change: 2.3 },
  { area: '東北', price: 11.82, change: -1.5 },
  { area: '東京', price: 14.23, change: 3.8 },
  { area: '中部', price: 13.67, change: 1.2 },
  { area: '北陸', price: 10.98, change: -0.8 },
  { area: '関西', price: 13.12, change: 2.1 },
  { area: '中国', price: 12.34, change: -2.4 },
  { area: '四国', price: 11.56, change: 0.5 },
  { area: '九州', price: 12.89, change: 1.9 },
];

function TickerItem({ area, price, change }: { area: string; price: number; change: number }) {
  const isUp = change >= 0;
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        px: 2,
        py: 0.5,
        mx: 1,
        borderRadius: 1,
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.05)',
        whiteSpace: 'nowrap',
      }}
    >
      <Typography sx={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{area}</Typography>
      <Typography sx={{ fontSize: 13, color: '#fff', fontWeight: 700, fontFamily: 'monospace' }}>¥{price.toFixed(2)}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', color: isUp ? '#4ade80' : '#f87171' }}>
        {isUp ? <TrendingUpIcon sx={{ fontSize: 14 }} /> : <TrendingDownIcon sx={{ fontSize: 14 }} />}
        <Typography sx={{ fontSize: 11, fontWeight: 600, fontFamily: 'monospace' }}>{isUp ? '+' : ''}{change.toFixed(1)}%</Typography>
      </Box>
    </Box>
  );
}

function TickerMarquee({ direction = 'left', speed = 30 }: { direction?: 'left' | 'right'; speed?: number }) {
  const items = [...TICKER_DATA, ...TICKER_DATA, ...TICKER_DATA];
  return (
    <Box sx={{ display: 'flex', overflow: 'hidden', py: 1 }}>
      <Box
        sx={{
          display: 'flex',
          animation: `ticker-${direction} ${speed}s linear infinite`,
          [`@keyframes ticker-${direction}`]: {
            '0%': { transform: direction === 'left' ? 'translateX(0)' : 'translateX(-33.33%)' },
            '100%': { transform: direction === 'left' ? 'translateX(-33.33%)' : 'translateX(0)' },
          },
        }}
      >
        {items.map((item, i) => (
          <TickerItem key={`${item.area}-${i}`} {...item} />
        ))}
      </Box>
    </Box>
  );
}

// Wave bar background - fills entire background, subtle height variation
function WaveBarBackground() {
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
          '0%, 100%': { transform: 'scaleY(0.7)' },  // Less variation: 0.7 to 1.0
          '50%': { transform: 'scaleY(1)' },
        },
      }}
    >
      {Array.from({ length: 80 }).map((_, i) => (
        <Box
          key={i}
          sx={{
            width: 8,
            height: '22%', // Shorter than form
            backgroundColor: i % 3 === 0 ? '#22c55e' : i % 3 === 1 ? '#3b82f6' : '#8b5cf6',
            borderRadius: '3px 3px 0 0',
            transformOrigin: 'bottom',
            animation: 'wave 6s ease-in-out infinite', // 6s speed
            animationDelay: `${i * 0.06}s`,
          }}
        />
      ))}
    </Box>
  );
}

// Flowing water top effect
function FlowingWaterTop() {
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
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
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

// Enhanced sloshing water surface effect
function SloshingWaterSurface() {
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
          background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.12), rgba(34, 197, 94, 0.06), rgba(59, 130, 246, 0.03))',
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
          background: 'linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.4) 50%, transparent 90%)',
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

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [focused, setFocused] = useState<'username' | 'password' | null>(null);
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login({ username, password });
    } catch (err) {
      console.error('Login failed', err);
      setError('登入失敗，請檢查帳號密碼');
    } finally {
      setIsLoading(false);
    }
  };

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
      <Box sx={{ borderBottom: '1px solid var(--card-border)', backgroundColor: 'var(--card-bg)', flexShrink: 0 }}>
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
        {/* Wave bar background - fills entire area */}
        <WaveBarBackground />

        {/* Login form */}
        <Box
          component="form"
          onSubmit={handleSubmit}
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

          <Box sx={{ position: 'relative', zIndex: 1 }}>
            {/* Logo */}
            <Box sx={{ textAlign: 'center', mb: 3, mt: 1 }}>
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  mx: 'auto',
                  mb: 1.5,
                  borderRadius: 1.5,
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)',
                }}
              >
                <BoltIcon sx={{ fontSize: 28, color: '#fff' }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--foreground)', fontSize: 18 }}>
                日本電力市場儀表板
              </Typography>
              <Typography sx={{ color: 'var(--muted)', fontSize: 12 }}>
                HD Japan Electricity Market
              </Typography>
            </Box>

            {error && (
              <Alert
                severity="error"
                sx={{
                  mb: 2,
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  '& .MuiAlert-icon': { color: '#f87171' },
                }}
              >
                {error}
              </Alert>
            )}

            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: 11, color: 'var(--muted)', mb: 0.5, ml: 0.5, fontWeight: 500 }}>帳號</Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="請輸入帳號"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setFocused('username')}
                onBlur={() => setFocused(null)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutlineIcon sx={{ fontSize: 18, color: focused === 'username' ? 'var(--primary)' : 'var(--muted)', transition: 'color 0.2s' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(4px)',
                    '& fieldset': { borderColor: 'var(--card-border)' },
                    '&:hover fieldset': { borderColor: 'var(--primary)' },
                    '&.Mui-focused fieldset': { borderColor: 'var(--primary)' },
                  },
                  '& .MuiInputBase-input': { color: 'var(--foreground)' },
                }}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography sx={{ fontSize: 11, color: 'var(--muted)', mb: 0.5, ml: 0.5, fontWeight: 500 }}>密碼</Typography>
              <TextField
                fullWidth
                size="small"
                type={showPassword ? 'text' : 'password'}
                placeholder="請輸入密碼"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ fontSize: 18, color: focused === 'password' ? 'var(--primary)' : 'var(--muted)', transition: 'color 0.2s' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small" sx={{ color: 'var(--muted)' }}>
                        {showPassword ? <VisibilityOffIcon sx={{ fontSize: 18 }} /> : <VisibilityIcon sx={{ fontSize: 18 }} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(4px)',
                    '& fieldset': { borderColor: 'var(--card-border)' },
                    '&:hover fieldset': { borderColor: 'var(--primary)' },
                    '&.Mui-focused fieldset': { borderColor: 'var(--primary)' },
                  },
                  '& .MuiInputBase-input': { color: 'var(--foreground)' },
                }}
              />
            </Box>

            <Button
              type="submit"
              fullWidth
              disabled={isLoading || !username || !password}
              sx={{
                py: 1.25,
                borderRadius: 1,
                fontSize: 14,
                fontWeight: 600,
                textTransform: 'none',
                backgroundColor: 'var(--primary)',
                color: '#fff',
                '&:hover': { backgroundColor: 'var(--primary)', filter: 'brightness(1.1)' },
                '&.Mui-disabled': { backgroundColor: 'rgba(59, 130, 246, 0.3)', color: 'rgba(255,255,255,0.5)' },
              }}
            >
              {isLoading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : '登入'}
            </Button>

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 10, color: 'var(--muted)' }}>© 2026 HD Research</Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Bottom ticker */}
      <Box sx={{ borderTop: '1px solid var(--card-border)', backgroundColor: 'var(--card-bg)', flexShrink: 0 }}>
        <TickerMarquee direction="right" speed={35} />
      </Box>
    </Box>
  );
}
