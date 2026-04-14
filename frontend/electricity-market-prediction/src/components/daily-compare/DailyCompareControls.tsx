'use client';

import React, { useState } from 'react';
import {
    Box,
    Typography,
    List,
    ListItemButton,
    Checkbox,
    Chip,
    Tooltip,
    Paper,
    Divider,
    IconButton,
    Popover,
} from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import BoltIcon from '@mui/icons-material/Bolt';
import EnergySavingsLeafIcon from '@mui/icons-material/EnergySavingsLeaf';
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt';
import BarChartIcon from '@mui/icons-material/BarChart';
import AddIcon from '@mui/icons-material/Add';
import { Area } from '@/types';
import { SectionHeader } from '@/components/selectors/shared';
import { useTranslation } from 'react-i18next';
import { getAreaName } from '@/utils/areaI18n';
import { PresetSelector } from '@/components/selectors/PresetSelector';
import type { Preset } from '@/types/presets';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPreset = Preset<any>;

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChartType = 'line' | 'step' | 'bar';

export type MetricKey =
    | 'spot_price'
    | 'system_price'
    | 'imbalance_surplus'
    | 'imbalance_deficit'
    | 'imbalance_quantity'
    | 'intraday_avg'
    | 'intraday_volume'
    | 'solar'
    | 'solar_curtail'
    | 'wind'
    | 'wind_curtail'
    | 'thermal'
    | 'nuclear'
    | 'hydro'
    | 'area_demand'
    | 'jepx_sell_qty'
    | 'jepx_contract_qty';

export type GroupKey = 'spotMarket' | 'imbalanceMarket' | 'intradayMarket' | 'renewable' | 'powerSupplyDemand' | 'spotTradeVolume';

export interface MetricConfig {
    key: MetricKey;
    label: string;
    unit: string;
    group: string;
    groupKey: GroupKey;
    chartType: ChartType;
    baseColor: string;
}

/** Raw configs — label/group are populated at runtime via useTranslatedMetrics() */
const RAW_METRIC_CONFIGS: Omit<MetricConfig, 'label' | 'group'>[] = [
    { key: 'spot_price',        unit: '円/kWh', groupKey: 'spotMarket',        chartType: 'step', baseColor: '#ff4d4f' },
    { key: 'system_price',      unit: '円/kWh', groupKey: 'spotMarket',        chartType: 'step', baseColor: '#ff7875' },
    { key: 'imbalance_surplus', unit: '円/kWh', groupKey: 'imbalanceMarket',   chartType: 'step', baseColor: '#52c41a' },
    { key: 'imbalance_deficit', unit: '円/kWh', groupKey: 'imbalanceMarket',   chartType: 'step', baseColor: '#fa8c16' },
    { key: 'imbalance_quantity',unit: 'kWh',    groupKey: 'imbalanceMarket',   chartType: 'bar',  baseColor: '#73d13d' },
    { key: 'intraday_avg',      unit: '円/kWh', groupKey: 'intradayMarket',    chartType: 'step', baseColor: '#9254de' },
    { key: 'intraday_volume',   unit: 'kWh',    groupKey: 'intradayMarket',    chartType: 'bar',  baseColor: '#722ed1' },
    { key: 'solar',             unit: 'MW',     groupKey: 'renewable',         chartType: 'bar',  baseColor: '#fadb14' },
    { key: 'solar_curtail',     unit: 'MW',     groupKey: 'renewable',         chartType: 'bar',  baseColor: '#ffc53d' },
    { key: 'wind',              unit: 'MW',     groupKey: 'renewable',         chartType: 'bar',  baseColor: '#40a9ff' },
    { key: 'wind_curtail',      unit: 'MW',     groupKey: 'renewable',         chartType: 'bar',  baseColor: '#91d5ff' },
    { key: 'thermal',           unit: 'MW',     groupKey: 'powerSupplyDemand', chartType: 'bar',  baseColor: '#fa541c' },
    { key: 'nuclear',           unit: 'MW',     groupKey: 'powerSupplyDemand', chartType: 'bar',  baseColor: '#13c2c2' },
    { key: 'hydro',             unit: 'MW',     groupKey: 'powerSupplyDemand', chartType: 'bar',  baseColor: '#1890ff' },
    { key: 'area_demand',       unit: 'MW',     groupKey: 'powerSupplyDemand', chartType: 'line', baseColor: '#b0bec5' },
    { key: 'jepx_sell_qty',     unit: 'MWh',    groupKey: 'spotTradeVolume',   chartType: 'bar',  baseColor: '#ff85c0' },
    { key: 'jepx_contract_qty', unit: 'MWh',    groupKey: 'spotTradeVolume',   chartType: 'bar',  baseColor: '#eb2f96' },
];

/** Fallback export for non-translated contexts (keeps backward compat) */
export const METRIC_CONFIGS: MetricConfig[] = RAW_METRIC_CONFIGS.map(c => ({
    ...c,
    label: c.key,
    group: c.groupKey,
})) as MetricConfig[];

/** Hook that returns METRIC_CONFIGS with translated label & group */
export function useTranslatedMetrics(): MetricConfig[] {
    const { t } = useTranslation('dailyCompare');
    return React.useMemo(() =>
        RAW_METRIC_CONFIGS.map(c => ({
            ...c,
            label: t(`metrics.${c.key}`),
            group: t(`groups.${c.groupKey}`),
        })) as MetricConfig[],
    [t]);
}

const GROUP_KEY_ORDER: GroupKey[] = ['spotMarket', 'imbalanceMarket', 'intradayMarket', 'renewable', 'powerSupplyDemand', 'spotTradeVolume'];

const MAX_AREAS = 6;

const AREA_COLORS = ['#00ff9d', '#00d2ff', '#ffca28', '#ff7043', '#9254de', '#26c6da'];

// ─── Group icon map ────────────────────────────────────────────────────────────

const GROUP_ICONS: Record<string, React.ReactNode> = {
    spotMarket:        <ShowChartIcon sx={{ fontSize: 11 }} />,
    imbalanceMarket:   <SwapHorizIcon sx={{ fontSize: 11 }} />,
    intradayMarket:    <BoltIcon sx={{ fontSize: 11 }} />,
    renewable:         <EnergySavingsLeafIcon sx={{ fontSize: 11 }} />,
    powerSupplyDemand: <ElectricBoltIcon sx={{ fontSize: 11 }} />,
    spotTradeVolume:   <BarChartIcon sx={{ fontSize: 11 }} />,
};

// ─── Props ─────────────────────────────────────────────────────────────────────

interface DailyCompareControlsProps {
    areas: Area[];
    selectedAreas: string[];
    onAreasChange: (names: string[]) => void;
    selectedMetric: MetricKey;
    onMetricChange: (metric: MetricKey) => void;
    // Presets
    presets?: AnyPreset[];
    presetsLoading?: boolean;
    defaultPresetId?: number | null;
    onPresetSave?: (name: string) => void;
    onPresetLoad?: (preset: AnyPreset) => void;
    onPresetUpdate?: (id: number) => void;
    onPresetDelete?: (id: number) => void;
    onPresetRename?: (id: number, newName: string) => void;
    onPresetSetDefault?: (id: number | null) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderPresetPreview?: (data: any) => React.ReactNode;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export const DailyCompareControls: React.FC<DailyCompareControlsProps> = ({
    areas,
    selectedAreas,
    onAreasChange,
    selectedMetric,
    onMetricChange,
    presets = [],
    presetsLoading = false,
    defaultPresetId = null,
    onPresetSave,
    onPresetLoad,
    onPresetUpdate,
    onPresetDelete,
    onPresetRename,
    onPresetSetDefault,
    renderPresetPreview,
}) => {
    const { t } = useTranslation('dailyCompare');
    const translatedMetrics = useTranslatedMetrics();
    const [areaPopoverAnchor, setAreaPopoverAnchor] = useState<HTMLElement | null>(null);
    const [metricPopoverAnchor, setMetricPopoverAnchor] = useState<HTMLElement | null>(null);

    const handleAreaToggle = (areaName: string) => {
        if (selectedAreas.includes(areaName)) {
            onAreasChange(selectedAreas.filter(a => a !== areaName));
        } else {
            if (selectedAreas.length >= MAX_AREAS) return;
            onAreasChange([...selectedAreas, areaName]);
        }
    };

    const atMax = selectedAreas.length >= MAX_AREAS;
    const currentMetric = translatedMetrics.find(m => m.key === selectedMetric);

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
            {/* ── Area chips ───────────────────────────────────────────────── */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                {selectedAreas.map((areaName, idx) => {
                    const color = AREA_COLORS[idx % AREA_COLORS.length];
                    const label = getAreaName(t, areaName);
                    return (
                        <Chip
                            key={areaName}
                            label={label}
                            size="small"
                            onDelete={() => onAreasChange(selectedAreas.filter(a => a !== areaName))}
                            sx={{
                                height: 26,
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                bgcolor: `${color}20`,
                                color,
                                border: `1px solid ${color}50`,
                                '& .MuiChip-deleteIcon': { fontSize: '0.8rem', color, '&:hover': { color } },
                            }}
                        />
                    );
                })}

                <Tooltip title={atMax ? t('maxAreaReached') : t('addArea')} arrow>
                    <span>
                        <IconButton
                            size="small"
                            disabled={atMax && selectedAreas.length >= areas.length}
                            onClick={(e) => setAreaPopoverAnchor(e.currentTarget)}
                            sx={{
                                width: 26, height: 26,
                                border: '1px dashed var(--card-border)',
                                borderRadius: '3px',
                                color: 'var(--text-secondary)',
                                '&:hover': { color: 'var(--primary)', borderColor: 'var(--primary)', bgcolor: 'rgba(0,204,122,0.08)' },
                                '&.Mui-disabled': { opacity: 0.4 },
                            }}
                        >
                            <AddIcon sx={{ fontSize: '0.85rem' }} />
                        </IconButton>
                    </span>
                </Tooltip>

                {selectedAreas.length === 0 && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                        {t('selectAreaHint')}
                    </Typography>
                )}
            </Box>

            <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />

            {/* ── Metric trigger button ────────────────────────────────────── */}
            <Box
                component="button"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => setMetricPopoverAnchor(e.currentTarget)}
                sx={{
                    display: 'inline-flex', alignItems: 'center', gap: 0.75,
                    height: 28, px: 1,
                    border: `1px solid ${currentMetric ? `${currentMetric.baseColor}60` : 'var(--card-border)'}`,
                    bgcolor: currentMetric ? `${currentMetric.baseColor}10` : 'var(--card-bg)',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    width: 220, minWidth: 0,
                    transition: 'border-color 0.12s, background-color 0.12s',
                    '&:hover': {
                        borderColor: currentMetric?.baseColor ?? 'var(--primary)',
                        bgcolor: currentMetric ? `${currentMetric.baseColor}18` : 'var(--hover-bg)',
                    },
                    appearance: 'none', outline: 'none', fontFamily: 'inherit',
                    color: 'var(--text-primary)',
                }}
            >
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: currentMetric?.baseColor ?? '#888', flexShrink: 0 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', flexShrink: 0, fontSize: 14 }}>
                    {currentMetric ? GROUP_ICONS[currentMetric.groupKey] : null}
                </Box>
                <Typography noWrap sx={{ fontSize: '0.78rem', fontWeight: 500, flex: 1, textAlign: 'left', color: 'inherit' }}>
                    {currentMetric?.label ?? t('selectMetric')}
                </Typography>
                <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', flexShrink: 0, fontFamily: 'monospace' }}>
                    {currentMetric?.unit}
                </Typography>
                <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', flexShrink: 0, ml: 0.25 }}>▾</Typography>
            </Box>

            {/* ── Presets ──────────────────────────────────────────────────── */}
            {onPresetSave && (
                <>
                    <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
                    <PresetSelector
                        presets={presets}
                        isLoading={presetsLoading}
                        defaultPresetId={defaultPresetId}
                        onSave={onPresetSave}
                        onLoad={(preset) => onPresetLoad?.(preset)}
                        onUpdate={(id) => onPresetUpdate?.(id)}
                        onDelete={(id) => onPresetDelete?.(id)}
                        onRename={(id, name) => onPresetRename?.(id, name)}
                        onSetDefault={(id) => onPresetSetDefault?.(id)}
                        renderPreview={renderPresetPreview}
                    />
                </>
            )}

            {/* ── Area add popover ─────────────────────────────────────────── */}
            <Popover
                open={Boolean(areaPopoverAnchor)}
                anchorEl={areaPopoverAnchor}
                onClose={() => setAreaPopoverAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                PaperProps={{
                    elevation: 4,
                    sx: {
                        width: 200,
                        mt: 0.5,
                        border: '1px solid var(--card-border)',
                        bgcolor: 'var(--card-bg)',
                        borderRadius: '4px',
                    },
                }}
            >
                <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                        {t('selectAreaTitle', { max: MAX_AREAS })}
                    </Typography>
                    {atMax && (
                        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'warning.main' }}>
                            {t('maxAreaReached')}
                        </Typography>
                    )}
                </Box>
                <List dense sx={{ py: 0.5, maxHeight: 260, overflowY: 'auto' }}>
                    {areas.map((area) => {
                        const isSelected = selectedAreas.includes(area.name);
                        const isDisabled = !isSelected && atMax;
                        const selIdx = selectedAreas.indexOf(area.name);
                        const color = isSelected ? AREA_COLORS[selIdx % AREA_COLORS.length] : 'var(--primary)';
                        return (
                            <ListItemButton
                                key={area.id}
                                disabled={isDisabled}
                                onClick={() => handleAreaToggle(area.name)}
                                dense
                                sx={{
                                    px: 1.5, py: 0.5,
                                    borderLeft: `3px solid ${isSelected ? color : 'transparent'}`,
                                    bgcolor: isSelected ? `color-mix(in srgb, ${color}, transparent 88%)` : 'transparent',
                                    '&:hover': { bgcolor: isSelected ? `color-mix(in srgb, ${color}, transparent 82%)` : 'var(--hover-bg)' },
                                    '&.Mui-disabled': { opacity: 0.4 },
                                }}
                            >
                                <Checkbox
                                    checked={isSelected}
                                    size="small"
                                    sx={{ p: 0.5, mr: 1, color, '&.Mui-checked': { color } }}
                                    disableRipple
                                />
                                <Typography sx={{ fontSize: '0.8rem', fontWeight: isSelected ? 600 : 400 }}>
                                    {getAreaName(t, area.name)}
                                </Typography>
                            </ListItemButton>
                        );
                    })}
                </List>
            </Popover>

            {/* ── Metric picker popover ────────────────────────────────────── */}
            <Popover
                open={Boolean(metricPopoverAnchor)}
                anchorEl={metricPopoverAnchor}
                onClose={() => setMetricPopoverAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                PaperProps={{
                    elevation: 4,
                    sx: {
                        width: 280,
                        mt: 0.5,
                        border: '1px solid var(--card-border)',
                        bgcolor: 'var(--card-bg)',
                        borderRadius: '4px',
                        overflow: 'hidden',
                    },
                }}
            >
                <Box sx={{ px: 1.5, py: 0.75, borderBottom: '1px solid var(--card-border)', bgcolor: 'var(--hover-bg)' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                        {t('selectMetric')}
                    </Typography>
                </Box>
                <Box sx={{ maxHeight: 360, overflowY: 'auto' }}>
                    {GROUP_KEY_ORDER.map(groupKey => {
                        const groupLabel = t(`groups.${groupKey}`);
                        return (
                        <Box key={groupKey}>
                            <Box sx={{
                                display: 'flex', alignItems: 'center', gap: 0.75,
                                px: 1.5, py: 0.6,
                                bgcolor: 'var(--hover-bg)',
                                borderBottom: '1px solid var(--card-border)',
                                position: 'sticky', top: 0, zIndex: 1,
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', fontSize: 13 }}>
                                    {GROUP_ICONS[groupKey]}
                                </Box>
                                <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'text.secondary' }}>
                                    {groupLabel}
                                </Typography>
                            </Box>
                            {translatedMetrics.filter(m => m.groupKey === groupKey).map(metric => {
                                const isSelected = metric.key === selectedMetric;
                                return (
                                    <Box
                                        key={metric.key}
                                        onClick={() => { onMetricChange(metric.key); setMetricPopoverAnchor(null); }}
                                        sx={{
                                            display: 'flex', alignItems: 'center', gap: 1,
                                            px: 1.5, py: 0.65,
                                            cursor: 'pointer',
                                            bgcolor: isSelected ? `color-mix(in srgb, ${metric.baseColor}, transparent 88%)` : 'transparent',
                                            borderLeft: `3px solid ${isSelected ? metric.baseColor : 'transparent'}`,
                                            transition: 'background-color 0.1s',
                                            '&:hover': { bgcolor: isSelected ? `color-mix(in srgb, ${metric.baseColor}, transparent 82%)` : 'var(--hover-bg)' },
                                        }}
                                    >
                                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: metric.baseColor, flexShrink: 0 }} />
                                        <Typography sx={{ fontSize: '0.8rem', fontWeight: isSelected ? 700 : 400, flex: 1, color: isSelected ? metric.baseColor : 'inherit' }}>
                                            {metric.label}
                                        </Typography>
                                        <Box sx={{
                                            fontSize: '0.6rem', px: 0.6, py: 0.15, borderRadius: '3px',
                                            bgcolor: `${metric.baseColor}18`,
                                            color: metric.baseColor,
                                            border: `1px solid ${metric.baseColor}35`,
                                            fontFamily: 'monospace',
                                            flexShrink: 0,
                                            opacity: isSelected ? 1 : 0.7,
                                        }}>
                                            {metric.unit}
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                        );
                    })}
                </Box>
            </Popover>
        </Paper>
    );
};
