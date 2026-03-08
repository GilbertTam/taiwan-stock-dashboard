import { transformWeatherToChartData } from '../converters';
import { WeatherData } from '@/types/external';

describe('transformWeatherToChartData', () => {
    it('should transform weather data to ChartDataPoint format', () => {
        const weatherData: WeatherData[] = [
            {
                datetime: '2024-01-15T10:00:00Z',
                area: 'Tokyo',
                temperature_2m: 15.5,
                relative_humidity_2m: 60,
                precipitation: 0,
                rain: 0,
                snowfall: 0,
                wind_speed_10m: 5.2,
                wind_direction_10m: 'N',
                cloud_cover: 30,
                shortwave_radiation: 500,
                weather_code_jwa: 1,
                is_day: 1,
                model: 'jma'
            },
            {
                datetime: '2024-01-15T11:00:00Z',
                area: 'Tokyo',
                temperature_2m: 16.2,
                relative_humidity_2m: 58,
                precipitation: 0,
                rain: 0,
                snowfall: 0,
                wind_speed_10m: 5.5,
                wind_direction_10m: 'N',
                cloud_cover: 25,
                shortwave_radiation: 550,
                weather_code_jwa: 1,
                is_day: 1,
                model: 'jma'
            }
        ];

        const selectedFields = new Set(['temperature_2m', 'wind_speed_10m', 'precipitation']);
        const result = transformWeatherToChartData(weatherData, selectedFields);

        expect(result).toHaveLength(2);
        expect(result[0].timestamp).toBe(new Date('2024-01-15T10:00:00Z').getTime());
        expect(result[0].dateTime).toMatch(/2024-01-15 \d{2}:\d{2}/);
        expect((result[0] as any).weather_temperature_2m).toBe(15.5);
        expect((result[0] as any).weather_wind_speed_10m).toBe(5.2);
        expect((result[0] as any).weather_precipitation).toBe(0);
        
        expect(result[1].timestamp).toBe(new Date('2024-01-15T11:00:00Z').getTime());
        expect((result[1] as any).weather_temperature_2m).toBe(16.2);
    });

    it('should group data by timestamp', () => {
        const weatherData: WeatherData[] = [
            {
                datetime: '2024-01-15T10:00:00Z',
                area: 'Tokyo',
                temperature_2m: 15.5,
                relative_humidity_2m: 60,
                precipitation: 0,
                rain: 0,
                snowfall: 0,
                wind_speed_10m: 5.2,
                wind_direction_10m: 'N',
                cloud_cover: 30,
                shortwave_radiation: 500,
                weather_code_jwa: 1,
                is_day: 1,
                model: 'jma'
            },
            {
                datetime: '2024-01-15T10:00:00Z',
                area: 'Tokyo',
                temperature_2m: 15.8,
                relative_humidity_2m: 62,
                precipitation: 0,
                rain: 0,
                snowfall: 0,
                wind_speed_10m: 5.0,
                wind_direction_10m: 'N',
                cloud_cover: 32,
                shortwave_radiation: 510,
                weather_code_jwa: 1,
                is_day: 1,
                model: 'ecmwf'
            }
        ];

        const selectedFields = new Set(['temperature_2m']);
        const result = transformWeatherToChartData(weatherData, selectedFields);

        // Should group by timestamp, so only 1 point
        expect(result).toHaveLength(1);
        // Last value should win (ecmwf model)
        expect((result[0] as any).weather_temperature_2m).toBe(15.8);
    });

    it('should sort by timestamp ascending', () => {
        const weatherData: WeatherData[] = [
            {
                datetime: '2024-01-15T12:00:00Z',
                area: 'Tokyo',
                temperature_2m: 17.0,
                relative_humidity_2m: 55,
                precipitation: 0,
                rain: 0,
                snowfall: 0,
                wind_speed_10m: 6.0,
                wind_direction_10m: 'N',
                cloud_cover: 20,
                shortwave_radiation: 600,
                weather_code_jwa: 1,
                is_day: 1,
                model: 'jma'
            },
            {
                datetime: '2024-01-15T10:00:00Z',
                area: 'Tokyo',
                temperature_2m: 15.5,
                relative_humidity_2m: 60,
                precipitation: 0,
                rain: 0,
                snowfall: 0,
                wind_speed_10m: 5.2,
                wind_direction_10m: 'N',
                cloud_cover: 30,
                shortwave_radiation: 500,
                weather_code_jwa: 1,
                is_day: 1,
                model: 'jma'
            }
        ];

        const selectedFields = new Set(['temperature_2m']);
        const result = transformWeatherToChartData(weatherData, selectedFields);

        expect(result).toHaveLength(2);
        expect(result[0].timestamp).toBeLessThan(result[1].timestamp);
        expect((result[0] as any).weather_temperature_2m).toBe(15.5);
        expect((result[1] as any).weather_temperature_2m).toBe(17.0);
    });

    it('should handle null values', () => {
        const weatherData: WeatherData[] = [
            {
                datetime: '2024-01-15T10:00:00Z',
                area: 'Tokyo',
                temperature_2m: null,
                relative_humidity_2m: 60,
                precipitation: null,
                rain: null,
                snowfall: null,
                wind_speed_10m: 5.2,
                wind_direction_10m: 'N',
                cloud_cover: 30,
                shortwave_radiation: 500,
                weather_code_jwa: 1,
                is_day: 1,
                model: 'jma'
            }
        ];

        const selectedFields = new Set(['temperature_2m', 'precipitation']);
        const result = transformWeatherToChartData(weatherData, selectedFields);

        expect(result).toHaveLength(1);
        expect((result[0] as any).weather_temperature_2m).toBeNull();
        expect((result[0] as any).weather_precipitation).toBeNull();
    });

    it('should skip invalid timestamps', () => {
        const weatherData: WeatherData[] = [
            {
                datetime: 'invalid-date',
                area: 'Tokyo',
                temperature_2m: 15.5,
                relative_humidity_2m: 60,
                precipitation: 0,
                rain: 0,
                snowfall: 0,
                wind_speed_10m: 5.2,
                wind_direction_10m: 'N',
                cloud_cover: 30,
                shortwave_radiation: 500,
                weather_code_jwa: 1,
                is_day: 1,
                model: 'jma'
            },
            {
                datetime: '2024-01-15T10:00:00Z',
                area: 'Tokyo',
                temperature_2m: 16.0,
                relative_humidity_2m: 58,
                precipitation: 0,
                rain: 0,
                snowfall: 0,
                wind_speed_10m: 5.5,
                wind_direction_10m: 'N',
                cloud_cover: 25,
                shortwave_radiation: 550,
                weather_code_jwa: 1,
                is_day: 1,
                model: 'jma'
            }
        ];

        const selectedFields = new Set(['temperature_2m']);
        const result = transformWeatherToChartData(weatherData, selectedFields);

        // Should skip invalid timestamp
        expect(result).toHaveLength(1);
        expect((result[0] as any).weather_temperature_2m).toBe(16.0);
    });

    it('should handle empty weather data', () => {
        const weatherData: WeatherData[] = [];
        const selectedFields = new Set(['temperature_2m']);
        const result = transformWeatherToChartData(weatherData, selectedFields);

        expect(result).toHaveLength(0);
    });

    it('should handle empty selected fields', () => {
        const weatherData: WeatherData[] = [
            {
                datetime: '2024-01-15T10:00:00Z',
                area: 'Tokyo',
                temperature_2m: 15.5,
                relative_humidity_2m: 60,
                precipitation: 0,
                rain: 0,
                snowfall: 0,
                wind_speed_10m: 5.2,
                wind_direction_10m: 'N',
                cloud_cover: 30,
                shortwave_radiation: 500,
                weather_code_jwa: 1,
                is_day: 1,
                model: 'jma'
            }
        ];

        const selectedFields = new Set<string>();
        const result = transformWeatherToChartData(weatherData, selectedFields);

        expect(result).toHaveLength(1);
        expect(result[0].timestamp).toBe(new Date('2024-01-15T10:00:00Z').getTime());
        // Should not have any weather_ fields
        expect((result[0] as any).weather_temperature_2m).toBeUndefined();
    });
});
