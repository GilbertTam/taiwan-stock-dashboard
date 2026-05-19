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
    fetchWeatherForecastDaily,
    fetchWeatherActualModels,
    fetchWeatherForecastModels,
    fetchImbalance,
    fetchIntraday,
    fetchInterconnectionFlows,
    fetchOcctoArea,
    fetchBatteryData,
    fetchBidPlans,
    fetchTdgc,
    fetchWeatherActualDaily,
    WeatherModelInfo,
    WeatherModelBasicInfo
} from '@/services';
import { Area, PredictionModel, AreaPrice, PricePrediction, CalculatingDate, WeatherData, WeatherDailyData, ImbalanceData, IntradayData, InterconnectionFlow, OcctoAreaData, BatteryData, BidPlanData, TdgcData } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { generateColor, hashString } from '@/utils/chartUtils';
import { SelectChangeEvent } from '@mui/material';
import { useUserPreferences } from './useUserPreferences';

/**
 * Scopes for data fetching to prevent unnecessary API calls
 */
export type DataScope = 'price' | 'weather' | 'grid' | 'batteryBid';

export type PageKey = 'dashboard' | 'forecast' | 'weather' | 'siteRevenue' | string;

export interface PageNeeds {
    scopes: Set<DataScope>;
    wantsPredictions: boolean;
}

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
    weatherActualDaily: WeatherDailyData[];
    weatherForecast: WeatherData[];
    weatherForecastDaily: WeatherDailyData[];
    weatherActualRaw: WeatherData[];
    weatherForecastRaw: WeatherData[];
    weatherModelsActual: WeatherModelBasicInfo[];
    weatherModelsForecast: WeatherModelBasicInfo[];
    selectedWeatherModelActual: string | null;
    setSelectedWeatherModelActual: React.Dispatch<React.SetStateAction<string | null>>;
    selectedWeatherModelForecast: string | null;
    setSelectedWeatherModelForecast: React.Dispatch<React.SetStateAction<string | null>>;
    imbalanceData: ImbalanceData[];
    intradayData: IntradayData[];
    interconnectionData: InterconnectionFlow[];
    occtoAreaData: OcctoAreaData[];
    batteryData: BatteryData[];
    bidPlansData: BidPlanData[];
    tdgcData: TdgcData[];
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
    /** Monotonically increasing counter; increments on every user date selection. */
    selectionVersion: number;
    /** Commit a new date range. Increments selectionVersion to force re-fetch. */
    commitDateSelection: (start: Date, end: Date, preset: string | null) => void;

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

    // Data Scopes & Page Needs
    activeScopes: Set<DataScope>;
    predictionsEnabled: boolean;
    registerPageNeeds: (pageKey: PageKey, scopes: Set<DataScope>, wantsPredictions: boolean) => void;
    unregisterPageNeeds: (pageKey: PageKey) => void;

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
    showTopBottomLabels: boolean;
    setShowTopBottomLabels: React.Dispatch<React.SetStateAction<boolean>>;
    topBottomPairs: number;
    setTopBottomPairs: React.Dispatch<React.SetStateAction<number>>;
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

    /**
     * Monotonically increasing counter. Increments on every user date selection,
     * even when startDate/endDate values are unchanged. Used to force re-fetches
     * for subset-range selections that would otherwise hit the same cache key.
     */
    const [selectionVersion, setSelectionVersion] = useState(0);
    const selectionVersionRef = useRef(0);

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

    /**
     * Page needs registration map
     */
    const [pageNeedsMap, setPageNeedsMap] = useState<Record<PageKey, PageNeeds>>({});

    /**
     * Active data scopes to determine which APIs to call, derived from pageNeedsMap
     */
    const activeScopes = useMemo(() => {
        const s = new Set<DataScope>();
        Object.values(pageNeedsMap).forEach(({ scopes }) => {
            scopes.forEach(v => s.add(v));
        });
        // Default to all scopes if no page has registered yet (fallback)
        if (s.size === 0 && Object.keys(pageNeedsMap).length === 0) {
            return new Set(['price', 'weather', 'grid', 'batteryBid'] as DataScope[]);
        }
        return s;
    }, [pageNeedsMap]);

    /**
     * Whether prediction fetching is enabled based on active pages
     */
    const predictionsEnabled = useMemo(() => {
        const pages = Object.values(pageNeedsMap);
        // Default to true if no pages have registered yet (fallback)
        if (pages.length === 0) return true;
        return pages.some(p => p.wantsPredictions);
    }, [pageNeedsMap]);

    const registerPageNeeds = useCallback((pageKey: PageKey, scopes: Set<DataScope>, wantsPredictions: boolean) => {
        setPageNeedsMap(prev => {
            // Avoid unnecessary state updates
            const existing = prev[pageKey];
            if (existing && existing.wantsPredictions === wantsPredictions &&
                existing.scopes.size === scopes.size &&
                Array.from(existing.scopes).every(s => scopes.has(s))) {
                return prev;
            }
            return {
                ...prev,
                [pageKey]: { scopes, wantsPredictions }
            };
        });
    }, []);

    const unregisterPageNeeds = useCallback((pageKey: PageKey) => {
        setPageNeedsMap(prev => {
            if (!prev[pageKey]) return prev;
            const next = { ...prev };
            delete next[pageKey];
            return next;
        });
    }, []);

    /**
     * Cache for actual data bundle to avoid redundant fetches on navigation
     */
    const actualDataCacheRef = useRef<Record<string, {
        scopes: Set<DataScope>;
        data: {
            actualPrices: AreaPrice[];
            weatherActual: WeatherData[];
            weatherActualDaily: WeatherDailyData[];
            weatherForecast: WeatherData[];
            weatherForecastDaily: WeatherDailyData[];
            imbalanceData: ImbalanceData[];
            intradayData: IntradayData[];
            interconnectionData: InterconnectionFlow[];
            occtoAreaData: OcctoAreaData[];
            batteryData: BatteryData[];
            bidPlansData: BidPlanData[];
            tdgcData: TdgcData[];
        }
    }>>({});

    /** Actual observed daily weather data */
    const [weatherActualDaily, setWeatherActualDaily] = useState<WeatherDailyData[]>([]);

    /** Weather forecast data */
    const [weatherForecast, setWeatherForecast] = useState<WeatherData[]>([]);

    /** Weather forecast daily data */
    const [weatherForecastDaily, setWeatherForecastDaily] = useState<WeatherDailyData[]>([]);

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

    /** TDGC (balancing market) data */
    const [tdgcData, setTdgcData] = useState<TdgcData[]>([]);

    /** Selected site IDs for bid plans filtering */
    const [selectedSiteIds, setSelectedSiteIds] = useState<Set<string>>(new Set());

    /** Available site IDs extracted from bid plans data */
    const availableSiteIds = useMemo(() => {
        if (!bidPlansData || bidPlansData.length === 0) return [];
        return Array.from(new Set(bidPlansData.map(d => d.site_id).filter(Boolean))).sort() as string[];
    }, [bidPlansData]);

    // Weather model selection
    const [weatherModelsActual, setWeatherModelsActual] = useState<WeatherModelBasicInfo[]>([]);
    const [weatherModelsForecast, setWeatherModelsForecast] = useState<WeatherModelBasicInfo[]>([]);
    const [selectedWeatherModelActual, setSelectedWeatherModelActual] = useState<string | null>(null);
    const [selectedWeatherModelForecast, setSelectedWeatherModelForecast] = useState<string | null>(null);

    /** Filtered weather actual data based on selected model */
    const filteredWeatherActual = useMemo(() => {
        if (!selectedWeatherModelActual) return weatherActual;
        return weatherActual.filter((d: any) => d.model === selectedWeatherModelActual);
    }, [weatherActual, selectedWeatherModelActual]);

    /** Filtered weather forecast data based on selected model */
    const filteredWeatherForecast = useMemo(() => {
        if (!selectedWeatherModelForecast) return weatherForecast;
        return weatherForecast.filter((d: any) => d.model === selectedWeatherModelForecast);
    }, [weatherForecast, selectedWeatherModelForecast]);

    /** Filtered weather actual daily data based on selected model */
    const filteredWeatherActualDaily = useMemo(() => {
        if (!selectedWeatherModelActual) return weatherActualDaily;
        return weatherActualDaily.filter((d: any) => d.model === selectedWeatherModelActual);
    }, [weatherActualDaily, selectedWeatherModelActual]);

    /** Filtered weather forecast daily data based on selected model */
    const filteredWeatherForecastDaily = useMemo(() => {
        if (!selectedWeatherModelForecast) return weatherForecastDaily;
        return weatherForecastDaily.filter((d: any) => d.model === selectedWeatherModelForecast);
    }, [weatherForecastDaily, selectedWeatherModelForecast]);

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
    const [showTopBottomLabels, setShowTopBottomLabels] = useState<boolean>(true);
    const [topBottomPairs, setTopBottomPairs] = useState<number>(3);

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

    const { loadPreferences, savePreferences } = useUserPreferences();
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

    // Batch save all preferences in a single effect to reduce localStorage I/O
    useEffect(() => {
        if (!prefsLoadedRef.current) return;
        const current = loadPreferences();
        const updated = {
            ...current,
            showImbalance,
            showImbalanceQuantity,
            showImbalanceSurplusRate,
            showImbalanceDeficitRate,
            showIntraday,
            showIntradayAverage,
            showInterconnection,
            showOcctoArea,
            ...(selectedArea ? { selectedArea } : {}),
            selectedModels,
            selectedWeatherModelActual,
            selectedWeatherModelForecast,
        };
        savePreferences(updated);
    }, [
        showImbalance, showImbalanceQuantity, showImbalanceSurplusRate,
        showImbalanceDeficitRate, showIntraday, showIntradayAverage,
        showInterconnection, showOcctoArea, selectedArea, selectedModels,
        selectedWeatherModelActual, selectedWeatherModelForecast,
        loadPreferences, savePreferences,
    ]);

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

                // Apply weather model preferences
                if (prefs.selectedWeatherModelActual !== undefined) {
                    setSelectedWeatherModelActual(prefs.selectedWeatherModelActual);
                }
                if (prefs.selectedWeatherModelForecast !== undefined) {
                    setSelectedWeatherModelForecast(prefs.selectedWeatherModelForecast);
                }

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
    // Effects: Fetch Weather Models
    // ==========================================================================

    /**
     * Fetch available weather models when area changes
     */
    useEffect(() => {
        if (!selectedArea) return;

        const fetchModels = async () => {
            try {
                const [actualModels, forecastModels] = await Promise.all([
                    fetchWeatherActualModels({ area_name: selectedArea }).catch(err => {
                        console.warn('Failed to fetch weather actual models:', err);
                        return [];
                    }),
                    fetchWeatherForecastModels({ area_name: selectedArea }).catch(err => {
                        console.warn('Failed to fetch weather forecast models:', err);
                        return [];
                    })
                ]);

                setWeatherModelsActual(actualModels);
                setWeatherModelsForecast(forecastModels);

                // Auto-select first model if none selected or current selection is invalid
                if (actualModels.length > 0) {
                    setSelectedWeatherModelActual(prev => {
                        if (!prev || !actualModels.some((m: any) => m.model === prev)) {
                            return actualModels[0].model;
                        }
                        return prev;
                    });
                }

                if (forecastModels.length > 0) {
                    setSelectedWeatherModelForecast(prev => {
                        if (!prev || !forecastModels.some((m: any) => m.model === prev)) {
                            return forecastModels[0].model;
                        }
                        return prev;
                    });
                }
            } catch (err) {
                console.warn('Failed to fetch weather models:', err);
                setWeatherModelsActual([]);
                setWeatherModelsForecast([]);
            }
        };

        fetchModels();
    }, [selectedArea]);

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

        const formattedStartDate = format(startDate, 'yyyyMMdd');
        const formattedEndDate = format(endDate, 'yyyyMMdd');
        const cacheKey = `${selectedArea}_${formattedStartDate}_${formattedEndDate}`;

        const existingCache = actualDataCacheRef.current[cacheKey];
        const scopesToFetch = new Set(Array.from(activeScopes).filter(scope => !existingCache?.scopes.has(scope)));

        // 1. Full Cache Hit
        if (scopesToFetch.size === 0 && existingCache) {
            if (activeScopes.has('price')) setActualPrices(existingCache.data.actualPrices);
            if (activeScopes.has('weather')) {
                setWeatherActual(existingCache.data.weatherActual);
                setWeatherActualDaily(existingCache.data.weatherActualDaily);
                setWeatherForecast(existingCache.data.weatherForecast);
                setWeatherForecastDaily(existingCache.data.weatherForecastDaily || []);
            }
            if (activeScopes.has('grid')) {
                setImbalanceData(existingCache.data.imbalanceData);
                setIntradayData(existingCache.data.intradayData);
                setInterconnectionData(existingCache.data.interconnectionData);
                setOcctoAreaData(existingCache.data.occtoAreaData);
            }
            if (activeScopes.has('batteryBid')) {
                setBatteryData(existingCache.data.batteryData);
                setBidPlansData(existingCache.data.bidPlansData);
            }
            return; // Everything we need is already cached
        }

        // 2. Cache Miss or Partial Hit: Fetch missing scopes
        const requestId = ++latestActualDataRequestId.current;
        setIsLoading(true);
        setError(null);
        setDataFetchWarnings([]);

        const failedLabels: string[] = [];

        const catchWithLabel = (label: string) => (e: unknown) => {
            console.warn(`[fetchActualData] ${label} 取得失敗:`, e);
            failedLabels.push(label);
            return [] as any;
        };

        try {
            const promises: Promise<any>[] = [];
            const indices: string[] = [];

            if (scopesToFetch.has('price')) {
                promises.push(fetchActualPrices({ start_date: formattedStartDate, end_date: formattedEndDate, name: selectedArea }).catch(catchWithLabel('現貨')));
                indices.push('price');
            }
            if (scopesToFetch.has('weather')) {
                promises.push(fetchWeatherActual({ start_date: formattedStartDate, end_date: formattedEndDate, area_name: selectedArea }).catch(catchWithLabel('天氣(實際)')));
                promises.push(fetchWeatherActualDaily({ start_date: formattedStartDate, end_date: formattedEndDate, area_name: selectedArea }).catch(catchWithLabel('天氣(實際日)')));
                promises.push(fetchWeatherForecast({ start_date: formattedStartDate, end_date: formattedEndDate, area_name: selectedArea }).catch(catchWithLabel('天氣(預報)')));
                promises.push(fetchWeatherForecastDaily({ start_date: formattedStartDate, end_date: formattedEndDate, area_name: selectedArea }).catch(catchWithLabel('天氣(預報日)')));
                indices.push('weatherActual', 'weatherActualDaily', 'weatherForecast', 'weatherForecastDaily');
            }
            if (scopesToFetch.has('grid')) {
                promises.push(fetchImbalance({ start_date: formattedStartDate, end_date: formattedEndDate, area_name: selectedArea }).catch(catchWithLabel('不平衡')));
                promises.push(fetchIntraday({ start_date: formattedStartDate, end_date: formattedEndDate, area_name: selectedArea }).catch(catchWithLabel('日前')));
                promises.push(fetchInterconnectionFlows({ start_date: formattedStartDate, end_date: formattedEndDate, interval_minutes: 30 }).catch(catchWithLabel('互連')));
                promises.push(fetchOcctoArea({ start_date: formattedStartDate, end_date: formattedEndDate, area_name: selectedArea }).catch(catchWithLabel('OCCTO 區域')));
                promises.push(fetchTdgc({ start_date: formattedStartDate, end_date: formattedEndDate, area_name: selectedArea }).catch(catchWithLabel('調整力')));
                indices.push('imbalance', 'intraday', 'interconnection', 'occtoArea', 'tdgc');
            }
            if (scopesToFetch.has('batteryBid')) {
                promises.push(fetchBatteryData({ start_date: formattedStartDate, end_date: formattedEndDate }).catch(catchWithLabel('電池')));
                promises.push(fetchBidPlans({ start_date: formattedStartDate, end_date: formattedEndDate }).catch(catchWithLabel('投標計畫')));
                indices.push('battery', 'bidPlans');
            }

            const results = await Promise.all(promises);

            if (requestId !== latestActualDataRequestId.current) return;

            // 3. Merge newly fetched data with existing cache
            const newData: Record<string, any> = { ...(existingCache?.data || {}) };
            indices.forEach((key, index) => {
                newData[key] = results[index];
            });

            // 4. Update states for active scopes
            if (activeScopes.has('price')) setActualPrices(newData['price'] || []);
            if (activeScopes.has('weather')) {
                setWeatherActual(newData['weatherActual'] || []);
                setWeatherActualDaily(newData['weatherActualDaily'] || []);
                setWeatherForecast(newData['weatherForecast'] || []);
                setWeatherForecastDaily(newData['weatherForecastDaily'] || []);
            }
            if (activeScopes.has('grid')) {
                setImbalanceData(newData['imbalance'] || []);
                setIntradayData(newData['intraday'] || []);
                setInterconnectionData(newData['interconnection'] || []);
                setOcctoAreaData(newData['occtoArea'] || []);
                setTdgcData(newData['tdgc'] || []);
            }
            if (activeScopes.has('batteryBid')) {
                setBatteryData(newData['battery'] || []);
                setBidPlansData(newData['bidPlans'] || []);
            }

            // 5. Update Cache
            const newScopes = new Set([...(existingCache?.scopes || []), ...scopesToFetch]);
            actualDataCacheRef.current[cacheKey] = {
                scopes: newScopes,
                data: {
                    actualPrices: newData['price'] || [],
                    weatherActual: newData['weatherActual'] || [],
                    weatherActualDaily: newData['weatherActualDaily'] || [],
                    weatherForecast: newData['weatherForecast'] || [],
                    weatherForecastDaily: newData['weatherForecastDaily'] || [],
                    imbalanceData: newData['imbalance'] || [],
                    intradayData: newData['intraday'] || [],
                    interconnectionData: newData['interconnection'] || [],
                    occtoAreaData: newData['occtoArea'] || [],
                    batteryData: newData['battery'] || [],
                    bidPlansData: newData['bidPlans'] || [],
                    tdgcData: newData['tdgc'] || [],
                }
            };

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
    }, [selectedArea, startDate, endDate, activeScopes, logout]);

    /**
     * Fetch prediction data with caching.
     *
     * Uses cacheRef to check cache without adding it to dependency array,
     * which prevents infinite re-fetch loops.
     */
    const fetchPredictionData = useCallback(async () => {
        if (!predictionsEnabled) {
            setPredictionsByModel({});
            setIsFetchingPredictions(false);
            return;
        }

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
    }, [predictionsEnabled, selectedArea, selectedModels, startDate, endDate, logout]);

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
     * Re-fetch actual data when area or date range changes.
     * selectionVersion is included to force re-fetch even when dates are structurally
     * identical to the previous selection (e.g., subset-range re-selection).
     */
    useEffect(() => {
        if (selectedArea && startDate && endDate) {
            fetchActualData();
        }
    }, [selectedArea, startDate, endDate, selectionVersion, fetchActualData]); // eslint-disable-line react-hooks/exhaustive-deps

    /**
     * Re-fetch predictions when area, models, date range, or prediction enablement changes.
     */
    useEffect(() => {
        if (!predictionsEnabled) {
            setPredictionsByModel({});
            return;
        }

        if (selectedArea && selectedModels.length > 0 && startDate && endDate) {
            fetchPredictionData();
        } else {
            setPredictionsByModel({});
        }
    }, [predictionsEnabled, selectedArea, selectedModels, startDate, endDate, selectionVersion, fetchPredictionData]); // eslint-disable-line react-hooks/exhaustive-deps

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
     * Commit a new date range selection. Increments selectionVersion so fetch
     * effects re-run even when startDate/endDate values are unchanged.
     * Both dates are normalized to 00:00:00.000 by the caller (DateRangePicker).
     */
    const commitDateSelection = useCallback((start: Date, end: Date, preset: string | null) => {
        selectionVersionRef.current += 1;
        const v = selectionVersionRef.current;
        setStartDate(start);
        setEndDate(end);
        setDateRangePreset(preset);
        setSelectionVersion(v);
    }, []);

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
        today.setHours(0, 0, 0, 0);
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
        commitDateSelection(start, today, preset);
    };

    /**
     * Move date range one month backward.
     * Clears date range preset since it's now a custom range.
     */
    const handleMoveMonthBackward = () => {
        if (startDate && endDate) {
            commitDateSelection(subMonths(startDate, 1), subMonths(endDate, 1), null);
        }
    };

    /**
     * Move date range one month forward.
     * Clears date range preset since it's now a custom range.
     */
    const handleMoveMonthForward = () => {
        if (startDate && endDate) {
            commitDateSelection(addMonths(startDate, 1), addMonths(endDate, 1), null);
        }
    };

    /**
     * Force refresh all data by clearing cache and incrementing selectionVersion.
     * Version increment causes fetch effects to re-run and the page-level version
     * watcher to reset simulation state.
     */
    const refreshData = useCallback(() => {
        if (selectedArea && startDate && endDate) {
            // Clear entire prediction cache to force fresh API calls
            setCachedPredictionsByModel({});
            // Clear actual data cache to force fresh API calls
            actualDataCacheRef.current = {};
            // Increment version so fetch effects re-run and page resets simulation
            commitDateSelection(startDate, endDate, dateRangePreset);
        }
    }, [selectedArea, startDate, endDate, dateRangePreset, commitDateSelection]);

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
        weatherActual: filteredWeatherActual,
        weatherActualDaily: filteredWeatherActualDaily,
        weatherForecast: filteredWeatherForecast,
        weatherForecastDaily: filteredWeatherForecastDaily,
        weatherActualRaw: weatherActual,
        weatherForecastRaw: weatherForecast,
        weatherModelsActual,
        weatherModelsForecast,
        selectedWeatherModelActual,
        setSelectedWeatherModelActual,
        selectedWeatherModelForecast,
        setSelectedWeatherModelForecast,
        imbalanceData,
        intradayData,
        interconnectionData,
        occtoAreaData,
        batteryData,
        bidPlansData,
        tdgcData,
        selectedSiteIds,
        setSelectedSiteIds,
        availableSiteIds,

        // Data Scopes & Page Needs
        activeScopes,
        predictionsEnabled,
        registerPageNeeds,
        unregisterPageNeeds,

        // Loading/Error
        isLoading,
        isFetchingPredictions,
        error,
        dataFetchWarnings,

        // Date setters
        setStartDate,
        setEndDate,
        setDateRangePreset,
        selectionVersion,
        commitDateSelection,

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
        showActualPrice, setShowActualPrice,
        showTopBottomLabels, setShowTopBottomLabels,
        topBottomPairs, setTopBottomPairs
    };
};