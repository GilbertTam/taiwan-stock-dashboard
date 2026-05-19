'use client';

import { Box, Button, Divider, Tooltip, Typography } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import MicrosoftIcon from '@mui/icons-material/Microsoft';
import { useTranslation } from 'react-i18next';

import { oauthLoginUrl } from '@/services/authApi';
import type { OAuthProviders } from '@/types';

interface OAuthButtonsProps {
    providers: OAuthProviders;
    /** Whether this is the bootstrap-admin flow (sets backend `mode=setup`). */
    mode: 'login' | 'setup';
    disabled?: boolean;
}

const PROVIDER_META: Array<{
    id: keyof OAuthProviders;
    Icon: React.ElementType;
    labelKey: string;
}> = [
    { id: 'google', Icon: GoogleIcon, labelKey: 'signInWithGoogle' },
    { id: 'microsoft', Icon: MicrosoftIcon, labelKey: 'signInWithMicrosoft' },
];

/**
 * Google / Microsoft sign-in buttons.
 *
 * A click is a FULL-PAGE navigation (not an axios call) so the eventual
 * same-origin httponly cookie set by the backend callback reaches our app.
 *
 * The section ALWAYS renders so users can see the feature exists; each
 * individual provider is disabled (with a tooltip explaining why) when its
 * `CLIENT_ID`/`CLIENT_SECRET` are missing from the backend env. This is a
 * deliberate change from the "hide entirely when nothing is configured"
 * pattern — hiding made it look like the feature was missing rather than
 * un-configured.
 */
export function OAuthButtons({ providers, mode, disabled }: OAuthButtonsProps) {
    const { t } = useTranslation('auth');

    const baseSx = {
        py: 1,
        borderRadius: 1,
        fontSize: 13,
        fontWeight: 500,
        textTransform: 'none' as const,
        borderColor: 'var(--card-border)',
        color: 'var(--foreground)',
        backgroundColor: 'var(--card-bg)',
        '&:hover': {
            backgroundColor: 'var(--hover-bg)',
            borderColor: 'var(--primary)',
        },
        // MUI disables hover styles on .Mui-disabled by default; keep the
        // disabled look obvious to distinguish "not configured" from
        // "configured but transient error".
        '&.Mui-disabled': {
            opacity: 0.5,
            cursor: 'not-allowed',
        },
    };

    return (
        <Box sx={{ mt: 2 }}>
            <Divider sx={{ my: 1.5, '&::before, &::after': { borderColor: 'var(--card-border)' } }}>
                <Typography sx={{ fontSize: 10, color: 'var(--text-secondary)', px: 1 }}>
                    {t('orContinueWith')}
                </Typography>
            </Divider>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {PROVIDER_META.map(({ id, Icon, labelKey }) => {
                    const enabled = providers[id];
                    const buttonDisabled = disabled || !enabled;
                    // Wrapping in a span lets the Tooltip fire even when the
                    // underlying Button is disabled (MUI quirk).
                    return (
                        <Tooltip
                            key={id}
                            title={!enabled ? t('errors.providerNotConfigured', { provider: id }) : ''}
                            placement="top"
                            arrow
                        >
                            <span style={{ display: 'block' }}>
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    disabled={buttonDisabled}
                                    startIcon={<Icon sx={{ fontSize: 18 }} />}
                                    onClick={() => { window.location.href = oauthLoginUrl(id, mode); }}
                                    sx={baseSx}
                                >
                                    {t(labelKey)}
                                </Button>
                            </span>
                        </Tooltip>
                    );
                })}
            </Box>
        </Box>
    );
}
