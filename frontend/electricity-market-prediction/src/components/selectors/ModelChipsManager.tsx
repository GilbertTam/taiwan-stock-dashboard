'use client';

import React, { useState } from 'react';
import {
    Box, Chip, Typography, Tooltip, Popover, List, ListItemButton, Checkbox, Menu, MenuItem, Button,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import type { CalculatingDate } from '@/types';
import type { ChartDataPoint } from '@/utils/chartUtils';
import { calculateModelMAE } from '@/utils/chartUtils';

/**
 * Format a calculatingDate value for display.
 * Mirrors the helpers previously duplicated in Forecast/Revenue control bars.
 */
function formatCalcDate(dateVal: string, latestLabel: string): string {
    if (!dateVal || dateVal === 'latest') return latestLabel;
    if (dateVal.length === 8 && !isNaN(Number(dateVal))) {
        return `${dateVal.slice(0, 4)}-${dateVal.slice(4, 6)}-${dateVal.slice(6, 8)}`;
    }
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(dateVal)) return String(dateVal).slice(0, 16);
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    return dateVal;
}

interface ModelOption {
    id: string | number;
    name: string;
}

interface SelectedModel {
    id: string | number;
    name: string;
    color: string;
    calculatingDate: string;
}

export interface ModelChipsManagerLabels {
    /** Button label shown next to chips, e.g. "加入/管理模型". */
    addManageModels: string;
    /** Popover header, e.g. "選擇預測模型". */
    selectModels: string;
    /** Date menu header, e.g. "計算日". */
    calculationDate: string;
    /** Date menu first item, e.g. "最新預測". */
    latestForecast: string;
    /** Short label used inside chips when calculatingDate==='latest', e.g. "最新". */
    latest: string;
}

export interface ModelChipsManagerProps {
    models: ModelOption[];
    selectedModels: SelectedModel[];
    calculatingDatesByModel: Record<string, CalculatingDate[]>;
    /** Optional override for chip color — falls back to `m.color`. Pass when a context-wide map exists. */
    modelColorMap?: Record<string, string>;
    chartData: ChartDataPoint[];
    onModelToggle: (modelId: string | number, modelName: string) => void;
    onCalculatingDateChange: (modelIndex: number, date: string) => void;
    labels: ModelChipsManagerLabels;
}

export const ModelChipsManager: React.FC<ModelChipsManagerProps> = ({
    models,
    selectedModels,
    calculatingDatesByModel,
    modelColorMap,
    chartData,
    onModelToggle,
    onCalculatingDateChange,
    labels,
}) => {
    const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);
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
        onCalculatingDateChange(modelIndex, date);
        setDateMenuState(null);
    };

    const activeDateDates: CalculatingDate[] = dateMenuState
        ? (calculatingDatesByModel[dateMenuState.modelKey] ?? [])
        : [];

    return (
        <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                {selectedModels.map((m, idx) => {
                    const modelKey = `${m.id}|${m.name}`;
                    const color = modelColorMap?.[modelKey] || m.color || '#cccccc';
                    const mae = calculateModelMAE(chartData, m.id, m.name);
                    const dateLabel = formatCalcDate(m.calculatingDate, labels.latest);
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

                {/* Entry button — labeled (was a tiny + icon before; users couldn't find it). */}
                <Tooltip title={labels.addManageModels} arrow>
                    <Button
                        size="small"
                        startIcon={<AddIcon sx={{ fontSize: '0.95rem' }} />}
                        onClick={(e) => setPopoverAnchor(e.currentTarget)}
                        sx={{
                            height: 26,
                            px: 1.25,
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            textTransform: 'none',
                            color: 'var(--text-secondary)',
                            border: '1px dashed var(--card-border)',
                            borderRadius: '3px',
                            bgcolor: 'transparent',
                            whiteSpace: 'nowrap',
                            '& .MuiButton-startIcon': { mr: 0.5 },
                            '&:hover': {
                                color: 'var(--primary)',
                                borderColor: 'var(--primary)',
                                borderStyle: 'solid',
                                bgcolor: 'rgba(0,204,122,0.08)',
                            },
                        }}
                    >
                        {labels.addManageModels}
                    </Button>
                </Tooltip>
            </Box>

            {/* Model add/manage popover */}
            <Popover
                open={Boolean(popoverAnchor)}
                anchorEl={popoverAnchor}
                onClose={() => setPopoverAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                PaperProps={{
                    elevation: 4,
                    sx: { width: 240, mt: 0.5, border: '1px solid var(--card-border)', bgcolor: 'var(--card-bg)', borderRadius: '4px' },
                }}
            >
                <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid var(--card-border)' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                        {labels.selectModels}
                    </Typography>
                </Box>
                <List dense sx={{ py: 0.5, maxHeight: 280, overflowY: 'auto' }}>
                    {models.map((model) => {
                        const modelKey = `${model.id}|${model.name}`;
                        const isSelected = selectedModels.some(m => `${m.id}|${m.name}` === modelKey);
                        const color = modelColorMap?.[modelKey]
                            || selectedModels.find(m => `${m.id}|${m.name}` === modelKey)?.color
                            || '#cccccc';
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

            {/* Calculating date menu (opened by chip click) */}
            <Menu
                anchorEl={dateMenuState?.anchor}
                open={Boolean(dateMenuState)}
                onClose={() => setDateMenuState(null)}
                PaperProps={{ sx: { border: '1px solid var(--card-border)', bgcolor: 'var(--card-bg)' } }}
            >
                <Box sx={{ px: 1.5, py: 0.75, borderBottom: '1px solid var(--card-border)' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', fontSize: '0.7rem' }}>
                        {labels.calculationDate}
                    </Typography>
                </Box>
                <MenuItem onClick={() => dateMenuState && handleDateSelect(dateMenuState.modelIndex, 'latest')} dense sx={{ fontSize: '0.8rem' }}>
                    {labels.latestForecast}
                </MenuItem>
                {activeDateDates.map((d) => (
                    <MenuItem
                        key={d.calculating_date}
                        onClick={() => dateMenuState && handleDateSelect(dateMenuState.modelIndex, d.calculating_date)}
                        dense
                        sx={{ fontSize: '0.8rem', fontFamily: 'monospace' }}
                    >
                        {formatCalcDate(String(d.calculating_date), labels.latest)}
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
};
