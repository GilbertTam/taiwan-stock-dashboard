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

export interface MetricConfig {
    key: MetricKey;
    label: string;
    unit: string;
    group: string;
    chartType: ChartType;
    baseColor: string;
}

export const METRIC_CONFIGS: MetricConfig[] = [
    // 現貨市場
    { key: 'spot_price',        label: '地區現貨價格',   unit: '円/kWh', group: '現貨市場',   chartType: 'step', baseColor: '#ff4d4f' },
    { key: 'system_price',      label: '系統參考價格',   unit: '円/kWh', group: '現貨市場',   chartType: 'step', baseColor: '#ff7875' },
    // 不平衡市場
    { key: 'imbalance_surplus', label: '超供費率',       unit: '円/kWh', group: '不平衡市場', chartType: 'step', baseColor: '#52c41a' },
    { key: 'imbalance_deficit', label: '不足費率',       unit: '円/kWh', group: '不平衡市場', chartType: 'step', baseColor: '#fa8c16' },
    { key: 'imbalance_quantity',label: '不平衡量',       unit: 'kWh',    group: '不平衡市場', chartType: 'bar',  baseColor: '#73d13d' },
    // 日內市場
    { key: 'intraday_avg',      label: '日內平均成交價', unit: '円/kWh', group: '日內市場',   chartType: 'step', baseColor: '#9254de' },
    { key: 'intraday_volume',   label: '日內成交量',     unit: 'kWh',    group: '日內市場',   chartType: 'bar',  baseColor: '#722ed1' },
    // 再生能源
    { key: 'solar',             label: '太陽能發電量',   unit: 'MW',     group: '再生能源',   chartType: 'bar',  baseColor: '#fadb14' },
    { key: 'solar_curtail',     label: '太陽能棄電量',   unit: 'MW',     group: '再生能源',   chartType: 'bar',  baseColor: '#ffc53d' },
    { key: 'wind',              label: '風力發電量',     unit: 'MW',     group: '再生能源',   chartType: 'bar',  baseColor: '#40a9ff' },
    { key: 'wind_curtail',      label: '風力棄電量',     unit: 'MW',     group: '再生能源',   chartType: 'bar',  baseColor: '#91d5ff' },
    // 電力供需
    { key: 'thermal',           label: '火力發電量',     unit: 'MW',     group: '電力供需',   chartType: 'bar',  baseColor: '#fa541c' },
    { key: 'nuclear',           label: '核能發電量',     unit: 'MW',     group: '電力供需',   chartType: 'bar',  baseColor: '#13c2c2' },
    { key: 'hydro',             label: '水力發電量',     unit: 'MW',     group: '電力供需',   chartType: 'bar',  baseColor: '#1890ff' },
    { key: 'area_demand',       label: '地區需求量',     unit: 'MW',     group: '電力供需',   chartType: 'line', baseColor: '#b0bec5' },
    // 現貨交易量
    { key: 'jepx_sell_qty',     label: '現貨賣出量',     unit: 'MWh',    group: '現貨交易量', chartType: 'bar',  baseColor: '#ff85c0' },
    { key: 'jepx_contract_qty', label: '現貨成交量',     unit: 'MWh',    group: '現貨交易量', chartType: 'bar',  baseColor: '#eb2f96' },
];

const CHART_TYPE_LABELS: Record<ChartType, string> = {
    line: '折線',
    step: '梯線',
    bar:  '長條',
};

const GROUPS = Array.from(new Set(METRIC_CONFIGS.map(m => m.group)));

const MAX_AREAS = 6;

const AREA_COLORS = ['#00ff9d', '#00d2ff', '#ffca28', '#ff7043', '#9254de', '#26c6da'];

// ─── Group icon map ────────────────────────────────────────────────────────────

const GROUP_ICONS: Record<string, React.ReactNode> = {
    '現貨市場':   <ShowChartIcon sx={{ fontSize: 11 }} />,
    '不平衡市場': <SwapHorizIcon sx={{ fontSize: 11 }} />,
    '日內市場':   <BoltIcon sx={{ fontSize: 11 }} />,
    '再生能源':   <EnergySavingsLeafIcon sx={{ fontSize: 11 }} />,
    '電力供需':   <ElectricBoltIcon sx={{ fontSize: 11 }} />,
    '現貨交易量': <BarChartIcon sx={{ fontSize: 11 }} />,
};

// ─── Props ─────────────────────────────────────────────────────────────────────

interface DailyCompareControlsProps {
    areas: Area[];
    selectedAreas: string[];
    onAreasChange: (names: string[]) => void;
    selectedMetric: MetricKey;
    onMetricChange: (metric: MetricKey) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export const DailyCompareControls: React.FC<DailyCompareControlsProps> = ({
    areas,
    selectedAreas,
    onAreasChange,
    selectedMetric,
    onMetricChange,
}) => {
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
    const currentMetric = METRIC_CONFIGS.find(m => m.key === selectedMetric);

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
                    const area = areas.find(a => a.name === areaName);
                    const label = area?.name_ch || areaName;
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

                <Tooltip title={atMax ? `已達上限 ${MAX_AREAS} 個` : '新增地區'} arrow>
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
                        點擊 + 選擇地區
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
                    {currentMetric ? GROUP_ICONS[currentMetric.group] : null}
                </Box>
                <Typography noWrap sx={{ fontSize: '0.78rem', fontWeight: 500, flex: 1, textAlign: 'left', color: 'inherit' }}>
                    {currentMetric?.label ?? '選擇指標'}
                </Typography>
                <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', flexShrink: 0, fontFamily: 'monospace' }}>
                    {currentMetric?.unit}
                </Typography>
                <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', flexShrink: 0, ml: 0.25 }}>▾</Typography>
            </Box>

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
                        選擇地區（最多 {MAX_AREAS} 個）
                    </Typography>
                    {atMax && (
                        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'warning.main' }}>
                            已達上限
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
                                    {area.name_ch}
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
                        選擇指標
                    </Typography>
                </Box>
                <Box sx={{ maxHeight: 360, overflowY: 'auto' }}>
                    {GROUPS.map(group => (
                        <Box key={group}>
                            <Box sx={{
                                display: 'flex', alignItems: 'center', gap: 0.75,
                                px: 1.5, py: 0.6,
                                bgcolor: 'var(--hover-bg)',
                                borderBottom: '1px solid var(--card-border)',
                                position: 'sticky', top: 0, zIndex: 1,
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', fontSize: 13 }}>
                                    {GROUP_ICONS[group]}
                                </Box>
                                <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'text.secondary' }}>
                                    {group}
                                </Typography>
                            </Box>
                            {METRIC_CONFIGS.filter(m => m.group === group).map(metric => {
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
                    ))}
                </Box>
            </Popover>
        </Paper>
    );
};
