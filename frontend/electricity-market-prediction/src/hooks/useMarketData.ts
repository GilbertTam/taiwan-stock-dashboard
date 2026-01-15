import { useState, useEffect, useCallback } from 'react';
import { format, subDays, subMonths, addMonths } from 'date-fns';
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

    const [actualPrices, setActualPrices] = useState<AreaPrice[]>([]);
    const [predictionsByModel, setPredictionsByModel] = useState<{ [key: string]: PricePrediction[] }>({});
    const [weatherActual, setWeatherActual] = useState<WeatherData[]>([]);
    const [weatherForecast, setWeatherForecast] = useState<WeatherData[]>([]);
    const [imbalanceData, setImbalanceData] = useState<ImbalanceData[]>([]);
    const [intradayData, setIntradayData] = useState<IntradayData[]>([]);
    const [interconnectionData, setInterconnectionData] = useState<InterconnectionFlow[]>([]);
    const [occtoAreaData, setOcctoAreaData] = useState<OcctoAreaData[]>([]);

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

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

                if (areasData.length > 0) {
                    setSelectedArea(areasData[0].name);
                }

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
    }, [logout]);


    // Fetch Calculating Dates
    useEffect(() => {
        const fetchAllCalculatingDates = async () => {
            if (!selectedArea || selectedModels.length === 0 || !startDate || !endDate) return;

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
                    }))
                );

                const results = await Promise.all(datesPromises);

                const newCalculatingDatesByModel: { [key: string]: CalculatingDate[] } = {};
                results.forEach(result => {
                    newCalculatingDatesByModel[result.modelKey] = result.dates;
                });

                setCalculatingDatesByModel(newCalculatingDatesByModel);

                setSelectedModels(prev => prev.map(model => {
                    const modelKey = `${model.id}|${model.name}`;
                    const availableDates = newCalculatingDatesByModel[modelKey] || [];
                    if (model.calculatingDate !== 'latest' &&
                        !availableDates.some(d => d.calculating_date === model.calculatingDate)) {
                        return { ...model, calculatingDate: 'latest' };
                    }
                    return model;
                }));

            } catch (err: any) {
                console.error('獲取計算日期失敗', err);
                if (err.response && err.response.status === 401) {
                    setError('認證已過期，請重新登入');
                    setTimeout(() => logout(), 2000);
                }
            }
        };

        fetchAllCalculatingDates();
    }, [selectedArea, selectedModels.map(m => `${m.id}|${m.name}`).join(','), startDate, endDate, logout]);

    // Fetch Actual Data
    const fetchActualData = useCallback(async () => {
        if (!selectedArea || !startDate || !endDate) return;

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


            setActualPrices(actualData);
            setWeatherActual(weatherActualData);
            setWeatherForecast(weatherForecastData);
            setImbalanceData(imbalanceDataResult);
            setIntradayData(intradayDataResult);
            setInterconnectionData(interconnectionDataResult);
            setOcctoAreaData(occtoAreaDataResult);
        } catch (err: any) {
            console.error('獲取實際數據失敗', err);
            if (err.response && err.response.status === 401) {
                setError('認證已過期，請重新登入');
                setTimeout(() => logout(), 2000);
            } else {
                setError('獲取實際數據失敗');
            }
        } finally {
            setIsLoading(false);
        }
    }, [selectedArea, startDate, endDate, logout]);

    // Fetch Prediction Data
    const fetchPredictionData = useCallback(async () => {
        if (!selectedArea || selectedModels.length === 0 || !startDate || !endDate) {
            setPredictionsByModel({});
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const formattedStartDate = format(startDate, 'yyyyMMdd');
            const formattedEndDate = format(endDate, 'yyyyMMdd');
            const predictionsData: { [key: string]: PricePrediction[] } = {};

            await Promise.all(selectedModels.map(async (model) => {
                const modelKey = `${model.id}|${model.name}`;
                let modelPredictions;

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
            }));

            setPredictionsByModel(predictionsData);
        } catch (err: any) {
            console.error('獲取預測數據失敗', err);
            if (err.response && err.response.status === 401) {
                setError('認證已過期，請重新登入');
                setTimeout(() => logout(), 2000);
            } else {
                setError('獲取預測數據失敗');
            }
        } finally {
            setIsLoading(false);
        }
    }, [selectedArea, selectedModels, startDate, endDate, logout]);

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
            case 'week': start = subDays(today, 7); break;
            case 'twoWeeks': start = subDays(today, 14); break;
            case 'month': start = subMonths(today, 1); break;
            case 'threeMonths': start = subMonths(today, 3); break;
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
        error,
        setStartDate,
        setEndDate,
        setDateRangePreset,
        handleAreaChange,
        handleModelChange,
        handleModelCalculatingDateChange,
        handleDateRangePreset,
        handleMoveMonthBackward,
        handleMoveMonthForward
    };
};
