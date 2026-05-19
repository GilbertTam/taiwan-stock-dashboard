'use client';

/**
 * AccountSettingsPanel — the content of the Settings modal's "Account &
 * Security" tab. Sections (top to bottom):
 *
 *   1. Profile summary (read-only).
 *   2. Linked sign-in providers — Google / Microsoft. Always shows both
 *      providers; the Link button is disabled with a tooltip when the
 *      provider isn't configured server-side. Unlink surfaces the
 *      backend's "≥1 login method" 400 verbatim.
 *   3. Password — change / set initial / remove. Remove is only offered
 *      when removing would still leave a usable login method (≥1 linked
 *      provider); the backend enforces the same rule as a safety net.
 *
 * The panel takes no props — it consumes `useAuth()` and the OAuth provider
 * config it fetches itself. It is intentionally self-contained so it can
 * live unchanged inside any modal/page that wants account settings.
 */

import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    IconButton,
    InputAdornment,
    Snackbar,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import MicrosoftIcon from '@mui/icons-material/Microsoft';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/context/AuthContext';
import {
    oauthLinkStartUrl,
    removePassword,
    setPassword,
    unlinkProvider,
} from '@/services/accountApi';
import { fetchOAuthProviders } from '@/services/authApi';
import type { OAuthProviders } from '@/types';

type Toast = { severity: 'success' | 'error' | 'info'; msg: string } | null;
type ProviderId = 'google' | 'microsoft';
const PROVIDER_META: { id: ProviderId; Icon: React.ElementType }[] = [
    { id: 'google', Icon: GoogleIcon },
    { id: 'microsoft', Icon: MicrosoftIcon },
];

// Card style — slightly lighter than the modal background so each section
// is visually grouped without competing with the modal chrome.
const sectionCardSx = {
    p: 2,
    borderRadius: 1.5,
    border: '1px solid var(--subtle-border)',
    backgroundColor: 'var(--subtle-bg)',
};

const sectionTitleSx = {
    fontWeight: 700,
    color: 'var(--foreground)',
    mb: 1.25,
    borderLeft: '3px solid var(--primary)',
    pl: 1.25,
    ml: -0.25,
    fontSize: '0.875rem',
};

export function AccountSettingsPanel() {
    // CLAUDE.md — all hooks declared first.
    const { t } = useTranslation('account');
    const { profile, refreshProfile } = useAuth();
    const [providers, setProviders] = useState<OAuthProviders>({ google: false, microsoft: false });
    const [toast, setToast] = useState<Toast>(null);
    const [currentPwd, setCurrentPwd] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [removeOpen, setRemoveOpen] = useState(false);
    const [removePwd, setRemovePwd] = useState('');
    const [showRemovePwd, setShowRemovePwd] = useState(false);
    const [removing, setRemoving] = useState(false);

    useEffect(() => {
        fetchOAuthProviders()
            .then(setProviders)
            .catch(() => { /* leave defaults — Link buttons render disabled with tooltip */ });
    }, []);

    const handleUnlink = useCallback(async (p: ProviderId) => {
        try {
            await unlinkProvider(p);
            await refreshProfile();
            setToast({ severity: 'success', msg: t('providers.unlinked', { provider: p }) });
        } catch (err) {
            const msg = axios.isAxiosError(err)
                ? err.response?.data?.detail ?? t('providers.unlinkFailed')
                : t('providers.unlinkFailed');
            setToast({ severity: 'error', msg });
        }
    }, [refreshProfile, t]);

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;
        if (newPwd !== confirmPwd) {
            setToast({ severity: 'error', msg: t('password.mismatch') });
            return;
        }
        setSubmitting(true);
        try {
            await setPassword({
                current_password: profile.hasPassword ? currentPwd : undefined,
                new_password: newPwd,
            });
            await refreshProfile();
            setCurrentPwd('');
            setNewPwd('');
            setConfirmPwd('');
            setToast({ severity: 'success', msg: t('password.saved') });
        } catch (err) {
            const msg = axios.isAxiosError(err)
                ? err.response?.data?.detail ?? t('password.saveFailed')
                : t('password.saveFailed');
            setToast({ severity: 'error', msg });
        } finally {
            setSubmitting(false);
        }
    };

    const handleRemovePassword = async () => {
        setRemoving(true);
        try {
            await removePassword(removePwd);
            await refreshProfile();
            setRemovePwd('');
            setRemoveOpen(false);
            setToast({ severity: 'success', msg: t('password.removed') });
        } catch (err) {
            const msg = axios.isAxiosError(err)
                ? err.response?.data?.detail ?? t('password.removeFailed')
                : t('password.removeFailed');
            setToast({ severity: 'error', msg });
        } finally {
            setRemoving(false);
        }
    };

    if (!profile) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={24} />
            </Box>
        );
    }

    const linkedSet = new Set(profile.linkedProviders.map((p) => p.provider));
    const linkedCount = profile.linkedProviders.length;
    const canRemovePassword = profile.hasPassword && linkedCount > 0;
    const anyProviderEnabled = providers.google || providers.microsoft;

    return (
        <Stack spacing={2}>
            <Snackbar
                open={!!toast}
                autoHideDuration={5000}
                onClose={() => setToast(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                {toast ? (
                    <Alert
                        severity={toast.severity}
                        variant="filled"
                        onClose={() => setToast(null)}
                        sx={{ maxWidth: 520 }}
                    >
                        {toast.msg}
                    </Alert>
                ) : <span />}
            </Snackbar>

            {/* ── Profile ── */}
            <Box sx={sectionCardSx}>
                <Typography variant="subtitle2" sx={sectionTitleSx}>
                    {t('profile.title')}
                </Typography>
                <Stack spacing={0.5}>
                    <Row label={t('profile.username')} value={profile.username} />
                    <Row label={t('profile.email')} value={profile.email ?? '—'} />
                    <Row
                        label={t('profile.role')}
                        value={profile.isSuperuser ? t('profile.admin') : t('profile.user')}
                    />
                </Stack>
            </Box>

            {/* ── Linked providers ── */}
            <Box sx={sectionCardSx}>
                <Typography variant="subtitle2" sx={sectionTitleSx}>
                    {t('providers.title')}
                </Typography>
                {!anyProviderEnabled && (
                    <Alert severity="info" sx={{ mb: 1.5, fontSize: 12, py: 0.5 }}>
                        {t('providers.noneConfigured')}
                    </Alert>
                )}
                <Stack spacing={1}>
                    {PROVIDER_META.map(({ id, Icon }) => {
                        const enabled = providers[id];
                        const linked = linkedSet.has(id);
                        return (
                            <Box
                                key={id}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    p: 1,
                                    border: '1px solid var(--card-border)',
                                    borderRadius: 1,
                                    opacity: !enabled && !linked ? 0.55 : 1,
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                                    <Icon sx={{ fontSize: 18, color: 'var(--foreground)' }} />
                                    <Typography sx={{ fontSize: 13, color: 'var(--foreground)', textTransform: 'capitalize' }}>
                                        {id}
                                    </Typography>
                                    {linked && (
                                        <Chip
                                            size="small"
                                            label={t('providers.linked')}
                                            color="primary"
                                            sx={{ height: 18, fontSize: 10 }}
                                        />
                                    )}
                                    {!enabled && (
                                        <Chip
                                            size="small"
                                            label={t('providers.notConfigured')}
                                            sx={{
                                                height: 18,
                                                fontSize: 10,
                                                backgroundColor: 'var(--hover-bg)',
                                                color: 'var(--text-secondary)',
                                            }}
                                        />
                                    )}
                                </Box>
                                {linked ? (
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="error"
                                        onClick={() => void handleUnlink(id)}
                                        sx={{ textTransform: 'none', minWidth: 0 }}
                                    >
                                        {t('providers.unlink')}
                                    </Button>
                                ) : (
                                    <Tooltip
                                        title={!enabled ? t('providers.notConfiguredHint') : ''}
                                        placement="top"
                                        arrow
                                    >
                                        <span>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                disabled={!enabled}
                                                onClick={() => { window.location.href = oauthLinkStartUrl(id); }}
                                                sx={{ textTransform: 'none', minWidth: 0 }}
                                            >
                                                {t('providers.link')}
                                            </Button>
                                        </span>
                                    </Tooltip>
                                )}
                            </Box>
                        );
                    })}
                </Stack>
            </Box>

            {/* ── Password ── */}
            <Box sx={sectionCardSx}>
                <Typography variant="subtitle2" sx={sectionTitleSx}>
                    {profile.hasPassword ? t('password.change') : t('password.setInitial')}
                </Typography>
                {!profile.hasPassword && (
                    <Alert severity="info" sx={{ mb: 1.5, fontSize: 12, py: 0.5 }}>
                        {t('password.setInitialHint')}
                    </Alert>
                )}
                <Box component="form" onSubmit={handleSetPassword}>
                    <Stack spacing={1.5}>
                        {profile.hasPassword && (
                            <TextField
                                label={t('password.current')}
                                type={showCurrent ? 'text' : 'password'}
                                value={currentPwd}
                                onChange={(e) => setCurrentPwd(e.target.value)}
                                fullWidth
                                size="small"
                                required
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setShowCurrent(!showCurrent)} edge="end" size="small">
                                                {showCurrent ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        )}
                        <TextField
                            label={t('password.new')}
                            type={showNew ? 'text' : 'password'}
                            value={newPwd}
                            onChange={(e) => setNewPwd(e.target.value)}
                            fullWidth
                            size="small"
                            required
                            inputProps={{ minLength: 8 }}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowNew(!showNew)} edge="end" size="small">
                                            {showNew ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <TextField
                            label={t('password.confirm')}
                            type={showNew ? 'text' : 'password'}
                            value={confirmPwd}
                            onChange={(e) => setConfirmPwd(e.target.value)}
                            fullWidth
                            size="small"
                            required
                            inputProps={{ minLength: 8 }}
                            error={confirmPwd.length > 0 && newPwd !== confirmPwd}
                            helperText={
                                confirmPwd.length > 0 && newPwd !== confirmPwd
                                    ? t('password.mismatch')
                                    : undefined
                            }
                        />
                        <Divider />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            {profile.hasPassword ? (
                                <Tooltip
                                    title={!canRemovePassword ? t('password.removeBlockedHint') : ''}
                                    placement="top"
                                    arrow
                                >
                                    <span>
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            size="small"
                                            disabled={!canRemovePassword}
                                            onClick={() => setRemoveOpen(true)}
                                            sx={{ textTransform: 'none' }}
                                        >
                                            {t('password.remove')}
                                        </Button>
                                    </span>
                                </Tooltip>
                            ) : <span />}
                            <Button
                                type="submit"
                                variant="contained"
                                size="small"
                                disabled={submitting || newPwd.length < 8 || newPwd !== confirmPwd}
                                sx={{ textTransform: 'none' }}
                            >
                                {submitting ? <CircularProgress size={16} /> : t('password.save')}
                            </Button>
                        </Box>
                    </Stack>
                </Box>
            </Box>

            {/* Remove-password confirmation. Modal-in-modal is intentional —
                MUI Dialog stacks correctly, and a confirm-with-password step
                is the standard pattern for destructive account actions. */}
            <Dialog open={removeOpen} onClose={() => !removing && setRemoveOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>{t('password.removeTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        {t('password.removeWarning')}
                    </DialogContentText>
                    <TextField
                        autoFocus
                        label={t('password.current')}
                        type={showRemovePwd ? 'text' : 'password'}
                        value={removePwd}
                        onChange={(e) => setRemovePwd(e.target.value)}
                        fullWidth
                        required
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => setShowRemovePwd(!showRemovePwd)} edge="end" size="small">
                                        {showRemovePwd ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRemoveOpen(false)} disabled={removing} sx={{ textTransform: 'none' }}>
                        {t('password.cancel')}
                    </Button>
                    <Button
                        onClick={() => void handleRemovePassword()}
                        color="error"
                        variant="contained"
                        disabled={removing || removePwd.length === 0}
                        sx={{ textTransform: 'none' }}
                    >
                        {removing ? <CircularProgress size={18} /> : t('password.removeConfirm')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <Box sx={{ display: 'flex', gap: 2 }}>
            <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 80 }}>
                {label}
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'var(--foreground)' }}>{value}</Typography>
        </Box>
    );
}
