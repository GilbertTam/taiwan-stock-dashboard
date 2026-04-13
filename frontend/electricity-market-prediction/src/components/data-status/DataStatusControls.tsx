'use client';

import React, { useState } from 'react';
import { Box, Typography, InputBase, Collapse } from '@mui/material';
import { useTranslation } from 'react-i18next';
import SearchIcon        from '@mui/icons-material/Search';
import ExpandMoreIcon    from '@mui/icons-material/ExpandMore';
import ChevronRightIcon  from '@mui/icons-material/ChevronRight';

// ─── Source / Area constants (exported for use across data-status components) ──

export interface SourceConfig {
    key: string;
    label: string;
    labelKey?: string;          // i18n key for label, e.g. 'sources.spot_price'
    category: string;
    categoryKey?: string;       // i18n key for category, e.g. 'categories.spotMarket'
    isSystem: boolean;          // true = single "全域" row, not per-area
    interval: 'hour' | '30m' | 'day';  // granularity: hourly (24/day), half-hourly (48/day), or daily (1/day)
    validationType: 'fixed' | 'variable' | 'event';  // validation strategy
    expectedPerDay: number | null;  // explicit expected doc count; null = use median fallback or event logic
}

// Static source configs — spot market, balance, OCCTO, weather.
// Prediction models (prediction_*) and TDGC categories (tdgc_*) are fetched
// dynamically from /api/data-status/sources and merged in page.tsx.
export const STATIC_SOURCE_CONFIGS: SourceConfig[] = [
    { key: 'spot_price',       label: '現貨價格',    labelKey: 'sources.spot_price',           category: '現貨市場',   categoryKey: 'categories.spotMarket',         isSystem: false, interval: 'hour', validationType: 'fixed',    expectedPerDay: 24   },
    { key: 'jepx_system',      label: '系統現貨',    labelKey: 'sources.jepx_system',          category: '現貨市場',   categoryKey: 'categories.spotMarket',         isSystem: true,  interval: 'hour', validationType: 'fixed',    expectedPerDay: 24   },
    { key: 'intraday',         label: '日內交易',    labelKey: 'sources.intraday',             category: '日內市場',   categoryKey: 'categories.intradayMarket',     isSystem: true,  interval: 'hour', validationType: 'variable', expectedPerDay: null },
    { key: 'imbalance',        label: '不平衡費率',  labelKey: 'sources.imbalance',            category: '不平衡市場', categoryKey: 'categories.imbalanceMarket',    isSystem: false, interval: 'hour', validationType: 'fixed',    expectedPerDay: 24   },
    { key: 'occto_area',       label: 'OCCTO供需',   labelKey: 'sources.occto_area',           category: '電力供需',   categoryKey: 'categories.powerSupplyDemand', isSystem: false, interval: 'hour', validationType: 'fixed',    expectedPerDay: 24   },
    { key: 'occto_inter',      label: 'OCCTO連絡線', labelKey: 'sources.occto_inter',          category: '電力供需',   categoryKey: 'categories.powerSupplyDemand', isSystem: true,  interval: 'hour', validationType: 'fixed',    expectedPerDay: 24   },
    { key: 'occto_event',      label: 'OCCTO事件',   labelKey: 'sources.occto_event',          category: '電力供需',   categoryKey: 'categories.powerSupplyDemand', isSystem: false, interval: 'hour', validationType: 'event',    expectedPerDay: null },
    { key: 'weather_actual',         label: '氣象實績(時別)', labelKey: 'sources.weather_actual',         category: '氣象', categoryKey: 'categories.weather', isSystem: false, interval: 'hour', validationType: 'variable', expectedPerDay: null },
    { key: 'weather_actual_daily',   label: '氣象實績(日別)', labelKey: 'sources.weather_actual_daily',   category: '氣象', categoryKey: 'categories.weather', isSystem: false, interval: 'day',  validationType: 'fixed',    expectedPerDay: 1    },
    { key: 'weather_forecast',       label: '氣象預測(時別)', labelKey: 'sources.weather_forecast',       category: '氣象', categoryKey: 'categories.weather', isSystem: false, interval: 'hour', validationType: 'variable', expectedPerDay: null },
    { key: 'weather_forecast_daily', label: '氣象預測(日別)', labelKey: 'sources.weather_forecast_daily', category: '氣象', categoryKey: 'categories.weather', isSystem: false, interval: 'day',  validationType: 'fixed',    expectedPerDay: 1    },
];

export const AREA_ORDER = [
    'hokkaido', 'tohoku', 'tokyo', 'chubu',
    'hokuriku', 'kansai', 'chugoku', 'shikoku', 'kyushu',
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface DataStatusControlsProps {
    sourceConfigs: SourceConfig[];      // merged static + dynamic; passed from page.tsx
    selectedSources: Set<string>;
    onSourcesChange: (sources: Set<string>) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const DataStatusControls: React.FC<DataStatusControlsProps> = ({
    sourceConfigs,
    selectedSources,
    onSourcesChange,
}) => {
    const { t } = useTranslation('dataStatus');
    const [searchQuery,      setSearchQuery]      = useState('');
    const [collapsedGroups,  setCollapsedGroups]  = useState<Set<string>>(new Set());

    const toggleSource = (key: string) => {
        const next = new Set(selectedSources);
        next.has(key) ? next.delete(key) : next.add(key);
        onSourcesChange(next);
    };

    const toggleGroup = (category: string, groupSources: SourceConfig[]) => {
        const next = new Set(selectedSources);
        const allSelected = groupSources.every(s => next.has(s.key));
        if (allSelected) {
            groupSources.forEach(s => next.delete(s.key));
        } else {
            groupSources.forEach(s => next.add(s.key));
        }
        onSourcesChange(next);
    };

    const toggleCollapseGroup = (category: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            next.has(category) ? next.delete(category) : next.add(category);
            return next;
        });
    };

    const allSourcesSelected = selectedSources.size === sourceConfigs.length;

    // Filter sources by search query (client-side)
    const q = searchQuery.trim().toLowerCase();
    const filteredConfigs = q
        ? sourceConfigs.filter(s => {
            const translatedLabel = s.labelKey ? t(s.labelKey) : s.label;
            const translatedCategory = s.categoryKey ? t(s.categoryKey) : s.category;
            return translatedLabel.toLowerCase().includes(q) || translatedCategory.toLowerCase().includes(q)
                || s.label.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
          })
        : sourceConfigs;

    // Group configs by category (preserve insertion order)
    const categoryOrder = Array.from(new Set(sourceConfigs.map(s => s.category)));
    const categories = categoryOrder.filter(cat =>
        filteredConfigs.some(s => s.category === cat),
    );

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

            {/* ── Title ── */}
            <Box sx={{ px: 2, pt: 1.5, pb: 1, flexShrink: 0 }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', letterSpacing: 0.3 }}>
                    {t('controls.dataSource')}
                </Typography>
            </Box>

            {/* ── Search ── */}
            <Box sx={{
                mx: 1.5, mb: 0.75, flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 0.75,
                border: '1px solid var(--card-border)',
                borderRadius: 1.5,
                px: 1, py: 0.4,
                backgroundColor: 'var(--card-bg)',
            }}>
                <SearchIcon sx={{ fontSize: '0.85rem', color: 'text.disabled', flexShrink: 0 }} />
                <InputBase
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={t('controls.searchPlaceholder')}
                    sx={{ flex: 1, fontSize: '0.75rem', '& input': { py: 0, px: 0 } }}
                />
            </Box>

            {/* ── 全選 row ── */}
            <Box
                onClick={() => onSourcesChange(allSourcesSelected ? new Set() : new Set(sourceConfigs.map(s => s.key)))}
                sx={{
                    mx: 1.5, mb: 0.5, px: 1, py: 0.5, flexShrink: 0,
                    display: 'flex', alignItems: 'center', gap: 1,
                    borderRadius: 1, cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': { backgroundColor: 'action.hover' },
                }}
            >
                {/* Status dot */}
                <Box sx={{
                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                    backgroundColor: allSourcesSelected
                        ? 'var(--primary)'
                        : selectedSources.size > 0
                            ? 'var(--primary)'
                            : 'transparent',
                    border: allSourcesSelected || selectedSources.size === 0
                        ? '1.5px solid var(--primary)'
                        : '1.5px solid var(--primary)',
                    opacity: allSourcesSelected ? 1 : selectedSources.size > 0 ? 0.5 : 0.4,
                }} />
                <Typography sx={{ fontSize: '0.78rem', fontWeight: allSourcesSelected ? 600 : 400, flex: 1, color: 'text.primary' }}>
                    {t('controls.selectAll')}
                </Typography>
                <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled', fontVariantNumeric: 'tabular-nums' }}>
                    {selectedSources.size}/{sourceConfigs.length}
                </Typography>
            </Box>

            <Box sx={{ height: '1px', backgroundColor: 'var(--card-border)', mx: 1.5, mb: 0.5, flexShrink: 0 }} />

            {/* ── Source list (scrollable) ── */}
            <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', pb: 1 }}>
                {categories.map(category => {
                    const groupSources = filteredConfigs.filter(s => s.category === category);
                    const selectedCount = groupSources.filter(s => selectedSources.has(s.key)).length;
                    const allGroupSelected = selectedCount === groupSources.length;
                    const isCollapsed = collapsedGroups.has(category);

                    return (
                        <Box key={category} sx={{ mb: 0.25 }}>
                            {/* ── Category header ── */}
                            <Box
                                sx={{
                                    display: 'flex', alignItems: 'center', gap: 0.5,
                                    px: 1.5, py: 0.6,
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                    '&:hover': { backgroundColor: 'action.hover' },
                                }}
                            >
                                {/* Expand/collapse icon */}
                                <Box
                                    onClick={() => toggleCollapseGroup(category)}
                                    sx={{ display: 'flex', alignItems: 'center', color: 'text.disabled' }}
                                >
                                    {isCollapsed
                                        ? <ChevronRightIcon sx={{ fontSize: '0.9rem' }} />
                                        : <ExpandMoreIcon  sx={{ fontSize: '0.9rem' }} />
                                    }
                                </Box>

                                {/* Category name (click = group toggle) */}
                                <Typography
                                    onClick={() => toggleGroup(category, groupSources)}
                                    sx={{
                                        flex: 1,
                                        fontSize: '0.68rem',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5,
                                        color: allGroupSelected ? 'var(--primary)' : selectedCount > 0 ? 'text.primary' : 'text.disabled',
                                    }}
                                >
                                    {(() => {
                                        const catKey = groupSources[0]?.categoryKey;
                                        return catKey ? t(catKey) : category;
                                    })()}
                                </Typography>

                                {/* Count badge */}
                                <Typography
                                    onClick={() => toggleGroup(category, groupSources)}
                                    sx={{
                                        fontSize: '0.62rem',
                                        color: 'text.disabled',
                                        fontVariantNumeric: 'tabular-nums',
                                        px: 0.75, py: 0.1,
                                        border: '1px solid var(--card-border)',
                                        borderRadius: 0.75,
                                        lineHeight: 1.5,
                                    }}
                                >
                                    {selectedCount}/{groupSources.length}
                                </Typography>
                            </Box>

                            {/* ── Source rows ── */}
                            <Collapse in={!isCollapsed}>
                                {groupSources.map(src => {
                                    const active = selectedSources.has(src.key);
                                    return (
                                        <Box
                                            key={src.key}
                                            onClick={() => toggleSource(src.key)}
                                            sx={{
                                                display: 'flex', alignItems: 'center', gap: 1,
                                                pl: 3.75, pr: 1.5, py: 0.55,
                                                cursor: 'pointer', userSelect: 'none',
                                                '&:hover': { backgroundColor: 'action.hover' },
                                            }}
                                        >
                                            {/* Status dot */}
                                            <Box sx={{
                                                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                                                backgroundColor: active ? 'var(--primary)' : 'transparent',
                                                border: `1.5px solid ${active ? 'var(--primary)' : 'var(--card-border)'}`,
                                                transition: 'all 0.12s',
                                            }} />

                                            {/* Label */}
                                            <Typography sx={{
                                                flex: 1,
                                                fontSize: '0.78rem',
                                                fontWeight: active ? 600 : 400,
                                                color: active ? 'text.primary' : 'text.secondary',
                                                lineHeight: 1.4,
                                            }}>
                                                {src.labelKey ? t(src.labelKey) : src.label}
                                            </Typography>

                                            {/* System badge */}
                                            {src.isSystem && (
                                                <Typography sx={{
                                                    fontSize: '0.58rem',
                                                    color: 'text.disabled',
                                                    border: '1px solid var(--card-border)',
                                                    borderRadius: 0.5,
                                                    px: 0.5, py: 0,
                                                    lineHeight: 1.6,
                                                    flexShrink: 0,
                                                }}>
                                                    {t('controls.systemBadge')}
                                                </Typography>
                                            )}
                                        </Box>
                                    );
                                })}
                            </Collapse>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
};
