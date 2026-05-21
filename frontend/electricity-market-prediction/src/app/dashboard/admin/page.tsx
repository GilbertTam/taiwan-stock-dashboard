'use client';

/**
 * Admin user management page.
 *
 * Three sections:
 *   1. Registration settings card — the two runtime toggles
 *      (allow_registration + require_admin_approval). Optimistic update with
 *      revert on error.
 *   2. Pending approvals — users with `is_pending=true`. Approve / Reject.
 *   3. All users table — create, toggle active/role, reset password, delete.
 *
 * Guards (mirror the backend so the UI fails fast, but the backend is the
 * source of truth and its 400/403 detail is surfaced verbatim):
 *   - Self-protection: the signed-in admin can't demote/deactivate/delete
 *     their own row, so those controls are disabled on the "you" row.
 *   - Last-superuser guard: enforced backend-side only; we just show the error.
 *
 * RouteGuard already enforces admin access; this page just has to render.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
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
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LockResetIcon from '@mui/icons-material/LockReset';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/context/AuthContext';
import {
    approveUser,
    createUser,
    deleteUser,
    getAdminSettings,
    listUsers,
    patchUser,
    rejectUser,
    resetUserPassword,
    updateAdminSettings,
} from '@/services/adminApi';
import type { AdminUserRow, AppSettings } from '@/types';

type Toast = { severity: 'success' | 'error' | 'info'; msg: string } | null;

const MIN_PASSWORD = 8;
const MIN_USERNAME = 3;

export default function AdminPage() {
    // CLAUDE.md — all hooks declared first.
    const { t } = useTranslation('admin');
    const { profile } = useAuth();
    const selfId = profile?.id ?? null;
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [users, setUsers] = useState<AdminUserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<Toast>(null);

    // Create-user dialog state.
    const [createOpen, setCreateOpen] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newIsAdmin, setNewIsAdmin] = useState(false);
    const [creating, setCreating] = useState(false);

    // Reset-password dialog state (null = closed).
    const [resetTarget, setResetTarget] = useState<AdminUserRow | null>(null);
    const [resetPwd, setResetPwd] = useState('');
    const [resetting, setResetting] = useState(false);

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

    const handleReject = async (u: AdminUserRow) => {
        if (!window.confirm(t('pending.rejectConfirm', { name: u.username }))) return;
        try {
            await rejectUser(u.id);
            setUsers((prev) => prev.filter((x) => x.id !== u.id));
            setToast({ severity: 'success', msg: t('pending.rejected') });
        } catch (err) {
            const msg = axios.isAxiosError(err)
                ? err.response?.data?.detail ?? t('pending.rejectFailed')
                : t('pending.rejectFailed');
            setToast({ severity: 'error', msg });
        }
    };

    const handleCreate = async () => {
        setCreating(true);
        try {
            const created = await createUser({
                username: newUsername.trim(),
                email: newEmail.trim() || undefined,
                password: newPassword,
                is_superuser: newIsAdmin,
            });
            setUsers((prev) => [...prev, created]);
            setCreateOpen(false);
            setNewUsername('');
            setNewEmail('');
            setNewPassword('');
            setNewIsAdmin(false);
            setToast({ severity: 'success', msg: t('create.created') });
        } catch (err) {
            const msg = axios.isAxiosError(err)
                ? err.response?.data?.detail ?? t('create.failed')
                : t('create.failed');
            setToast({ severity: 'error', msg });
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (u: AdminUserRow) => {
        if (!window.confirm(t('users.deleteConfirm', { name: u.username }))) return;
        try {
            await deleteUser(u.id);
            setUsers((prev) => prev.filter((x) => x.id !== u.id));
            setToast({ severity: 'success', msg: t('users.deleted') });
        } catch (err) {
            const msg = axios.isAxiosError(err)
                ? err.response?.data?.detail ?? t('users.deleteFailed')
                : t('users.deleteFailed');
            setToast({ severity: 'error', msg });
        }
    };

    const handleResetPassword = async () => {
        if (!resetTarget) return;
        setResetting(true);
        try {
            await resetUserPassword(resetTarget.id, resetPwd);
            setResetTarget(null);
            setResetPwd('');
            setToast({ severity: 'success', msg: t('users.passwordReset') });
        } catch (err) {
            const msg = axios.isAxiosError(err)
                ? err.response?.data?.detail ?? t('users.resetFailed')
                : t('users.resetFailed');
            setToast({ severity: 'error', msg });
        } finally {
            setResetting(false);
        }
    };

    const pendingUsers = useMemo(
        () => users.filter((u) => u.is_pending),
        [users],
    );

    return (
        <Box sx={{ p: 3, height: '100vh', overflow: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h5" sx={{ color: 'var(--foreground)', fontWeight: 700 }}>
                    {t('title')}
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<PersonAddAlt1Icon />}
                    onClick={() => setCreateOpen(true)}
                    sx={{ textTransform: 'none' }}
                >
                    {t('create.button')}
                </Button>
            </Box>

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
                                        <Stack direction="row" spacing={1}>
                                            <Button
                                                variant="contained"
                                                size="small"
                                                onClick={() => void handleApprove(u.id)}
                                                sx={{ textTransform: 'none' }}
                                            >
                                                {t('pending.approve')}
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                size="small"
                                                onClick={() => void handleReject(u)}
                                                sx={{ textTransform: 'none' }}
                                            >
                                                {t('pending.reject')}
                                            </Button>
                                        </Stack>
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
                                        <TableCell sx={{ color: 'var(--text-secondary)' }} align="right">{t('users.columns.actions')}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {users.map((u) => {
                                        const isSelf = u.id === selfId;
                                        return (
                                        <TableRow key={u.id}>
                                            <TableCell sx={{ color: 'var(--foreground)' }}>
                                                {u.username}
                                                {isSelf && (
                                                    <Chip
                                                        size="small"
                                                        label={t('users.you')}
                                                        sx={{ height: 18, fontSize: 10, ml: 0.75 }}
                                                    />
                                                )}
                                            </TableCell>
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
                                                <Tooltip title={isSelf ? t('users.selfLockTooltip') : ''} disableHoverListener={!isSelf}>
                                                    <span>
                                                        <Switch
                                                            size="small"
                                                            checked={u.is_active}
                                                            disabled={isSelf}
                                                            onChange={(_, c) => void handlePatch(u.id, { is_active: c })}
                                                        />
                                                    </span>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Tooltip title={isSelf ? t('users.selfLockTooltip') : ''} disableHoverListener={!isSelf}>
                                                    <span>
                                                        <Switch
                                                            size="small"
                                                            checked={u.is_superuser}
                                                            disabled={isSelf}
                                                            onChange={(_, c) => void handlePatch(u.id, { is_superuser: c })}
                                                        />
                                                    </span>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Tooltip title={t('users.resetPassword')}>
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => { setResetTarget(u); setResetPwd(''); }}
                                                            sx={{ color: 'var(--text-secondary)' }}
                                                        >
                                                            <LockResetIcon fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                                <Tooltip title={isSelf ? t('users.selfLockTooltip') : t('users.delete')}>
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            disabled={isSelf}
                                                            onClick={() => void handleDelete(u)}
                                                        >
                                                            <DeleteOutlineIcon fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Stack>
            )}

            {/* ── Create user dialog ── */}
            <Dialog open={createOpen} onClose={() => !creating && setCreateOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>{t('create.title')}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label={t('create.username')}
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            size="small"
                            fullWidth
                            autoFocus
                        />
                        <TextField
                            label={t('create.email')}
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            size="small"
                            fullWidth
                        />
                        <TextField
                            label={t('create.password')}
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            helperText={t('create.passwordHint')}
                            size="small"
                            fullWidth
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={newIsAdmin}
                                    onChange={(_, c) => setNewIsAdmin(c)}
                                />
                            }
                            label={t('create.admin')}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateOpen(false)} disabled={creating} sx={{ textTransform: 'none' }}>
                        {t('actions.cancel')}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => void handleCreate()}
                        disabled={
                            creating
                            || newUsername.trim().length < MIN_USERNAME
                            || newPassword.length < MIN_PASSWORD
                        }
                        sx={{ textTransform: 'none' }}
                    >
                        {t('create.submit')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Reset password dialog ── */}
            <Dialog open={!!resetTarget} onClose={() => !resetting && setResetTarget(null)} fullWidth maxWidth="xs">
                <DialogTitle>
                    {t('users.resetPasswordTitle', { name: resetTarget?.username ?? '' })}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        label={t('users.newPassword')}
                        type="password"
                        value={resetPwd}
                        onChange={(e) => setResetPwd(e.target.value)}
                        helperText={t('create.passwordHint')}
                        size="small"
                        fullWidth
                        autoFocus
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setResetTarget(null)} disabled={resetting} sx={{ textTransform: 'none' }}>
                        {t('actions.cancel')}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => void handleResetPassword()}
                        disabled={resetting || resetPwd.length < MIN_PASSWORD}
                        sx={{ textTransform: 'none' }}
                    >
                        {t('users.resetSubmit')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
