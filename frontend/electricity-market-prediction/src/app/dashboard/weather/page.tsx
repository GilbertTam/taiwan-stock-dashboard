'use client';

import React, { useState, useEffect, useTransition, useMemo, useCallback } from 'react';
import { Box, Typography, Snackbar, Alert } from '@mui/material';
import { DashboardToolbar } from '@/components/navigation/DashboardToolbar';
import { ResizableLayout } from '@/components/layout/ResizableLayout';
import { WeatherPageSidebar } from '@/components/weather/WeatherPageSidebar';
import { HourlyWeatherCharts } from '@/components/weather/HourlyWeatherCharts';
import { DailyWeatherSummary } from '@/components/weather/DailyWeatherSummary';
import { useMarketDataContext } from '@/context/MarketDataContext';
import { LoadingOverlay } from '@/components/overlay/LoadingOverlay';
import {
    DEFAULT_SELECTED_HOURLY,
    DEFAULT_SELECTED_DAILY,
    HOURLY_CATEGORIES,
    DAILY_CATEGORIES,
} from '@/constants/weatherCategories';
import { fetchWeatherModels } from '@/services/weatherApi';
import type { WeatherModelInfo } from '@/services/weatherApi';

export default function WeatherPage() {
    const {
        areas,
        selectedArea,
        handleAreaChange,
        weatherActual,
        weatherActualDaily,
        startDate,
        endDate,
        dateRangePreset,
        setStartDate,
        setEndDate,
        setDateRangePreset,
        refreshData,
        isLoading,
        dataFetchWarnings,
        registerPageNeeds,
        unregisterPageNeeds,
    } = useMarketDataContext();

    // Register scopes specific to WeatherPage
    useEffect(() => {
        registerPageNeeds('weather', new Set(['weather']), false);
        return () => unregisterPageNeeds('weather');
    }, [registerPageNeeds, unregisterPageNeeds]);

    const [showWarnings, setShowWarnings] = useState(false);

    useEffect(() => {
        if (dataFetchWarnings && dataFetchWarnings.length > 0) {
            setShowWarnings(true);
        } else {
            setShowWarnings(false);
        }
    }, [dataFetchWarnings]);

    // --- Model selection ---
    const [weatherModels, setWeatherModels] = useState<WeatherModelInfo[]>([]);
    const [selectedModel, setSelectedModel] = useState<string | null>(null);
    const [isLoadingModels, setIsLoadingModels] = useState(false);

    // Fetch available models when area changes
    useEffect(() => {
        if (!selectedArea) return;
        let cancelled = false;
        setIsLoadingModels(true);
        fetchWeatherModels({ area_name: selectedArea })
            .then((models) => {
                if (cancelled) return;
                setWeatherModels(models);
                // Auto-select first model, or keep current if it still exists
                if (models.length > 0) {
                    const currentStillExists = selectedModel && models.some(m => m.model === selectedModel);
                    if (!currentStillExists) {
                        setSelectedModel(models[0].model);
                    }
                } else {
                    setSelectedModel(null);
                }
            })
            .catch((err) => {
                if (cancelled) return;
                console.warn('Failed to fetch weather models:', err);
                setWeatherModels([]);
            })
            .finally(() => {
                if (!cancelled) setIsLoadingModels(false);
            });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedArea]);

    // --- Filter data by selected model ---
    const filteredHourly = useMemo(() => {
        if (!selectedModel) return weatherActual;
        return weatherActual.filter((d: any) => d.model === selectedModel);
    }, [weatherActual, selectedModel]);

    const filteredDaily = useMemo(() => {
        if (!selectedModel) return weatherActualDaily;
        return weatherActualDaily.filter((d: any) => d.model === selectedModel);
    }, [weatherActualDaily, selectedModel]);

    // --- Compute disabled categories based on field availability ---
    const disabledHourlyCategories = useMemo(() => {
        const disabled = new Set<string>();
        if (filteredHourly.length === 0) {
            HOURLY_CATEGORIES.forEach(cat => disabled.add(cat.id));
            return disabled;
        }
        for (const cat of HOURLY_CATEGORIES) {
            const hasAnyField = cat.fields.some(field =>
                filteredHourly.some((d: any) => d[field] !== null && d[field] !== undefined)
            );
            if (!hasAnyField) disabled.add(cat.id);
        }
        return disabled;
    }, [filteredHourly]);

    const disabledDailyCategories = useMemo(() => {
        const disabled = new Set<string>();
        if (filteredDaily.length === 0) {
            DAILY_CATEGORIES.forEach(cat => disabled.add(cat.id));
            return disabled;
        }
        for (const cat of DAILY_CATEGORIES) {
            const hasAnyField = cat.fields.some(field =>
                filteredDaily.some((d: any) => d[field] !== null && d[field] !== undefined)
            );
            if (!hasAnyField) disabled.add(cat.id);
        }
        return disabled;
    }, [filteredDaily]);

    // --- Category selection ---
    const [selectedHourlyCategories, setSelectedHourlyCategories] = useState<Set<string>>(
        new Set(DEFAULT_SELECTED_HOURLY)
    );
    const [selectedDailyCategories, setSelectedDailyCategories] = useState<Set<string>>(
        new Set(DEFAULT_SELECTED_DAILY)
    );

    const [isPending, startTransition] = useTransition();

    const handleHourlyCategoryChange = useCallback((id: string) => {
        startTransition(() => {
            setSelectedHourlyCategories(prev => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
            });
        });
    }, []);

    const handleDailyCategoryChange = useCallback((id: string) => {
        startTransition(() => {
            setSelectedDailyCategories(prev => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
            });
        });
    }, []);

    const handleModelChange = useCallback((model: string) => {
        setSelectedModel(model);
    }, []);

    const handleDateRangeChange = (ranges: any) => {
        if (ranges.selection.startDate) setStartDate(ranges.selection.startDate);
        if (ranges.selection.endDate) setEndDate(ranges.selection.endDate);
    };

    const hasNoData = filteredHourly.length === 0 && filteredDaily.length === 0;
    const currentAreaName = areas.find(a => a.name === selectedArea)?.name_ch || selectedArea;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative' }}>
            {(isLoading || isLoadingModels) && <LoadingOverlay />}

            <Snackbar
                open={showWarnings}
                autoHideDuration={6000}
                onClose={() => setShowWarnings(false)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert onClose={() => setShowWarnings(false)} severity="warning" sx={{ width: '100%' }}>
                    以下資料載入失敗，可能影響部分圖表：{dataFetchWarnings?.join('、')}
                </Alert>
            </Snackbar>

            <DashboardToolbar
                variant="full"
                startDate={startDate}
                endDate={endDate}
                dateRangePreset={dateRangePreset}
                onDateRangePreset={setDateRangePreset}
                onDateRangeChange={handleDateRangeChange}
                onRefresh={refreshData}
                isLoading={isLoading}
            />

            <ResizableLayout
                direction="horizontal"
                defaultSizes={[25, 75]}
                minSizes={[15, 40]}
            >
                <WeatherPageSidebar
                    areas={areas}
                    selectedArea={selectedArea}
                    onAreaChange={handleAreaChange}
                    weatherModels={weatherModels}
                    selectedModel={selectedModel}
                    onModelChange={handleModelChange}
                    selectedHourlyCategories={selectedHourlyCategories}
                    onHourlyCategoryChange={handleHourlyCategoryChange}
                    disabledHourlyCategories={disabledHourlyCategories}
                    selectedDailyCategories={selectedDailyCategories}
                    onDailyCategoryChange={handleDailyCategoryChange}
                    disabledDailyCategories={disabledDailyCategories}
                />
                <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, color: 'var(--text-primary)' }}>
                        天氣分析
                    </Typography>

                    <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
                        {currentAreaName}
                        {selectedModel && ` • 模型：${selectedModel}`}
                        {` • 逐時 ${filteredHourly.length} 筆，每日 ${filteredDaily.length} 筆`}
                    </Typography>

                    {hasNoData ? (
                        <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'var(--card-bg)', borderRadius: 2, border: '1px dashed var(--card-border)' }}>
                            <Typography variant="body1" color="text.secondary">
                                此日期區間尚無天氣資料，請更換日期或地區
                            </Typography>
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <Box>
                                <Typography variant="h5" sx={{ mb: 2, borderBottom: '1px solid var(--card-border)', pb: 1, fontWeight: 700 }}>逐時天氣</Typography>
                                {filteredHourly.length > 0 ? (
                                    <HourlyWeatherCharts
                                        data={filteredHourly as any[]}
                                        selectedCategoryIds={selectedHourlyCategories}
                                        isPending={isPending}
                                    />
                                ) : (
                                    <Typography variant="body2" color="text.secondary">本時段無逐時天氣資料</Typography>
                                )}
                            </Box>

                            <Box>
                                <Typography variant="h5" sx={{ mb: 2, borderBottom: '1px solid var(--card-border)', pb: 1, fontWeight: 700 }}>每日天氣總計</Typography>
                                {filteredDaily.length > 0 ? (
                                    <DailyWeatherSummary
                                        data={filteredDaily as any[]}
                                        selectedCategoryIds={selectedDailyCategories}
                                        isPending={isPending}
                                    />
                                ) : (
                                    <Typography variant="body2" color="text.secondary">本時段無每日總計資料</Typography>
                                )}
                            </Box>
                        </Box>
                    )}
                </Box>
            </ResizableLayout>
        </Box>
    );
}
