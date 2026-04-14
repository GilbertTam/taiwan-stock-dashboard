'use client';

import React, { useState } from 'react';
import {
    Box,
    Typography,
    Popover,
    IconButton,
    TextField,
    Menu,
    MenuItem,
    Divider,
    Tooltip,
    CircularProgress,
} from '@mui/material';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import AddIcon from '@mui/icons-material/Add';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useTranslation } from 'react-i18next';
import type { Preset } from '@/types/presets';

// ─── Props ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface PresetSelectorProps {
    presets: Preset<any>[];
    isLoading: boolean;
    defaultPresetId: number | null;
    onSave: (name: string) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onLoad: (preset: Preset<any>) => void;
    onUpdate: (id: number) => void;
    onDelete: (id: number) => void;
    onRename: (id: number, newName: string) => void;
    onSetDefault: (id: number | null) => void;
    maxPresets?: number;
    /** Render a preview summary of preset data. If provided, a preview toggle is shown per row. */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderPreview?: (data: any) => React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PresetSelector: React.FC<PresetSelectorProps> = ({
    presets,
    isLoading,
    defaultPresetId,
    onSave,
    onLoad,
    onUpdate,
    onDelete,
    onRename,
    onSetDefault,
    maxPresets = 10,
    renderPreview,
}) => {
    const { t } = useTranslation('common');

    // Popover state
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const open = Boolean(anchorEl);

    // Save mode
    const [isSaving, setIsSaving] = useState(false);
    const [saveName, setSaveName] = useState('');

    // Rename mode
    const [renamingId, setRenamingId] = useState<number | null>(null);
    const [renameValue, setRenameValue] = useState('');

    // Context menu
    const [menuState, setMenuState] = useState<{ anchor: HTMLElement; preset: Preset } | null>(null);

    // Delete confirm
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

    // Preview expand
    const [previewId, setPreviewId] = useState<number | null>(null);

    const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(e.currentTarget);
        setIsSaving(false);
        setRenamingId(null);
        setDeleteConfirmId(null);
    };

    const handleClose = () => {
        setAnchorEl(null);
        setIsSaving(false);
        setSaveName('');
        setRenamingId(null);
        setDeleteConfirmId(null);
    };

    const handleSaveConfirm = () => {
        const trimmed = saveName.trim();
        if (!trimmed) return;
        onSave(trimmed);
        setIsSaving(false);
        setSaveName('');
    };

    const handleRenameConfirm = () => {
        const trimmed = renameValue.trim();
        if (!trimmed || renamingId === null) return;
        onRename(renamingId, trimmed);
        setRenamingId(null);
        setRenameValue('');
    };

    const atMax = presets.length >= maxPresets;

    return (
        <>
            {/* ── Trigger button ─────────────────────────────────────────── */}
            <Tooltip title={t('presets.title')}>
                <Box
                    onClick={handleOpen}
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        height: 26,
                        px: 0.75,
                        border: '1px solid var(--card-border)',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        transition: 'border-color 0.12s, background-color 0.12s',
                        '&:hover': {
                            borderColor: 'var(--primary)',
                            bgcolor: 'rgba(0,204,122,0.08)',
                        },
                    }}
                >
                    <BookmarkBorderIcon sx={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }} />
                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-secondary)', userSelect: 'none' }}>
                        {t('presets.title')}
                    </Typography>
                    {presets.length > 0 && (
                        <Typography sx={{
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            color: 'var(--primary)',
                            bgcolor: 'rgba(0,204,122,0.12)',
                            borderRadius: '6px',
                            px: 0.4,
                            lineHeight: '14px',
                            minWidth: 14,
                            textAlign: 'center',
                        }}>
                            {presets.length}
                        </Typography>
                    )}
                    <Typography sx={{ fontSize: '0.6rem', color: 'var(--text-secondary)', ml: -0.25 }}>▾</Typography>
                </Box>
            </Tooltip>

            {/* ── Popover ────────────────────────────────────────────────── */}
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                PaperProps={{
                    elevation: 4,
                    sx: {
                        width: 260,
                        mt: 0.5,
                        border: '1px solid var(--card-border)',
                        bgcolor: 'var(--card-bg)',
                        borderRadius: '4px',
                        overflow: 'hidden',
                    },
                }}
            >
                {/* Header */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 1.5,
                    py: 0.75,
                    borderBottom: '1px solid var(--card-border)',
                    bgcolor: 'var(--hover-bg)',
                }}>
                    <Typography variant="caption" sx={{
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: 'text.secondary',
                        fontSize: '0.7rem',
                        letterSpacing: '0.5px',
                    }}>
                        {t('presets.title')}
                    </Typography>
                    {isLoading && <CircularProgress size={12} sx={{ color: 'var(--text-secondary)' }} />}
                    {!isSaving && (
                        <Tooltip title={atMax ? t('presets.maxReached', { max: maxPresets }) : t('presets.save')}>
                            <span>
                                <IconButton
                                    size="small"
                                    disabled={atMax}
                                    onClick={() => { setIsSaving(true); setSaveName(''); }}
                                    sx={{
                                        width: 22, height: 22,
                                        color: 'var(--text-secondary)',
                                        '&:hover': { color: 'var(--primary)' },
                                    }}
                                >
                                    <AddIcon sx={{ fontSize: '0.9rem' }} />
                                </IconButton>
                            </span>
                        </Tooltip>
                    )}
                </Box>

                {/* Save form (inline) */}
                {isSaving && (
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 1.5,
                        py: 0.75,
                        borderBottom: '1px solid var(--card-border)',
                    }}>
                        <TextField
                            autoFocus
                            size="small"
                            placeholder={t('presets.namePlaceholder')}
                            value={saveName}
                            onChange={e => setSaveName(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveConfirm();
                                if (e.key === 'Escape') { setIsSaving(false); setSaveName(''); }
                            }}
                            sx={{
                                flex: 1,
                                '& .MuiInputBase-input': { fontSize: '0.75rem', py: 0.5, px: 1 },
                            }}
                        />
                        <IconButton size="small" onClick={handleSaveConfirm} disabled={!saveName.trim()} sx={{ width: 22, height: 22, color: 'var(--primary)' }}>
                            <CheckIcon sx={{ fontSize: '0.85rem' }} />
                        </IconButton>
                        <IconButton size="small" onClick={() => { setIsSaving(false); setSaveName(''); }} sx={{ width: 22, height: 22 }}>
                            <CloseIcon sx={{ fontSize: '0.85rem' }} />
                        </IconButton>
                    </Box>
                )}

                {/* Preset list */}
                <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                    {presets.length === 0 && !isLoading && (
                        <Box sx={{ px: 1.5, py: 2, textAlign: 'center' }}>
                            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                                {t('presets.noPresets')}
                            </Typography>
                        </Box>
                    )}
                    {presets.map(preset => {
                        const isDefault = preset.id === defaultPresetId;
                        const isRenaming = renamingId === preset.id;
                        const isDeleting = deleteConfirmId === preset.id;

                        if (isRenaming) {
                            return (
                                <Box key={preset.id} sx={{
                                    display: 'flex', alignItems: 'center', gap: 0.5,
                                    px: 1.5, py: 0.5,
                                    borderBottom: '1px solid var(--card-border)',
                                }}>
                                    <TextField
                                        autoFocus
                                        size="small"
                                        value={renameValue}
                                        onChange={e => setRenameValue(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleRenameConfirm();
                                            if (e.key === 'Escape') setRenamingId(null);
                                        }}
                                        sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: '0.75rem', py: 0.5, px: 1 } }}
                                    />
                                    <IconButton size="small" onClick={handleRenameConfirm} disabled={!renameValue.trim()} sx={{ width: 22, height: 22, color: 'var(--primary)' }}>
                                        <CheckIcon sx={{ fontSize: '0.85rem' }} />
                                    </IconButton>
                                    <IconButton size="small" onClick={() => setRenamingId(null)} sx={{ width: 22, height: 22 }}>
                                        <CloseIcon sx={{ fontSize: '0.85rem' }} />
                                    </IconButton>
                                </Box>
                            );
                        }

                        if (isDeleting) {
                            return (
                                <Box key={preset.id} sx={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    px: 1.5, py: 0.65,
                                    bgcolor: 'rgba(244,67,54,0.06)',
                                    borderBottom: '1px solid var(--card-border)',
                                }}>
                                    <Typography sx={{ fontSize: '0.72rem', color: 'error.main' }}>
                                        {t('presets.deleteConfirm', { name: preset.name })}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 0.25 }}>
                                        <IconButton size="small" onClick={() => { onDelete(preset.id); setDeleteConfirmId(null); }} sx={{ width: 22, height: 22, color: 'error.main' }}>
                                            <CheckIcon sx={{ fontSize: '0.85rem' }} />
                                        </IconButton>
                                        <IconButton size="small" onClick={() => setDeleteConfirmId(null)} sx={{ width: 22, height: 22 }}>
                                            <CloseIcon sx={{ fontSize: '0.85rem' }} />
                                        </IconButton>
                                    </Box>
                                </Box>
                            );
                        }

                        const isPreviewing = previewId === preset.id;

                        return (
                            <Box key={preset.id} sx={{ borderBottom: '1px solid var(--card-border)' }}>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                        px: 1.5,
                                        py: 0.5,
                                        cursor: 'pointer',
                                        transition: 'background-color 0.1s',
                                        '&:hover': { bgcolor: 'var(--hover-bg)' },
                                    }}
                                    onClick={() => { onLoad(preset); handleClose(); }}
                                >
                                    {/* Default star */}
                                    <Box
                                        onClick={(e) => { e.stopPropagation(); onSetDefault(isDefault ? null : preset.id); }}
                                        sx={{
                                            display: 'flex', alignItems: 'center',
                                            cursor: 'pointer',
                                            color: isDefault ? 'var(--primary)' : 'var(--text-secondary)',
                                            '&:hover': { color: 'var(--primary)' },
                                        }}
                                    >
                                        {isDefault
                                            ? <StarIcon sx={{ fontSize: '0.9rem' }} />
                                            : <StarBorderIcon sx={{ fontSize: '0.9rem' }} />
                                        }
                                    </Box>

                                    {/* Name */}
                                    <Typography noWrap sx={{ flex: 1, fontSize: '0.78rem', fontWeight: isDefault ? 600 : 400 }}>
                                        {preset.name}
                                    </Typography>

                                    {isDefault && (
                                        <Typography sx={{
                                            fontSize: '0.58rem',
                                            fontWeight: 700,
                                            color: 'var(--primary)',
                                            bgcolor: 'rgba(0,204,122,0.12)',
                                            px: 0.5,
                                            py: 0.1,
                                            borderRadius: '3px',
                                            lineHeight: 1.4,
                                            flexShrink: 0,
                                        }}>
                                            {t('presets.defaultBadge')}
                                        </Typography>
                                    )}

                                    {/* Preview toggle */}
                                    {renderPreview && (
                                        <IconButton
                                            size="small"
                                            onClick={(e) => { e.stopPropagation(); setPreviewId(isPreviewing ? null : preset.id); }}
                                            sx={{
                                                width: 22, height: 22, flexShrink: 0,
                                                color: isPreviewing ? 'var(--primary)' : 'var(--text-secondary)',
                                                '&:hover': { color: 'var(--primary)' },
                                            }}
                                        >
                                            <VisibilityIcon sx={{ fontSize: '0.8rem' }} />
                                        </IconButton>
                                    )}

                                    {/* More menu trigger */}
                                    <IconButton
                                        size="small"
                                        onClick={(e) => { e.stopPropagation(); setMenuState({ anchor: e.currentTarget, preset }); }}
                                        sx={{ width: 22, height: 22, color: 'var(--text-secondary)', flexShrink: 0 }}
                                    >
                                        <MoreVertIcon sx={{ fontSize: '0.85rem' }} />
                                    </IconButton>
                                </Box>

                                {/* Inline preview panel */}
                                {isPreviewing && renderPreview && (
                                    <Box sx={{
                                        px: 1.5, py: 0.75,
                                        bgcolor: 'var(--hover-bg)',
                                        borderTop: '1px dashed var(--card-border)',
                                    }}>
                                        {renderPreview(preset.data)}
                                    </Box>
                                )}
                            </Box>
                        );
                    })}
                </Box>
            </Popover>

            {/* ── Context menu ───────────────────────────────────────────── */}
            <Menu
                anchorEl={menuState?.anchor ?? null}
                open={Boolean(menuState)}
                onClose={() => setMenuState(null)}
                PaperProps={{
                    elevation: 4,
                    sx: {
                        minWidth: 160,
                        border: '1px solid var(--card-border)',
                        bgcolor: 'var(--card-bg)',
                        '& .MuiMenuItem-root': { fontSize: '0.75rem', py: 0.6 },
                    },
                }}
            >
                <MenuItem onClick={() => {
                    if (menuState) { onLoad(menuState.preset); handleClose(); }
                    setMenuState(null);
                }}>
                    {t('presets.load')}
                </MenuItem>
                <MenuItem onClick={() => {
                    if (menuState) onUpdate(menuState.preset.id);
                    setMenuState(null);
                }}>
                    {t('presets.update')}
                </MenuItem>
                <Divider sx={{ my: 0.5 }} />
                <MenuItem onClick={() => {
                    if (menuState) {
                        setRenamingId(menuState.preset.id);
                        setRenameValue(menuState.preset.name);
                    }
                    setMenuState(null);
                }}>
                    {t('presets.rename')}
                </MenuItem>
                <MenuItem onClick={() => {
                    if (menuState) {
                        const isDefault = menuState.preset.id === defaultPresetId;
                        onSetDefault(isDefault ? null : menuState.preset.id);
                    }
                    setMenuState(null);
                }}>
                    {menuState && menuState.preset.id === defaultPresetId
                        ? t('presets.removeDefault')
                        : t('presets.setDefault')
                    }
                </MenuItem>
                <Divider sx={{ my: 0.5 }} />
                <MenuItem onClick={() => {
                    if (menuState) setDeleteConfirmId(menuState.preset.id);
                    setMenuState(null);
                }} sx={{ color: 'error.main' }}>
                    {t('presets.delete')}
                </MenuItem>
            </Menu>
        </>
    );
};
