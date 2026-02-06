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
    fetchOcctoArea
} from '@/services/api';
import { Area, PredictionModel, AreaPrice, PricePrediction, CalculatingDate, WeatherData, ImbalanceData, IntradayData, InterconnectionFlow, OcctoAreaData } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { generateColor, hashString } from '@/utils/chartUtils';
import { SelectChangeEvent } from '@mui/material';
import { useUserPreferences } from './useUserPreferences';


export const useMarketData = () => {
    const { logout } = useAuth();

    // State
    const [areas, setAreas] = useState<Area[]>([]);
    const [models, setModels] = useState<PredictionModel[]>([]);
    const [calculatingDatesByModel, setCalculatingDatesByModel] = useState<{ [key: string]: CalculatingDate[] }>({});
    const [selectedArea, setSelectedArea] = useState<string>('');
    const [selectedModels, setSelectedModels] = useState<{
        id: string | number;
        name: string;
        color: string;
        calculatingDate: string;
    }[]>([]);

    const [startDate, setStartDate] = useState<Date | null>(subDays(new Date(), 7));
    const [endDate, setEndDate] = useState<Date | null>(new Date());
    const [dateRangePreset, setDateRangePreset] = useState<string | null>('week');

    // Debounce dates for fetching
    // Removed debounce as per user request to fetch on selection completion instead
    // const debouncedDateRange = useDebounce(dateRange, 500);

    const [actualPrices, setActualPrices] = useState<AreaPrice[]>([]);
    const [predictionsByModel, setPredictionsByModel] = useState<{ [key: string]: PricePrediction[] }>({});

    // Cache State
    const [cachedPredictionsByModel, setCachedPredictionsByModel] = useState<{ [key: string]: PricePrediction[] }>({});
    // Ref to hold the latest cache value for reading inside callbacks without dependency loops
    const cacheRef = useRef(cachedPredictionsByModel);

    const [weatherActual, setWeatherActual] = useState<WeatherData[]>([]);
    const [weatherForecast, setWeatherForecast] = useState<WeatherData[]>([]);
    const [imbalanceData, setImbalanceData] = useState<ImbalanceData[]>([]);
    const [intradayData, setIntradayData] = useState<IntradayData[]>([]);
    const [interconnectionData, setInterconnectionData] = useState<InterconnectionFlow[]>([]);
    const [occtoAreaData, setOcctoAreaData] = useState<OcctoAreaData[]>([]);

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isFetchingPredictions, setIsFetchingPredictions] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Highlighted model for chart focus - when set, other models fade out
    const [highlightedModelId, setHighlightedModelId] = useState<string | null>(null);

    // Focus states for data sources - when set, other sources fade out
    const [focusedDataSource, setFocusedDataSource] = useState<string | null>(null);

    // Data layer toggles - shared between sidebar and chart
    const [showImbalance, setShowImbalance] = useState<boolean>(false);
    const [showIntraday, setShowIntraday] = useState<boolean>(false);
    const [showIntradayAverage, setShowIntradayAverage] = useState<boolean>(true);
    const [showInterconnection, setShowInterconnection] = useState<boolean>(false);
    const [showWeather, setShowWeather] = useState<boolean>(false);
    const [showWeatherActual, setShowWeatherActual] = useState<boolean>(false);
    const [showWeatherForecast, setShowWeatherForecast] = useState<boolean>(false);
    const [showOcctoArea, setShowOcctoArea] = useState<boolean>(false);
    const [showActualPrice, setShowActualPrice] = useState<boolean>(true); // Default true - show actual price

    // Refs for race condition handling
    const latestActualDataRequestId = useRef<number>(0);
    const latestPredictionRequestId = useRef<number>(0);
    const latestCalcDateRequestId = useRef<number>(0);

    // User preferences hook
    const { loadPreferences, updatePreference } = useUserPreferences();
    const prefsLoadedRef = useRef(false);

    // Sync cache ref whenever state changes
    useEffect(() => {
        cacheRef.current = cachedPredictionsByModel;
    }, [cachedPredictionsByModel]);

    // Auto-save preferences when data layer toggles change
    useEffect(() => {
        if (!prefsLoadedRef.current) return; // Don't save during initial load
        updatePreference('showImbalance', showImbalance);
    }, [showImbalance, updatePreference]);

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

    // Auto-save area preference
    useEffect(() => {
        if (!prefsLoadedRef.current || !selectedArea) return;
        updatePreference('selectedArea', selectedArea);
    }, [selectedArea, updatePreference]);

    // Auto-save model preferences
    useEffect(() => {
        if (!prefsLoadedRef.current) return;
        updatePreference('selectedModels', selectedModels);
    }, [selectedModels, updatePreference]);

    // Initial Data Fetch
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

                // Load saved preferences
                const prefs = loadPreferences();

                // Apply area preference (or default to first area)
                if (prefs.selectedArea && areasData.some(a => a.name === prefs.selectedArea)) {
                    setSelectedArea(prefs.selectedArea);
                } else if (areasData.length > 0) {
                    setSelectedArea(areasData[0].name);
                }

                // Apply data layer preferences
                if (prefs.showImbalance !== undefined) setShowImbalance(prefs.showImbalance);
                if (prefs.showIntraday !== undefined) setShowIntraday(prefs.showIntraday);
                if (prefs.showIntradayAverage !== undefined) setShowIntradayAverage(prefs.showIntradayAverage);
                if (prefs.showInterconnection !== undefined) setShowInterconnection(prefs.showInterconnection);
                if (prefs.showOcctoArea !== undefined) setShowOcctoArea(prefs.showOcctoArea);

                // Apply model preferences (if valid)
                if (prefs.selectedModels && prefs.selectedModels.length > 0) {
                    // Filter to only include models that still exist
                    const validModels = prefs.selectedModels.filter(pm =>
                        modelsData.some(m => m.id === pm.id && m.name === pm.name)
                    );
                    if (validModels.length > 0) {
                        setSelectedModels(validModels);
                    }
                }

                // Mark preferences as loaded (enable auto-save)
                prefsLoadedRef.current = true;

            } catch (err: any) {
                console.error('獲取初始資料失敗', err);
                if (err.response && err.response.status === 401) {
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



    // Fetch Calculating Dates
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
                        return { modelKey: `${model.id}|${model.name}`, dates: [] }; // Return empty on error
                    })
                );

                const results = await Promise.all(datesPromises);

                // Race condition guard
                if (requestId !== latestCalcDateRequestId.current) return;

                const newCalculatingDatesByModel: { [key: string]: CalculatingDate[] } = {};
                results.forEach(result => {
                    newCalculatingDatesByModel[result.modelKey] = result.dates;
                });

                setCalculatingDatesByModel(newCalculatingDatesByModel);

                setSelectedModels(prev => {
                    let hasChanges = false;
                    const updatedModels = prev.map(model => {
                        const modelKey = `${model.id}|${model.name}`;
                        const availableDates = newCalculatingDatesByModel[modelKey] || [];
                        // Check if current calculating date is valid for the new range
                        if (model.calculatingDate !== 'latest' &&
                            !availableDates.some(d => d.calculating_date === model.calculatingDate)) {
                            hasChanges = true;
                            // Reset to latest if specific date is invalid in new range
                            return { ...model, calculatingDate: 'latest' };
                        }
                        return model;
                    });

                    return hasChanges ? updatedModels : prev;
                });

            } catch (err: any) {
                if (requestId !== latestCalcDateRequestId.current) return;
                console.error('獲取計算日期失敗', err);
                // Don't log out here to avoid interrupting UX on minor failures
            }
        };


        fetchAllCalculatingDates();
    }, [selectedArea, selectedModels.map(m => `${m.id}|${m.name}`).join(','), startDate, endDate, logout]);

    // Fetch Actual Data
    const fetchActualData = useCallback(async () => {
        if (!selectedArea || !startDate || !endDate) return;
        if (!isValid(startDate) || !isValid(endDate)) return;

        const requestId = ++latestActualDataRequestId.current;
        setIsLoading(true);
        setError(null);

        try {
            const formattedStartDate = format(startDate, 'yyyyMMdd');
            const formattedEndDate = format(endDate, 'yyyyMMdd');

            const [actualData, weatherActualData, weatherForecastData, imbalanceDataResult, intradayDataResult, interconnectionDataResult, occtoAreaDataResult] = await Promise.all([
                fetchActualPrices({ start_date: formattedStartDate, end_date: formattedEndDate, name: selectedArea }),
                fetchWeatherActual({ start_date: formattedStartDate, end_date: formattedEndDate, area_name: selectedArea }),
                fetchWeatherForecast({ start_date: formattedStartDate, end_date: formattedEndDate, area_name: selectedArea }),
                fetchImbalance({ start_date: formattedStartDate, end_date: formattedEndDate, area_name: selectedArea }).catch(e => { console.error(e); return []; }),
                fetchIntraday({ start_date: formattedStartDate, end_date: formattedEndDate, area_name: selectedArea }).catch(e => { console.error(e); return []; }),
                fetchInterconnectionFlows({ start_date: formattedStartDate, end_date: formattedEndDate }).catch(e => { console.error(e); return []; }),
                fetchOcctoArea({ start_date: formattedStartDate, end_date: formattedEndDate, area_name: selectedArea }).catch(e => { console.error(e); return []; })
            ]);

            if (requestId !== latestActualDataRequestId.current) return;

            setActualPrices(actualData);
            setWeatherActual(weatherActualData);
            setWeatherForecast(weatherForecastData);
            setImbalanceData(imbalanceDataResult);
            setIntradayData(intradayDataResult);
            setInterconnectionData(interconnectionDataResult);
            setOcctoAreaData(occtoAreaDataResult);
        } catch (err: any) {
            if (requestId !== latestActualDataRequestId.current) return;

            console.error('獲取實際數據失敗', err);
            if (err.response && err.response.status === 401) {
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

    // Fetch Prediction Data with caching
    // KEY FIX: Removed cachedPredictionsByModel from dependency array to prevent double-fetching loop
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
                model: typeof selectedModels[0];
                modelKey: string;
                cacheKey: string;
            }> = [];

            // KEY FIX: Use cacheRef.current to check cache without creating dependency
            const currentCache = cacheRef.current;

            selectedModels.forEach((model) => {
                const modelKey = `${model.id}|${model.name}`;
                const cacheKey = `${selectedArea}_${formattedStartDate}_${formattedEndDate}_${modelKey}_${model.calculatingDate}`;

                if (currentCache[cacheKey]) {
                    predictionsData[modelKey] = currentCache[cacheKey];
                } else {
                    modelsToFetch.push({ model, modelKey, cacheKey });
                }
            });

            if (modelsToFetch.length > 0) {
                // KEY FIX: Handle individual model failures so one bad request doesn't crash everything
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

                        // Only add to result if successful
                        predictionsData[modelKey] = modelPredictions;
                        newCacheEntries[cacheKey] = modelPredictions;
                    } catch (err) {
                        console.error(`Failed to fetch predictions for ${model.name}`, err);
                        // We intentionally don't re-throw here so other models can still load.
                        // You might want to track which models failed to show a specific error UI.
                    }
                }));

                if (requestId !== latestPredictionRequestId.current) return;

                if (Object.keys(newCacheEntries).length > 0) {
                    setCachedPredictionsByModel(prev => ({ ...prev, ...newCacheEntries }));
                }
            }

            if (requestId !== latestPredictionRequestId.current) return;

            setPredictionsByModel(predictionsData);
        } catch (err: any) {
            if (requestId !== latestPredictionRequestId.current) return;

            console.error('獲取預測數據失敗', err);
            // Only set global error if strictly needed, otherwise partial data is better
            if (err.response && err.response.status === 401) {
                setError('認證已過期，請重新登入');
                setTimeout(() => logout(), 2000);
            }
        } finally {
            if (requestId === latestPredictionRequestId.current) {
                setIsFetchingPredictions(false);
            }
        }
    }, [selectedArea, selectedModels, startDate, endDate, logout]); // Removed cachedPredictionsByModel

    // Clear cache when area or date range changes
    useEffect(() => {
        if (selectedArea && startDate && endDate && isValid(startDate) && isValid(endDate)) {
            const formattedStartDate = format(startDate, 'yyyyMMdd');
            const formattedEndDate = format(endDate, 'yyyyMMdd');

            setCachedPredictionsByModel(prev => {
                const newCache: { [key: string]: PricePrediction[] } = {};
                Object.keys(prev).forEach(key => {
                    if (key.startsWith(`${selectedArea}_${formattedStartDate}_${formattedEndDate}_`)) {
                        newCache[key] = prev[key];
                    }
                });
                return newCache;
            });
        }
    }, [selectedArea, startDate, endDate]);

    // Re-fetch when dependencies change
    useEffect(() => {
        if (selectedArea && startDate && endDate) {
            fetchActualData();
        }
    }, [selectedArea, startDate, endDate, fetchActualData]);

    useEffect(() => {
        if (selectedArea && selectedModels.length > 0 && startDate && endDate) {
            fetchPredictionData();
        } else {
            setPredictionsByModel({});
        }
    }, [selectedArea, selectedModels, startDate, endDate, fetchPredictionData]);

    // Handlers
    const handleAreaChange = (event: SelectChangeEvent) => {
        setSelectedArea(event.target.value);
    };

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
            const existingModel = selectedModels.find(m => m.id === id && m.name === name);
            if (existingModel) return existingModel;
            return { id, name, color: generateColor(hashString(modelValue)), calculatingDate: 'latest' };
        });
        setSelectedModels(newSelectedModels);
    };

    const handleModelCalculatingDateChange = (modelIndex: number, newCalculatingDate: string) => {
        setSelectedModels(prev => {
            const updated = [...prev];
            updated[modelIndex] = { ...updated[modelIndex], calculatingDate: newCalculatingDate };
            return updated;
        });
    };

    const handleDateRangePreset = (preset: string | null) => {
        if (!preset) {
            setDateRangePreset(null);
            return;
        }
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        let start: Date;
        switch (preset) {
            case '1D': start = subDays(today, 1); break;
            case 'week': start = subDays(today, 7); break;
            case 'twoWeeks': start = subDays(today, 14); break;
            case 'month': start = subMonths(today, 1); break;
            case 'threeMonths': start = subMonths(today, 3); break;
            case 'sixMonths': start = subMonths(today, 6); break;
            case 'year': start = subMonths(today, 12); break;
            case 'all': start = subMonths(today, 24); break; // Default to 2 years for "all"
            default: start = subDays(today, 7);
        }
        start.setHours(0, 0, 0, 0);
        setStartDate(start);
        setEndDate(today);
        setDateRangePreset(preset);
    };


    const handleMoveMonthBackward = () => {
        if (startDate && endDate) {
            setStartDate(subMonths(startDate, 1));
            setEndDate(subMonths(endDate, 1));
            setDateRangePreset(null);
        }
    };

    const handleMoveMonthForward = () => {
        if (startDate && endDate) {
            setStartDate(addMonths(startDate, 1));
            setEndDate(addMonths(endDate, 1));
            setDateRangePreset(null);
        }
    };

    const refreshData = useCallback(() => {
        if (selectedArea && startDate && endDate) {
            // Clear cache to force re-fetch
            const formattedStartDate = format(startDate, 'yyyyMMdd');
            const formattedEndDate = format(endDate, 'yyyyMMdd');

            // Optional: Only clear relevant cache to avoid wiping everything
            // But for simplicity, we can let the fetch logic handle it or just force execution.
            // Since fetchPredictionData checks cache, we should clear it for current View.

            // Actually, we can just clear the specific entries or all for now.
            setCachedPredictionsByModel({});

            fetchActualData();
            fetchPredictionData();
        }
    }, [selectedArea, startDate, endDate, fetchActualData, fetchPredictionData]);

    return {
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
        isLoading,
        isFetchingPredictions,
        error,
        setStartDate,
        setEndDate,
        setDateRangePreset,
        handleAreaChange,
        handleModelChange,
        handleModelCalculatingDateChange,
        handleDateRangePreset,
        handleMoveMonthBackward,
        handleMoveMonthForward,
        refreshData, // Expose refreshData
        // Model highlight
        highlightedModelId,
        setHighlightedModelId,
        // Data source focus
        focusedDataSource,
        setFocusedDataSource,
        // Data layer toggles
        showImbalance, setShowImbalance,
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