import fc from 'fast-check';
import { transformWeatherToChartData } from '../converters';
import { WeatherData } from '@/types/external';

/**
 * Feature: weather-forecast-models-and-chart
 * 
 * **Validates: Requirements 4.4**
 * 
 * Property 5: Time Axis Synchronization
 * 
 * For any set of selected weather fields on the unified chart, all series
 * SHALL share the same time axis with synchronized timestamps.
 */
describe('Property Test: Time Axis Synchronization', () => {
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

    it('should ensure all selected weather fields share the same timestamps', () => {
        fc.assert(
            fc.property(
                fc.array(weatherDataArbitrary, { minLength: 1, maxLength: 100 }),
                fc.array(weatherFieldArbitrary, { minLength: 2, maxLength: 8 }).map(arr => new Set(arr)),
                (weatherData, selectedFields) => {
                    // Skip if we don't have at least 2 fields to test synchronization
                    if (selectedFields.size < 2) return;

                    const result = transformWeatherToChartData(weatherData, selectedFields);

                    // Property: All selected weather fields must be present at every timestamp
                    result.forEach(point => {
                        selectedFields.forEach(field => {
                            const fieldKey = `weather_${field}`;
                            // Every selected field must exist at this timestamp
                            expect(fieldKey in point).toBe(true);
                        });
                    });
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should synchronize timestamps across all weather field series', () => {
        fc.assert(
            fc.property(
                fc.array(weatherDataArbitrary, { minLength: 1, maxLength: 100 }),
                fc.array(weatherFieldArbitrary, { minLength: 1, maxLength: 8 }).map(arr => new Set(arr)),
                (weatherData, selectedFields) => {
                    const result = transformWeatherToChartData(weatherData, selectedFields);

                    // Property: The set of timestamps should be identical for all weather fields
                    // This means if we extract timestamps for each field, they should all be the same
                    const timestamps = result.map(p => p.timestamp);
                    
                    selectedFields.forEach(field => {
                        const fieldKey = `weather_${field}`;
                        // Get all points where this field exists
                        const fieldTimestamps = result
                            .filter(p => fieldKey in p)
                            .map(p => p.timestamp);
                        
                        // The timestamps for this field should match the overall timestamps
                        expect(fieldTimestamps).toEqual(timestamps);
                    });
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should maintain time axis synchronization when combining data from multiple models', () => {
        fc.assert(
            fc.property(
                fc.array(weatherDataArbitrary, { minLength: 2, maxLength: 50 }),
                fc.array(weatherFieldArbitrary, { minLength: 1, maxLength: 8 }).map(arr => new Set(arr)),
                (weatherData, selectedFields) => {
                    const result = transformWeatherToChartData(weatherData, selectedFields);

                    // Property: When multiple weather records share the same timestamp,
                    // they should be merged into a single ChartDataPoint with all fields present
                    const timestampCounts = new Map<number, number>();
                    result.forEach(point => {
                        timestampCounts.set(point.timestamp, (timestampCounts.get(point.timestamp) || 0) + 1);
                    });

                    // Each timestamp should appear exactly once in the result
                    timestampCounts.forEach(count => {
                        expect(count).toBe(1);
                    });
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should preserve time axis synchronization regardless of input data order', () => {
        fc.assert(
            fc.property(
                fc.array(weatherDataArbitrary, { minLength: 2, maxLength: 50 }),
                fc.array(weatherFieldArbitrary, { minLength: 1, maxLength: 8 }).map(arr => new Set(arr)),
                (weatherData, selectedFields) => {
                    // Transform with original order
                    const result1 = transformWeatherToChartData(weatherData, selectedFields);

                    // Transform with shuffled order
                    const shuffled = [...weatherData].sort(() => Math.random() - 0.5);
                    const result2 = transformWeatherToChartData(shuffled, selectedFields);

                    // Property: The timestamps should be the same regardless of input order
                    const timestamps1 = result1.map(p => p.timestamp);
                    const timestamps2 = result2.map(p => p.timestamp);
                    
                    expect(timestamps1).toEqual(timestamps2);

                    // Property: All fields should be present at the same timestamps
                    result1.forEach((point1, index) => {
                        const point2 = result2[index];
                        selectedFields.forEach(field => {
                            const fieldKey = `weather_${field}`;
                            // Both points should have the same fields
                            expect(fieldKey in point1).toBe(fieldKey in point2);
                        });
                    });
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should ensure no gaps in time axis when all fields are selected', () => {
        fc.assert(
            fc.property(
                fc.array(weatherDataArbitrary, { minLength: 1, maxLength: 50 }),
                fc.array(weatherFieldArbitrary, { minLength: 1, maxLength: 8 }).map(arr => new Set(arr)),
                (weatherData, selectedFields) => {
                    const result = transformWeatherToChartData(weatherData, selectedFields);

                    // Property: Every unique timestamp in the input should appear in the output
                    const inputTimestamps = new Set(
                        weatherData
                            .map(d => new Date(d.datetime).getTime())
                            .filter(ts => !isNaN(ts))
                    );
                    
                    const outputTimestamps = new Set(result.map(p => p.timestamp));
                    
                    // All input timestamps should be in the output
                    inputTimestamps.forEach(ts => {
                        expect(outputTimestamps.has(ts)).toBe(true);
                    });
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should maintain consistent timestamp format across all weather fields', () => {
        fc.assert(
            fc.property(
                fc.array(weatherDataArbitrary, { minLength: 1, maxLength: 50 }),
                fc.array(weatherFieldArbitrary, { minLength: 1, maxLength: 8 }).map(arr => new Set(arr)),
                (weatherData, selectedFields) => {
                    const result = transformWeatherToChartData(weatherData, selectedFields);

                    // Property: All timestamps should be valid numbers (Unix milliseconds)
                    result.forEach(point => {
                        expect(typeof point.timestamp).toBe('number');
                        expect(isNaN(point.timestamp)).toBe(false);
                        expect(point.timestamp).toBeGreaterThan(0);
                    });
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should synchronize time axis even when some fields have null values', () => {
        fc.assert(
            fc.property(
                fc.array(weatherDataArbitrary, { minLength: 1, maxLength: 50 }),
                fc.array(weatherFieldArbitrary, { minLength: 2, maxLength: 8 }).map(arr => new Set(arr)),
                (weatherData, selectedFields) => {
                    // Skip if we don't have at least 2 fields
                    if (selectedFields.size < 2) return;

                    const result = transformWeatherToChartData(weatherData, selectedFields);

                    // Property: Even if some fields have null values, all fields should still
                    // be present at every timestamp (time axis is synchronized)
                    result.forEach(point => {
                        const fieldsPresent = Array.from(selectedFields).filter(field => {
                            const fieldKey = `weather_${field}`;
                            return fieldKey in point;
                        });

                        // All selected fields should be present
                        expect(fieldsPresent.length).toBe(selectedFields.size);
                    });
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should maintain time axis synchronization with mixed data from different areas', () => {
        fc.assert(
            fc.property(
                fc.array(weatherDataArbitrary, { minLength: 2, maxLength: 50 }),
                fc.array(weatherFieldArbitrary, { minLength: 1, maxLength: 8 }).map(arr => new Set(arr)),
                (weatherData, selectedFields) => {
                    const result = transformWeatherToChartData(weatherData, selectedFields);

                    // Property: When data from different areas share the same timestamp,
                    // they should be merged into a single point with synchronized time axis
                    const uniqueTimestamps = new Set(result.map(p => p.timestamp));
                    
                    // Each timestamp should appear exactly once
                    expect(result.length).toBe(uniqueTimestamps.size);

                    // All fields should be present at each timestamp
                    result.forEach(point => {
                        selectedFields.forEach(field => {
                            const fieldKey = `weather_${field}`;
                            expect(fieldKey in point).toBe(true);
                        });
                    });
                }
            ),
            { numRuns: 100 }
        );
    });
});
