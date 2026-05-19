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
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import BoltIcon from '@mui/icons-material/Bolt';
import { createAdminUser } from '@/services/authApi';
import { useTranslation } from 'react-i18next';

import { OAuthButtons } from './OAuthButtons';
import type { OAuthProviders } from '@/types';

interface SetupFormProps {
  onSetupComplete: () => void;
  oauthProviders?: OAuthProviders;
}

export function SetupForm({
  onSetupComplete,
  oauthProviders = { google: false, microsoft: false },
}: SetupFormProps) {
  const { t } = useTranslation('auth');
  const { t: tCommon } = useTranslation('common');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const canSubmit = username && password && confirmPassword && !passwordMismatch && !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setIsLoading(true);
    try {
      await createAdminUser({ username, email, password });
      onSetupComplete();
    } catch {
      setError(t('setup.createFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      backgroundColor: 'var(--hover-bg)',
      borderRadius: 1,
      '& fieldset': { borderColor: 'var(--card-border)' },
      '&:hover fieldset': { borderColor: 'var(--primary)' },
      '&.Mui-focused fieldset': { borderColor: 'var(--primary)', borderWidth: '1px' },
    },
    '& .MuiInputBase-input': { color: 'var(--foreground)' },
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ position: 'relative', zIndex: 1 }}>
      {/* Logo */}
      <Box sx={{ textAlign: 'center', mb: 2.5, mt: 1 }}>
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
            boxShadow: 'var(--logo-glow)',
          }}
        >
          <BoltIcon sx={{ fontSize: 30, color: 'var(--primary-foreground)' }} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--foreground)', fontSize: 18 }}>
          {t('setup.title')}
        </Typography>
        <Typography sx={{ color: 'var(--text-secondary)', fontSize: 12 }}>
          {t('setup.subtitle')}
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

      {/* Username */}
      <Box sx={{ mb: 1.5 }}>
        <Typography sx={{ fontSize: 11, color: 'var(--text-secondary)', mb: 0.5, ml: 0.5, fontWeight: 500 }}>
          {t('setup.usernameRequired')}
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
          sx={fieldSx}
        />
      </Box>

      {/* Email (optional) */}
      <Box sx={{ mb: 1.5 }}>
        <Typography sx={{ fontSize: 11, color: 'var(--text-secondary)', mb: 0.5, ml: 0.5, fontWeight: 500 }}>
          {t('setup.emailOptional')}
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder={t('setup.emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onFocus={() => setFocused('email')}
          onBlur={() => setFocused(null)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailOutlinedIcon
                  sx={{
                    fontSize: 18,
                    color: focused === 'email' ? 'var(--primary)' : 'var(--text-secondary)',
                    transition: 'color 0.2s',
                  }}
                />
              </InputAdornment>
            ),
          }}
          sx={fieldSx}
        />
      </Box>

      {/* Password */}
      <Box sx={{ mb: 1.5 }}>
        <Typography sx={{ fontSize: 11, color: 'var(--text-secondary)', mb: 0.5, ml: 0.5, fontWeight: 500 }}>
          {t('setup.passwordRequired')}
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
                  {showPassword ? <VisibilityOffIcon sx={{ fontSize: 18 }} /> : <VisibilityIcon sx={{ fontSize: 18 }} />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={fieldSx}
        />
      </Box>

      {/* Confirm Password */}
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ fontSize: 11, color: 'var(--text-secondary)', mb: 0.5, ml: 0.5, fontWeight: 500 }}>
          {t('setup.confirmPassword')}
        </Typography>
        <TextField
          fullWidth
          size="small"
          type={showConfirm ? 'text' : 'password'}
          placeholder={t('setup.confirmPlaceholder')}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onFocus={() => setFocused('confirm')}
          onBlur={() => setFocused(null)}
          error={passwordMismatch}
          helperText={passwordMismatch ? t('setup.passwordMismatch') : undefined}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockOutlinedIcon
                  sx={{
                    fontSize: 18,
                    color: passwordMismatch ? 'var(--error)' : focused === 'confirm' ? 'var(--primary)' : 'var(--text-secondary)',
                    transition: 'color 0.2s',
                  }}
                />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowConfirm(!showConfirm)}
                  edge="end"
                  size="small"
                  sx={{ color: 'var(--text-secondary)' }}
                  aria-label={showConfirm ? tCommon('auth.hidePassword') : tCommon('auth.showPassword')}
                >
                  {showConfirm ? <VisibilityOffIcon sx={{ fontSize: 18 }} /> : <VisibilityIcon sx={{ fontSize: 18 }} />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            ...fieldSx,
            '& .MuiFormHelperText-root': { color: 'var(--error)', ml: 0.5 },
            ...(passwordMismatch && {
              '& .MuiOutlinedInput-root': {
                ...fieldSx['& .MuiOutlinedInput-root'],
                '& fieldset': { borderColor: 'var(--error)' },
              },
            }),
          }}
        />
      </Box>

      <Button
        type="submit"
        fullWidth
        disabled={!canSubmit}
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
        {isLoading ? <CircularProgress size={20} sx={{ color: 'var(--primary-foreground)' }} /> : t('setup.createAccount')}
      </Button>

      {/* OAuth bootstrap: the first OAuth identity becomes admin while
          count_users() == 0 (same trust boundary as the password path). */}
      <OAuthButtons providers={oauthProviders} mode="setup" disabled={isLoading} />

      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography sx={{ fontSize: 10, color: 'var(--text-secondary)' }}>{t('copyright')}</Typography>
      </Box>
    </Box>
  );
}
