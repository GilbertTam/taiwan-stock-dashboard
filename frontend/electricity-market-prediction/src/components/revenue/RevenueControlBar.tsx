'use client';

import React, { useMemo, useState } from 'react';
import {
    Box, Paper, Chip, Typography, IconButton, Tooltip, Divider,
    Popover, List, ListItemButton, Checkbox, Menu, MenuItem, Button,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SettingsIcon from '@mui/icons-material/Settings';
import { AreaButtonGroup } from '@/components/selectors/AreaButtonGroup';
import { useMarketDataContext } from '@/context/MarketDataContext';
import { calculateModelMAE, prepareChartData } from '@/utils/chartUtils';
import type { CalculatingDate } from '@/types';
import type { ChartDataPoint } from '@/utils/chartUtils';
import { useTranslation } from 'react-i18next';

// ─── Calculating date label helper ───────────────────────────────────────────

function formatCalcDate(dateVal: string, latestLabel: string): string {
    if (!dateVal || dateVal === 'latest') return latestLabel;
    if (dateVal.length === 8 && !isNaN(Number(dateVal))) {
        return `${dateVal.slice(0, 4)}-${dateVal.slice(4, 6)}-${dateVal.slice(6, 8)}`;
    }
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    return dateVal;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface RevenueControlBarProps {
    onModelToggle: (modelId: string | number, modelName: string) => void;
    chartData: ChartDataPoint[];
    onOpenBatteryConfig: () => void;
    batteryConfigOpen: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const RevenueControlBar: React.FC<RevenueControlBarProps> = ({
    onModelToggle,
    chartData,
    onOpenBatteryConfig,
    batteryConfigOpen,
}) => {
    const { t } = useTranslation('siteRevenue');
    const {
        areas, selectedArea, handleAreaChange,
        models, selectedModels, calculatingDatesByModel,
        handleModelCalculatingDateChange,
    } = useMarketDataContext();

    // Model add/remove popover
    const [modelPopoverAnchor, setModelPopoverAnchor] = useState<HTMLElement | null>(null);

    // Calculating date menu
    const [dateMenuState, setDateMenuState] = useState<{
        anchor: HTMLElement;
        modelIndex: number;
        modelKey: string;
    } | null>(null);

    const handleChipClick = (e: React.MouseEvent<HTMLDivElement>, modelIndex: number, modelKey: string) => {
        e.stopPropagation();
        setDateMenuState({ anchor: e.currentTarget, modelIndex, modelKey });
    };

    const handleDateSelect = (modelIndex: number, date: string) => {
        handleModelCalculatingDateChange(modelIndex, date);
        setDateMenuState(null);
    };

    const activeDateDates: CalculatingDate[] = dateMenuState
        ? (calculatingDatesByModel[dateMenuState.modelKey] ?? [])
        : [];

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
            {/* ── Area ─────────────────────────────────────────────────────── */}
            <AreaButtonGroup areas={areas} selectedArea={selectedArea} onAreaChange={handleAreaChange} />

            <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />

            {/* ── Models ───────────────────────────────────────────────────── */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                {selectedModels.map((m, idx) => {
                    const modelKey = `${m.id}|${m.name}`;
                    const color = m.color || '#cccccc';
                    const mae = calculateModelMAE(chartData, m.id, m.name);
                    const dateLabel = formatCalcDate(m.calculatingDate, t('controlBar.latest'));
                    return (
                        <Chip
                            key={modelKey}
                            size="small"
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                                    <Typography component="span" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                        {m.name}
                                    </Typography>
                                    {mae != null && mae > 0 && (
                                        <Typography component="span" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                                            MAE {mae.toFixed(1)}
                                        </Typography>
                                    )}
                                    <Typography component="span" sx={{ fontSize: '0.65rem', color: 'text.secondary', fontFamily: 'monospace' }}>
                                        {dateLabel}
                                    </Typography>
                                </Box>
                            }
                            onDelete={() => onModelToggle(m.id, m.name)}
                            onClick={(e) => handleChipClick(e, idx, modelKey)}
                            sx={{
                                height: 26,
                                bgcolor: `color-mix(in srgb, ${color}, transparent 85%)`,
                                border: `1px solid color-mix(in srgb, ${color}, transparent 60%)`,
                                cursor: 'pointer',
                                '& .MuiChip-label': { px: 1 },
                                '& .MuiChip-deleteIcon': {
                                    color: 'var(--text-secondary)',
                                    fontSize: '0.85rem',
                                    '&:hover': { color },
                                },
                                '&:hover': { bgcolor: `color-mix(in srgb, ${color}, transparent 78%)` },
                            }}
                        />
                    );
                })}

                <Tooltip title={t('controlBar.addManageModels')}>
                    <IconButton
                        size="small"
                        onClick={(e) => setModelPopoverAnchor(e.currentTarget)}
                        sx={{
                            width: 26, height: 26,
                            border: '1px dashed var(--card-border)',
                            borderRadius: '3px',
                            color: 'var(--text-secondary)',
                            transition: 'all 0.12s',
                            '&:hover': { color: 'var(--primary)', borderColor: 'var(--primary)', bgcolor: 'rgba(0,204,122,0.08)' },
                        }}
                    >
                        <AddIcon sx={{ fontSize: '0.85rem' }} />
                    </IconButton>
                </Tooltip>
            </Box>

            <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />

            {/* ── Battery Config Button ────────────────────────────────────── */}
            <Tooltip title={t('controlBar.batteryConfigTooltip')} arrow>
                <Button
                    size="small"
                    startIcon={<SettingsIcon sx={{ fontSize: '0.85rem' }} />}
                    onClick={onOpenBatteryConfig}
                    variant={batteryConfigOpen ? 'contained' : 'outlined'}
                    sx={{
                        height: 28,
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        textTransform: 'none',
                        border: `1px solid ${batteryConfigOpen ? 'var(--primary)' : 'var(--card-border)'}`,
                        color: batteryConfigOpen ? 'white' : 'var(--text-secondary)',
                        bgcolor: batteryConfigOpen ? 'var(--primary)' : 'transparent',
                        px: 1.5,
                        '&:hover': {
                            bgcolor: batteryConfigOpen ? 'var(--primary)' : 'rgba(0,204,122,0.08)',
                            borderColor: 'var(--primary)',
                            color: batteryConfigOpen ? 'white' : 'var(--primary)',
                        },
                    }}
                >
                    {t('controlBar.batteryParamsBtn')}
                </Button>
            </Tooltip>

            {/* ── Model add/manage popover ─────────────────────────────────── */}
            <Popover
                open={Boolean(modelPopoverAnchor)}
                anchorEl={modelPopoverAnchor}
                onClose={() => setModelPopoverAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                PaperProps={{
                    elevation: 4,
                    sx: {
                        width: 240,
                        mt: 0.5,
                        border: '1px solid var(--card-border)',
                        bgcolor: 'var(--card-bg)',
                        borderRadius: '4px',
                    },
                }}
            >
                <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid var(--card-border)' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                        {t('controlBar.selectModel')}
                    </Typography>
                </Box>
                <List dense sx={{ py: 0.5, maxHeight: 280, overflowY: 'auto' }}>
                    {models.map((model) => {
                        const modelKey = `${model.id}|${model.name}`;
                        const isSelected = selectedModels.some(m => `${m.id}|${m.name}` === modelKey);
                        const color = selectedModels.find(m => `${m.id}|${m.name}` === modelKey)?.color || '#cccccc';
                        return (
                            <ListItemButton
                                key={modelKey}
                                onClick={() => onModelToggle(model.id, model.name)}
                                dense
                                sx={{
                                    px: 1.5, py: 0.5,
                                    borderLeft: `3px solid ${isSelected ? color : 'transparent'}`,
                                    bgcolor: isSelected ? `color-mix(in srgb, ${color}, transparent 88%)` : 'transparent',
                                    '&:hover': { bgcolor: isSelected ? `color-mix(in srgb, ${color}, transparent 82%)` : 'var(--hover-bg)' },
                                }}
                            >
                                <Checkbox checked={isSelected} size="small" sx={{ p: 0.5, mr: 1, color, '&.Mui-checked': { color } }} disableRipple />
                                <Typography sx={{ fontSize: '0.8rem', fontWeight: isSelected ? 600 : 400 }}>
                                    {model.name}
                                </Typography>
                            </ListItemButton>
                        );
                    })}
                </List>
            </Popover>

            {/* ── Calculating date menu ────────────────────────────────────── */}
            <Menu
                anchorEl={dateMenuState?.anchor}
                open={Boolean(dateMenuState)}
                onClose={() => setDateMenuState(null)}
                PaperProps={{ sx: { border: '1px solid var(--card-border)', bgcolor: 'var(--card-bg)' } }}
            >
                <Box sx={{ px: 1.5, py: 0.75, borderBottom: '1px solid var(--card-border)' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', fontSize: '0.7rem' }}>
                        {t('controlBar.calcDate')}
                    </Typography>
                </Box>
                <MenuItem onClick={() => dateMenuState && handleDateSelect(dateMenuState.modelIndex, 'latest')} dense sx={{ fontSize: '0.8rem' }}>
                    {t('controlBar.latestForecast')}
                </MenuItem>
                {activeDateDates.map((d) => (
                    <MenuItem
                        key={d.calculating_date}
                        onClick={() => dateMenuState && handleDateSelect(dateMenuState.modelIndex, d.calculating_date)}
                        dense
                        sx={{ fontSize: '0.8rem', fontFamily: 'monospace' }}
                    >
                        {formatCalcDate(String(d.calculating_date), t('controlBar.latest'))}
                    </MenuItem>
                ))}
            </Menu>
        </Paper>
    );
};
