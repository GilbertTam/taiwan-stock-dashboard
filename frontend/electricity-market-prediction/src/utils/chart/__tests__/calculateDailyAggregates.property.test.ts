import fc from 'fast-check';
import { calculateDailyAggregates } from '../converters';
import { WeatherData } from '@/types/external';

/**
 * Feature: weather-forecast-models-and-chart
 * 
 * **Validates: Requirements 7.2, 7.4**
 * 
 * Property 10: Daily Aggregate Calculation
 * 
 * For any hourly weather data and selected field, the system SHALL calculate daily
 * aggregates (min, max, avg) by grouping records by date and computing statistics
 * from all hourly values for that date.
 */
describe('Property Test: Daily Aggregate Calculation', () => {
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

    it('should group records by date and field correctly', () => {
        fc.assert(
            fc.property(
                fc.array(weatherDataArbitrary, { minLength: 1, maxLength: 100 }),
                fc.array(weatherFieldArbitrary, { minLength: 1, maxLength: 8 }).map(arr => new Set(arr)),
                (weatherData, selectedFields) => {
                    const result = calculateDailyAggregates(weatherData, selectedFields);

                    // Property: Each aggregate should have a unique date-field combination
                    const keys = result.map(agg => `${agg.date}_${agg.field}`);
                    const uniqueKeys = new Set(keys);
                    expect(keys.length).toBe(uniqueKeys.size);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should calculate correct min value for each date-field group', () => {
        fc.assert(
            fc.property(
                fc.array(weatherDataArbitrary, { minLength: 1, maxLength: 100 }),
                fc.array(weatherFieldArbitrary, { minLength: 1, maxLength: 8 }).map(arr => new Set(arr)),
                (weatherData, selectedFields) => {
                    const result = calculateDailyAggregates(weatherData, selectedFields);

                    // Property: Min value should be the minimum of all hourly values for that date-field
                    result.forEach(agg => {
                        const date = agg.date;
                        const field = agg.field;

                        // Get all values for this date-field combination
                        const values = weatherData
                            .filter(record => {
                                const recordDate = record.datetime.split('T')[0].split(' ')[0];
                                return recordDate === date;
                            })
                            .map(record => (record as any)[field])
                            .filter((v: any) => v != null && typeof v === 'number' && !isNaN(v));

                        if (values.length > 0) {
                            const expectedMin = Math.min(...values);
                            expect(agg.min).toBe(expectedMin);
                        }
                    });
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should calculate correct max value for each date-field group', () => {
        fc.assert(
            fc.property(
                fc.array(weatherDataArbitrary, { minLength: 1, maxLength: 100 }),
                fc.array(weatherFieldArbitrary, { minLength: 1, maxLength: 8 }).map(arr => new Set(arr)),
                (weatherData, selectedFields) => {
                    const result = calculateDailyAggregates(weatherData, selectedFields);

                    // Property: Max value should be the maximum of all hourly values for that date-field
                    result.forEach(agg => {
                        const date = agg.date;
                        const field = agg.field;

                        // Get all values for this date-field combination
                        const values = weatherData
                            .filter(record => {
                                const recordDate = record.datetime.split('T')[0].split(' ')[0];
                                return recordDate === date;
                            })
                            .map(record => (record as any)[field])
                            .filter((v: any) => v != null && typeof v === 'number' && !isNaN(v));

                        if (values.length > 0) {
                            const expectedMax = Math.max(...values);
                            expect(agg.max).toBe(expectedMax);
                        }
                    });
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should calculate correct average value for each date-field group', () => {
        fc.assert(
            fc.property(
                fc.array(weatherDataArbitrary, { minLength: 1, maxLength: 100 }),
                fc.array(weatherFieldArbitrary, { minLength: 1, maxLength: 8 }).map(arr => new Set(arr)),
                (weatherData, selectedFields) => {
                    const result = calculateDailyAggregates(weatherData, selectedFields);

                    // Property: Avg value should be the average of all hourly values for that date-field
                    result.forEach(agg => {
                        const date = agg.date;
                        const field = agg.field;

                        // Get all values for this date-field combination
                        const values = weatherData
                            .filter(record => {
                                const recordDate = record.datetime.split('T')[0].split(' ')[0];
                                return recordDate === date;
                            })
                            .map(record => (record as any)[field])
                            .filter((v: any) => v != null && typeof v === 'number' && !isNaN(v));

                        if (values.length > 0) {
                            const expectedAvg = values.reduce((sum, v) => sum + v, 0) / values.length;
                            expect(agg.avg).toBeCloseTo(expectedAvg, 10);
                        }
                    });
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should calculate correct count for each date-field group', () => {
        fc.assert(
            fc.property(
                fc.array(weatherDataArbitrary, { minLength: 1, maxLength: 100 }),
                fc.array(weatherFieldArbitrary, { minLength: 1, maxLength: 8 }).map(arr => new Set(arr)),
                (weatherData, selectedFields) => {
                    const result = calculateDailyAggregates(weatherData, selectedFields);

                    // Property: Count should match the number of non-null hourly values for that date-field
                    // Only check aggregates that actually exist in the result
                    result.forEach(agg => {
                        const date = agg.date;
                        const field = agg.field;

                        // Count records for this specific date-field combination
                        // Must match the exact logic in calculateDailyAggregates
                        const count = weatherData.filter(record => {
                            // Extract date the same way as implementation
                            const recordDate = record.datetime.split('T')[0].split(' ')[0];
                            if (recordDate !== date) return false;

                            // Check if field has valid value
                            const value = (record as any)[field];
                            return value != null && typeof value === 'number' && !isNaN(value);
                        }).length;

                        expect(agg.count).toBe(count);
                    });
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should return sorted aggregates by date ascending', () => {
        fc.assert(
            fc.property(
                fc.array(weatherDataArbitrary, { minLength: 2, maxLength: 100 }),
                fc.array(weatherFieldArbitrary, { minLength: 1, maxLength: 8 }).map(arr => new Set(arr)),
                (weatherData, selectedFields) => {
                    const result = calculateDailyAggregates(weatherData, selectedFields);

                    // Property: Aggregates should be sorted by date ascending
                    for (let i = 1; i < result.length; i++) {
                        const dateCompare = result[i].date.localeCompare(result[i - 1].date);
                        expect(dateCompare).toBeGreaterThanOrEqual(0);
                    }
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
                    const result = calculateDailyAggregates([], selectedFields);

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
                    const result = calculateDailyAggregates(weatherData, new Set());

                    // Property: With no selected fields, should produce empty output
                    expect(result).toHaveLength(0);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should only include aggregates for fields with non-null values', () => {
        fc.assert(
            fc.property(
                fc.array(weatherDataArbitrary, { minLength: 1, maxLength: 100 }),
                fc.array(weatherFieldArbitrary, { minLength: 1, maxLength: 8 }).map(arr => new Set(arr)),
                (weatherData, selectedFields) => {
                    const result = calculateDailyAggregates(weatherData, selectedFields);

                    // Property: Each aggregate should have at least one non-null value (count > 0)
                    result.forEach(agg => {
                        expect(agg.count).toBeGreaterThan(0);
                    });
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should maintain min <= avg <= max invariant', () => {
        fc.assert(
            fc.property(
                fc.array(weatherDataArbitrary, { minLength: 1, maxLength: 100 }),
                fc.array(weatherFieldArbitrary, { minLength: 1, maxLength: 8 }).map(arr => new Set(arr)),
                (weatherData, selectedFields) => {
                    const result = calculateDailyAggregates(weatherData, selectedFields);

                    // Property: For each aggregate, min <= avg <= max
                    result.forEach(agg => {
                        expect(agg.min).toBeLessThanOrEqual(agg.avg);
                        expect(agg.avg).toBeLessThanOrEqual(agg.max);
                    });
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should handle single hourly value per day correctly', () => {
        fc.assert(
            fc.property(
                weatherFieldArbitrary,
                fc.float({ min: -100, max: 100, noNaN: true }),
                fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
                (field, value, date) => {
                    // Create a single weather data point
                    const weatherData: WeatherData[] = [{
                        datetime: date.toISOString(),
                        area: 'Tokyo',
                        temperature_2m: field === 'temperature_2m' ? value : null,
                        relative_humidity_2m: field === 'relative_humidity_2m' ? value : null,
                        precipitation: field === 'precipitation' ? value : null,
                        rain: null,
                        snowfall: field === 'snowfall' ? value : null,
                        wind_speed_10m: field === 'wind_speed_10m' ? value : null,
                        wind_direction_10m: 'N',
                        cloud_cover: field === 'cloud_cover' ? value : null,
                        shortwave_radiation: field === 'shortwave_radiation' ? value : null,
                        sunshine_duration: field === 'sunshine_duration' ? value : null,
                        weather_code_jwa: 0,
                        is_day: 1,
                        model: 'jma'
                    }];

                    const result = calculateDailyAggregates(weatherData, new Set([field]));

                    // Property: With single value, min = max = avg = value
                    // Use Object.is to handle -0 vs 0 correctly
                    expect(result).toHaveLength(1);
                    expect(Object.is(result[0].min, value) || result[0].min === value).toBe(true);
                    expect(Object.is(result[0].max, value) || result[0].max === value).toBe(true);
                    expect(Object.is(result[0].avg, value) || result[0].avg === value).toBe(true);
                    expect(result[0].count).toBe(1);
                }
            ),
            { numRuns: 100 }
        );
    });
});
