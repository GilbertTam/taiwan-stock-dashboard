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
            const dt = item.datetime || item.weather_datetime;
            if (!dt) return;
            const key = getNormalizedKey(dt);
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

            // Map either new or old fields to be safe during transition
            const temp = item.temperature_2m ?? item.temperature;
            const rain = item.precipitation ?? item.rainfall;
            const snow = item.snowfall;
            const wind = item.wind_speed_10m ?? item.wind_speed;
            const humid = item.relative_humidity_2m ?? item.relative_humidity;
            const clouds = item.cloud_cover ?? item.clouds_all;

            if (temp !== null && temp !== undefined) data.temperature = temp;
            if (rain !== null && rain !== undefined) data.rainfall = rain;
            if (snow !== null && snow !== undefined) data.snowfall = snow;
            if (wind !== null && wind !== undefined) data.windSpeed = wind;
            if (humid !== null && humid !== undefined) data.humidity = humid;
            if (clouds !== null && clouds !== undefined) data.cloudCover = clouds;
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
            const dt = item.datetime || item.weather_datetime;
            if (!dt) return;
            const key = getNormalizedKey(dt);
            if (!dataMap.has(key)) {
                dataMap.set(key, {
                    weather_datetime: dt,
                    temperature_actual: null, rainfall_actual: null, wind_speed_actual: null,
                    temperature_forecast: null, rainfall_forecast: null, wind_speed_forecast: null,
                });
            }
            const existing = dataMap.get(key);
            existing[`temperature_${type}`] = item.temperature_2m ?? item.temperature;
            existing[`rainfall_${type}`] = item.precipitation ?? item.rainfall;
            existing[`wind_speed_${type}`] = item.wind_speed_10m ?? item.wind_speed;
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
