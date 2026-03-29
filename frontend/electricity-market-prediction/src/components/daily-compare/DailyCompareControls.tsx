'use client';

import React, { useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Collapse,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Radio,
    SelectChangeEvent,
} from '@mui/material';
import { Area } from '@/types';
import { AreaSelector } from '@/components/selectors/AreaSelector';
import { SectionHeader, SubHeader } from '@/components/selectors/shared';

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

// Group configs for rendering
const GROUPS = Array.from(new Set(METRIC_CONFIGS.map(m => m.group)));

// ─── Props ─────────────────────────────────────────────────────────────────────

interface DailyCompareControlsProps {
    areas: Area[];
    selectedArea: string;
    onAreaChange: (areaName: string) => void;
    selectedMetric: MetricKey;
    onMetricChange: (metric: MetricKey) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export const DailyCompareControls: React.FC<DailyCompareControlsProps> = ({
    areas,
    selectedArea,
    onAreaChange,
    selectedMetric,
    onMetricChange,
}) => {
    const [expandedSection, setExpandedSection] = useState<number | null>(1);

    const toggleSection = (section: number) => {
        setExpandedSection(prev => prev === section ? null : section);
    };

    const handleAreaChange = (e: SelectChangeEvent) => {
        onAreaChange(e.target.value);
    };

    const currentMetric = METRIC_CONFIGS.find(m => m.key === selectedMetric);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* Title bar */}
            <Box sx={{ px: 1.5, py: 1.25, borderBottom: '1px solid var(--card-border)', flexShrink: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--primary)' }}>
                    疊圖比較設定
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                    工具列日期範圍決定疊加的天數
                </Typography>
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                {/* Section 1: Area */}
                <AreaSelector
                    areas={areas}
                    selectedArea={selectedArea}
                    onAreaChange={handleAreaChange}
                    expanded={expandedSection === 1}
                    onToggle={() => toggleSection(1)}
                    step={1}
                    description="選擇要比較的電力地區"
                />

                {/* Section 2: Metric */}
                <Paper
                    elevation={0}
                    sx={{ borderBottom: '1px solid var(--card-border)', borderRadius: 0, backgroundColor: 'transparent', flexShrink: 0 }}
                >
                    <SectionHeader
                        onClick={() => toggleSection(2)}
                        expanded={expandedSection === 2}
                        step={2}
                        description="選擇要比較的資料指標"
                    >
                        選擇指標
                    </SectionHeader>
                    <Collapse in={expandedSection === 2}>
                        <Box sx={{ pb: 1 }}>
                            {GROUPS.map(group => {
                                const groupMetrics = METRIC_CONFIGS.filter(m => m.group === group);
                                return (
                                    <Box key={group}>
                                        <SubHeader label={group} />
                                        <List dense sx={{ px: 1, py: 0 }}>
                                            {groupMetrics.map((metric) => {
                                                const isSelected = selectedMetric === metric.key;
                                                return (
                                                    <ListItem
                                                        key={metric.key}
                                                        disablePadding
                                                        onClick={() => {
                                                            onMetricChange(metric.key);
                                                            toggleSection(2);
                                                        }}
                                                        sx={{
                                                            borderRadius: 1,
                                                            mb: 0.5,
                                                            backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent',
                                                            color: isSelected ? 'var(--primary)' : 'inherit',
                                                            '&:hover': {
                                                                backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--hover-bg)',
                                                            },
                                                        }}
                                                    >
                                                        <ListItemButton sx={{ py: 0.5, px: 1, borderRadius: 1 }}>
                                                            <ListItemIcon sx={{ minWidth: 28 }}>
                                                                <Radio
                                                                    checked={isSelected}
                                                                    size="small"
                                                                    sx={{
                                                                        p: 0.5,
                                                                        color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                                                                        '&.Mui-checked': { color: 'var(--primary)' },
                                                                    }}
                                                                />
                                                            </ListItemIcon>
                                                            <ListItemText
                                                                primary={metric.label}
                                                                secondary={
                                                                    <Box component="span" sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                                                        <span>{metric.unit}</span>
                                                                        <Box
                                                                            component="span"
                                                                            sx={{
                                                                                fontSize: '0.6rem',
                                                                                px: 0.5,
                                                                                py: 0.1,
                                                                                borderRadius: 0.5,
                                                                                backgroundColor: isSelected
                                                                                    ? 'color-mix(in srgb, var(--primary), transparent 80%)'
                                                                                    : 'var(--hover-bg)',
                                                                                color: isSelected ? 'var(--primary)' : 'text.secondary',
                                                                                border: '1px solid',
                                                                                borderColor: isSelected
                                                                                    ? 'color-mix(in srgb, var(--primary), transparent 60%)'
                                                                                    : 'var(--card-border)',
                                                                            }}
                                                                        >
                                                                            {CHART_TYPE_LABELS[metric.chartType]}
                                                                        </Box>
                                                                    </Box>
                                                                }
                                                                primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: isSelected ? 600 : 400 }}
                                                                secondaryTypographyProps={{
                                                                    fontSize: '0.7rem',
                                                                    color: isSelected
                                                                        ? 'color-mix(in srgb, var(--primary), transparent 30%)'
                                                                        : 'text.secondary',
                                                                    component: 'span',
                                                                }}
                                                            />
                                                        </ListItemButton>
                                                    </ListItem>
                                                );
                                            })}
                                        </List>
                                    </Box>
                                );
                            })}
                        </Box>
                    </Collapse>
                    {/* Collapsed summary */}
                    {expandedSection !== 2 && currentMetric && (
                        <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1, borderLeft: '3px solid var(--primary)', ml: 0.5, bgcolor: 'var(--hover-bg)' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>目前指標：</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.75rem' }}>
                                {currentMetric.label}
                            </Typography>
                            <Box
                                component="span"
                                sx={{
                                    fontSize: '0.65rem',
                                    px: 0.5,
                                    py: 0.1,
                                    borderRadius: 0.5,
                                    backgroundColor: 'color-mix(in srgb, var(--primary), transparent 80%)',
                                    color: 'var(--primary)',
                                    border: '1px solid',
                                    borderColor: 'color-mix(in srgb, var(--primary), transparent 60%)',
                                }}
                            >
                                {CHART_TYPE_LABELS[currentMetric.chartType]}
                            </Box>
                        </Box>
                    )}
                </Paper>
            </Box>
        </Box>
    );
};
