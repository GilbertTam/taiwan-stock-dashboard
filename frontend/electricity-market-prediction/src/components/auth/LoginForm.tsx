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
import { useTranslation } from 'react-i18next';

interface LoginFormProps {
  onSubmit: (credentials: LoginCredentials) => Promise<void>;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const { t } = useTranslation('auth');
  const { t: tCommon } = useTranslation('common');
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
      setError(tCommon('auth.loginFailed'));
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
            width: 56,
            height: 56,
            mx: 'auto',
            mb: 1.5,
            borderRadius: 1.5,
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(0, 255, 157, 0.25)',
          }}
        >
          <BoltIcon sx={{ fontSize: 30, color: 'var(--primary-foreground)' }} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--foreground)', fontSize: 18 }}>
          {t('title')}
        </Typography>
        <Typography sx={{ color: 'var(--text-secondary)', fontSize: 12 }}>
          {t('subtitle')}
        </Typography>
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 2,
            backgroundColor: 'color-mix(in srgb, var(--error) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--error) 40%, transparent)',
            color: 'var(--error)',
            '& .MuiAlert-icon': { color: 'var(--error)' },
          }}
        >
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: 11, color: 'var(--text-secondary)', mb: 0.5, ml: 0.5, fontWeight: 500 }}>
          {t('username')}
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder={t('usernamePlaceholder')}
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
                    color: focused === 'username' ? 'var(--primary)' : 'var(--text-secondary)',
                    transition: 'color 0.2s',
                  }}
                />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'var(--hover-bg)',
              borderRadius: 1,
              '& fieldset': { borderColor: 'var(--card-border)' },
              '&:hover fieldset': { borderColor: 'var(--primary)' },
              '&.Mui-focused fieldset': { borderColor: 'var(--primary)', borderWidth: '1px' },
            },
            '& .MuiInputBase-input': { color: 'var(--foreground)' },
          }}
        />
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: 11, color: 'var(--text-secondary)', mb: 0.5, ml: 0.5, fontWeight: 500 }}>
          {t('password')}
        </Typography>
        <TextField
          fullWidth
          size="small"
          type={showPassword ? 'text' : 'password'}
          placeholder={t('passwordPlaceholder')}
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
                    color: focused === 'password' ? 'var(--primary)' : 'var(--text-secondary)',
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
                  sx={{ color: 'var(--text-secondary)' }}
                  aria-label={showPassword ? tCommon('auth.hidePassword') : tCommon('auth.showPassword')}
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
              backgroundColor: 'var(--hover-bg)',
              borderRadius: 1,
              '& fieldset': { borderColor: 'var(--card-border)' },
              '&:hover fieldset': { borderColor: 'var(--primary)' },
              '&.Mui-focused fieldset': { borderColor: 'var(--primary)', borderWidth: '1px' },
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
          color: 'var(--primary-foreground)',
          '&:hover': { backgroundColor: 'var(--primary)', filter: 'brightness(1.08)' },
          '&.Mui-disabled': {
            backgroundColor: 'var(--hover-bg)',
            color: 'var(--text-secondary)',
          },
        }}
      >
        {isLoading ? <CircularProgress size={20} sx={{ color: 'var(--primary-foreground)' }} /> : t('login')}
      </Button>

      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography sx={{ fontSize: 10, color: 'var(--text-secondary)' }}>{t('copyright')}</Typography>
      </Box>
    </Box>
  );
}
