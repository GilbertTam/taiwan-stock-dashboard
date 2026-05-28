'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Box, Paper, Chip, Typography, IconButton, Tooltip, Divider,
    Popover, Slider,
} from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import RemoveIcon from '@mui/icons-material/Remove';
import BarChartIcon from '@mui/icons-material/BarChart';
import StackedLineChartIcon from '@mui/icons-material/StackedLineChart';
import { useTranslation } from 'react-i18next';
import { AreaButtonGroup } from '@/components/selectors/AreaButtonGroup';
import { ModelChipsManager } from '@/components/selectors/ModelChipsManager';
import { useMarketDataContext } from '@/context/MarketDataContext';
import { usePriceChart } from '@/components/price-chart/context/PriceChartContext';
import { prepareChartData } from '@/utils/chartUtils';
import {
    occtoStackedFields, weatherFields,
    INTERCONNECTION_FIELDS, BATTERY_FIELDS, BID_PLAN_BASE_FIELDS, TDGC_FIELDS, TDGC_CATEGORIES, TDGC_DEFAULT_FIELDS,
} from '@/components/price-chart/constants';
import { SOURCE_COLORS } from '@/components/selectors/shared';
import { PresetSelector } from '@/components/selectors/PresetSelector';
import { ForecastPreview } from '@/components/selectors/presetPreviews';
import { useForecastPresets } from '@/components/forecast/hooks/useForecastPresets';
import type { ForecastPresetData } from '@/types/presets';

// ─── Source config ────────────────────────────────────────────────────────────

type SourceKey = 'actual' | 'intraday' | 'imbalance' | 'interconnection' | 'battery' | 'bidPlans' | 'weather' | 'occto' | 'tdgc';

interface SourceConfig {
    key: SourceKey;
    labelKey: string;
    color: string;
    hasSubOptions: boolean;
}

const SOURCES: SourceConfig[] = [
    { key: 'actual',          labelKey: 'controlBar.spotActual',       color: '#ef5350',                    hasSubOptions: false },
    { key: 'intraday',        labelKey: 'controlBar.intradayMarket',   color: SOURCE_COLORS.intraday,        hasSubOptions: true  },
    { key: 'imbalance',       labelKey: 'controlBar.imbalance',        color: SOURCE_COLORS.imbalance,       hasSubOptions: true  },
    { key: 'interconnection', labelKey: 'controlBar.interconnection',  color: SOURCE_COLORS.interconnection, hasSubOptions: true  },
    { key: 'battery',         labelKey: 'controlBar.battery',          color: SOURCE_COLORS.battery,         hasSubOptions: true  },
    { key: 'bidPlans',        labelKey: 'controlBar.bidPlans',         color: SOURCE_COLORS.bidPlans,        hasSubOptions: true  },
    { key: 'weather',         labelKey: 'controlBar.weather',          color: SOURCE_COLORS.weather,         hasSubOptions: true  },
    { key: 'occto',           labelKey: 'controlBar.occto',            color: SOURCE_COLORS.occto,           hasSubOptions: true  },
    { key: 'tdgc',            labelKey: 'controlBar.tdgc',             color: SOURCE_COLORS.tdgc,            hasSubOptions: true  },
];

// OCCTO field groups
const OCCTO_GROUPS = [
    { labelKey: 'controlBar.occtoGroups.load', keys: ['area_demand'] },
    { labelKey: 'controlBar.occtoGroups.generation', keys: ['nuclear_power', 'thermal', 'hydropower', 'geothermal_power', 'biomass', 'solar_power_generation_actual', 'wind_power_generation_actual'] },
    { labelKey: 'controlBar.occtoGroups.storage', keys: ['pumped_storage', 'battery_storage'] },
    { labelKey: 'controlBar.occtoGroups.other', keys: ['interconnection_line', 'others'] },
];


function PopoverLabel({ children }: { children: React.ReactNode }) {
    return (
        <Typography sx={{
            fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.5px', color: 'text.secondary',
            px: 1.5, pt: 0.75, pb: 0.25,
        }}>
            {children}
        </Typography>
    );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ForecastControlBarProps {
    onModelToggle: (modelId: string | number, modelName: string) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const ForecastControlBar: React.FC<ForecastControlBarProps> = ({ onModelToggle }) => {
    const { t } = useTranslation('forecast');

    // ── MarketDataContext ─────────────────────────────────────────────────────
    const {
        areas, selectedArea, handleAreaChange,
        models, selectedModels, calculatingDatesByModel,
        handleModelCalculatingDateChange,
        actualPrices, predictionsByModel,
        showActualPrice, setShowActualPrice,
        showTopBottomLabels, setShowTopBottomLabels,
        topBottomPairs, setTopBottomPairs,
        showImbalance,            setShowImbalance,
        showImbalanceQuantity,    setShowImbalanceQuantity,
        showImbalanceSurplusRate, setShowImbalanceSurplusRate,
        showImbalanceDeficitRate, setShowImbalanceDeficitRate,
        showIntraday,             setShowIntraday,
        showIntradayAverage,      setShowIntradayAverage,
        showWeather,              setShowWeather,
        showWeatherActual,        setShowWeatherActual,
        showWeatherForecast,      setShowWeatherForecast,
        showOcctoArea,            setShowOcctoArea,
        imbalanceData, intradayData, interconnectionData,
        batteryData, bidPlansData, occtoAreaData, tdgcData,
        weatherActual, weatherForecast,
        weatherModelsActual, weatherModelsForecast,
        selectedWeatherModelActual,   setSelectedWeatherModelActual,
        selectedWeatherModelForecast, setSelectedWeatherModelForecast,
    } = useMarketDataContext();

    // ── PriceChartContext ─────────────────────────────────────────────────────
    const {
        modelColorMap,
        selectedInterconnectionFields, setSelectedInterconnectionFields,
        selectedBatteryFields,         setSelectedBatteryFields,
        selectedOcctoFields,           setSelectedOcctoFields,
        occtoChartType,                setOcctoChartType,
        // bid plans & weather fields via any-cast since they may be optional on the type
    } = usePriceChart();

    // bid plans fields from context (with any-cast for optional properties)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chartCtxAny = usePriceChart() as any;
    const selectedBidPlanFields: Set<string>    = chartCtxAny.selectedBidPlanFields    ?? new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setSelectedBidPlanFields: (fn: (p: Set<string>) => Set<string>) => void = chartCtxAny.setSelectedBidPlanFields ?? (() => {});
    const availableBidPlanCategories: string[]  = chartCtxAny.availableBidPlanCategories ?? [];
    const selectedBidPlanCategories: Set<string>= chartCtxAny.selectedBidPlanCategories ?? new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setSelectedBidPlanCategories: (fn: (p: Set<string>) => Set<string>) => void = chartCtxAny.setSelectedBidPlanCategories ?? (() => {});
    const availableSiteIds: string[]            = chartCtxAny.availableSiteIds    ?? [];
    const selectedSiteIds: Set<string>          = chartCtxAny.selectedSiteIds     ?? new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setSelectedSiteIds: (fn: (p: Set<string>) => Set<string>) => void = chartCtxAny.setSelectedSiteIds ?? (() => {});
    const selectedWeatherFieldsActual: Set<string>   = chartCtxAny.selectedWeatherFieldsActual   ?? new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setSelectedWeatherFieldsActual: (fn: (p: Set<string>) => Set<string>) => void = chartCtxAny.setSelectedWeatherFieldsActual ?? (() => {});
    const selectedWeatherFieldsForecast: Set<string> = chartCtxAny.selectedWeatherFieldsForecast ?? new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setSelectedWeatherFieldsForecast: (fn: (p: Set<string>) => Set<string>) => void = chartCtxAny.setSelectedWeatherFieldsForecast ?? (() => {});
    const selectedTdgcFields: Set<string> = chartCtxAny.selectedTdgcFields ?? new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setSelectedTdgcFields: (fn: (p: Set<string>) => Set<string>) => void = chartCtxAny.setSelectedTdgcFields ?? (() => {});
    const availableTdgcCategories: string[] = chartCtxAny.availableTdgcCategories ?? [];
    const selectedTdgcCategories: Set<string> = chartCtxAny.selectedTdgcCategories ?? new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setSelectedTdgcCategories: (fn: (p: Set<string>) => Set<string>) => void = chartCtxAny.setSelectedTdgcCategories ?? (() => {});
    const selectedTdgcDataTypes: Set<string> = chartCtxAny.selectedTdgcDataTypes ?? new Set(['prompt']);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setSelectedTdgcDataTypes: (fn: Set<string> | ((p: Set<string>) => Set<string>)) => void = chartCtxAny.setSelectedTdgcDataTypes ?? (() => {});
    const selectedTdgcGroups: Set<string> = chartCtxAny.selectedTdgcGroups ?? new Set(['origin']);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setSelectedTdgcGroups: (fn: Set<string> | ((p: Set<string>) => Set<string>)) => void = chartCtxAny.setSelectedTdgcGroups ?? (() => {});
    const tdgcBarStacking: boolean = chartCtxAny.tdgcBarStacking ?? false;
    const setTdgcBarStacking: (v: boolean) => void = chartCtxAny.setTdgcBarStacking ?? (() => {});

    // ── Chart data for MAE ────────────────────────────────────────────────────
    const chartData = useMemo(
        () => prepareChartData(actualPrices, predictionsByModel),
        [actualPrices, predictionsByModel],
    );

    // ── Presets ───────────────────────────────────────────────────────────────
    const {
        presets: forecastPresets,
        isLoading: forecastPresetsLoading,
        defaultPreset: forecastDefaultPreset,
        savePreset: saveForecastPreset,
        updatePresetData: updateForecastPresetData,
        renamePreset: renameForecastPreset,
        deletePreset: deleteForecastPreset,
        setAsDefault: setForecastAsDefault,
        captureState: captureForecastState,
        applyPreset: applyForecastPreset,
    } = useForecastPresets();

    // Apply default preset on mount
    const didApplyForecastDefault = useRef(false);
    useEffect(() => {
        if (didApplyForecastDefault.current || !forecastDefaultPreset) return;
        applyForecastPreset(forecastDefaultPreset.data);
        didApplyForecastDefault.current = true;
    }, [forecastDefaultPreset, applyForecastPreset]);

    // ── Source popover state ──────────────────────────────────────────────────
    const [sourcePopover, setSourcePopover] = useState<{ anchor: HTMLElement; key: SourceKey } | null>(null);
    const [labelsPopoverAnchor, setLabelsPopoverAnchor] = useState<HTMLElement | null>(null);

    // ── Source chip state helpers ─────────────────────────────────────────────

    function getIsActive(key: SourceKey): boolean {
        switch (key) {
            case 'actual':          return showActualPrice;
            case 'intraday':        return showIntraday || showIntradayAverage;
            case 'imbalance':       return showImbalance;
            case 'interconnection': return selectedInterconnectionFields.size > 0;
            case 'battery':         return selectedBatteryFields.size > 0;
            case 'bidPlans':        return selectedBidPlanFields.size > 0;
            case 'weather':         return showWeather;
            case 'occto':           return showOcctoArea;
            case 'tdgc':            return selectedTdgcFields.size > 0;
        }
    }

    function getHasData(key: SourceKey): boolean {
        switch (key) {
            case 'actual':          return true;
            case 'intraday':        return !!(intradayData        && intradayData.length > 0);
            case 'imbalance':       return !!(imbalanceData       && imbalanceData.length > 0);
            case 'interconnection': return !!(interconnectionData && interconnectionData.length > 0);
            case 'battery':         return !!(batteryData         && batteryData.length > 0);
            case 'bidPlans':        return !!(bidPlansData        && bidPlansData.length > 0);
            case 'weather':         return !!((weatherActual?.length ?? 0) > 0 || (weatherForecast?.length ?? 0) > 0);
            case 'occto':           return !!(occtoAreaData       && occtoAreaData.length > 0);
            case 'tdgc':            return !!(tdgcData            && tdgcData.length > 0);
        }
    }

    function handleToggle(key: SourceKey) {
        switch (key) {
            case 'actual':    setShowActualPrice(!showActualPrice); break;
            case 'intraday':
                if (showIntraday || showIntradayAverage) {
                    setShowIntraday(false);
                    setShowIntradayAverage(false);
                } else {
                    setShowIntraday(true);
                }
                break;
            case 'imbalance':
                if (showImbalance) {
                    setShowImbalance(false);
                    setShowImbalanceQuantity(false);
                    setShowImbalanceSurplusRate(false);
                    setShowImbalanceDeficitRate(false);
                } else {
                    setShowImbalance(true);
                    setShowImbalanceQuantity(true);
                }
                break;
            case 'interconnection':
                setSelectedInterconnectionFields(prev =>
                    prev.size > 0 ? new Set() : new Set(INTERCONNECTION_FIELDS.map(f => f.key))
                );
                break;
            case 'battery':
                setSelectedBatteryFields(prev =>
                    prev.size > 0 ? new Set() : new Set(BATTERY_FIELDS.map(f => f.key))
                );
                break;
            case 'bidPlans':
                setSelectedBidPlanFields(prev =>
                    prev.size > 0 ? new Set() : new Set(BID_PLAN_BASE_FIELDS.map(f => f.key))
                );
                break;
            case 'weather':
                if (showWeather) {
                    setShowWeather(false);
                    setShowWeatherActual(false);
                    setShowWeatherForecast(false);
                } else {
                    setShowWeather(true);
                    setShowWeatherActual(true);
                }
                break;
            case 'occto':
                if (showOcctoArea) {
                    setShowOcctoArea(false);
                    setSelectedOcctoFields(new Set());
                } else {
                    setShowOcctoArea(true);
                    setSelectedOcctoFields(new Set(['area_demand']));
                }
                break;
            case 'tdgc':
                setSelectedTdgcFields(prev => {
                    if (prev.size > 0) {
                        return new Set();
                    } else {
                        // 確保至少有一個 category 被選取
                        if (selectedTdgcCategories.size === 0 && availableTdgcCategories.length > 0) {
                            setSelectedTdgcCategories(() => new Set([availableTdgcCategories[0]]));
                        }
                        // 預設只開啟 origin 群組的 band trio + 落札量合計
                        if (selectedTdgcGroups.size === 0) {
                            setSelectedTdgcGroups(() => new Set(['origin']));
                        }
                        return new Set(TDGC_DEFAULT_FIELDS);
                    }
                });
                break;
        }
    }

    // ── Sub-option popover content ────────────────────────────────────────────

    function renderPopoverContent(key: SourceKey) {
        // Shared row style for checkbox-style items
        const rowSx = {
            display: 'flex', alignItems: 'center', gap: 0.75,
            px: 1.5, py: 0.35, cursor: 'pointer', borderRadius: '2px',
            '&:hover': { bgcolor: 'var(--hover-bg)' },
        };

        switch (key) {

            case 'intraday':
                return (
                    <Box sx={{ py: 0.75, minWidth: 190 }}>
                        <PopoverLabel>{t('controlBar.displayItems')}</PopoverLabel>
                        {[
                            { label: t('dataSources.intradayCandle'), active: showIntraday,        set: setShowIntraday,        color: SOURCE_COLORS.intraday },
                            { label: t('dataSources.intradayAvgLine'), active: showIntradayAverage, set: setShowIntradayAverage, color: '#ffa726' },
                        ].map(({ label, active, set, color }) => (
                            <Box key={label} sx={rowSx} onClick={() => set(!active)}>
                                <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: active ? color : 'transparent', border: `1.5px solid ${color}`, flexShrink: 0 }} />
                                <Typography sx={{ fontSize: '0.77rem' }}>{label}</Typography>
                            </Box>
                        ))}
                    </Box>
                );

            case 'imbalance':
                return (
                    <Box sx={{ py: 0.75, minWidth: 190 }}>
                        <PopoverLabel>{t('controlBar.displayItems')}</PopoverLabel>
                        {[
                            { label: t('dataSources.imbalanceQuantity'), active: showImbalanceQuantity,    set: setShowImbalanceQuantity,    color: SOURCE_COLORS.imbalance, othersActive: showImbalanceSurplusRate || showImbalanceDeficitRate },
                            { label: t('dataSources.surplusRate'),       active: showImbalanceSurplusRate, set: setShowImbalanceSurplusRate, color: '#4caf50',                othersActive: showImbalanceQuantity    || showImbalanceDeficitRate },
                            { label: t('dataSources.deficitRate'),       active: showImbalanceDeficitRate, set: setShowImbalanceDeficitRate, color: '#e65100',                othersActive: showImbalanceQuantity    || showImbalanceSurplusRate },
                        ].map(({ label, active, set, color, othersActive }) => (
                            <Box key={label} sx={rowSx} onClick={() => {
                                set(!active);
                                if (!active) { if (!showImbalance) setShowImbalance(true); }
                                else if (!othersActive) setShowImbalance(false);
                            }}>
                                <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: active ? color : 'transparent', border: `1.5px solid ${color}`, flexShrink: 0 }} />
                                <Typography sx={{ fontSize: '0.77rem' }}>{label}</Typography>
                            </Box>
                        ))}
                    </Box>
                );

            case 'interconnection':
                return (
                    <Box sx={{ py: 0.75, minWidth: 230 }}>
                        <PopoverLabel>{t('controlBar.displayFields')}</PopoverLabel>
                        {INTERCONNECTION_FIELDS.map(f => {
                            const on = selectedInterconnectionFields.has(f.key);
                            return (
                                <Box key={f.key} sx={rowSx} onClick={() =>
                                    setSelectedInterconnectionFields(prev => {
                                        const next = new Set(prev);
                                        on ? next.delete(f.key) : next.add(f.key);
                                        return next;
                                    })
                                }>
                                    <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: on ? f.color : 'transparent', border: `1.5px solid ${f.color}`, flexShrink: 0 }} />
                                    <Typography sx={{ fontSize: '0.75rem' }}>{t(f.labelKey)}</Typography>
                                </Box>
                            );
                        })}
                    </Box>
                );

            case 'battery':
                return (
                    <Box sx={{ py: 0.75, minWidth: 200 }}>
                        <PopoverLabel>{t('controlBar.displayFields')}</PopoverLabel>
                        {BATTERY_FIELDS.map(f => {
                            const on = selectedBatteryFields.has(f.key);
                            return (
                                <Box key={f.key} sx={rowSx} onClick={() =>
                                    setSelectedBatteryFields(prev => {
                                        const next = new Set(prev);
                                        on ? next.delete(f.key) : next.add(f.key);
                                        return next;
                                    })
                                }>
                                    <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: on ? f.color : 'transparent', border: `1.5px solid ${f.color}`, flexShrink: 0 }} />
                                    <Typography sx={{ fontSize: '0.75rem' }}>{t(f.labelKey)}</Typography>
                                </Box>
                            );
                        })}
                    </Box>
                );

            case 'bidPlans':
                return (
                    <Box sx={{ py: 0.75, minWidth: 240 }}>
                        {availableBidPlanCategories.length > 0 && (
                            <>
                                <PopoverLabel>{t('dataSourceSections.marketCategory')}</PopoverLabel>
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', px: 1.5, pb: 0.75 }}>
                                    {availableBidPlanCategories.map(cat => {
                                        const sel = selectedBidPlanCategories.has(cat);
                                        const catLabels: Record<string, string> = { spot: t('dataSourceCategories.spotMarket'), intraday: t('dataSourceCategories.intradayMarket'), '1000': t('dataSourceCategories.primaryAdjustment') };
                                        return (
                                            <Chip key={cat} label={catLabels[cat] ?? cat} size="small"
                                                onClick={() => setSelectedBidPlanCategories(prev => {
                                                    const next = new Set(prev);
                                                    sel ? next.delete(cat) : next.add(cat);
                                                    return next;
                                                })}
                                                sx={{
                                                    height: 22, fontSize: '0.7rem', cursor: 'pointer',
                                                    bgcolor: sel ? `${SOURCE_COLORS.bidPlans}20` : 'transparent',
                                                    border: `1px solid ${sel ? SOURCE_COLORS.bidPlans : 'var(--card-border)'}`,
                                                    color: sel ? SOURCE_COLORS.bidPlans : 'var(--text-secondary)',
                                                }}
                                            />
                                        );
                                    })}
                                </Box>
                            </>
                        )}
                        {availableSiteIds.length > 0 && (
                            <>
                                <PopoverLabel>{t('dataSourceSections.site')}</PopoverLabel>
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', px: 1.5, pb: 0.75 }}>
                                    {availableSiteIds.map(id => {
                                        const sel = selectedSiteIds.has(id);
                                        return (
                                            <Chip key={id} label={id} size="small"
                                                onClick={() => setSelectedSiteIds(prev => {
                                                    const next = new Set(prev);
                                                    sel ? next.delete(id) : next.add(id);
                                                    return next;
                                                })}
                                                sx={{
                                                    height: 22, fontSize: '0.7rem', cursor: 'pointer',
                                                    bgcolor: sel ? 'rgba(0,204,122,0.12)' : 'transparent',
                                                    border: `1px solid ${sel ? 'var(--primary)' : 'var(--card-border)'}`,
                                                    color: sel ? 'var(--primary)' : 'var(--text-secondary)',
                                                }}
                                            />
                                        );
                                    })}
                                </Box>
                            </>
                        )}
                        <PopoverLabel>{t('controlBar.fields')}</PopoverLabel>
                        {BID_PLAN_BASE_FIELDS.map(f => {
                            const on = selectedBidPlanFields.has(f.key);
                            return (
                                <Box key={f.key} sx={rowSx} onClick={() =>
                                    setSelectedBidPlanFields(prev => {
                                        const next = new Set(prev);
                                        on ? next.delete(f.key) : next.add(f.key);
                                        return next;
                                    })
                                }>
                                    <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: on ? f.color : 'transparent', border: `1.5px solid ${f.color}`, flexShrink: 0 }} />
                                    <Typography sx={{ fontSize: '0.75rem' }}>{t(f.labelKey)}</Typography>
                                </Box>
                            );
                        })}
                    </Box>
                );

            case 'weather': {
                const hasActual   = (weatherModelsActual?.length   ?? 0) > 0 || (weatherActual?.length   ?? 0) > 0;
                const hasForecast = (weatherModelsForecast?.length ?? 0) > 0 || (weatherForecast?.length ?? 0) > 0;

                const FieldPill = ({ value: _value, label, color, selected, onToggle }: {
                    value: string; label: string; color: string; selected: boolean;
                    onToggle: () => void;
                }) => (
                    <Box onClick={onToggle} sx={{
                        px: 0.75, py: 0.2, fontSize: '0.7rem', borderRadius: '3px', cursor: 'pointer',
                        border: `1px solid ${selected ? color : 'var(--card-border)'}`,
                        bgcolor: selected ? `color-mix(in srgb, ${color}, transparent 82%)` : 'transparent',
                        color: selected ? color : 'var(--text-secondary)',
                        fontWeight: selected ? 600 : 400,
                        transition: 'all 0.1s',
                        userSelect: 'none',
                    }}>
                        {label}
                    </Box>
                );

                return (
                    <Box sx={{ minWidth: 300, maxWidth: 340, maxHeight: 460, overflowY: 'auto' }}>
                        {/* Actual / Forecast source toggles */}
                        <Box sx={{ px: 1.5, pt: 1, pb: 0.75, borderBottom: '1px solid var(--card-border)', display: 'flex', gap: 0.75 }}>
                            {([
                                { label: t('controlBar.actual'), active: showWeatherActual,   set: setShowWeatherActual,   color: SOURCE_COLORS.weatherActual,   available: hasActual,   otherActive: showWeatherForecast },
                                { label: t('controlBar.forecast'), active: showWeatherForecast, set: setShowWeatherForecast, color: SOURCE_COLORS.weatherForecast, available: hasForecast, otherActive: showWeatherActual   },
                            ] as const).map(({ label, active, set, color, available, otherActive }) => (
                                <Tooltip key={label} title={available ? '' : t('controlBar.noDataAvailable')}>
                                    <Box onClick={() => {
                                        if (!available) return;
                                        set(!active);
                                        if (!active) { if (!showWeather) setShowWeather(true); }
                                        else if (!otherActive) setShowWeather(false);
                                    }} sx={{
                                        display: 'flex', alignItems: 'center', gap: 0.4, px: 0.75, py: 0.35,
                                        borderRadius: '3px', cursor: available ? 'pointer' : 'default',
                                        opacity: available ? 1 : 0.45,
                                        border: `1px solid ${active ? color : 'var(--card-border)'}`,
                                        bgcolor: active ? `color-mix(in srgb, ${color}, transparent 82%)` : 'transparent',
                                        color: active ? color : 'var(--text-secondary)',
                                        transition: 'all 0.1s',
                                    }}>
                                        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: active ? color : 'var(--card-border)', flexShrink: 0 }} />
                                        <Typography sx={{ fontSize: '0.75rem', fontWeight: active ? 600 : 400 }}>{label}</Typography>
                                    </Box>
                                </Tooltip>
                            ))}
                        </Box>

                        {/* Actual section */}
                        {hasActual && (
                            <Box>
                                {weatherModelsActual && weatherModelsActual.length > 0 && (
                                    <>
                                        <PopoverLabel>{t('controlBar.actualModel')}</PopoverLabel>
                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', px: 1.5, pb: 0.5 }}>
                                            {weatherModelsActual.map((m: { model: string }) => (
                                                <Chip key={m.model} label={m.model} size="small"
                                                    onClick={() => setSelectedWeatherModelActual(m.model)}
                                                    sx={{
                                                        height: 22, fontSize: '0.7rem', cursor: 'pointer',
                                                        bgcolor: selectedWeatherModelActual === m.model ? `${SOURCE_COLORS.weatherActual}25` : 'transparent',
                                                        border: `1px solid ${selectedWeatherModelActual === m.model ? SOURCE_COLORS.weatherActual : 'var(--card-border)'}`,
                                                        color: selectedWeatherModelActual === m.model ? SOURCE_COLORS.weatherActual : 'var(--text-secondary)',
                                                    }}
                                                />
                                            ))}
                                        </Box>
                                    </>
                                )}
                                <PopoverLabel>{t('controlBar.actualFields')}</PopoverLabel>
                                <Box sx={{ display: 'flex', gap: 0.4, flexWrap: 'wrap', px: 1.5, pb: 0.75 }}>
                                    {weatherFields.map(f => (
                                        <FieldPill key={f.value} value={f.value} label={t(f.labelKey)} color={f.color}
                                            selected={selectedWeatherFieldsActual.has(f.value)}
                                            onToggle={() => setSelectedWeatherFieldsActual(prev => {
                                                const next = new Set(prev);
                                                if (next.has(f.value)) { if (next.size > 1) next.delete(f.value); }
                                                else next.add(f.value);
                                                return next;
                                            })}
                                        />
                                    ))}
                                </Box>
                            </Box>
                        )}

                        {/* Forecast section */}
                        {hasForecast && (
                            <Box sx={{ borderTop: hasActual ? '1px solid var(--card-border)' : 'none' }}>
                                {weatherModelsForecast && weatherModelsForecast.length > 0 && (
                                    <>
                                        <PopoverLabel>{t('controlBar.forecastModel')}</PopoverLabel>
                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', px: 1.5, pb: 0.5 }}>
                                            {weatherModelsForecast.map((m: { model: string }) => (
                                                <Chip key={m.model} label={m.model} size="small"
                                                    onClick={() => setSelectedWeatherModelForecast(m.model)}
                                                    sx={{
                                                        height: 22, fontSize: '0.7rem', cursor: 'pointer',
                                                        bgcolor: selectedWeatherModelForecast === m.model ? `${SOURCE_COLORS.weatherForecast}25` : 'transparent',
                                                        border: `1px solid ${selectedWeatherModelForecast === m.model ? SOURCE_COLORS.weatherForecast : 'var(--card-border)'}`,
                                                        color: selectedWeatherModelForecast === m.model ? SOURCE_COLORS.weatherForecast : 'var(--text-secondary)',
                                                    }}
                                                />
                                            ))}
                                        </Box>
                                    </>
                                )}
                                <PopoverLabel>{t('controlBar.forecastFields')}</PopoverLabel>
                                <Box sx={{ display: 'flex', gap: 0.4, flexWrap: 'wrap', px: 1.5, pb: 0.75 }}>
                                    {weatherFields.map(f => (
                                        <FieldPill key={f.value} value={f.value} label={t(f.labelKey)} color={f.color}
                                            selected={selectedWeatherFieldsForecast.has(f.value)}
                                            onToggle={() => setSelectedWeatherFieldsForecast(prev => {
                                                const next = new Set(prev);
                                                if (next.has(f.value)) { if (next.size > 1) next.delete(f.value); }
                                                else next.add(f.value);
                                                return next;
                                            })}
                                        />
                                    ))}
                                </Box>
                            </Box>
                        )}
                    </Box>
                );
            }

            case 'occto':
                return (
                    <Box sx={{ minWidth: 280, maxHeight: 440, overflowY: 'auto' }}>
                        {/* Chart type toggle */}
                        <Box sx={{
                            display: 'flex', alignItems: 'center', gap: 0.75,
                            px: 1.5, pt: 1, pb: 0.75,
                            borderBottom: '1px solid var(--card-border)',
                        }}>
                            <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', mr: 'auto', letterSpacing: '0.5px' }}>
                                {t('controlBar.chartType')}
                            </Typography>
                            {([
                                { value: 'stacked', label: t('controlBar.stacked'), icon: <BarChartIcon sx={{ fontSize: '0.85rem' }} /> },
                                { value: 'area',    label: t('controlBar.area'), icon: <StackedLineChartIcon sx={{ fontSize: '0.85rem' }} /> },
                            ] as const).map(opt => (
                                <Box key={opt.value} onClick={() => setOcctoChartType(opt.value)} sx={{
                                    display: 'flex', alignItems: 'center', gap: 0.4, px: 0.75, py: 0.3,
                                    borderRadius: '3px', cursor: 'pointer',
                                    border: `1px solid ${occtoChartType === opt.value ? SOURCE_COLORS.occto : 'var(--card-border)'}`,
                                    bgcolor: occtoChartType === opt.value ? `${SOURCE_COLORS.occto}20` : 'transparent',
                                    color: occtoChartType === opt.value ? SOURCE_COLORS.occto : 'var(--text-secondary)',
                                    transition: 'all 0.1s',
                                }}>
                                    {opt.icon}
                                    <Typography sx={{ fontSize: '0.72rem', fontWeight: occtoChartType === opt.value ? 600 : 400 }}>
                                        {opt.label}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>

                        {/* Field groups */}
                        {OCCTO_GROUPS.map(group => (
                            <Box key={group.labelKey}>
                                <PopoverLabel>{t(group.labelKey)}</PopoverLabel>
                                <Box sx={{ display: 'flex', gap: 0.4, flexWrap: 'wrap', px: 1.5, pb: 0.75 }}>
                                    {group.keys.map(k => {
                                        const f = occtoStackedFields.find(x => x.key === k);
                                        if (!f) return null;
                                        const sel = selectedOcctoFields.has(k);
                                        return (
                                            <Box key={k} onClick={() => {
                                                setSelectedOcctoFields(prev => {
                                                    const next = new Set(prev);
                                                    sel ? next.delete(k) : next.add(k);
                                                    return next;
                                                });
                                                if (!sel && !showOcctoArea) setShowOcctoArea(true);
                                                else if (sel && selectedOcctoFields.size === 1) setShowOcctoArea(false);
                                            }} sx={{
                                                px: 0.75, py: 0.2, fontSize: '0.7rem', borderRadius: '3px', cursor: 'pointer',
                                                border: `1px solid ${sel ? f.color : 'var(--card-border)'}`,
                                                bgcolor: sel ? `color-mix(in srgb, ${f.color}, transparent 82%)` : 'transparent',
                                                color: sel ? f.color : 'var(--text-secondary)',
                                                fontWeight: sel ? 600 : 400,
                                                transition: 'all 0.1s',
                                                userSelect: 'none',
                                            }}>
                                                {t(f.labelKey)}
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </Box>
                        ))}
                    </Box>
                );

            case 'tdgc': {
                const tdgcGroupConfig = [
                    { key: 'origin' as const, label: t('tdgcTab.groups.origin'), color: SOURCE_COLORS.tdgc },
                    { key: 'tso' as const,    label: t('tdgcTab.groups.tso'),    color: '#5c6bc0' },
                ];
                const visibleFields = TDGC_FIELDS.filter(f => selectedTdgcGroups.has(f.group));
                return (
                    <Box sx={{ py: 0.75, minWidth: 280 }}>
                        {/* Result / Prompt data type toggles */}
                        <Box sx={{ px: 1.5, pt: 0.25, pb: 0.75, borderBottom: '1px solid var(--card-border)', display: 'flex', gap: 0.75 }}>
                            {([
                                { key: 'result', label: t('controlBar.result'), color: SOURCE_COLORS.tdgc },
                                { key: 'prompt', label: t('controlBar.prompt'), color: '#78909c' },
                            ] as const).map(({ key, label, color }) => {
                                const active = selectedTdgcDataTypes.has(key);
                                return (
                                    <Box key={key} onClick={() => {
                                        setSelectedTdgcDataTypes(prev => {
                                            const next = new Set(prev);
                                            if (active) {
                                                if (next.size > 1) next.delete(key);
                                            } else {
                                                next.add(key);
                                            }
                                            return next;
                                        });
                                    }} sx={{
                                        display: 'flex', alignItems: 'center', gap: 0.4, px: 0.75, py: 0.35,
                                        borderRadius: '3px', cursor: 'pointer',
                                        border: `1px solid ${active ? color : 'var(--card-border)'}`,
                                        bgcolor: active ? `color-mix(in srgb, ${color}, transparent 82%)` : 'transparent',
                                        color: active ? color : 'var(--text-secondary)',
                                        transition: 'all 0.1s',
                                    }}>
                                        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: active ? color : 'var(--card-border)', flexShrink: 0 }} />
                                        <Typography sx={{ fontSize: '0.75rem', fontWeight: active ? 600 : 400 }}>{label}</Typography>
                                    </Box>
                                );
                            })}
                        </Box>

                        {/* Group toggles (origin / tso) */}
                        <PopoverLabel>{t('tdgcTab.priceRange')}</PopoverLabel>
                        <Box sx={{ px: 1.5, pb: 0.75, display: 'flex', gap: 0.5 }}>
                            {tdgcGroupConfig.map(({ key, label, color }) => {
                                const active = selectedTdgcGroups.has(key);
                                return (
                                    <Box key={key} onClick={() => {
                                        setSelectedTdgcGroups(prev => {
                                            const next = new Set(prev);
                                            if (active) {
                                                if (next.size > 1) next.delete(key);
                                            } else {
                                                next.add(key);
                                            }
                                            return next;
                                        });
                                    }} sx={{
                                        display: 'flex', alignItems: 'center', gap: 0.4, px: 0.75, py: 0.3,
                                        borderRadius: '3px', cursor: 'pointer',
                                        border: `1px solid ${active ? color : 'var(--card-border)'}`,
                                        bgcolor: active ? `color-mix(in srgb, ${color}, transparent 82%)` : 'transparent',
                                        color: active ? color : 'var(--text-secondary)',
                                    }}>
                                        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: active ? color : 'var(--card-border)' }} />
                                        <Typography sx={{ fontSize: '0.72rem', fontWeight: active ? 600 : 400 }}>{label}</Typography>
                                    </Box>
                                );
                            })}
                        </Box>

                        {/* Bar stacking switch */}
                        <Box sx={{ px: 1.5, pb: 0.75, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box onClick={() => setTdgcBarStacking(!tdgcBarStacking)} sx={{
                                display: 'flex', alignItems: 'center', gap: 0.4, px: 0.75, py: 0.3,
                                borderRadius: '3px', cursor: 'pointer',
                                border: `1px solid ${tdgcBarStacking ? SOURCE_COLORS.tdgc : 'var(--card-border)'}`,
                                bgcolor: tdgcBarStacking ? `color-mix(in srgb, ${SOURCE_COLORS.tdgc}, transparent 82%)` : 'transparent',
                                color: tdgcBarStacking ? SOURCE_COLORS.tdgc : 'var(--text-secondary)',
                            }}>
                                <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: tdgcBarStacking ? SOURCE_COLORS.tdgc : 'var(--card-border)' }} />
                                <Typography sx={{ fontSize: '0.72rem', fontWeight: tdgcBarStacking ? 600 : 400 }}>{t('tdgcTab.stackBars')}</Typography>
                            </Box>
                        </Box>

                        {availableTdgcCategories.length > 0 && (
                            <>
                                <PopoverLabel>{t('dataSourceSections.marketCategory')}</PopoverLabel>
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', px: 1.5, pb: 0.75 }}>
                                    {availableTdgcCategories.map(cat => {
                                        const sel = selectedTdgcCategories.has(cat);
                                        const catCfg = TDGC_CATEGORIES[cat];
                                        const catColor = catCfg?.color ?? SOURCE_COLORS.tdgc;
                                        return (
                                            <Chip key={cat} label={catCfg ? t(catCfg.labelKey) : cat} size="small"
                                                onClick={() => setSelectedTdgcCategories(prev => {
                                                    const next = new Set(prev);
                                                    sel ? next.delete(cat) : next.add(cat);
                                                    return next;
                                                })}
                                                sx={{
                                                    height: 22, fontSize: '0.7rem', cursor: 'pointer',
                                                    bgcolor: sel ? `${catColor}20` : 'transparent',
                                                    border: `1px solid ${sel ? catColor : 'var(--card-border)'}`,
                                                    color: sel ? catColor : 'var(--text-secondary)',
                                                }}
                                            />
                                        );
                                    })}
                                </Box>
                            </>
                        )}
                        <PopoverLabel>{t('controlBar.displayFields')}</PopoverLabel>
                        {tdgcGroupConfig.map(({ key: gKey, label: gLabel }) => {
                            if (!selectedTdgcGroups.has(gKey)) return null;
                            const groupFields = visibleFields.filter(f => f.group === gKey);
                            if (groupFields.length === 0) return null;
                            return (
                                <Box key={gKey} sx={{ pt: 0.25, pb: 0.5 }}>
                                    <Typography sx={{
                                        px: 1.5, fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase',
                                        letterSpacing: '0.4px', color: 'text.disabled', pb: 0.25,
                                    }}>
                                        {gLabel}
                                    </Typography>
                                    {groupFields.map(f => {
                                        const on = selectedTdgcFields.has(f.key);
                                        return (
                                            <Box key={f.key} sx={rowSx} onClick={() =>
                                                setSelectedTdgcFields(prev => {
                                                    const next = new Set(prev);
                                                    on ? next.delete(f.key) : next.add(f.key);
                                                    return next;
                                                })
                                            }>
                                                <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: on ? f.color : 'transparent', border: `1.5px solid ${f.color}`, flexShrink: 0 }} />
                                                <Typography sx={{ fontSize: '0.74rem' }}>{t(f.labelKey)}</Typography>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            );
                        })}
                    </Box>
                );
            }

            default: return null;
        }
    }

    // ─── Render ───────────────────────────────────────────────────────────────

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
            <ModelChipsManager
                models={models}
                selectedModels={selectedModels}
                calculatingDatesByModel={calculatingDatesByModel}
                modelColorMap={modelColorMap}
                chartData={chartData}
                onModelToggle={onModelToggle}
                onCalculatingDateChange={handleModelCalculatingDateChange}
                labels={{
                    addManageModels: t('controlBar.addManageModels'),
                    selectModels: t('controlBar.selectModels'),
                    calculationDate: t('controlBar.calculationDate'),
                    latestForecast: t('controlBar.latestForecast'),
                    latest: t('controlBar.latest'),
                }}
            />

            <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />

            {/* ── Data Source Chips ─────────────────────────────────────────── */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                {SOURCES.map(({ key, labelKey, color, hasSubOptions }) => {
                    const isActive = getIsActive(key);
                    const hasData = getHasData(key);
                    return (
                        <Tooltip key={key} title={hasData ? '' : t('controlBar.noDataAvailable')} arrow>
                            <Box sx={{
                                display: 'flex', alignItems: 'stretch',
                                height: 26,
                                border: `1px ${hasData ? 'solid' : 'dashed'} ${isActive ? color : 'var(--card-border)'}`,
                                bgcolor: isActive ? `color-mix(in srgb, ${color}, transparent 85%)` : 'transparent',
                                borderRadius: '3px',
                                overflow: 'hidden',
                                opacity: hasData ? 1 : 0.65,
                                transition: 'border-color 0.12s, background-color 0.12s, opacity 0.15s',
                            }}>
                                {/* Toggle area */}
                                <Box
                                    onClick={() => hasData && handleToggle(key)}
                                    sx={{
                                        display: 'flex', alignItems: 'center', gap: 0.5,
                                        px: hasSubOptions ? 0.75 : 1,
                                        cursor: hasData ? 'pointer' : 'default',
                                        '&:hover': hasData ? { bgcolor: `color-mix(in srgb, ${color}, transparent 78%)` } : {},
                                        transition: 'background-color 0.1s',
                                    }}
                                >
                                    {!hasData && (
                                        <RemoveIcon sx={{
                                            fontSize: '0.65rem',
                                            color: 'var(--text-secondary)',
                                            opacity: 0.7,
                                            ml: -0.25,
                                        }} />
                                    )}
                                    <Box sx={{
                                        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                                        bgcolor: isActive ? color : 'var(--card-border)',
                                        transition: 'background-color 0.12s',
                                    }} />
                                    <Typography sx={{
                                        fontSize: '0.72rem',
                                        fontWeight: isActive ? 600 : 400,
                                        color: isActive ? color : 'var(--text-secondary)',
                                        userSelect: 'none',
                                        lineHeight: 1,
                                        transition: 'color 0.12s',
                                    }}>
                                        {t(labelKey)}
                                    </Typography>
                                </Box>

                                {/* Sub-options trigger */}
                                {hasSubOptions && hasData && (
                                    <Box
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSourcePopover({ anchor: e.currentTarget as HTMLElement, key });
                                        }}
                                        sx={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            width: 18,
                                            borderLeft: `1px solid ${isActive ? `color-mix(in srgb, ${color}, transparent 55%)` : 'var(--card-border)'}`,
                                            color: 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            transition: 'all 0.1s',
                                            '&:hover': {
                                                bgcolor: `color-mix(in srgb, ${color}, transparent 72%)`,
                                                color,
                                            },
                                        }}
                                    >
                                        <TuneIcon sx={{ fontSize: '0.72rem' }} />
                                    </Box>
                                )}
                            </Box>
                        </Tooltip>
                    );
                })}
            </Box>

            {/* ── Presets ─────────────────────────────────────────────────── */}
            <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
            <PresetSelector
                presets={forecastPresets}
                isLoading={forecastPresetsLoading}
                defaultPresetId={forecastDefaultPreset?.id ?? null}
                onSave={(name) => saveForecastPreset(name, captureForecastState())}
                onLoad={(preset) => applyForecastPreset(preset.data as ForecastPresetData)}
                onUpdate={(id) => updateForecastPresetData(id, captureForecastState())}
                onDelete={deleteForecastPreset}
                onRename={renameForecastPreset}
                onSetDefault={setForecastAsDefault}
                renderPreview={(data) => <ForecastPreview data={data} />}
            />

            {/* ── Display Options: Peak/Trough Labels ─────────────────────── */}
            <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
            {(() => {
                const color = '#f59e0b';
                const isActive = !!showTopBottomLabels;
                return (
                    <Tooltip title={t('controlBar.topBottomLabelsHint')} arrow>
                        <Box sx={{
                            display: 'flex', alignItems: 'stretch',
                            height: 26,
                            border: `1px solid ${isActive ? color : 'var(--card-border)'}`,
                            bgcolor: isActive ? `color-mix(in srgb, ${color}, transparent 85%)` : 'transparent',
                            borderRadius: '3px',
                            overflow: 'hidden',
                            transition: 'border-color 0.12s, background-color 0.12s',
                        }}>
                            {/* Toggle area */}
                            <Box
                                onClick={() => setShowTopBottomLabels(!showTopBottomLabels)}
                                sx={{
                                    display: 'flex', alignItems: 'center', gap: 0.5,
                                    px: 0.75,
                                    cursor: 'pointer',
                                    '&:hover': { bgcolor: `color-mix(in srgb, ${color}, transparent 78%)` },
                                    transition: 'background-color 0.1s',
                                }}
                            >
                                <Box sx={{
                                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                                    bgcolor: isActive ? color : 'var(--card-border)',
                                    transition: 'background-color 0.12s',
                                }} />
                                <Typography sx={{
                                    fontSize: '0.72rem',
                                    fontWeight: isActive ? 600 : 400,
                                    color: isActive ? color : 'var(--text-secondary)',
                                    userSelect: 'none',
                                    lineHeight: 1,
                                    transition: 'color 0.12s',
                                }}>
                                    {t('controlBar.topBottomLabels')} ({topBottomPairs})
                                </Typography>
                            </Box>
                            {/* k slider trigger */}
                            <Box
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setLabelsPopoverAnchor(e.currentTarget as HTMLElement);
                                }}
                                sx={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    width: 18,
                                    borderLeft: `1px solid ${isActive ? `color-mix(in srgb, ${color}, transparent 55%)` : 'var(--card-border)'}`,
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    transition: 'all 0.1s',
                                    '&:hover': {
                                        bgcolor: `color-mix(in srgb, ${color}, transparent 72%)`,
                                        color,
                                    },
                                }}
                            >
                                <TuneIcon sx={{ fontSize: '0.72rem' }} />
                            </Box>
                        </Box>
                    </Tooltip>
                );
            })()}

            {/* ── Peak/Trough k-value popover ──────────────────────────────── */}
            <Popover
                open={Boolean(labelsPopoverAnchor)}
                anchorEl={labelsPopoverAnchor}
                onClose={() => setLabelsPopoverAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                PaperProps={{
                    elevation: 4,
                    sx: { width: 240, mt: 0.5, p: 1.5, border: '1px solid var(--card-border)', bgcolor: 'var(--card-bg)', borderRadius: '4px' },
                }}
            >
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', fontSize: '0.7rem', letterSpacing: '0.5px', display: 'block', mb: 0.5 }}>
                    {t('controlBar.topBottomKLabel', { k: topBottomPairs })}
                </Typography>
                <Slider
                    value={topBottomPairs}
                    onChange={(_, v) => setTopBottomPairs(Array.isArray(v) ? v[0] : v)}
                    min={1}
                    max={10}
                    step={1}
                    marks
                    size="small"
                    valueLabelDisplay="auto"
                    sx={{ color: '#f59e0b', mx: 0.5 }}
                />
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', display: 'block', mt: 0.5 }}>
                    {t('controlBar.topBottomKHint')}
                </Typography>
            </Popover>

            {/* ── Source sub-options popover ───────────────────────────────── */}
            <Popover
                open={Boolean(sourcePopover)}
                anchorEl={sourcePopover?.anchor}
                onClose={() => setSourcePopover(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                PaperProps={{
                    elevation: 4,
                    sx: { mt: 0.5, border: '1px solid var(--card-border)', bgcolor: 'var(--card-bg)', borderRadius: '4px' },
                }}
            >
                {sourcePopover && (() => {
                    const src = SOURCES.find(s => s.key === sourcePopover.key)!;
                    return (
                        <>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.75, borderBottom: '1px solid var(--card-border)' }}>
                                <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: src.color, flexShrink: 0 }} />
                                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', fontSize: '0.68rem', letterSpacing: '0.5px' }}>
                                    {t(src.labelKey)}
                                </Typography>
                            </Box>
                            {renderPopoverContent(sourcePopover.key)}
                        </>
                    );
                })()}
            </Popover>
        </Paper>
    );
};
