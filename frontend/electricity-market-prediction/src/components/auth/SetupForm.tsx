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

interface SetupFormProps {
  onSetupComplete: () => void;
}

export function SetupForm({ onSetupComplete }: SetupFormProps) {
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
      setError('建立帳號失敗，請重試');
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
            boxShadow: '0 8px 24px rgba(0, 255, 157, 0.25)',
          }}
        >
          <BoltIcon sx={{ fontSize: 30, color: 'var(--primary-foreground)' }} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--foreground)', fontSize: 18 }}>
          初期設定
        </Typography>
        <Typography sx={{ color: 'var(--text-secondary)', fontSize: 12 }}>
          建立第一個管理員帳號
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
          帳號 *
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
          Email（選填）
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="請輸入 Email"
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
          密碼 *
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
                  aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
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
          確認密碼 *
        </Typography>
        <TextField
          fullWidth
          size="small"
          type={showConfirm ? 'text' : 'password'}
          placeholder="請再次輸入密碼"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onFocus={() => setFocused('confirm')}
          onBlur={() => setFocused(null)}
          error={passwordMismatch}
          helperText={passwordMismatch ? '密碼不一致' : undefined}
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
                  aria-label={showConfirm ? '隱藏密碼' : '顯示密碼'}
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
        {isLoading ? <CircularProgress size={20} sx={{ color: 'var(--primary-foreground)' }} /> : '建立帳號'}
      </Button>

      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography sx={{ fontSize: 10, color: 'var(--text-secondary)' }}>© 2026 HD Research</Typography>
      </Box>
    </Box>
  );
}
