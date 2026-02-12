/**
 * @fileoverview Market Data Hook
 *
 * Custom React hook that manages state and data fetching for the electricity
 * market dashboard. Handles areas, prediction models, actual prices, weather,
 * and various grid operation data sources.
 *
 * Features:
 * - Cached predictions to avoid redundant API calls
 * - Race condition handling with request IDs
 * - User preferences persistence (localStorage)
 * - Date range presets and custom date selection
 * - Multiple data layer toggles (imbalance, intraday, weather, etc.)
 *
 * @example
 * const {
 *   areas,
 *   selectedArea,
 *   handleAreaChange,
 *   actualPrices,
 *   isLoading
 * } = useMarketData();
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { format, subDays, subMonths, addMonths, isValid } from 'date-fns';
import {
    fetchAreas,
    fetchPredictionModels,
    fetchPredictions,
    fetchActualPrices,
    fetchAvailableCalculatingDates,
    fetchSpecificPredictions,
    fetchWeatherActual,
    fetchWeatherForecast,
    fetchImbalance,
    fetchIntraday,
    fetchInterconnectionFlows,
    fetchOcctoArea,
    fetchBatteryData,
    fetchBidPlans
} from '@/services/api';
import { Area, PredictionModel, AreaPrice, PricePrediction, CalculatingDate, WeatherData, ImbalanceData, IntradayData, InterconnectionFlow, OcctoAreaData, BatteryData, BidPlanData } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { generateColor, hashString } from '@/utils/chartUtils';
import { SelectChangeEvent } from '@mui/material';
import { useUserPreferences } from './useUserPreferences';

/**
 * Selected model configuration with display settings
 */
interface SelectedModelConfig {
    /** Model ID (string or number depending on source) */
    id: string | number;
    /** Model display name */
    name: string;
    /** CSS color for chart series */
    color: string;
    /** Calculation date for predictions ('latest' or YYYY-MM-DD) */
    calculatingDate: string;
}

/**
 * Return type for the useMarketData hook
 */
export interface UseMarketDataReturn {
    // Data
    areas: Area[];
    models: PredictionModel[];
    calculatingDatesByModel: { [key: string]: CalculatingDate[] };
    selectedArea: string;
    selectedModels: SelectedModelConfig[];
    actualPrices: AreaPrice[];
    predictionsByModel: { [key: string]: PricePrediction[] };
    weatherActual: WeatherData[];
    weatherForecast: WeatherData[];
    imbalanceData: ImbalanceData[];
    intradayData: IntradayData[];
    interconnectionData: InterconnectionFlow[];
    occtoAreaData: OcctoAreaData[];
    batteryData: BatteryData[];
    bidPlansData: BidPlanData[];
    selectedSiteIds: Set<string>;
    setSelectedSiteIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    availableSiteIds: string[];

    // Date range
    startDate: Date | null;
    endDate: Date | null;
    dateRangePreset: string | null;
    setStartDate: React.Dispatch<React.SetStateAction<Date | null>>;
    setEndDate: React.Dispatch<React.SetStateAction<Date | null>>;
    setDateRangePreset: React.Dispatch<React.SetStateAction<string | null>>;

    // Loading/Error states
    isLoading: boolean;
    isFetchingPredictions: boolean;
    error: string | null;
    /** Labels of data sources that failed to load (e.g. ['天氣(實際)', '天氣(預報)']) — show in Snackbar */
    dataFetchWarnings: string[];

    // Handlers
    handleAreaChange: (event: SelectChangeEvent) => void;
    handleModelChange: (event: SelectChangeEvent<string[]>) => void;
    handleModelCalculatingDateChange: (modelIndex: number, newCalculatingDate: string) => void;
    handleDateRangePreset: (preset: string | null) => void;
    handleMoveMonthBackward: () => void;
    handleMoveMonthForward: () => void;
    refreshData: () => void;

    // Chart highlight/focus
    highlightedModelId: string | null;
    setHighlightedModelId: React.Dispatch<React.SetStateAction<string | null>>;
    focusedDataSource: string | null;
    setFocusedDataSource: React.Dispatch<React.SetStateAction<string | null>>;

    // Data layer toggles
    showImbalance: boolean;
    setShowImbalance: React.Dispatch<React.SetStateAction<boolean>>;
    showImbalanceQuantity: boolean;
    setShowImbalanceQuantity: React.Dispatch<React.SetStateAction<boolean>>;
    showImbalanceSurplusRate: boolean;
    setShowImbalanceSurplusRate: React.Dispatch<React.SetStateAction<boolean>>;
    showImbalanceDeficitRate: boolean;
    setShowImbalanceDeficitRate: React.Dispatch<React.SetStateAction<boolean>>;
    showIntraday: boolean;
    setShowIntraday: React.Dispatch<React.SetStateAction<boolean>>;
    showIntradayAverage: boolean;
    setShowIntradayAverage: React.Dispatch<React.SetStateAction<boolean>>;
    showInterconnection: boolean;
    setShowInterconnection: React.Dispatch<React.SetStateAction<boolean>>;
    showWeather: boolean;
    setShowWeather: React.Dispatch<React.SetStateAction<boolean>>;
    showWeatherActual: boolean;
    setShowWeatherActual: React.Dispatch<React.SetStateAction<boolean>>;
    showWeatherForecast: boolean;
    setShowWeatherForecast: React.Dispatch<React.SetStateAction<boolean>>;
    showOcctoArea: boolean;
    setShowOcctoArea: React.Dispatch<React.SetStateAction<boolean>>;
    showActualPrice: boolean;
    setShowActualPrice: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Custom hook for managing electricity market dashboard data.
 *
 * Fetches and caches market data including predictions, actual prices,
 * weather, and grid operation data. Manages user preferences for
 * selected areas, models, and data layer visibility.
 *
 * @returns Hook state and handler functions
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const {
 *     areas,
 *     selectedArea,
 *     handleAreaChange,
 *     actualPrices,
 *     isLoading,
 *     error
 *   } = useMarketData();
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <ErrorMessage message={error} />;
 *
 *   return (
 *     <AreaSelect
 *       areas={areas}
 *       value={selectedArea}
 *       onChange={handleAreaChange}
 *     />
 *   );
 * }
 * ```
 */
export const useMarketData = (): UseMarketDataReturn => {
    const { logout } = useAuth();

    // ==========================================================================
    // Core State: Areas, Models, Selection
    // ==========================================================================

    /** Available electricity grid areas from API */
    const [areas, setAreas] = useState<Area[]>([]);

    /** Available prediction models from API */
    const [models, setModels] = useState<PredictionModel[]>([]);

    /** Available calculation dates per model, keyed by "modelId|modelName" */
    const [calculatingDatesByModel, setCalculatingDatesByModel] = useState<{ [key: string]: CalculatingDate[] }>({});

    /** Currently selected area name (e.g., 'tokyo', 'hokkaido') */
    const [selectedArea, setSelectedArea] = useState<string>('');

    /** Currently selected models with their display configuration */
    const [selectedModels, setSelectedModels] = useState<SelectedModelConfig[]>([]);

    // ==========================================================================
    // Date Range State
    // ==========================================================================

    /** Start date for data queries (defaults to 7 days / week) */
    const [startDate, setStartDate] = useState<Date | null>(() => {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const start = subDays(today, 6);
        start.setHours(0, 0, 0, 0);
        return start;
    });

    /** End date for data queries (defaults to today) */
    const [endDate, setEndDate] = useState<Date | null>(() => {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return today;
    });

    /** Active date range preset identifier (e.g., '3D', 'week', 'month') */
    const [dateRangePreset, setDateRangePreset] = useState<string | null>('week');

    // ==========================================================================
    // Market Data State
    // ==========================================================================

    /** JEPX actual spot market prices */
    const [actualPrices, setActualPrices] = useState<AreaPrice[]>([]);

    /** Predictions per model, keyed by "modelId|modelName" */
    const [predictionsByModel, setPredictionsByModel] = useState<{ [key: string]: PricePrediction[] }>({});

    /**
     * Prediction cache to avoid redundant API calls.
     * Key format: "area_startDate_endDate_modelKey_calculatingDate"
     */
    const [cachedPredictionsByModel, setCachedPredictionsByModel] = useState<{ [key: string]: PricePrediction[] }>({});

    /**
     * Ref to hold the latest cache value for reading inside callbacks.
     * This avoids adding cachedPredictionsByModel to dependency arrays,
     * which would cause infinite re-fetch loops.
     */
    const cacheRef = useRef(cachedPredictionsByModel);

    /** Actual observed weather data */
    const [weatherActual, setWeatherActual] = useState<WeatherData[]>([]);

    /** Weather forecast data */
    const [weatherForecast, setWeatherForecast] = useState<WeatherData[]>([]);

    /** Grid imbalance data (supply vs demand gap) */
    const [imbalanceData, setImbalanceData] = useState<ImbalanceData[]>([]);

    /** JEPX intraday market trading data */
    const [intradayData, setIntradayData] = useState<IntradayData[]>([]);

    /** Interconnection line flow data between areas */
    const [interconnectionData, setInterconnectionData] = useState<InterconnectionFlow[]>([]);

    /** OCCTO area supply/demand data */
    const [occtoAreaData, setOcctoAreaData] = useState<OcctoAreaData[]>([]);

    /** Battery data (eflow) */
    const [batteryData, setBatteryData] = useState<BatteryData[]>([]);

    /** Bid plan data (spot) */
    const [bidPlansData, setBidPlansData] = useState<BidPlanData[]>([]);

    /** Selected site IDs for bid plans filtering */
    const [selectedSiteIds, setSelectedSiteIds] = useState<Set<string>>(new Set());

    /** Available site IDs extracted from bid plans data */
    const availableSiteIds = useMemo(() => {
        if (!bidPlansData || bidPlansData.length === 0) return [];
        return Array.from(new Set(bidPlansData.map(d => d.site_id).filter(Boolean))).sort() as string[];
    }, [bidPlansData]);

    // 当有新的 availableSiteIds 时，如果当前没有选中任何 site，自动选中第一个
    useEffect(() => {
        if (availableSiteIds.length > 0 && selectedSiteIds.size === 0) {
            setSelectedSiteIds(new Set([availableSiteIds[0]]));
        }
    }, [availableSiteIds, selectedSiteIds]);

    // ==========================================================================
    // Loading and Error State
    // ==========================================================================

    /** True while fetching initial data or actual prices */
    const [isLoading, setIsLoading] = useState<boolean>(false);

    /** True while fetching prediction data specifically */
    const [isFetchingPredictions, setIsFetchingPredictions] = useState<boolean>(false);

    /** Error message to display, null if no error */
    const [error, setError] = useState<string | null>(null);

    /** Data sources that failed in last fetch (for partial-failure Snackbar) */
    const [dataFetchWarnings, setDataFetchWarnings] = useState<string[]>([]);

    // ==========================================================================
    // Chart Highlight State
    // ==========================================================================

    /** Model ID to highlight in chart (others fade out) */
    const [highlightedModelId, setHighlightedModelId] = useState<string | null>(null);

    /** Data source to focus in chart (e.g., 'imbalance', 'weather') */
    const [focusedDataSource, setFocusedDataSource] = useState<string | null>(null);

    // ==========================================================================
    // Data Layer Toggle State
    // ==========================================================================

    const [showImbalance, setShowImbalance] = useState<boolean>(false);
    const [showImbalanceQuantity, setShowImbalanceQuantity] = useState<boolean>(true);
    const [showImbalanceSurplusRate, setShowImbalanceSurplusRate] = useState<boolean>(true);
    const [showImbalanceDeficitRate, setShowImbalanceDeficitRate] = useState<boolean>(true);
    const [showIntraday, setShowIntraday] = useState<boolean>(false);
    const [showIntradayAverage, setShowIntradayAverage] = useState<boolean>(true);
    const [showInterconnection, setShowInterconnection] = useState<boolean>(false);
    const [showWeather, setShowWeather] = useState<boolean>(false);
    const [showWeatherActual, setShowWeatherActual] = useState<boolean>(false);
    const [showWeatherForecast, setShowWeatherForecast] = useState<boolean>(false);
    const [showOcctoArea, setShowOcctoArea] = useState<boolean>(false);
    const [showActualPrice, setShowActualPrice] = useState<boolean>(true);

    // ==========================================================================
    // Race Condition Prevention Refs
    // ==========================================================================

    /**
     * Request ID counters to handle race conditions.
     * When a slower request completes after a newer one, we ignore its results.
     */
    const latestActualDataRequestId = useRef<number>(0);
    const latestPredictionRequestId = useRef<number>(0);
    const latestCalcDateRequestId = useRef<number>(0);

    // ==========================================================================
    // User Preferences
    // ==========================================================================

    const { loadPreferences, updatePreference } = useUserPreferences();
    /** Flag to prevent saving preferences during initial load */
    const prefsLoadedRef = useRef(false);

    /**
     * Memoized model key string to use in useEffect dependencies.
     * This prevents unnecessary re-renders from creating new array references.
     */
    const selectedModelKeysString = useMemo(
        () => selectedModels.map(m => `${m.id}|${m.name}|${m.calculatingDate}`).join(','),
        [selectedModels]
    );

    // ==========================================================================
    // Effects: Cache Sync
    // ==========================================================================

    // Keep cacheRef in sync with state for use in callbacks
    useEffect(() => {
        cacheRef.current = cachedPredictionsByModel;
    }, [cachedPredictionsByModel]);

    // ==========================================================================
    // Effects: Auto-save Preferences
    // ==========================================================================

    useEffect(() => {
        if (!prefsLoadedRef.current) return;
        updatePreference('showImbalance', showImbalance);
    }, [showImbalance, updatePreference]);

    useEffect(() => {
        if (!prefsLoadedRef.current) return;
        updatePreference('showImbalanceQuantity', showImbalanceQuantity);
    }, [showImbalanceQuantity, updatePreference]);

    useEffect(() => {
        if (!prefsLoadedRef.current) return;
        updatePreference('showImbalanceSurplusRate', showImbalanceSurplusRate);
    }, [showImbalanceSurplusRate, updatePreference]);

    useEffect(() => {
        if (!prefsLoadedRef.current) return;
        updatePreference('showImbalanceDeficitRate', showImbalanceDeficitRate);
    }, [showImbalanceDeficitRate, updatePreference]);

    useEffect(() => {
        if (!prefsLoadedRef.current) return;
        updatePreference('showIntraday', showIntraday);
    }, [showIntraday, updatePreference]);

    useEffect(() => {
        if (!prefsLoadedRef.current) return;
        updatePreference('showIntradayAverage', showIntradayAverage);
    }, [showIntradayAverage, updatePreference]);

    useEffect(() => {
        if (!prefsLoadedRef.current) return;
        updatePreference('showInterconnection', showInterconnection);
    }, [showInterconnection, updatePreference]);

    useEffect(() => {
        if (!prefsLoadedRef.current) return;
        updatePreference('showOcctoArea', showOcctoArea);
    }, [showOcctoArea, updatePreference]);

    useEffect(() => {
        if (!prefsLoadedRef.current || !selectedArea) return;
        updatePreference('selectedArea', selectedArea);
    }, [selectedArea, updatePreference]);

    useEffect(() => {
        if (!prefsLoadedRef.current) return;
        updatePreference('selectedModels', selectedModels);
    }, [selectedModels, updatePreference]);

    // ==========================================================================
    // Effects: Initial Data Fetch
    // ==========================================================================

    /**
     * On mount, fetch areas and models, then apply saved preferences.
     */
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setIsLoading(true);
                const [areasData, modelsData] = await Promise.all([
                    fetchAreas(),
                    fetchPredictionModels()
                ]);

                setAreas(areasData);
                setModels(modelsData);

                // Load and apply saved preferences
                const prefs = loadPreferences();

                // Apply area preference (fallback to first area)
                if (prefs.selectedArea && areasData.some(a => a.name === prefs.selectedArea)) {
                    setSelectedArea(prefs.selectedArea);
                } else if (areasData.length > 0) {
                    setSelectedArea(areasData[0].name);
                }

                // Apply data layer preferences
                if (prefs.showImbalance !== undefined) setShowImbalance(prefs.showImbalance);
                if (prefs.showImbalanceQuantity !== undefined) setShowImbalanceQuantity(prefs.showImbalanceQuantity);
                if (prefs.showImbalanceSurplusRate !== undefined) setShowImbalanceSurplusRate(prefs.showImbalanceSurplusRate);
                if (prefs.showImbalanceDeficitRate !== undefined) setShowImbalanceDeficitRate(prefs.showImbalanceDeficitRate);
                if (prefs.showIntraday !== undefined) setShowIntraday(prefs.showIntraday);
                if (prefs.showIntradayAverage !== undefined) setShowIntradayAverage(prefs.showIntradayAverage);
                if (prefs.showInterconnection !== undefined) setShowInterconnection(prefs.showInterconnection);
                if (prefs.showOcctoArea !== undefined) setShowOcctoArea(prefs.showOcctoArea);

                // Apply model preferences (filter to existing models only)
                if (prefs.selectedModels && prefs.selectedModels.length > 0) {
                    const validModels = prefs.selectedModels.filter(pm =>
                        modelsData.some(m => m.id === pm.id && m.name === pm.name)
                    );
                    if (validModels.length > 0) {
                        setSelectedModels(validModels);
                    }
                }

                // Enable auto-save now that preferences are loaded
                prefsLoadedRef.current = true;

            } catch (err: unknown) {
                console.error('獲取初始資料失敗', err);
                const error = err as { response?: { status: number } };
                if (error.response?.status === 401) {
                    setError('認證已過期，請重新登入');
                    setTimeout(() => logout(), 2000);
                } else {
                    setError('獲取初始資料失敗');
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchInitialData();
    }, [logout, loadPreferences]);

    // ==========================================================================
    // Effects: Fetch Calculating Dates
    // ==========================================================================

    /**
     * Fetch available calculation dates whenever area, models, or date range changes.
     * Resets model calculatingDate to 'latest' if previous date is no longer valid.
     */
    useEffect(() => {
        const fetchAllCalculatingDates = async () => {
            if (!selectedArea || selectedModels.length === 0 || !startDate || !endDate) return;
            if (!isValid(startDate) || !isValid(endDate)) return;

            const requestId = ++latestCalcDateRequestId.current;

            try {
                const formattedStartDate = format(startDate, 'yyyyMMdd');
                const formattedEndDate = format(endDate, 'yyyyMMdd');

                const datesPromises = selectedModels.map(model =>
                    fetchAvailableCalculatingDates({
                        start_date: formattedStartDate,
                        end_date: formattedEndDate,
                        area_name: selectedArea,
                        model_name: model.name
                    }).then(dates => ({
                        modelKey: `${model.id}|${model.name}`,
                        dates
                    })).catch(err => {
                        console.warn(`Failed to fetch calculating dates for ${model.name}`, err);
                        return { modelKey: `${model.id}|${model.name}`, dates: [] };
                    })
                );

                const results = await Promise.all(datesPromises);

                // Race condition guard: ignore stale responses
                if (requestId !== latestCalcDateRequestId.current) return;

                const newCalculatingDatesByModel: { [key: string]: CalculatingDate[] } = {};
                results.forEach(result => {
                    newCalculatingDatesByModel[result.modelKey] = result.dates;
                });

                setCalculatingDatesByModel(newCalculatingDatesByModel);

                // Reset calculatingDate to 'latest' if previous date is no longer available
                setSelectedModels(prev => {
                    let hasChanges = false;
                    const updatedModels = prev.map(model => {
                        const modelKey = `${model.id}|${model.name}`;
                        const availableDates = newCalculatingDatesByModel[modelKey] || [];
                        if (model.calculatingDate !== 'latest' &&
                            !availableDates.some(d => d.calculating_date === model.calculatingDate)) {
                            hasChanges = true;
                            return { ...model, calculatingDate: 'latest' };
                        }
                        return model;
                    });
                    return hasChanges ? updatedModels : prev;
                });

            } catch (err: unknown) {
                if (requestId !== latestCalcDateRequestId.current) return;
                console.error('獲取計算日期失敗', err);
            }
        };

        fetchAllCalculatingDates();
        // Use memoized string to avoid dependency on selectedModels array reference
    }, [selectedArea, selectedModelKeysString, startDate, endDate, logout]);

    // ==========================================================================
    // Data Fetching Functions
    // ==========================================================================

    /**
     * Fetch actual market data (prices, weather, imbalance, etc.).
     * Uses request ID to handle race conditions from rapid date changes.
     */
    const fetchActualData = useCallback(async () => {
        if (!selectedArea || !startDate || !endDate) return;
        if (!isValid(startDate) || !isValid(endDate)) return;

        const requestId = ++latestActualDataRequestId.current;
        setIsLoading(true);
        setError(null);
        setDataFetchWarnings([]);

        const formattedStartDate = format(startDate, 'yyyyMMdd');
        const formattedEndDate = format(endDate, 'yyyyMMdd');
        const failedLabels: string[] = [];

        const catchWithLabel = (label: string) => (e: unknown) => {
            console.warn(`[fetchActualData] ${label} 取得失敗:`, e);
            failedLabels.push(label);
            return [] as any;
        };

        try {
            // Fetch all data sources in parallel. Each .catch() prevents one failure from blocking others.
            const [actualData, weatherActualData, weatherForecastData, imbalanceDataResult, intradayDataResult, interconnectionDataResult, occtoAreaDataResult, batteryDataResult, bidPlansDataResult] = await Promise.all([
                fetchActualPrices({ start_date: formattedStartDate, end_date: formattedEndDate, name: selectedArea }).catch(catchWithLabel('現貨')),
                fetchWeatherActual({ start_date: formattedStartDate, end_date: formattedEndDate, area_name: selectedArea }).catch(catchWithLabel('天氣(實際)')),
                fetchWeatherForecast({ start_date: formattedStartDate, end_date: formattedEndDate, area_name: selectedArea }).catch(catchWithLabel('天氣(預報)')),
                fetchImbalance({ start_date: formattedStartDate, end_date: formattedEndDate, area_name: selectedArea }).catch(catchWithLabel('不平衡')),
                fetchIntraday({ start_date: formattedStartDate, end_date: formattedEndDate, area_name: selectedArea }).catch(catchWithLabel('日前')),
                fetchInterconnectionFlows({ start_date: formattedStartDate, end_date: formattedEndDate, interval_minutes: 30 }).catch(catchWithLabel('互連')),
                fetchOcctoArea({ start_date: formattedStartDate, end_date: formattedEndDate, area_name: selectedArea }).catch(catchWithLabel('OCCTO 區域')),
                fetchBatteryData({ start_date: formattedStartDate, end_date: formattedEndDate }).catch(catchWithLabel('電池')),
                fetchBidPlans({ 
                    start_date: formattedStartDate, 
                    end_date: formattedEndDate
                    // commodity_category 和 site_id 筛选在前端进行，以支持多选和预设 spot
                }).catch(catchWithLabel('投標計畫'))
            ]);

            // Race condition guard: ignore stale responses
            if (requestId !== latestActualDataRequestId.current) return;

            setActualPrices(actualData);
            setWeatherActual(weatherActualData);
            setWeatherForecast(weatherForecastData);
            setImbalanceData(imbalanceDataResult);
            setIntradayData(intradayDataResult);
            setInterconnectionData(interconnectionDataResult);
            setOcctoAreaData(occtoAreaDataResult);
            setBatteryData(batteryDataResult);
            // 注意：site_id 筛选在 PriceChartContext 中进行，这里先设置所有数据
            setBidPlansData(bidPlansDataResult);

            if (failedLabels.length > 0) {
                setDataFetchWarnings(failedLabels);
            }
        } catch (err: unknown) {
            if (requestId !== latestActualDataRequestId.current) return;

            console.error('獲取實際數據失敗', err);
            const errRes = err as { response?: { status: number } };
            if (errRes.response?.status === 401) {
                setError('認證已過期，請重新登入');
                setTimeout(() => logout(), 2000);
            } else {
                setError('獲取實際數據失敗');
            }
        } finally {
            if (requestId === latestActualDataRequestId.current) {
                setIsLoading(false);
            }
        }
    }, [selectedArea, startDate, endDate, logout]);

    /**
     * Fetch prediction data with caching.
     *
     * Uses cacheRef to check cache without adding it to dependency array,
     * which prevents infinite re-fetch loops.
     */
    const fetchPredictionData = useCallback(async () => {
        if (!selectedArea || selectedModels.length === 0 || !startDate || !endDate) {
            setPredictionsByModel({});
            setIsFetchingPredictions(false);
            return;
        }
        if (!isValid(startDate) || !isValid(endDate)) return;

        const requestId = ++latestPredictionRequestId.current;
        setIsFetchingPredictions(true);
        setError(null);

        try {
            const formattedStartDate = format(startDate, 'yyyyMMdd');
            const formattedEndDate = format(endDate, 'yyyyMMdd');
            const predictionsData: { [key: string]: PricePrediction[] } = {};
            const newCacheEntries: { [key: string]: PricePrediction[] } = {};

            const modelsToFetch: Array<{
                model: SelectedModelConfig;
                modelKey: string;
                cacheKey: string;
            }> = [];

            // Check cache using ref to avoid dependency loop
            const currentCache = cacheRef.current;

            selectedModels.forEach((model) => {
                const modelKey = `${model.id}|${model.name}`;
                const cacheKey = `${selectedArea}_${formattedStartDate}_${formattedEndDate}_${modelKey}_${model.calculatingDate}`;

                if (currentCache[cacheKey]) {
                    // Cache hit: use cached data
                    predictionsData[modelKey] = currentCache[cacheKey];
                } else {
                    // Cache miss: queue for API fetch
                    modelsToFetch.push({ model, modelKey, cacheKey });
                }
            });

            if (modelsToFetch.length > 0) {
                // Fetch missing models individually so one failure doesn't block others
                await Promise.all(modelsToFetch.map(async ({ model, modelKey, cacheKey }) => {
                    try {
                        let modelPredictions: PricePrediction[];

                        if (model.calculatingDate === 'latest') {
                            modelPredictions = await fetchPredictions({
                                start_date: formattedStartDate,
                                end_date: formattedEndDate,
                                area_name: selectedArea,
                                model_name: model.name,
                                latest_only: true
                            });
                        } else {
                            const formattedCalculatingDate = format(new Date(model.calculatingDate), 'yyyyMMdd');
                            modelPredictions = await fetchSpecificPredictions({
                                start_date: formattedStartDate,
                                end_date: formattedEndDate,
                                area_name: selectedArea,
                                model_name: model.name,
                                calculating_date: formattedCalculatingDate
                            });
                        }

                        predictionsData[modelKey] = modelPredictions;
                        newCacheEntries[cacheKey] = modelPredictions;
                    } catch (err) {
                        console.error(`Failed to fetch predictions for ${model.name}`, err);
                        // Don't re-throw: allow other models to load even if one fails
                    }
                }));

                if (requestId !== latestPredictionRequestId.current) return;

                // Update cache with new entries
                if (Object.keys(newCacheEntries).length > 0) {
                    setCachedPredictionsByModel(prev => ({ ...prev, ...newCacheEntries }));
                }
            }

            if (requestId !== latestPredictionRequestId.current) return;

            setPredictionsByModel(predictionsData);
        } catch (err: unknown) {
            if (requestId !== latestPredictionRequestId.current) return;

            console.error('獲取預測數據失敗', err);
            const error = err as { response?: { status: number } };
            if (error.response?.status === 401) {
                setError('認證已過期，請重新登入');
                setTimeout(() => logout(), 2000);
            }
        } finally {
            if (requestId === latestPredictionRequestId.current) {
                setIsFetchingPredictions(false);
            }
        }
    }, [selectedArea, selectedModels, startDate, endDate, logout]);

    // ==========================================================================
    // Effects: Cache Cleanup & Data Refetch
    // ==========================================================================

    /**
     * Clear cache entries that don't match current area/date range.
     * Keeps cache from growing unbounded.
     */
    useEffect(() => {
        if (selectedArea && startDate && endDate && isValid(startDate) && isValid(endDate)) {
            const formattedStartDate = format(startDate, 'yyyyMMdd');
            const formattedEndDate = format(endDate, 'yyyyMMdd');

            setCachedPredictionsByModel(prev => {
                const newCache: { [key: string]: PricePrediction[] } = {};
                Object.keys(prev).forEach(key => {
                    // Only retain cache entries for current area and date range
                    if (key.startsWith(`${selectedArea}_${formattedStartDate}_${formattedEndDate}_`)) {
                        newCache[key] = prev[key];
                    }
                });
                return newCache;
            });
        }
    }, [selectedArea, startDate, endDate]);

    /**
     * Re-fetch actual data when area, date range, or selected site IDs change.
     */
    useEffect(() => {
        if (selectedArea && startDate && endDate) {
            fetchActualData();
        }
    }, [selectedArea, startDate, endDate, selectedSiteIds, fetchActualData]);

    /**
     * Re-fetch predictions when area, models, or date range changes.
     */
    useEffect(() => {
        if (selectedArea && selectedModels.length > 0 && startDate && endDate) {
            fetchPredictionData();
        } else {
            setPredictionsByModel({});
        }
    }, [selectedArea, selectedModels, startDate, endDate, fetchPredictionData]);

    // ==========================================================================
    // Event Handlers
    // ==========================================================================

    /**
     * Handle area dropdown change.
     * @param event - MUI Select change event
     */
    const handleAreaChange = (event: SelectChangeEvent) => {
        setSelectedArea(event.target.value);
    };

    /**
     * Handle model multi-select change.
     * Generates colors for new models and preserves existing model settings.
     * @param event - MUI Select change event with string array value
     */
    const handleModelChange = (event: SelectChangeEvent<string[]>) => {
        const selectedValues = event.target.value as string[];
        if (selectedValues.length === 0) {
            setSelectedModels([]);
            return;
        }
        const uniqueSelectedValues = Array.from(new Set(selectedValues));
        const newSelectedModels = uniqueSelectedValues.map((modelValue) => {
            const [idStr, name] = modelValue.split('|');
            const id = isNaN(Number(idStr)) ? idStr : Number(idStr);
            // Preserve existing model settings if already selected
            const existingModel = selectedModels.find(m => m.id === id && m.name === name);
            if (existingModel) return existingModel;
            // Generate consistent color based on model value hash
            return { id, name, color: generateColor(hashString(modelValue)), calculatingDate: 'latest' };
        });
        setSelectedModels(newSelectedModels);
    };

    /**
     * Handle calculating date change for a specific model.
     * @param modelIndex - Index of model in selectedModels array
     * @param newCalculatingDate - New calculation date ('latest' or YYYY-MM-DD)
     */
    const handleModelCalculatingDateChange = (modelIndex: number, newCalculatingDate: string) => {
        setSelectedModels(prev => {
            const updated = [...prev];
            updated[modelIndex] = { ...updated[modelIndex], calculatingDate: newCalculatingDate };
            return updated;
        });
    };

    /**
     * Apply a date range preset (e.g., 'week', 'month').
     * Sets start/end dates based on preset relative to today.
     * @param preset - Preset identifier or null to clear
     */
    const handleDateRangePreset = (preset: string | null) => {
        if (!preset) {
            setDateRangePreset(null);
            return;
        }
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        let start: Date;
        // N 天 = 含今日往前 N 天（1D=1天, 3D=3天, week=7天）
        switch (preset) {
            case '1D': start = new Date(today); break;                    // 今天 = 1 天
            case '3D': start = subDays(today, 2); break;                  // 今日～2 天前 = 3 天
            case 'week': start = subDays(today, 6); break;                // 今日～6 天前 = 7 天
            case 'twoWeeks': start = subDays(today, 13); break;           // 14 天
            case 'month': start = subMonths(today, 1); break;
            case 'twoMonths': start = subMonths(today, 2); break;
            case 'threeMonths': start = subMonths(today, 3); break;
            case 'sixMonths': start = subMonths(today, 6); break;
            case 'year': start = subMonths(today, 12); break;
            case 'all': start = subMonths(today, 24); break;
            default: start = subDays(today, 6);                           // 預設 7 天
        }
        start.setHours(0, 0, 0, 0);
        setStartDate(start);
        setEndDate(today);
        setDateRangePreset(preset);
    };

    /**
     * Move date range one month backward.
     * Clears date range preset since it's now a custom range.
     */
    const handleMoveMonthBackward = () => {
        if (startDate && endDate) {
            setStartDate(subMonths(startDate, 1));
            setEndDate(subMonths(endDate, 1));
            setDateRangePreset(null);
        }
    };

    /**
     * Move date range one month forward.
     * Clears date range preset since it's now a custom range.
     */
    const handleMoveMonthForward = () => {
        if (startDate && endDate) {
            setStartDate(addMonths(startDate, 1));
            setEndDate(addMonths(endDate, 1));
            setDateRangePreset(null);
        }
    };

    /**
     * Force refresh all data by clearing cache and re-fetching.
     * Useful when user wants latest data or suspects stale cache.
     */
    const refreshData = useCallback(() => {
        if (selectedArea && startDate && endDate) {
            // Clear entire prediction cache to force fresh API calls
            setCachedPredictionsByModel({});
            fetchActualData();
            fetchPredictionData();
        }
    }, [selectedArea, startDate, endDate, fetchActualData, fetchPredictionData]);

    // ==========================================================================
    // Return Hook API
    // ==========================================================================

    return {
        // Data
        areas,
        models,
        calculatingDatesByModel,
        selectedArea,
        selectedModels,
        startDate,
        endDate,
        dateRangePreset,
        actualPrices,
        predictionsByModel,
        weatherActual,
        weatherForecast,
        imbalanceData,
        intradayData,
        interconnectionData,
        occtoAreaData,
        batteryData,
        bidPlansData,
        selectedSiteIds,
        setSelectedSiteIds,
        availableSiteIds,

        // Loading/Error
        isLoading,
        isFetchingPredictions,
        error,
        dataFetchWarnings,

        // Date setters
        setStartDate,
        setEndDate,
        setDateRangePreset,

        // Handlers
        handleAreaChange,
        handleModelChange,
        handleModelCalculatingDateChange,
        handleDateRangePreset,
        handleMoveMonthBackward,
        handleMoveMonthForward,
        refreshData,

        // Chart highlight
        highlightedModelId,
        setHighlightedModelId,
        focusedDataSource,
        setFocusedDataSource,

        // Data layer toggles
        showImbalance, setShowImbalance,
        showImbalanceQuantity, setShowImbalanceQuantity,
        showImbalanceSurplusRate, setShowImbalanceSurplusRate,
        showImbalanceDeficitRate, setShowImbalanceDeficitRate,
        showIntraday, setShowIntraday,
        showIntradayAverage, setShowIntradayAverage,
        showInterconnection, setShowInterconnection,
        showWeather, setShowWeather,
        showWeatherActual, setShowWeatherActual,
        showWeatherForecast, setShowWeatherForecast,
        showOcctoArea, setShowOcctoArea,
        showActualPrice, setShowActualPrice
    };
};