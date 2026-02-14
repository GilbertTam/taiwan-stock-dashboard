'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import BoltIcon from '@mui/icons-material/Bolt';
import type { LoginCredentials } from '@/types';

interface LoginFormProps {
  onSubmit: (credentials: LoginCredentials) => Promise<void>;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [focused, setFocused] = useState<'username' | 'password' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await onSubmit({ username, password });
    } catch (err) {
      console.error('Login failed', err);
      setError('登入失敗，請檢查帳號密碼');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ position: 'relative', zIndex: 1 }}>
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
        <Typography sx={{ fontSize: 11, color: 'var(--muted)', mb: 0.5, ml: 0.5, fontWeight: 500 }}>
          帳號
        </Typography>
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
                <PersonOutlineIcon
                  sx={{
                    fontSize: 18,
                    color: focused === 'username' ? 'var(--primary)' : 'var(--muted)',
                    transition: 'color 0.2s',
                  }}
                />
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
        <Typography sx={{ fontSize: 11, color: 'var(--muted)', mb: 0.5, ml: 0.5, fontWeight: 500 }}>
          密碼
        </Typography>
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
                <LockOutlinedIcon
                  sx={{
                    fontSize: 18,
                    color: focused === 'password' ? 'var(--primary)' : 'var(--muted)',
                    transition: 'color 0.2s',
                  }}
                />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                  size="small"
                  sx={{ color: 'var(--muted)' }}
                >
                  {showPassword ? (
                    <VisibilityOffIcon sx={{ fontSize: 18 }} />
                  ) : (
                    <VisibilityIcon sx={{ fontSize: 18 }} />
                  )}
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
          '&.Mui-disabled': {
            backgroundColor: 'rgba(59, 130, 246, 0.3)',
            color: 'rgba(255,255,255,0.5)',
          },
        }}
      >
        {isLoading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : '登入'}
      </Button>

      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography sx={{ fontSize: 10, color: 'var(--muted)' }}>© 2026 HD Research</Typography>
      </Box>
    </Box>
  );
}
