import { useMemo } from 'react';
import { prepareChartData } from '@/utils/chartUtils';

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
        const getNormalizedKey = (dateStr: string) => {
            if (!dateStr) return '';
            try { return new Date(dateStr).toISOString(); }
            catch (e) { return dateStr; }
        };

        const processItem = (item: any, isForecast: boolean) => {
            if (!item.weather_datetime) return;
            const key = getNormalizedKey(item.weather_datetime);
            if (!dataMap.has(key)) {
                dataMap.set(key, {
                    time: key,
                    originalTime: item.weather_datetime,
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
            if (item.temperature !== null) data.temperature = item.temperature;
            if (item.rainfall !== null) data.rainfall = item.rainfall;
            if (item.snowfall !== null) data.snowfall = item.snowfall;
            if (item.wind_speed !== null) data.windSpeed = item.wind_speed;
            if (item.relative_humidity !== null) data.humidity = item.relative_humidity;
            if (item.clouds_all !== null) data.cloudCover = item.clouds_all;
        };

        weatherActual.forEach(item => processItem(item, false));
        weatherForecast.forEach(item => processItem(item, true));
        return Array.from(dataMap.values()).sort((a, b) => a.time.localeCompare(b.time));
    }, [weatherActual, weatherForecast]);

    const marketInfoWeatherChartData = useMemo(() => {
        const dataMap = new Map<string, any>();
        const getNormalizedKey = (dateStr: string) => {
            if (!dateStr) return '';
            try { return new Date(dateStr).toISOString(); }
            catch (e) { return dateStr; }
        };

        const processInfoItem = (item: any, type: 'actual' | 'forecast') => {
            const key = getNormalizedKey(item.weather_datetime);
            if (!dataMap.has(key)) {
                dataMap.set(key, {
                    weather_datetime: item.weather_datetime,
                    temperature_actual: null, rainfall_actual: null, wind_speed_actual: null,
                    temperature_forecast: null, rainfall_forecast: null, wind_speed_forecast: null,
                });
            }
            const existing = dataMap.get(key);
            existing[`temperature_${type}`] = item.temperature;
            existing[`rainfall_${type}`] = item.rainfall;
            existing[`wind_speed_${type}`] = item.wind_speed;
        };

        weatherActual.forEach(item => processInfoItem(item, 'actual'));
        weatherForecast.forEach(item => processInfoItem(item, 'forecast'));

        return Array.from(dataMap.values()).sort(
            (a, b) => new Date(a.weather_datetime).getTime() - new Date(b.weather_datetime).getTime()
        );
    }, [weatherActual, weatherForecast]);

    return {
        chartData,
        weatherChartData,
        marketInfoWeatherChartData,
    };
};
