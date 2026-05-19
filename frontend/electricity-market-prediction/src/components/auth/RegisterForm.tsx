'use client';

import { useState } from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    IconButton,
    InputAdornment,
    TextField,
    Typography,
} from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

import { OAuthButtons } from './OAuthButtons';
import { register } from '@/services/authApi';
import type { LoginCredentials, OAuthProviders } from '@/types';

interface RegisterFormProps {
    /** Used to auto-login after immediate-active registration. */
    onSubmit: (credentials: LoginCredentials) => Promise<void>;
    /** Switch back to login mode (called from "already have an account" link). */
    onSwitchToLogin: () => void;
    oauthProviders: OAuthProviders;
}

/**
 * Self-service registration form.
 *
 * Behavior after successful POST /auth/register:
 *   - `status === 'active'`  → auto-login (no extra click)
 *   - `status === 'pending'` → show "awaiting approval" notice and return
 *                              to the login form (admin must approve first)
 */
export function RegisterForm({ onSubmit, onSwitchToLogin, oauthProviders }: RegisterFormProps) {
    // CLAUDE.md: all hooks declared before any conditional return.
    const { t } = useTranslation('auth');
    const { t: tCommon } = useTranslation('common');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [focused, setFocused] = useState<string | null>(null);

    const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;
    const canSubmit =
        username && password && confirmPassword && !passwordMismatch && !isLoading;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        setError(null);
        setIsLoading(true);
        try {
            const result = await register({ username, email: email || undefined, password });
            if (result.status === 'pending') {
                setPending(true);
            } else {
                await onSubmit({ username, password });
            }
        } catch (err) {
            // Distinguish 403 (registration closed) and 409 (duplicate)
            // from generic failures so the user gets actionable feedback.
            if (axios.isAxiosError(err)) {
                if (err.response?.status === 403) {
                    setError(t('register.disabled'));
                } else if (err.response?.status === 409) {
                    setError(t('register.duplicate'));
                } else {
                    setError(t('register.failed'));
                }
            } else {
                setError(t('register.failed'));
            }
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
                    {t('register.title')}
                </Typography>
                <Typography sx={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                    {t('register.subtitle')}
                </Typography>
            </Box>

            {pending && (
                <Alert
                    severity="info"
                    sx={{
                        mb: 2,
                        backgroundColor: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--primary) 40%, transparent)',
                        color: 'var(--foreground)',
                    }}
                    action={
                        <Button size="small" onClick={onSwitchToLogin} sx={{ textTransform: 'none' }}>
                            {t('haveAccount')}
                        </Button>
                    }
                >
                    {t('register.pendingMsg')}
                </Alert>
            )}

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

            <Box sx={{ mb: 1.5 }}>
                <Typography sx={{ fontSize: 11, color: 'var(--text-secondary)', mb: 0.5, ml: 0.5, fontWeight: 500 }}>
                    {t('setup.usernameRequired')}
                </Typography>
                <TextField
                    fullWidth
                    size="small"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setFocused('username')}
                    onBlur={() => setFocused(null)}
                    disabled={pending}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <PersonOutlineIcon sx={{ fontSize: 18, color: focused === 'username' ? 'var(--primary)' : 'var(--text-secondary)' }} />
                            </InputAdornment>
                        ),
                    }}
                    sx={fieldSx}
                />
            </Box>

            <Box sx={{ mb: 1.5 }}>
                <Typography sx={{ fontSize: 11, color: 'var(--text-secondary)', mb: 0.5, ml: 0.5, fontWeight: 500 }}>
                    {t('setup.emailOptional')}
                </Typography>
                <TextField
                    fullWidth
                    size="small"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                    disabled={pending}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <EmailOutlinedIcon sx={{ fontSize: 18, color: focused === 'email' ? 'var(--primary)' : 'var(--text-secondary)' }} />
                            </InputAdornment>
                        ),
                    }}
                    sx={fieldSx}
                />
            </Box>

            <Box sx={{ mb: 1.5 }}>
                <Typography sx={{ fontSize: 11, color: 'var(--text-secondary)', mb: 0.5, ml: 0.5, fontWeight: 500 }}>
                    {t('setup.passwordRequired')}
                </Typography>
                <TextField
                    fullWidth
                    size="small"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                    disabled={pending}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <LockOutlinedIcon sx={{ fontSize: 18, color: focused === 'password' ? 'var(--primary)' : 'var(--text-secondary)' }} />
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

            <Box sx={{ mb: 2.5 }}>
                <Typography sx={{ fontSize: 11, color: 'var(--text-secondary)', mb: 0.5, ml: 0.5, fontWeight: 500 }}>
                    {t('setup.confirmPassword')}
                </Typography>
                <TextField
                    fullWidth
                    size="small"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={() => setFocused('confirm')}
                    onBlur={() => setFocused(null)}
                    error={passwordMismatch}
                    helperText={passwordMismatch ? t('setup.passwordMismatch') : undefined}
                    disabled={pending}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <LockOutlinedIcon sx={{ fontSize: 18, color: passwordMismatch ? 'var(--error)' : focused === 'confirm' ? 'var(--primary)' : 'var(--text-secondary)' }} />
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
                    }}
                />
            </Box>

            <Button
                type="submit"
                fullWidth
                disabled={!canSubmit || pending}
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
                {isLoading ? (
                    <CircularProgress size={20} sx={{ color: 'var(--primary-foreground)' }} />
                ) : (
                    t('register.submit')
                )}
            </Button>

            <OAuthButtons providers={oauthProviders} mode="login" disabled={isLoading || pending} />

            <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Button
                    onClick={onSwitchToLogin}
                    sx={{
                        textTransform: 'none',
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        '&:hover': { color: 'var(--primary)', backgroundColor: 'transparent' },
                    }}
                >
                    {t('haveAccount')}
                </Button>
            </Box>
        </Box>
    );
}
