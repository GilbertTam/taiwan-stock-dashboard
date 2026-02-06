'use client';

import React, { useMemo, useState } from 'react';
import { Tooltip } from '@mui/material';
import {
    TrendingUp, TrendingDown, Settings, ExpandMore, ExpandLess,
    Balance, SwapHoriz, Cloud, Map, ShowChart, BarChart
} from '@mui/icons-material';
import { useMarketDataContext } from '@/context/MarketDataContext';
import { calculateModelMAE, prepareChartData, ChartDataPoint } from '@/utils/chartUtils';
import { useProfitAnalysis } from '@/components/ProfitAnalysis/hooks/useProfitAnalysis';
import { usePriceChart } from '@/components/price-chart/context/PriceChartContext';
import { occtoFields, occtoStackedFields, weatherFields } from '@/components/price-chart/constants';

interface ModelWatchlistItem {
    id: string | number;
    name: string;
    color: string;
    calculatingDate: string;
    mae: number | null;
    sampleCount: number;
    isSelected: boolean;
    latestPrediction: number | null;
    latestActual: number | null;
    error: number | null;
    biasDirection: 'bullish' | 'bearish' | 'neutral';
    // Error statistics
    avgError: number | null;
    maxError: number | null;
    bullishCount: number;
    bearishCount: number;
    errorCount: number;
}


interface WatchlistSidebarProps {
    topBottomPairs?: number;
    onTopBottomPairsChange?: (value: number) => void;
}

function SectionHeader({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between border-b border-[var(--card-border)] px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                {children}
            </span>
            {action}
        </div>
    );
}

function TrendIndicator({ value, showPercent = false }: { value: number | null; showPercent?: boolean }) {
    if (value === null) return <span className="text-xs text-[var(--text-secondary)]">—</span>;

    const isPositive = value > 0;
    const isNegative = value < 0;
    const colorClass = isPositive
        ? 'text-[var(--success)]'
        : isNegative
            ? 'text-[var(--error)]'
            : 'text-[var(--text-secondary)]';

    return (
        <span className={`flex items-center gap-0.5 text-xs font-medium ${colorClass}`}>
            {isPositive && <TrendingUp className="h-3 w-3" />}
            {isNegative && <TrendingDown className="h-3 w-3" />}
            {isPositive ? '+' : ''}{value.toFixed(2)}
            {showPercent && '%'}
        </span>
    );
}

export function WatchlistSidebar({ topBottomPairs = 4, onTopBottomPairsChange }: WatchlistSidebarProps) {
    const {
        models,
        calculatingDatesByModel,
        selectedModels,
        actualPrices,
        predictionsByModel,
        handleModelChange,
        // Use context-provided highlight state for chart synchronization
        highlightedModelId,
        setHighlightedModelId,
        // Data layer toggles
        showImbalance, setShowImbalance,
        showIntraday, setShowIntraday,
        showInterconnection, setShowInterconnection,
        showWeather, setShowWeather,
        showOcctoArea, setShowOcctoArea,
        // Data availability check
        imbalanceData,
        intradayData,
        interconnectionData,
        weatherActual,
        occtoAreaData,
    } = useMarketDataContext();

    // Data availability flags
    const hasImbalanceData = imbalanceData && imbalanceData.length > 0;
    const hasIntradayData = intradayData && intradayData.length > 0;
    const hasInterconnectionData = interconnectionData && interconnectionData.length > 0;
    const hasWeatherData = weatherActual && weatherActual.length > 0;
    const hasOcctoData = occtoAreaData && occtoAreaData.length > 0;


    // Alias for readability - focused model in sidebar = highlighted model in chart
    const focusedModelKey = highlightedModelId;
    const setFocusedModelKey = setHighlightedModelId;


    const chartData = useMemo(
        () => prepareChartData(actualPrices, predictionsByModel),
        [actualPrices, predictionsByModel]
    );

    // Calculate profit analysis for the focused model
    const profitAnalysis = useProfitAnalysis({
        chartData,
        selectedModels: focusedModelKey
            ? selectedModels.filter((m) => `${m.id}|${m.name}` === focusedModelKey)
            : [],
        topBottomPairs,
    });

    // Build watchlist items for all available models
    const watchlistItems: ModelWatchlistItem[] = useMemo(() => {
        return models.map((model) => {
            const modelKey = `${model.id}|${model.name}`;
            const selectedModel = selectedModels.find((m) => `${m.id}|${m.name}` === modelKey);
            const isSelected = !!selectedModel;
            const mae = isSelected ? calculateModelMAE(chartData, model.id, model.name) : null;
            const sampleCount = chartData.length;

            // Get latest prediction and actual for this model
            let latestPrediction: number | null = null;
            let latestActual: number | null = null;
            let error: number | null = null;
            let bullishCount = 0;
            let bearishCount = 0;
            let errorSum = 0;
            let errorCount = 0;
            let maxError = 0;

            if (chartData.length > 0) {
                const lastPoint = chartData[chartData.length - 1];
                latestActual = lastPoint.actualPrice;

                const prediction = lastPoint.modelPredictions?.find(
                    (mp) => `${mp.modelId}|${mp.modelName}` === modelKey
                );
                if (prediction) {
                    latestPrediction = prediction.predictedPrice;
                    if (latestActual !== null && latestPrediction !== null) {
                        error = latestPrediction - latestActual;
                    }
                }

                // Count bias direction and calculate error stats across all data points
                chartData.forEach((point: ChartDataPoint) => {
                    const pred = point.modelPredictions?.find(
                        (mp) => `${mp.modelId}|${mp.modelName}` === modelKey
                    );
                    if (pred && point.actualPrice !== null && pred.predictedPrice !== null) {
                        const pointError = pred.predictedPrice - point.actualPrice;
                        if (pointError > 0) bullishCount++;
                        else if (pointError < 0) bearishCount++;

                        // Accumulate error stats
                        errorSum += Math.abs(pointError);
                        errorCount++;
                        maxError = Math.max(maxError, Math.abs(pointError));
                    }
                });
            }

            const biasDirection: 'bullish' | 'bearish' | 'neutral' =
                bullishCount > bearishCount ? 'bullish' : bearishCount > bullishCount ? 'bearish' : 'neutral';

            const avgError = errorCount > 0 ? errorSum / errorCount : null;

            return {
                id: model.id,
                name: model.name,
                color: selectedModel?.color || '#888888',
                calculatingDate: selectedModel?.calculatingDate || 'latest',
                mae: mae && mae > 0 ? mae : null,
                sampleCount,
                isSelected,
                latestPrediction,
                latestActual,
                error,
                biasDirection,
                // New fields for error statistics
                avgError,
                maxError: errorCount > 0 ? maxError : null,
                bullishCount,
                bearishCount,
                errorCount,
            };
        });
    }, [models, selectedModels, chartData]);


    const focusedModel = useMemo(() => {
        if (!focusedModelKey) return null;
        return watchlistItems.find((m) => `${m.id}|${m.name}` === focusedModelKey) || null;
    }, [focusedModelKey, watchlistItems]);

    const handleModelToggle = (modelId: string | number, modelName: string) => {
        const modelValue = `${modelId}|${modelName}`;
        const currentValues = selectedModels.map((m) => `${m.id}|${m.name}`);
        const isSelected = currentValues.includes(modelValue);
        const newValues = isSelected
            ? currentValues.filter((v) => v !== modelValue)
            : [...currentValues, modelValue];

        if (newValues.length <= 5) {
            handleModelChange({ target: { value: newValues } } as any);
        }
    };

    const cumulativeProfit = useMemo(() => {
        if (!focusedModelKey || profitAnalysis.combinedData.length === 0) return null;
        const lastDay = profitAnalysis.combinedData[profitAnalysis.combinedData.length - 1];
        return lastDay[`${focusedModelKey}_cumulative`] ?? null;
    }, [focusedModelKey, profitAnalysis.combinedData]);

    return (
        <div className="flex h-full flex-col gap-3">
            {/* Top: Watchlist */}
            <div className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
                <SectionHeader>
                    觀察清單
                    <span className="text-[10px] text-[var(--text-secondary)]">
                        {selectedModels.length}/5 已選
                    </span>
                </SectionHeader>

                <div className="max-h-[160px] overflow-y-auto">
                    {watchlistItems.map((item) => {
                        const modelKey = `${item.id}|${item.name}`;
                        const isFocused = focusedModelKey === modelKey;

                        return (
                            <div
                                key={modelKey}
                                className={`flex cursor-pointer items-center justify-between border-b border-[var(--card-border)] px-3 py-2 transition-colors last:border-b-0 ${item.isSelected
                                    ? 'bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20'
                                    : 'hover:bg-[var(--hover-bg)]'
                                    } ${isFocused ? 'ring-1 ring-inset ring-[var(--primary)]' : ''}`}
                                onClick={() => setFocusedModelKey(isFocused ? null : modelKey)}
                            >
                                <div className="flex items-center gap-2">
                                    {/* Selection checkbox */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleModelToggle(item.id, item.name);
                                        }}
                                        className={`flex h-4 w-4 items-center justify-center rounded border ${item.isSelected
                                            ? 'border-[var(--primary)] bg-[var(--primary)]'
                                            : 'border-[var(--card-border)] bg-transparent'
                                            }`}
                                    >
                                        {item.isSelected && (
                                            <svg className="h-3 w-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                                                <path
                                                    fillRule="evenodd"
                                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        )}
                                    </button>

                                    {/* Color dot */}
                                    <span
                                        className="h-2 w-2 rounded-full"
                                        style={{ backgroundColor: item.color }}
                                    />

                                    {/* Name */}
                                    <span className="truncate text-sm font-medium">{item.name}</span>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* MAE if selected */}
                                    {item.isSelected && item.mae !== null && (
                                        <Tooltip title="Mean Absolute Error" arrow>
                                            <span className="text-xs text-[var(--text-secondary)]">
                                                MAE {item.mae.toFixed(1)}
                                            </span>
                                        </Tooltip>
                                    )}

                                    {/* Trend indicator */}
                                    <TrendIndicator value={item.error} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Bottom: Focused Model Detail */}
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
                <SectionHeader>
                    模型詳情
                    {onTopBottomPairsChange && (
                        <button
                            onClick={() => {/* Could open settings modal */ }}
                            className="p-1 text-[var(--text-secondary)] hover:text-[var(--primary)]"
                        >
                            <Settings className="h-3.5 w-3.5" />
                        </button>
                    )}
                </SectionHeader>

                <div className="p-3">
                    {!focusedModel ? (
                        <p className="text-center text-xs text-[var(--text-secondary)]">
                            點擊上方模型查看詳細資訊
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {/* Model header */}
                            <div className="flex items-center gap-2">
                                <span
                                    className="h-3 w-3 rounded-full"
                                    style={{ backgroundColor: focusedModel.color }}
                                />
                                <span className="text-base font-bold">{focusedModel.name}</span>
                            </div>

                            {/* Stats grid */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="rounded-lg bg-[var(--hover-bg)] p-2">
                                    <div className="text-[var(--text-secondary)]">計算日期</div>
                                    <div className="font-semibold">
                                        {focusedModel.calculatingDate === 'latest' ? '最新' : focusedModel.calculatingDate}
                                    </div>
                                </div>

                                <div className="rounded-lg bg-[var(--hover-bg)] p-2">
                                    <div className="text-[var(--text-secondary)]">樣本數</div>
                                    <div className="font-semibold">{focusedModel.sampleCount}</div>
                                </div>

                                <div className="rounded-lg bg-[var(--hover-bg)] p-2">
                                    <div className="text-[var(--text-secondary)]">MAE</div>
                                    <div className="font-semibold">
                                        {focusedModel.mae !== null ? focusedModel.mae.toFixed(2) : '—'}
                                    </div>
                                </div>
                            </div>

                            {/* Error statistics grid - N predictions stats */}
                            {focusedModel.errorCount > 0 && (
                                <div className="mt-2 rounded-lg border border-[var(--card-border)] p-2">
                                    <div className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">
                                        誤差統計 ({focusedModel.errorCount} 筆)
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="text-[var(--text-secondary)]">平均誤差: </span>
                                            <span className="font-semibold">
                                                {focusedModel.avgError !== null ? focusedModel.avgError.toFixed(2) : '—'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[var(--text-secondary)]">最大誤差: </span>
                                            <span className="font-semibold">
                                                {focusedModel.maxError !== null ? focusedModel.maxError.toFixed(2) : '—'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}


                            {/* Cumulative profit if available */}
                            {focusedModel.isSelected && cumulativeProfit !== null && (
                                <div className="rounded-lg border border-[var(--card-border)] p-2">
                                    <div className="text-xs text-[var(--text-secondary)]">區間累計收益</div>
                                    <div className={`text-lg font-bold ${cumulativeProfit > 0 ? 'text-[var(--success)]' :
                                        cumulativeProfit < 0 ? 'text-[var(--error)]' : ''
                                        }`}>
                                        {cumulativeProfit > 0 ? '+' : ''}¥{cumulativeProfit.toFixed(2)}
                                    </div>
                                </div>
                            )}

                            {/* Latest prediction */}
                            {focusedModel.latestPrediction !== null && (
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-[var(--text-secondary)]">最新預測</span>
                                    <span className="font-semibold">¥{focusedModel.latestPrediction.toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Data Layers Section - VIEW style buttons with expandable sub-panels */}
            <DataLayersPanel
                showImbalance={showImbalance}
                setShowImbalance={setShowImbalance}
                showIntraday={showIntraday}
                setShowIntraday={setShowIntraday}
                showInterconnection={showInterconnection}
                setShowInterconnection={setShowInterconnection}
                showWeather={showWeather}
                setShowWeather={setShowWeather}
                showOcctoArea={showOcctoArea}
                setShowOcctoArea={setShowOcctoArea}
                hasImbalanceData={hasImbalanceData}
                hasIntradayData={hasIntradayData}
                hasInterconnectionData={hasInterconnectionData}
                hasWeatherData={hasWeatherData}
                hasOcctoData={hasOcctoData}
            />
        </div>
    );
}

// Extracted DataLayersPanel component for cleaner code
function DataLayersPanel({
    showImbalance, setShowImbalance,
    showIntraday, setShowIntraday,
    showInterconnection, setShowInterconnection,
    showWeather, setShowWeather,
    showOcctoArea, setShowOcctoArea,
    hasImbalanceData, hasIntradayData, hasInterconnectionData, hasWeatherData, hasOcctoData
}: {
    showImbalance: boolean; setShowImbalance: (v: boolean) => void;
    showIntraday: boolean; setShowIntraday: (v: boolean) => void;
    showInterconnection: boolean; setShowInterconnection: (v: boolean) => void;
    showWeather: boolean; setShowWeather: (v: boolean) => void;
    showOcctoArea: boolean; setShowOcctoArea: (v: boolean) => void;
    hasImbalanceData: boolean;
    hasIntradayData: boolean;
    hasInterconnectionData: boolean;
    hasWeatherData: boolean;
    hasOcctoData: boolean;
}) {
    // Get OCCTO field selection from PriceChartContext
    let selectedOcctoFields: Set<string> = new Set(['area_demand']);
    let setSelectedOcctoFields: (fn: (prev: Set<string>) => Set<string>) => void = () => { };
    let selectedWeatherFields: Set<string> = new Set(['temperature']);
    let setSelectedWeatherFields: (fn: (prev: Set<string>) => Set<string>) => void = () => { };
    let occtoChartType: 'line' | 'stacked' | 'percentage' = 'line';
    let setOcctoChartType: (val: 'line' | 'stacked') => void = () => { };

    try {
        const chartContext = usePriceChart();
        selectedOcctoFields = chartContext.selectedOcctoFields;
        setSelectedOcctoFields = chartContext.setSelectedOcctoFields;
        selectedWeatherFields = (chartContext as any).selectedWeatherFields ?? new Set(['temperature']);
        setSelectedWeatherFields = (chartContext as any).setSelectedWeatherFields ?? (() => { });
        occtoChartType = chartContext.occtoChartType;
        setOcctoChartType = chartContext.setOcctoChartType;
    } catch {
        // If not inside PriceChartProvider, use local state
    }

    const toggleOcctoField = (field: string) => {
        setSelectedOcctoFields((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(field)) {
                newSet.delete(field);
            } else {
                newSet.add(field);
            }
            if (newSet.size === 0) newSet.add('area_demand');
            return newSet;
        });
    };

    const toggleWeatherField = (field: string) => {
        setSelectedWeatherFields((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(field)) {
                newSet.delete(field);
            } else {
                newSet.add(field);
            }
            if (newSet.size === 0) newSet.add('temperature');
            return newSet;
        });
    };

    return (
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3 space-y-2">
            {/* Main toggle row */}
            <div className="flex flex-wrap items-center gap-1">
                <span className="mr-1 text-[10px] font-bold text-[var(--text-secondary)]">VIEW:</span>

                {/* Imbalance */}
                <button
                    onClick={() => setShowImbalance(!showImbalance)}
                    disabled={!hasImbalanceData}
                    className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] transition-colors ${showImbalance
                        ? 'bg-orange-500/20 text-orange-400 font-bold'
                        : hasImbalanceData
                            ? 'text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]'
                            : 'opacity-40 cursor-not-allowed text-[var(--text-secondary)]'
                        }`}
                >
                    <Balance className="h-3 w-3" /> Imbalance
                </button>

                {/* Intraday */}
                <button
                    onClick={() => setShowIntraday(!showIntraday)}
                    disabled={!hasIntradayData}
                    className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] transition-colors ${showIntraday
                        ? 'bg-purple-500/20 text-purple-400 font-bold'
                        : hasIntradayData
                            ? 'text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]'
                            : 'opacity-40 cursor-not-allowed text-[var(--text-secondary)]'
                        }`}
                >
                    <TrendingUp className="h-3 w-3" /> Intraday
                </button>

                {/* Interconnection */}
                <button
                    onClick={() => setShowInterconnection(!showInterconnection)}
                    disabled={!hasInterconnectionData}
                    className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] transition-colors ${showInterconnection
                        ? 'bg-cyan-500/20 text-cyan-400 font-bold'
                        : hasInterconnectionData
                            ? 'text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]'
                            : 'opacity-40 cursor-not-allowed text-[var(--text-secondary)]'
                        }`}
                >
                    <SwapHoriz className="h-3 w-3" /> Interconn
                </button>
            </div>

            {/* Weather with expandable sub-options */}
            <div className="space-y-1">
                <button
                    onClick={() => setShowWeather(!showWeather)}
                    disabled={!hasWeatherData}
                    className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-[10px] transition-colors ${showWeather
                        ? 'bg-yellow-500/20 text-yellow-400 font-bold'
                        : hasWeatherData
                            ? 'text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]'
                            : 'opacity-40 cursor-not-allowed text-[var(--text-secondary)]'
                        }`}
                >
                    <span className="flex items-center gap-1"><Cloud className="h-3 w-3" /> Weather</span>
                    {showWeather && hasWeatherData && <ExpandLess className="h-3 w-3" />}
                    {!showWeather && hasWeatherData && <ExpandMore className="h-3 w-3" />}
                </button>

                {/* Weather field toggles */}
                {showWeather && hasWeatherData && (
                    <div className="ml-2 flex flex-wrap gap-1 rounded bg-yellow-500/5 p-2">
                        {weatherFields.map((field) => {
                            const isSelected = selectedWeatherFields.has(field.value);
                            return (
                                <button
                                    key={field.value}
                                    onClick={() => toggleWeatherField(field.value)}
                                    className={`rounded px-1.5 py-0.5 text-[9px] transition-colors ${isSelected
                                        ? 'font-bold'
                                        : 'opacity-60 hover:opacity-100'
                                        }`}
                                    style={{
                                        backgroundColor: isSelected ? `${field.color}22` : 'transparent',
                                        color: isSelected ? field.color : 'var(--text-secondary)',
                                        border: `1px solid ${isSelected ? field.color : 'transparent'}`
                                    }}
                                >
                                    {field.label}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* OCCTO with expandable sub-options */}
            <div className="space-y-1">
                <button
                    onClick={() => setShowOcctoArea(!showOcctoArea)}
                    disabled={!hasOcctoData}
                    className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-[10px] transition-colors ${showOcctoArea
                        ? 'bg-teal-500/20 text-teal-400 font-bold'
                        : hasOcctoData
                            ? 'text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]'
                            : 'opacity-40 cursor-not-allowed text-[var(--text-secondary)]'
                        }`}
                >
                    <span className="flex items-center gap-1"><Map className="h-3 w-3" /> OCCTO</span>
                    {showOcctoArea && hasOcctoData && <ExpandLess className="h-3 w-3" />}
                    {!showOcctoArea && hasOcctoData && <ExpandMore className="h-3 w-3" />}
                </button>

                {/* OCCTO field toggles */}
                {showOcctoArea && hasOcctoData && (
                    <div className="ml-2 space-y-2 rounded bg-teal-500/5 p-2">
                        {/* Chart type toggle */}
                        <div className="flex gap-1">
                            <button
                                onClick={() => setOcctoChartType('line')}
                                className={`flex items-center gap-1 rounded px-2 py-0.5 text-[9px] transition-colors ${occtoChartType === 'line'
                                    ? 'bg-teal-500/30 text-teal-400 font-bold'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]'
                                    }`}
                            >
                                <ShowChart className="h-3 w-3" /> Line
                            </button>
                            <button
                                onClick={() => setOcctoChartType('stacked')}
                                className={`flex items-center gap-1 rounded px-2 py-0.5 text-[9px] transition-colors ${occtoChartType === 'stacked'
                                    ? 'bg-teal-500/30 text-teal-400 font-bold'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]'
                                    }`}
                            >
                                <BarChart className="h-3 w-3" /> Stack
                            </button>
                        </div>
                        {/* Field toggles */}
                        <div className="flex flex-wrap gap-1">
                            {occtoFields.map((field) => {
                                const isSelected = selectedOcctoFields.has(field.value);
                                const stackedField = occtoStackedFields.find(sf => sf.key === field.value);
                                const fieldColor = stackedField?.color ?? '#14b8a6';
                                return (
                                    <button
                                        key={field.value}
                                        onClick={() => toggleOcctoField(field.value)}
                                        className={`rounded px-1.5 py-0.5 text-[9px] transition-colors ${isSelected
                                            ? 'font-bold'
                                            : 'opacity-60 hover:opacity-100'
                                            }`}
                                        style={{
                                            backgroundColor: isSelected ? `${fieldColor}22` : 'transparent',
                                            color: isSelected ? fieldColor : 'var(--text-secondary)',
                                            border: `1px solid ${isSelected ? fieldColor : 'transparent'}`
                                        }}
                                    >
                                        {field.label}
                                    </button>
                                );
                            })}</div>
                    </div>
                )}
            </div>
        </div>
    );
}

