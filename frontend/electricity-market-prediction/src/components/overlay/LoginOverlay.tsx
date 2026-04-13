'use client';

import React, { useState } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    CircularProgress,
    Alert,
    InputAdornment,
    IconButton,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import BoltIcon from '@mui/icons-material/Bolt';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';

interface LoginOverlayProps {
    onLoginSuccess?: () => void;
}

export function LoginOverlay({ onLoginSuccess }: LoginOverlayProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const { t } = useTranslation('auth');
    const { t: tCommon } = useTranslation('common');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            await login({ username, password });
            onLoginSuccess?.();
        } catch (err) {
            console.error('Login failed', err);
            setError(tCommon('auth.loginFailed'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box
            sx={{
                position: 'absolute',
                inset: 0,
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                // Less blur, more transparent to show background clearly
                background: 'rgba(10, 15, 25, 0.75)',
                backdropFilter: 'blur(4px)',
            }}
        >
            {/* Login Card - matching site dark theme */}
            <Box
                sx={{
                    width: 380,
                    maxWidth: '90vw',
                    background: 'var(--card-bg)',
                    borderRadius: 2,
                    border: '1px solid var(--card-border)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    overflow: 'hidden',
                }}
            >
                {/* Top accent bar */}
                <Box
                    sx={{
                        height: 2,
                        background: 'var(--primary)',
                    }}
                />

                <Box sx={{ p: 3 }}>
                    {/* Header */}
                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <Box
                            sx={{
                                width: 48,
                                height: 48,
                                borderRadius: 1.5,
                                background: 'var(--primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mx: 'auto',
                                mb: 1.5,
                            }}
                        >
                            <BoltIcon sx={{ fontSize: 28, color: '#fff' }} />
                        </Box>
                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 700,
                                color: 'var(--foreground)',
                                letterSpacing: '-0.02em',
                            }}
                        >
                            {t('title')}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'var(--muted)' }}>
                            {t('loginPrompt')}
                        </Typography>
                    </Box>

                    {/* Error Alert */}
                    {error && (
                        <Alert
                            severity="error"
                            sx={{
                                mb: 2,
                                py: 0.5,
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                color: '#f87171',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                '& .MuiAlert-icon': { color: '#f87171' },
                            }}
                        >
                            {error}
                        </Alert>
                    )}

                    {/* Login Form */}
                    <Box component="form" onSubmit={handleSubmit}>
                        <TextField
                            fullWidth
                            placeholder={t('username')}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            size="small"
                            sx={{
                                mb: 1.5,
                                '& .MuiOutlinedInput-root': {
                                    backgroundColor: 'rgba(255,255,255,0.03)',
                                    borderRadius: 1,
                                    '& fieldset': { borderColor: 'var(--card-border)' },
                                    '&:hover fieldset': { borderColor: 'var(--primary)' },
                                    '&.Mui-focused fieldset': { borderColor: 'var(--primary)' },
                                },
                                '& .MuiInputBase-input': { color: 'var(--foreground)' },
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <PersonIcon sx={{ color: 'var(--muted)', fontSize: 20 }} />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <TextField
                            fullWidth
                            type={showPassword ? 'text' : 'password'}
                            placeholder={t('password')}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            size="small"
                            sx={{
                                mb: 2,
                                '& .MuiOutlinedInput-root': {
                                    backgroundColor: 'rgba(255,255,255,0.03)',
                                    borderRadius: 1,
                                    '& fieldset': { borderColor: 'var(--card-border)' },
                                    '&:hover fieldset': { borderColor: 'var(--primary)' },
                                    '&.Mui-focused fieldset': { borderColor: 'var(--primary)' },
                                },
                                '& .MuiInputBase-input': { color: 'var(--foreground)' },
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <LockIcon sx={{ color: 'var(--muted)', fontSize: 20 }} />
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
                                            {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            disabled={isLoading || !username || !password}
                            sx={{
                                py: 1,
                                borderRadius: 1,
                                backgroundColor: 'var(--primary)',
                                fontWeight: 600,
                                textTransform: 'none',
                                '&:hover': {
                                    backgroundColor: 'var(--primary)',
                                    filter: 'brightness(1.1)',
                                },
                                '&.Mui-disabled': {
                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                    color: 'rgba(255,255,255,0.3)',
                                },
                            }}
                        >
                            {isLoading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : t('login')}
                        </Button>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
