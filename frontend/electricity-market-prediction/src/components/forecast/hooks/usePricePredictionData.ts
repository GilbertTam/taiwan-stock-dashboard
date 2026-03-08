import { useMemo } from 'react';
import { prepareChartData } from '@/utils/chartUtils';
import { normalizeWeatherDatetimeToKey, mapWeatherFieldsToChart, normalizeWeatherItemToTimestamp } from '@/utils/chart/weatherChartData';
import { normalizeWeatherDatetimeToJST, parseToTimestamp } from '@/utils/chartUtils';

interface UsePricePredictionDataParams {
    actualPrices: any[];
    predictionsByModel: Record<string, any[]>;
    weatherActual: any[];
    weatherForecast: any[];
}

export const usePricePredictionData = ({
    actualPrices,
    predictionsByModel,
    weatherActual,
    weatherForecast,
}: UsePricePredictionDataParams) => {

    const chartData = useMemo(
        () => prepareChartData(actualPrices, predictionsByModel),
        [actualPrices, predictionsByModel]
    );

    const weatherChartData = useMemo(() => {
        const dataMap = new Map<string, any>();

        const processItem = (item: any, isForecast: boolean) => {
            const dt = item.datetime || item.weather_datetime;
            if (!dt) return;
            const key = normalizeWeatherDatetimeToKey(dt);
            if (!dataMap.has(key)) {
                dataMap.set(key, {
                    time: key,
                    originalTime: dt,
                    temperature: null,
                    rainfall: null,
                    snowfall: null,
                    windSpeed: null,
                    humidity: null,
                    cloudCover: null,
                    isForecast,
                });
            }
            const data = dataMap.get(key);

            // 使用共用欄位對應 / Use shared field mapping
            const mapped = mapWeatherFieldsToChart(item);
            if (mapped.temperature !== null) data.temperature = mapped.temperature;
            if (mapped.rainfall !== null) data.rainfall = mapped.rainfall;
            if (mapped.snowfall !== null) data.snowfall = mapped.snowfall;
            if (mapped.windSpeed !== null) data.windSpeed = mapped.windSpeed;
            if (mapped.humidity !== null) data.humidity = mapped.humidity;
            if (mapped.cloudCover !== null) data.cloudCover = mapped.cloudCover;
        };

        weatherActual.forEach(item => processItem(item, false));
        weatherForecast.forEach(item => processItem(item, true));
        return Array.from(dataMap.values()).sort((a, b) => a.time.localeCompare(b.time));
    }, [weatherActual, weatherForecast]);

    const marketInfoWeatherChartData = useMemo(() => {
        const dataMap = new Map<string, any>();

        const processInfoItem = (item: any, type: 'actual' | 'forecast') => {
            const dt = item.datetime || item.weather_datetime;
            if (!dt) return;
            const key = normalizeWeatherDatetimeToKey(dt);
            if (!dataMap.has(key)) {
                dataMap.set(key, {
                    weather_datetime: dt,
                    temperature_actual: null, rainfall_actual: null, wind_speed_actual: null,
                    temperature_forecast: null, rainfall_forecast: null, wind_speed_forecast: null,
                });
            }
            const existing = dataMap.get(key);

            // 使用共用欄位對應 / Use shared field mapping
            const mapped = mapWeatherFieldsToChart(item);
            existing[`temperature_${type}`] = mapped.temperature;
            existing[`rainfall_${type}`] = mapped.rainfall;
            existing[`wind_speed_${type}`] = mapped.windSpeed;
        };

        weatherActual.forEach(item => processInfoItem(item, 'actual'));
        weatherForecast.forEach(item => processInfoItem(item, 'forecast'));

        return Array.from(dataMap.values()).sort(
            (a, b) => {
                const tsA = normalizeWeatherItemToTimestamp(a.weather_datetime) || 0;
                const tsB = normalizeWeatherItemToTimestamp(b.weather_datetime) || 0;
                return tsA - tsB;
            }
        );
    }, [weatherActual, weatherForecast]);

    return {
        chartData,
        weatherChartData,
        marketInfoWeatherChartData,
    };
};
