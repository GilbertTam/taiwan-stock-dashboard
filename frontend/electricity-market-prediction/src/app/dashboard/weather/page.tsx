'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Box,
    Typography,
    Snackbar,
    Alert,
    Tabs,
    Tab,
    IconButton,
    alpha
} from '@mui/material';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import TableChartIcon from '@mui/icons-material/TableChart';
import { DashboardToolbar } from '@/components/navigation/DashboardToolbar';
import { ResizableLayout } from '@/components/layout/ResizableLayout';
import { WeatherUnifiedSidebar } from '@/components/weather/WeatherUnifiedSidebar';
import { useMarketDataContext } from '@/context/MarketDataContext';
import { LoadingOverlay } from '@/components/overlay/LoadingOverlay';
import { useTheme } from '@/app/ThemeProvider';
import { useChartColors } from '@/utils/chart-colors';
import {
    HOURLY_CATEGORIES,
    DAILY_CATEGORIES,
} from '@/constants/weatherCategories';
import { PriceChartProvider } from '@/components/price-chart/context/PriceChartContext';
import { ChartLightweight } from '@/components/price-chart/ChartLightweight';
import { WeatherDataTableWrapper } from '@/components/price-chart/controls/WeatherDataTableWrapper';
import {
    fetchWeatherActualModels,
    fetchWeatherActualDailyModels,
    fetchWeatherForecastModels,
    fetchWeatherForecastDailyModels,
} from '@/services/weatherApi';
import type { WeatherModelBasicInfo } from '@/services/weatherApi';

const BOTTOM_BAR_HEIGHT = 48;
const INNER_STORAGE_KEY = 'weather-page-inner-layout';
const COLLAPSED_SIZES = [95, 5] as const;
const COLLAPSED_MIN_SIZES = [92, 5] as const;
const DEFAULT_EXPANDED_SIZES = [65, 35];

export default function WeatherPage() {
    const { darkMode } = useTheme();
    const colors = useChartColors();

    const {
        areas,
        selectedArea,
        handleAreaChange,
        weatherActual,
        weatherActualDaily,
        weatherForecast,
        weatherForecastDaily,
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

    // ── Warnings ──
    const [showWarnings, setShowWarnings] = useState(false);
    useEffect(() => {
        setShowWarnings(!!(dataFetchWarnings && dataFetchWarnings.length > 0));
    }, [dataFetchWarnings]);

    // ── Layout State ──
    const [collapsed, setCollapsed] = useState(true);
    const [panelSizes, setPanelSizes] = useState<number[]>(DEFAULT_EXPANDED_SIZES);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        try {
            const saved = localStorage.getItem(INNER_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved) as number[];
                if (Array.isArray(parsed) && parsed.length === 2) {
                    setPanelSizes(parsed);
                }
            }
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        if (isClient && !collapsed) {
            localStorage.setItem(INNER_STORAGE_KEY, JSON.stringify(panelSizes));
        }
    }, [collapsed, panelSizes, isClient]);

    // ── Data Source Toggles ──
    const [showActualHourly, setShowActualHourly] = useState(true);
    const [showActualDaily, setShowActualDaily] = useState(true);
    const [showForecastHourly, setShowForecastHourly] = useState(true);
    const [showForecastDaily, setShowForecastDaily] = useState(true);

    // ── Per-Dataset Model Lists ──
    const [modelsActualHourly, setModelsActualHourly] = useState<WeatherModelBasicInfo[]>([]);
    const [modelsActualDaily, setModelsActualDaily] = useState<WeatherModelBasicInfo[]>([]);
    const [modelsForecastHourly, setModelsForecastHourly] = useState<WeatherModelBasicInfo[]>([]);
    const [modelsForecastDaily, setModelsForecastDaily] = useState<WeatherModelBasicInfo[]>([]);

    // ── Per-Dataset Selected Model ──
    const [selectedModelActualHourly, setSelectedModelActualHourly] = useState<string | null>(null);
    const [selectedModelActualDaily, setSelectedModelActualDaily] = useState<string | null>(null);
    const [selectedModelForecastHourly, setSelectedModelForecastHourly] = useState<string | null>(null);
    const [selectedModelForecastDaily, setSelectedModelForecastDaily] = useState<string | null>(null);

    const [isLoadingModels, setIsLoadingModels] = useState(false);

    // ── Field Selection ──
    const allHourlyFields = useMemo(
        () => HOURLY_CATEGORIES.flatMap(c => c.fields),
        []
    );
    const allDailyFields = useMemo(
        () => DAILY_CATEGORIES.flatMap(c => c.fields),
        []
    );
    const [selectedFields, setSelectedFields] = useState<Set<string>>(
        () => new Set([allHourlyFields[0], allHourlyFields[1], allDailyFields[0]]) // default: mix of hourly and daily
    );

    // ── Height Selection ──
    const [weatherHeightByField, setWeatherHeightByField] = useState<Record<string, string>>({});
    const availableHeights = useMemo<Record<string, string[]>>(() => {
        // Derive from field names by looking for specific scale/stat suffixes
        const heights: Record<string, string[]> = {};
        const allFields = [...allHourlyFields, ...allDailyFields];
        const scalePattern = /_(\d+m?|0_to_7cm|7_to_28cm|28_to_100cm|100_to_255cm|0_to_100cm|max|min|mean|sum)$/;

        allFields.forEach(f => {
            const match = f.match(scalePattern);
            if (match) {
                const h = match[1];
                const group = f.replace(scalePattern, '');
                if (!heights[group]) heights[group] = [];
                if (!heights[group].includes(h)) heights[group].push(h);
            }
        });
        return heights;
    }, [allHourlyFields, allDailyFields]);

    const handleFieldToggle = useCallback((field: string) => {
        setSelectedFields(prev => {
            const next = new Set(prev);
            if (next.has(field)) next.delete(field);
            else next.add(field);
            return next;
        });
    }, []);

    const handleHeightChange = useCallback((fieldGroup: string, height: string) => {
        setWeatherHeightByField(prev => ({ ...prev, [fieldGroup]: height }));

        // Switch the selected field to the new height variant immediately
        setSelectedFields(prev => {
            const next = new Set(prev);
            const scalePattern = /_(\d+m?|0_to_7cm|7_to_28cm|28_to_100cm|100_to_255cm|0_to_100cm|max|min|mean|sum)$/;
            let found = false;

            prev.forEach(f => {
                const group = f.replace(scalePattern, '');
                if (group === fieldGroup) {
                    next.delete(f);
                    found = true;
                }
            });

            if (found) {
                next.add(`${fieldGroup}_${height}`);
            }
            return next;
        });
    }, []);

    // ── Fetch model lists when area changes ──
    useEffect(() => {
        if (!selectedArea) return;
        let cancelled = false;
        setIsLoadingModels(true);

        const autoSelect = (
            models: WeatherModelBasicInfo[],
            current: string | null,
            setter: React.Dispatch<React.SetStateAction<string | null>>
        ) => {
            if (models.length > 0) {
                const stillExists = current && models.some(m => m.model === current);
                if (!stillExists) setter(models[0].model);
            } else {
                setter(null);
            }
        };

        Promise.all([
            fetchWeatherActualModels({ area_name: selectedArea }).catch(() => [] as WeatherModelBasicInfo[]),
            fetchWeatherActualDailyModels({ area_name: selectedArea }).catch(() => [] as WeatherModelBasicInfo[]),
            fetchWeatherForecastModels({ area_name: selectedArea }).catch(() => [] as WeatherModelBasicInfo[]),
            fetchWeatherForecastDailyModels({ area_name: selectedArea }).catch(() => [] as WeatherModelBasicInfo[]),
        ]).then(([ah, ad, fh, fd]) => {
            if (cancelled) return;
            setModelsActualHourly(ah);
            setModelsActualDaily(ad);
            setModelsForecastHourly(fh);
            setModelsForecastDaily(fd);
            autoSelect(ah, selectedModelActualHourly, setSelectedModelActualHourly);
            autoSelect(ad, selectedModelActualDaily, setSelectedModelActualDaily);
            autoSelect(fh, selectedModelForecastHourly, setSelectedModelForecastHourly);
            autoSelect(fd, selectedModelForecastDaily, setSelectedModelForecastDaily);
        }).finally(() => {
            if (!cancelled) setIsLoadingModels(false);
        });

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedArea]);

    // ── Filter and merge data (Hourly takes priority over Daily) ──
    const displayedWeatherActual = useMemo((): any[] => {
        const hourlyData = showActualHourly ? weatherActual.filter((d: any) => !selectedModelActualHourly || d.model === selectedModelActualHourly) : [];
        const dailyData = showActualDaily ? weatherActualDaily.filter((d: any) => !selectedModelActualDaily || d.model === selectedModelActualDaily) : [];

        const mergedMap = new Map<string, any>();

        // 1. Add daily first (lower priority)
        dailyData.forEach(d => {
            if (!d.datetime) return;
            let dailyTime = d.datetime;
            if (dailyTime.length === 8) { // YYYYMMDD
                dailyTime = `${dailyTime.substring(0, 4)}-${dailyTime.substring(4, 6)}-${dailyTime.substring(6, 8)}T00:00:00+09:00`;
            } else if (!dailyTime.includes('T') && !dailyTime.includes(' ')) {
                dailyTime = `${dailyTime}T00:00:00+09:00`;
            }
            mergedMap.set(dailyTime, { ...d, datetime: dailyTime });
        });

        // 2. Merge hourly (higher priority, overwrites overlapping keys with non-null values)
        hourlyData.forEach(d => {
            if (!d.datetime) return;
            const existing = mergedMap.get(d.datetime);
            if (existing) {
                const merged = { ...existing };
                Object.keys(d).forEach(key => {
                    const val = (d as any)[key];
                    if (val !== null && val !== undefined) {
                        merged[key] = val;
                    }
                });
                mergedMap.set(d.datetime, merged);
            } else {
                mergedMap.set(d.datetime, { ...d });
            }
        });

        return Array.from(mergedMap.values()).sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
    }, [showActualHourly, showActualDaily, selectedModelActualHourly, selectedModelActualDaily, weatherActual, weatherActualDaily]);

    const displayedWeatherForecast = useMemo((): any[] => {
        const hourlyData = showForecastHourly ? weatherForecast.filter((d: any) => !selectedModelForecastHourly || d.model === selectedModelForecastHourly) : [];
        const dailyData = showForecastDaily ? weatherForecastDaily.filter((d: any) => !selectedModelForecastDaily || d.model === selectedModelForecastDaily) : [];

        const mergedMap = new Map<string, any>();

        // 1. Add daily first (lower priority)
        dailyData.forEach(d => {
            if (!d.datetime) return;
            let dailyTime = d.datetime;
            if (dailyTime.length === 8) { // YYYYMMDD
                dailyTime = `${dailyTime.substring(0, 4)}-${dailyTime.substring(4, 6)}-${dailyTime.substring(6, 8)}T00:00:00+09:00`;
            } else if (!dailyTime.includes('T') && !dailyTime.includes(' ')) {
                dailyTime = `${dailyTime}T00:00:00+09:00`;
            }
            mergedMap.set(dailyTime, { ...d, datetime: dailyTime });
        });

        // 2. Merge hourly (higher priority, overwrites overlapping keys with non-null values)
        hourlyData.forEach(d => {
            if (!d.datetime) return;
            const existing = mergedMap.get(d.datetime);
            if (existing) {
                const merged = { ...existing };
                Object.keys(d).forEach(key => {
                    const val = (d as any)[key];
                    if (val !== null && val !== undefined) {
                        merged[key] = val;
                    }
                });
                mergedMap.set(d.datetime, merged);
            } else {
                mergedMap.set(d.datetime, { ...d });
            }
        });

        return Array.from(mergedMap.values()).sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
    }, [showForecastHourly, showForecastDaily, selectedModelForecastHourly, selectedModelForecastDaily, weatherForecast, weatherForecastDaily]);

    // ── Date range handler ──
    const handleDateRangeChange = (ranges: any) => {
        if (ranges.selection.startDate) setStartDate(ranges.selection.startDate);
        if (ranges.selection.endDate) setEndDate(ranges.selection.endDate);
    };

    const currentAreaName = areas.find(a => a.name === selectedArea)?.name_ch || selectedArea;
    const dataCount = displayedWeatherActual.length + displayedWeatherForecast.length;

    return (
        <Box sx={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
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

            <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <ResizableLayout
                    direction="horizontal"
                    defaultSizes={[25, 75]}
                    minSizes={[15, 40]}
                    storageKey="weather-page-layout"
                >
                    <Box
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            borderRight: '1px solid var(--card-border)',
                            backgroundColor: 'var(--card-bg)',
                        }}
                    >
                        <WeatherUnifiedSidebar
                            areas={areas}
                            selectedArea={selectedArea}
                            onAreaChange={handleAreaChange}
                            showActualHourly={showActualHourly}
                            onShowActualHourlyChange={setShowActualHourly}
                            showActualDaily={showActualDaily}
                            onShowActualDailyChange={setShowActualDaily}
                            showForecastHourly={showForecastHourly}
                            onShowForecastHourlyChange={setShowForecastHourly}
                            showForecastDaily={showForecastDaily}
                            onShowForecastDailyChange={setShowForecastDaily}
                            modelsActualHourly={modelsActualHourly}
                            selectedModelActualHourly={selectedModelActualHourly}
                            onModelActualHourlyChange={setSelectedModelActualHourly}
                            modelsActualDaily={modelsActualDaily}
                            selectedModelActualDaily={selectedModelActualDaily}
                            onModelActualDailyChange={setSelectedModelActualDaily}
                            modelsForecastHourly={modelsForecastHourly}
                            selectedModelForecastHourly={selectedModelForecastHourly}
                            onModelForecastHourlyChange={setSelectedModelForecastHourly}
                            modelsForecastDaily={modelsForecastDaily}
                            selectedModelForecastDaily={selectedModelForecastDaily}
                            onModelForecastDailyChange={setSelectedModelForecastDaily}
                            selectedFields={selectedFields}
                            onFieldToggle={handleFieldToggle}
                            weatherHeightByField={weatherHeightByField}
                            availableHeights={availableHeights}
                            onHeightChange={handleHeightChange}
                        />
                    </Box>

                    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <PriceChartProvider
                            chartData={[]}
                            areaName={selectedArea}
                            selectedModels={[]}
                            weatherActual={displayedWeatherActual}
                            weatherForecast={displayedWeatherForecast}
                            weatherHeightByField={weatherHeightByField}
                            showWeatherOverride={true}
                            showWeatherActualOverride={showActualHourly || showActualDaily}
                            showWeatherForecastOverride={showForecastHourly || showForecastDaily}
                            selectedWeatherFieldsActualOverride={selectedFields}
                            selectedWeatherFieldsForecastOverride={selectedFields}
                            darkMode={darkMode}
                            colors={colors}
                            hideObsAndPriceRow={true}
                            startDate={startDate}
                            endDate={endDate}
                        >
                            {dataCount === 0 && !isLoading ? (
                                <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'var(--card-bg)', borderRadius: 2, border: '1px dashed var(--card-border)', m: 2 }}>
                                    <Typography variant="body1" color="text.secondary">
                                        此日期區間尚無天氣資料，請更換日期或地區
                                    </Typography>
                                </Box>
                            ) : (
                                <ResizableLayout
                                    direction="vertical"
                                    defaultSizes={DEFAULT_EXPANDED_SIZES}
                                    minSizes={collapsed ? [...COLLAPSED_MIN_SIZES] : [30, 10]}
                                    sizes={collapsed ? [...COLLAPSED_SIZES] : panelSizes}
                                    onSizesChange={(sizes) => {
                                        if (!collapsed) setPanelSizes(sizes);
                                    }}
                                    storageKey={INNER_STORAGE_KEY}
                                    animateSizeChanges
                                >
                                    <Box sx={{ flex: 1, minHeight: 0, p: 1 }}>
                                        <ChartLightweight />
                                    </Box>
                                    <Box
                                        sx={{
                                            height: '100%',
                                            minHeight: 0,
                                            overflow: 'hidden',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            borderTop: `1px solid var(--card-border)`,
                                            backgroundColor: 'var(--card-bg)',
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                borderBottom: `1px solid var(--card-border)`,
                                                flexShrink: 0,
                                                height: BOTTOM_BAR_HEIGHT,
                                                minHeight: BOTTOM_BAR_HEIGHT,
                                                px: 1
                                            }}
                                        >
                                            <Tabs
                                                value={collapsed ? false : 0}
                                                sx={{
                                                    minHeight: BOTTOM_BAR_HEIGHT,
                                                    flex: 1,
                                                    '& .MuiTab-root': {
                                                        textTransform: 'none',
                                                        fontWeight: 600,
                                                        minHeight: BOTTOM_BAR_HEIGHT,
                                                        py: 0.75,
                                                        fontSize: '0.9rem',
                                                        ...(collapsed && { color: 'text.secondary', opacity: 0.85 }),
                                                    },
                                                    '& .MuiTabs-indicator': {
                                                        height: 3,
                                                        borderRadius: '3px 3px 0 0',
                                                        ...(collapsed && { display: 'none' }),
                                                    },
                                                }}
                                            >
                                                <Tab
                                                    icon={<TableChartIcon sx={{ fontSize: 18, mr: 0.5 }} />}
                                                    iconPosition="start"
                                                    label="天氣資料表格 (Weather Data Table)"
                                                    onClick={() => setCollapsed(!collapsed)}
                                                />
                                            </Tabs>
                                            <IconButton
                                                size="small"
                                                onClick={() => setCollapsed(!collapsed)}
                                                sx={{ color: 'text.secondary' }}
                                                title={collapsed ? '展開' : '收合'}
                                            >
                                                {collapsed ? <UnfoldMoreIcon sx={{ fontSize: 20 }} /> : <UnfoldLessIcon sx={{ fontSize: 20 }} />}
                                            </IconButton>
                                        </Box>
                                        <Box sx={{ flex: 1, minHeight: 0, p: 1, overflow: 'hidden', display: collapsed ? 'none' : 'block' }}>
                                            <WeatherDataTableWrapper />
                                        </Box>
                                    </Box>
                                </ResizableLayout>
                            )}
                        </PriceChartProvider>
                    </Box>
                </ResizableLayout>
            </Box>
        </Box>
    );
}
