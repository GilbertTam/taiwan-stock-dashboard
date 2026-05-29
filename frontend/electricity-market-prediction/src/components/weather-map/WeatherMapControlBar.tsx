'use client';

import React, { useMemo, useState } from 'react';
import {
    Box,
    Collapse,
    Divider,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Paper,
    Popover,
    Radio,
    Tab,
    Tabs,
    Tooltip,
    Typography,
} from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { useTranslation } from 'react-i18next';
import {
    HOURLY_CATEGORIES,
    DAILY_CATEGORIES,
    WEATHER_FIELD_DISPLAY,
} from '@/constants/weatherCategories';
import { UNSUPPORTED_FOR_MAP } from './fieldRanges';
import type { WeatherDataset } from '@/hooks/useWeatherFieldByArea';

export interface WeatherMapControlBarProps {
    dataset: WeatherDataset;
    onDatasetChange: (d: WeatherDataset) => void;
    /** Currently selected field key (must belong to the current dataset's categories) */
    field: string;
    onFieldChange: (field: string) => void;
    /** Slot at the right edge — typically the PresetSelector. */
    presetSlot?: React.ReactNode;
}

function fieldLabel(t: ReturnType<typeof useTranslation>['t'], fieldKey: string): string {
    const display = WEATHER_FIELD_DISPLAY[fieldKey];
    if (!display?.shortLabelKey) return fieldKey;
    const translated = t(`forecast:${display.shortLabelKey}`);
    return translated && translated !== display.shortLabelKey ? translated : fieldKey;
}

function fieldUnit(fieldKey: string): string | undefined {
    return WEATHER_FIELD_DISPLAY[fieldKey]?.unit;
}

const PRIMARY = 'var(--primary)';

interface SegmentChipProps {
    label: string;
    active: boolean;
    onClick: () => void;
}

/** Match the data-source chip style from WeatherControlBar:
 *  26px height, 1px border, primary-tinted bg when active. */
function SegmentChip({ label, active, onClick }: SegmentChipProps) {
    return (
        <Box
            onClick={onClick}
            sx={{
                display: 'flex',
                alignItems: 'center',
                height: 26,
                px: 1,
                border: `1px solid ${active ? PRIMARY : 'var(--card-border)'}`,
                bgcolor: active ? 'rgba(0,204,122,0.08)' : 'transparent',
                borderRadius: '3px',
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'all 0.12s',
                '&:hover': {
                    borderColor: PRIMARY,
                    bgcolor: active ? 'rgba(0,204,122,0.16)' : 'rgba(0,204,122,0.05)',
                },
            }}
        >
            <Typography
                sx={{
                    fontSize: '0.72rem',
                    fontWeight: active ? 600 : 400,
                    color: active ? PRIMARY : 'var(--text-secondary)',
                    lineHeight: 1,
                }}
            >
                {label}
            </Typography>
        </Box>
    );
}

export function WeatherMapControlBar({
    dataset, onDatasetChange, field, onFieldChange, presetSlot,
}: WeatherMapControlBarProps) {
    const { t } = useTranslation(['weatherMap', 'forecast']);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [tabIdx, setTabIdx] = useState<0 | 1>(dataset === 'hourly' ? 0 : 1);
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

    const activeCategories = tabIdx === 0 ? HOURLY_CATEGORIES : DAILY_CATEGORIES;

    const selectedLabel = useMemo(() => {
        const lbl = fieldLabel(t, field);
        const unit = fieldUnit(field);
        return unit ? `${lbl} (${unit})` : lbl;
    }, [t, field]);

    const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(e.currentTarget);
        setTabIdx(dataset === 'hourly' ? 0 : 1);
    };

    const handleClose = () => setAnchorEl(null);

    const handleSelectField = (newField: string) => {
        const newDataset: WeatherDataset = tabIdx === 0 ? 'hourly' : 'daily';
        if (newDataset !== dataset) onDatasetChange(newDataset);
        onFieldChange(newField);
        handleClose();
    };

    return (
        <Paper
            elevation={0}
            sx={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 0.75,
                px: 1,
                py: 0.5,
                minHeight: 40,
                border: '1px solid var(--card-border)',
                bgcolor: 'var(--card-bg)',
                borderRadius: '1.5px',
                flexShrink: 0,
            }}
        >
            {/* Dataset segment */}
            <Typography
                sx={{
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    pl: 0.25,
                }}
            >
                {t('weatherMap:dataset.label')}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <SegmentChip
                    label={t('weatherMap:dataset.hourly')}
                    active={dataset === 'hourly'}
                    onClick={() => onDatasetChange('hourly')}
                />
                <SegmentChip
                    label={t('weatherMap:dataset.daily')}
                    active={dataset === 'daily'}
                    onClick={() => onDatasetChange('daily')}
                />
            </Box>

            <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />

            {/* Field picker chip */}
            <Typography
                sx={{
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    pl: 0.25,
                }}
            >
                {t('weatherMap:fieldPicker.label')}
            </Typography>
            <Box
                onClick={handleOpen}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    height: 26,
                    px: 1,
                    border: `1px solid ${PRIMARY}`,
                    bgcolor: 'rgba(0,204,122,0.08)',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    transition: 'all 0.12s',
                    '&:hover': { borderColor: PRIMARY, bgcolor: 'rgba(0,204,122,0.16)' },
                }}
            >
                <Typography
                    sx={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: PRIMARY,
                        lineHeight: 1,
                        userSelect: 'none',
                    }}
                >
                    {selectedLabel}
                </Typography>
                <ExpandMore sx={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }} />
            </Box>

            {/* Preset slot rendered at the end */}
            {presetSlot && (
                <>
                    <Box sx={{ flex: 1 }} />
                    <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
                    {presetSlot}
                </>
            )}

            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{
                    paper: {
                        sx: {
                            mt: 0.5,
                            borderRadius: 1.5,
                            border: '1px solid var(--card-border)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
                        },
                    },
                }}
            >
                <Box sx={{ minWidth: 320, maxWidth: 380, maxHeight: 500, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ borderBottom: '1px solid var(--card-border)' }}>
                        <Tabs
                            value={tabIdx}
                            onChange={(_, v: 0 | 1) => { setTabIdx(v); setExpandedCategory(null); }}
                            sx={{ minHeight: 32, '& .MuiTab-root': { minHeight: 32, px: 1.5, fontSize: '0.75rem', py: 0, textTransform: 'none' } }}
                        >
                            <Tab label={t('weatherMap:dataset.hourly')} />
                            <Tab label={t('weatherMap:dataset.daily')} />
                        </Tabs>
                    </Box>

                    <Box sx={{ flex: 1, overflowY: 'auto' }}>
                        <List dense sx={{ p: 1 }}>
                            {activeCategories.map((cat) => {
                                const isExpanded = expandedCategory === cat.id;
                                const containsSelected = cat.fields.includes(field);
                                return (
                                    <Box key={cat.id} sx={{ mb: 0.5 }}>
                                        <ListItem disablePadding>
                                            <ListItemButton
                                                onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                                                sx={{ py: 0.25, px: 1, borderRadius: 1, bgcolor: isExpanded ? 'var(--hover-bg)' : 'transparent' }}
                                            >
                                                <ListItemText
                                                    primary={t(`forecast:${cat.labelKey}`)}
                                                    primaryTypographyProps={{
                                                        fontSize: '0.78rem',
                                                        fontWeight: 600,
                                                        color: containsSelected ? PRIMARY : 'text.primary',
                                                    }}
                                                />
                                                {isExpanded
                                                    ? <ExpandLess fontSize="small" color="action" />
                                                    : <ExpandMore fontSize="small" color="action" />}
                                            </ListItemButton>
                                        </ListItem>
                                        <Collapse in={isExpanded}>
                                            <Box sx={{ pl: 1, mt: 0.25 }}>
                                                {cat.fields.map((f) => {
                                                    const unsupported = UNSUPPORTED_FOR_MAP.has(f);
                                                    const isSelected = field === f;
                                                    const display = WEATHER_FIELD_DISPLAY[f];
                                                    const labelText = display?.shortLabelKey
                                                        ? t(`forecast:${display.shortLabelKey}`)
                                                        : f;
                                                    const item = (
                                                        <ListItem key={f} disablePadding>
                                                            <ListItemButton
                                                                disabled={unsupported}
                                                                onClick={() => handleSelectField(f)}
                                                                sx={{ py: 0.15, px: 1, borderRadius: 1 }}
                                                            >
                                                                <ListItemIcon sx={{ minWidth: 28 }}>
                                                                    <Radio checked={isSelected} size="small" sx={{ p: 0.5 }} />
                                                                </ListItemIcon>
                                                                <ListItemText
                                                                    primary={labelText}
                                                                    secondary={
                                                                        unsupported
                                                                            ? t('weatherMap:fieldPicker.unsupported')
                                                                            : display?.unit
                                                                                ? `(${display.unit})`
                                                                                : undefined
                                                                    }
                                                                    primaryTypographyProps={{ fontSize: '0.78rem' }}
                                                                    secondaryTypographyProps={{ fontSize: '0.65rem' }}
                                                                />
                                                            </ListItemButton>
                                                        </ListItem>
                                                    );
                                                    return unsupported ? (
                                                        <Tooltip key={f} title={t('weatherMap:fieldPicker.unsupported')} placement="right">
                                                            <span>{item}</span>
                                                        </Tooltip>
                                                    ) : item;
                                                })}
                                            </Box>
                                        </Collapse>
                                    </Box>
                                );
                            })}
                        </List>
                    </Box>
                </Box>
            </Popover>
        </Paper>
    );
}
