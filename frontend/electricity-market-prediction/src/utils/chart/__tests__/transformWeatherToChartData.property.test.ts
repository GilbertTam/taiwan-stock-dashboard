import fc from 'fast-check';
import { transformWeatherToChartData } from '../converters';
import { WeatherData } from '@/types/external';

/**
 * Feature: weather-forecast-models-and-chart
 * 
 * **Validates: Requirements 4.2**
 * 
 * Property 4: Weather Data Transformation
 * 
 * For any valid weather data input with hourly timestamps, the WeatherChartContainer
 * SHALL construct ChartDataPoint arrays where each point has a timestamp field and
 * all selected weather fields are present.
 */
describe('Property Test: Weather Data Transformation', () => {
    // Arbitrary for generating valid ISO 8601 timestamps
    const validTimestampArbitrary = fc.integer({
        min: new Date('2020-01-01T00:00:00Z').getTime(),
        max: new Date('2030-12-31T23:59:59Z').getTime()
    }).map(timestamp => new Date(timestamp).toISOString());

    // Arbitrary for generating weather field names
    const weatherFieldArbitrary = fc.constantFrom(
        'temperature_2m',
        'precipitation',
        'snowfall',
        'wind_speed_10m',
        'relative_humidity_2m',
        'cloud_cover',
        'sunshine_duration',
        'shortwave_radiation'
    );

    // Arbitrary for generating WeatherData records
    const weatherDataArbitrary = fc.record({
        datetime: validTimestampArbitrary,
        area: fc.constantFrom('Tokyo', 'Osaka', 'Nagoya'),
        temperature_2m: fc.option(fc.float({ min: -50, max: 50 }), { nil: null }),
        relative_humidity_2m: fc.option(fc.float({ min: 0, max: 100 }), { nil: null }),
        precipitation: fc.option(fc.float({ min: 0, max: 500 }), { nil: null }),
        rain: fc.option(fc.float({ min: 0, max: 500 }), { nil: null }),
        snowfall: fc.option(fc.float({ min: 0, max: 200 }), { nil: null }),
        wind_speed_10m: fc.option(fc.float({ min: 0, max: 100 }), { nil: null }),
        wind_direction_10m: fc.constantFrom('N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'),
        cloud_cover: fc.option(fc.float({ min: 0, max: 100 }), { nil: null }),
        shortwave_radiation: fc.option(fc.float({ min: 0, max: 1500 }), { nil: null }),
        sunshine_duration: fc.option(fc.float({ min: 0, max: 3600 }), { nil: null }),
        weather_code_jwa: fc.integer({ min: 0, max: 99 }),
        is_day: fc.constantFrom(0, 1),
        model: fc.constantFrom('jma', 'ecmwf', 'gfs')
    }) as fc.Arbitrary<WeatherData>;

    it('should always produce ChartDataPoint arrays with timestamp field for any valid weather data', () => {
        fc.assert(
            fc.property(
                fc.array(weatherDataArbitrary, { minLength: 0, maxLength: 100 }),
                fc.array(weatherFieldArbitrary, { minLength: 0, maxLength: 8 }).map(arr => new Set(arr)),
                (weatherData, selectedFields) => {
                    const result = transformWeatherToChartData(weatherData, selectedFields);

                    // Property: Every ChartDataPoint must have a timestamp field
                    result.forEach(point => {
                        expect(point.timestamp).toBeDefined();
                        expect(typeof point.timestamp).toBe('number');
                        expect(isNaN(point.timestamp)).toBe(false);
                    });
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should include all selected weather fields in each ChartDataPoint', () => {
        fc.assert(
            fc.property(
                fc.array(weatherDataArbitrary, { minLength: 1, maxLength: 50 }),
                fc.array(weatherFieldArbitrary, { minLength: 1, maxLength: 8 }).map(arr => new Set(arr)),
                (weatherData, selectedFields) => {
                    const result = transformWeatherToChartData(weatherData, selectedFields);

                    // Property: Every ChartDataPoint must have all selected weather fields
                    result.forEach(point => {
                        selectedFields.forEach(field => {
                            const fieldKey = `weather_${field}`;
                            // Field must be present (can be null, but must exist)
                            expect(fieldKey in point).toBe(true);
                        });
                    });
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should produce sorted ChartDataPoint arrays by timestamp ascending', () => {
        fc.assert(
            fc.property(
                fc.array(weatherDataArbitrary, { minLength: 2, maxLength: 50 }),
                fc.array(weatherFieldArbitrary, { minLength: 0, maxLength: 8 }).map(arr => new Set(arr)),
                (weatherData, selectedFields) => {
                    const result = transformWeatherToChartData(weatherData, selectedFields);

                    // Property: ChartDataPoints must be sorted by timestamp ascending
                    for (let i = 1; i < result.length; i++) {
                        expect(result[i].timestamp).toBeGreaterThanOrEqual(result[i - 1].timestamp);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should group weather data by timestamp correctly', () => {
        fc.assert(
            fc.property(
                fc.array(weatherDataArbitrary, { minLength: 1, maxLength: 50 }),
                fc.array(weatherFieldArbitrary, { minLength: 1, maxLength: 8 }).map(arr => new Set(arr)),
                (weatherData, selectedFields) => {
                    const result = transformWeatherToChartData(weatherData, selectedFields);

                    // Property: Number of unique timestamps in input should match output length
                    const uniqueTimestamps = new Set(
                        weatherData
                            .map(d => new Date(d.datetime).getTime())
                            .filter(ts => !isNaN(ts))
                    );
                    
                    expect(result.length).toBe(uniqueTimestamps.size);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should handle empty weather data gracefully', () => {
        fc.assert(
            fc.property(
                fc.array(weatherFieldArbitrary, { minLength: 0, maxLength: 8 }).map(arr => new Set(arr)),
                (selectedFields) => {
                    const result = transformWeatherToChartData([], selectedFields);

                    // Property: Empty input should produce empty output
                    expect(result).toHaveLength(0);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should handle empty selected fields gracefully', () => {
        fc.assert(
            fc.property(
                fc.array(weatherDataArbitrary, { minLength: 1, maxLength: 50 }),
                (weatherData) => {
                    const result = transformWeatherToChartData(weatherData, new Set());

                    // Property: With no selected fields, points should still have timestamp
                    result.forEach(point => {
                        expect(point.timestamp).toBeDefined();
                        expect(typeof point.timestamp).toBe('number');
                        
                        // Should not have any weather_ fields
                        const weatherFields = Object.keys(point).filter(k => k.startsWith('weather_'));
                        expect(weatherFields.length).toBe(0);
                    });
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should preserve null values for weather fields', () => {
        fc.assert(
            fc.property(
                fc.array(weatherDataArbitrary, { minLength: 1, maxLength: 50 }),
                fc.array(weatherFieldArbitrary, { minLength: 1, maxLength: 8 }).map(arr => new Set(arr)),
                (weatherData, selectedFields) => {
                    const result = transformWeatherToChartData(weatherData, selectedFields);

                    // Property: Null values in input should remain null in output
                    result.forEach(point => {
                        selectedFields.forEach(field => {
                            const fieldKey = `weather_${field}`;
                            const value = (point as any)[fieldKey];
                            
                            // Value should be either a number or null (not undefined)
                            expect(value === null || typeof value === 'number').toBe(true);
                        });
                    });
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should maintain timestamp uniqueness in output', () => {
        fc.assert(
            fc.property(
                fc.array(weatherDataArbitrary, { minLength: 1, maxLength: 50 }),
                fc.array(weatherFieldArbitrary, { minLength: 0, maxLength: 8 }).map(arr => new Set(arr)),
                (weatherData, selectedFields) => {
                    const result = transformWeatherToChartData(weatherData, selectedFields);

                    // Property: All timestamps in output should be unique
                    const timestamps = result.map(p => p.timestamp);
                    const uniqueTimestamps = new Set(timestamps);
                    
                    expect(timestamps.length).toBe(uniqueTimestamps.size);
                }
            ),
            { numRuns: 100 }
        );
    });
});
