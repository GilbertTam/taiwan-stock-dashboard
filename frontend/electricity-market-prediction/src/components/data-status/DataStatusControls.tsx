'use client';

import React, { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    CircularProgress,
    InputBase,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon  from '@mui/icons-material/Search';

// ─── Source / Area constants (exported for use across data-status components) ──

export interface SourceConfig {
    key: string;
    label: string;
    category: string;
    isSystem: boolean;          // true = single "全域" row, not per-area
    interval: 'hour' | '30m' | 'day';  // granularity: hourly (24/day), half-hourly (48/day), or daily (1/day)
}

// Static source configs — spot market, balance, OCCTO, weather.
// Prediction models (prediction_*) and TDGC categories (tdgc_*) are fetched
// dynamically from /api/data-status/sources and merged in page.tsx.
export const STATIC_SOURCE_CONFIGS: SourceConfig[] = [
    { key: 'spot_price',       label: '現貨價格',    category: '現貨市場',   isSystem: false, interval: 'hour' },
    { key: 'jepx_system',      label: '系統現貨',    category: '現貨市場',   isSystem: true,  interval: 'hour' },
    { key: 'intraday',         label: '日內交易',    category: '日內市場',   isSystem: true,  interval: 'hour' },
    { key: 'imbalance',        label: '不平衡費率',  category: '不平衡市場', isSystem: false, interval: 'hour' },
    { key: 'occto_area',       label: 'OCCTO供需',   category: '電力供需',   isSystem: false, interval: 'hour' },
    { key: 'occto_inter',      label: 'OCCTO連絡線', category: '電力供需',   isSystem: true,  interval: 'hour' },
    { key: 'occto_event',      label: 'OCCTO事件',   category: '電力供需',   isSystem: false, interval: 'hour' },
    { key: 'weather_actual',         label: '氣象實績(時別)', category: '氣象', isSystem: false, interval: 'hour' },
    { key: 'weather_actual_daily',   label: '氣象實績(日別)', category: '氣象', isSystem: false, interval: 'day'  },
    { key: 'weather_forecast',       label: '氣象預測(時別)', category: '氣象', isSystem: false, interval: 'hour' },
    { key: 'weather_forecast_daily', label: '氣象預測(日別)', category: '氣象', isSystem: false, interval: 'day'  },
];

export const AREA_ORDER = [
    'hokkaido', 'tohoku', 'tokyo', 'chubu',
    'hokuriku', 'kansai', 'chugoku', 'shikoku', 'kyushu',
];

export const AREA_JP: Record<string, string> = {
    hokkaido: '北海道',
    tohoku:   '東北',
    tokyo:    '東京',
    chubu:    '中部',
    hokuriku: '北陸',
    kansai:   '関西',
    chugoku:  '中国',
    shikoku:  '四国',
    kyushu:   '九州',
    system:   '全域',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface DataStatusControlsProps {
    sourceConfigs: SourceConfig[];      // merged static + dynamic; passed from page.tsx
    selectedSources: Set<string>;
    onSourcesChange: (sources: Set<string>) => void;
    isLoading: boolean;
    onRefresh: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const DataStatusControls: React.FC<DataStatusControlsProps> = ({
    sourceConfigs,
    selectedSources,
    onSourcesChange,
    isLoading,
    onRefresh,
}) => {
    const [searchQuery, setSearchQuery] = useState('');

    const toggleSource = (key: string) => {
        const next = new Set(selectedSources);
        next.has(key) ? next.delete(key) : next.add(key);
        onSourcesChange(next);
    };

    const allSourcesSelected = selectedSources.size === sourceConfigs.length;

    // Filter sources by search query (client-side)
    const q = searchQuery.trim().toLowerCase();
    const filteredConfigs = q
        ? sourceConfigs.filter(s =>
            s.label.toLowerCase().includes(q) || s.category.toLowerCase().includes(q),
          )
        : sourceConfigs;

    // Group configs by category (preserve insertion order)
    const groups = Array.from(new Set(filteredConfigs.map(s => s.category)));

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* Title bar */}
            <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid var(--card-border)', flexShrink: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--primary)' }}>
                    資料來源
                </Typography>
            </Box>

            {/* Search input */}
            <Box sx={{
                px: 1, py: 0.5, flexShrink: 0,
                borderBottom: '1px solid var(--card-border)',
                display: 'flex', alignItems: 'center', gap: 0.5,
            }}>
                <SearchIcon sx={{ fontSize: '0.85rem', color: 'text.disabled', flexShrink: 0 }} />
                <InputBase
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="搜尋來源…"
                    sx={{
                        flex: 1,
                        fontSize: '0.72rem',
                        '& input': { py: 0.25, px: 0 },
                    }}
                />
            </Box>

            {/* Source list — scrollable */}
            <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', px: 1, py: 0.75 }}>
                {/* 全選 chip */}
                <Box
                    onClick={() => onSourcesChange(allSourcesSelected ? new Set() : new Set(sourceConfigs.map(s => s.key)))}
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        height: 22,
                        px: 1,
                        mb: 1,
                        borderRadius: 1,
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        border: '1px solid',
                        borderColor: allSourcesSelected ? 'var(--primary)' : 'var(--card-border)',
                        backgroundColor: allSourcesSelected ? 'var(--primary)' : 'transparent',
                        color: allSourcesSelected ? 'var(--primary-foreground)' : 'text.secondary',
                        userSelect: 'none',
                        '&:hover': { opacity: 0.8 },
                    }}
                >
                    全選 {selectedSources.size}/{sourceConfigs.length}
                </Box>

                {/* Groups */}
                {groups.map(group => {
                    const groupSources = filteredConfigs.filter(s => s.category === group);
                    const groupSelected = groupSources.filter(s => selectedSources.has(s.key)).length;
                    const allGroupSelected = groupSelected === groupSources.length;

                    return (
                        <Box key={group} sx={{ mb: 1 }}>
                            {/* Category header — click to toggle entire group */}
                            <Box
                                sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5, cursor: 'pointer' }}
                                onClick={() => {
                                    const next = new Set(selectedSources);
                                    if (allGroupSelected) {
                                        groupSources.forEach(s => next.delete(s.key));
                                    } else {
                                        groupSources.forEach(s => next.add(s.key));
                                    }
                                    onSourcesChange(next);
                                }}
                            >
                                <Box sx={{
                                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                                    backgroundColor: allGroupSelected ? 'var(--primary)' : groupSelected > 0 ? 'var(--primary)' : 'var(--card-border)',
                                    opacity: allGroupSelected ? 1 : groupSelected > 0 ? 0.5 : 1,
                                }} />
                                <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                                    {group}
                                </Typography>
                            </Box>

                            {/* Source chips */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {groupSources.map(src => {
                                    const active = selectedSources.has(src.key);
                                    return (
                                        <Box
                                            key={src.key}
                                            onClick={() => toggleSource(src.key)}
                                            title={src.isSystem ? `${src.label}（全域）` : src.label}
                                            sx={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                height: 22,
                                                px: 0.875,
                                                borderRadius: 1,
                                                cursor: 'pointer',
                                                fontSize: '0.68rem',
                                                fontWeight: active ? 600 : 400,
                                                border: '1px solid',
                                                borderColor: active ? 'var(--primary)' : 'var(--card-border)',
                                                backgroundColor: active ? 'var(--primary)' : 'transparent',
                                                color: active ? 'var(--primary-foreground)' : 'text.secondary',
                                                userSelect: 'none',
                                                transition: 'all 0.12s',
                                                '&:hover': { opacity: 0.75 },
                                            }}
                                        >
                                            {src.label}
                                            {src.isSystem && (
                                                <Box component="span" sx={{ ml: 0.4, fontSize: '0.55rem', opacity: 0.8 }}>全</Box>
                                            )}
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Box>
                    );
                })}
            </Box>

            {/* Refresh button */}
            <Box sx={{ p: 1, borderTop: '1px solid var(--card-border)', flexShrink: 0 }}>
                <Button
                    fullWidth
                    variant="outlined"
                    size="small"
                    startIcon={isLoading ? <CircularProgress size={12} /> : <RefreshIcon sx={{ fontSize: '0.9rem !important' }} />}
                    onClick={onRefresh}
                    disabled={isLoading}
                    sx={{ fontSize: '0.75rem', py: 0.5, borderColor: 'var(--card-border)' }}
                >
                    {isLoading ? '載入中…' : '重新整理'}
                </Button>
            </Box>
        </Box>
    );
};
