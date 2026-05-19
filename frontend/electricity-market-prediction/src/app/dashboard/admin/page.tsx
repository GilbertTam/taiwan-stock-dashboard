'use client';

/**
 * Admin user management page.
 *
 * Three sections:
 *   1. Registration settings card — the two runtime toggles
 *      (allow_registration + require_admin_approval). Optimistic update with
 *      revert on error.
 *   2. Pending approvals — users with `is_pending=true`. Per-row Approve button.
 *   3. All users table — toggle active/role per user. Last-superuser guard
 *      is enforced backend-side; UI surfaces the 400 verbatim.
 *
 * RouteGuard already enforces admin access; this page just has to render.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    FormControlLabel,
    Paper,
    Snackbar,
    Stack,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

import {
    approveUser,
    getAdminSettings,
    listUsers,
    patchUser,
    updateAdminSettings,
} from '@/services/adminApi';
import type { AdminUserRow, AppSettings } from '@/types';

type Toast = { severity: 'success' | 'error' | 'info'; msg: string } | null;

export default function AdminPage() {
    // CLAUDE.md — all hooks declared first.
    const { t } = useTranslation('admin');
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [users, setUsers] = useState<AdminUserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<Toast>(null);

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const [s, u] = await Promise.all([getAdminSettings(), listUsers()]);
            setSettings(s);
            setUsers(u);
        } catch (err) {
            const msg = axios.isAxiosError(err)
                ? err.response?.data?.detail ?? t('loadFailed')
                : t('loadFailed');
            setToast({ severity: 'error', msg });
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => { void reload(); }, [reload]);

    const handleToggleSetting = async (
        key: keyof AppSettings,
        next: boolean,
    ) => {
        if (!settings) return;
        // Optimistic — revert on error so the UI stays consistent with the server.
        const prev = settings;
        const optimistic = { ...settings, [key]: next };
        setSettings(optimistic);
        try {
            const saved = await updateAdminSettings(optimistic);
            setSettings(saved);
        } catch (err) {
            setSettings(prev);
            const msg = axios.isAxiosError(err)
                ? err.response?.data?.detail ?? t('saveFailed')
                : t('saveFailed');
            setToast({ severity: 'error', msg });
        }
    };

    const handlePatch = async (id: number, patch: Partial<AdminUserRow>) => {
        try {
            const updated = await patchUser(id, patch);
            setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
            setToast({ severity: 'success', msg: t('users.updated') });
        } catch (err) {
            // 400 from backend (last-superuser guard) is the most common failure;
            // surface its detail verbatim so the admin sees WHY it was refused.
            const msg = axios.isAxiosError(err)
                ? err.response?.data?.detail ?? t('users.updateFailed')
                : t('users.updateFailed');
            setToast({ severity: 'error', msg });
        }
    };

    const handleApprove = async (id: number) => {
        try {
            const updated = await approveUser(id);
            setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
            setToast({ severity: 'success', msg: t('pending.approved') });
        } catch (err) {
            const msg = axios.isAxiosError(err)
                ? err.response?.data?.detail ?? t('pending.approveFailed')
                : t('pending.approveFailed');
            setToast({ severity: 'error', msg });
        }
    };

    const pendingUsers = useMemo(
        () => users.filter((u) => u.is_pending),
        [users],
    );

    return (
        <Box sx={{ p: 3, height: '100vh', overflow: 'auto' }}>
            <Typography variant="h5" sx={{ mb: 3, color: 'var(--foreground)', fontWeight: 700 }}>
                {t('title')}
            </Typography>

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

            {loading && !settings ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Stack spacing={3}>
                    {/* ── Registration settings ── */}
                    <Paper sx={{ p: 2.5, backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                        <Typography sx={{ fontWeight: 700, mb: 1.5, color: 'var(--foreground)' }}>
                            {t('settings.title')}
                        </Typography>
                        <Stack spacing={1}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={!!settings?.allow_registration}
                                        onChange={(_, c) => handleToggleSetting('allow_registration', c)}
                                    />
                                }
                                label={
                                    <Box>
                                        <Typography sx={{ fontSize: 14, color: 'var(--foreground)' }}>
                                            {t('settings.allowRegistration')}
                                        </Typography>
                                        <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                            {t('settings.allowRegistrationDesc')}
                                        </Typography>
                                    </Box>
                                }
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={!!settings?.require_admin_approval}
                                        onChange={(_, c) => handleToggleSetting('require_admin_approval', c)}
                                        disabled={!settings?.allow_registration}
                                    />
                                }
                                label={
                                    <Box>
                                        <Typography sx={{ fontSize: 14, color: 'var(--foreground)' }}>
                                            {t('settings.requireApproval')}
                                        </Typography>
                                        <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                            {t('settings.requireApprovalDesc')}
                                        </Typography>
                                    </Box>
                                }
                            />
                        </Stack>
                    </Paper>

                    {/* ── Pending approvals ── */}
                    <Paper sx={{ p: 2.5, backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                        <Typography sx={{ fontWeight: 700, mb: 1.5, color: 'var(--foreground)' }}>
                            {t('pending.title')} ({pendingUsers.length})
                        </Typography>
                        {pendingUsers.length === 0 ? (
                            <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                {t('pending.empty')}
                            </Typography>
                        ) : (
                            <Stack spacing={1}>
                                {pendingUsers.map((u) => (
                                    <Box
                                        key={u.id}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            p: 1.25,
                                            border: '1px solid var(--card-border)',
                                            borderRadius: 1,
                                        }}
                                    >
                                        <Box>
                                            <Typography sx={{ fontSize: 14, color: 'var(--foreground)', fontWeight: 600 }}>
                                                {u.username}
                                            </Typography>
                                            <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                                {u.email ?? '—'}
                                            </Typography>
                                        </Box>
                                        <Button
                                            variant="contained"
                                            size="small"
                                            onClick={() => void handleApprove(u.id)}
                                            sx={{ textTransform: 'none' }}
                                        >
                                            {t('pending.approve')}
                                        </Button>
                                    </Box>
                                ))}
                            </Stack>
                        )}
                    </Paper>

                    {/* ── All users ── */}
                    <Paper sx={{ p: 2.5, backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                        <Typography sx={{ fontWeight: 700, mb: 1.5, color: 'var(--foreground)' }}>
                            {t('users.title')}
                        </Typography>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ color: 'var(--text-secondary)' }}>{t('users.columns.username')}</TableCell>
                                        <TableCell sx={{ color: 'var(--text-secondary)' }}>{t('users.columns.email')}</TableCell>
                                        <TableCell sx={{ color: 'var(--text-secondary)' }}>{t('users.columns.providers')}</TableCell>
                                        <TableCell sx={{ color: 'var(--text-secondary)' }} align="center">{t('users.columns.active')}</TableCell>
                                        <TableCell sx={{ color: 'var(--text-secondary)' }} align="center">{t('users.columns.admin')}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {users.map((u) => (
                                        <TableRow key={u.id}>
                                            <TableCell sx={{ color: 'var(--foreground)' }}>{u.username}</TableCell>
                                            <TableCell sx={{ color: 'var(--text-secondary)' }}>{u.email ?? '—'}</TableCell>
                                            <TableCell>
                                                {u.providers.length === 0 ? (
                                                    <Chip
                                                        size="small"
                                                        label={u.has_password ? t('users.passwordOnly') : t('users.noMethod')}
                                                        sx={{ height: 20, fontSize: 11 }}
                                                    />
                                                ) : (
                                                    u.providers.map((p) => (
                                                        <Chip
                                                            key={p}
                                                            size="small"
                                                            label={p}
                                                            sx={{ height: 20, fontSize: 11, mr: 0.5 }}
                                                        />
                                                    ))
                                                )}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Switch
                                                    size="small"
                                                    checked={u.is_active}
                                                    onChange={(_, c) => void handlePatch(u.id, { is_active: c })}
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Switch
                                                    size="small"
                                                    checked={u.is_superuser}
                                                    onChange={(_, c) => void handlePatch(u.id, { is_superuser: c })}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Stack>
            )}
        </Box>
    );
}
