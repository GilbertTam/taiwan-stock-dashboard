import fc from 'fast-check';
import { parseWeatherData } from '../converters';

/**
 * Feature: weather-forecast-models-and-chart
 * 
 * **Validates: Requirements 11.2**
 * 
 * Property 12: Weather Data Parsing with Invalid Timestamps
 * 
 * For any weather data input containing invalid timestamps (non-ISO8601 format or 
 * unparseable dates), the Weather_Data_Parser SHALL return a descriptive error 
 * indicating which timestamp is invalid.
 */
describe('parseWeatherData - Property 12: Invalid Timestamp Handling', () => {
    it('should return descriptive error for invalid timestamp formats', () => {
        fc.assert(
            fc.property(
                // Generate invalid timestamp strings
                fc.oneof(
                    fc.constant('invalid-date'),
                    fc.constant('2024-13-01T10:00:00Z'), // Invalid month
                    fc.constant('2024-01-32T10:00:00Z'), // Invalid day
                    fc.constant('2024-01-01T25:00:00Z'), // Invalid hour
                    fc.constant('01/15/2024 10:00:00'), // Wrong format
                    fc.constant('2024/01/15T10:00:00Z'), // Wrong separator
                    fc.constant(''), // Empty string
                    fc.integer(), // Not a string
                    fc.constant(null), // Null
                    fc.constant(undefined) // Undefined
                ),
                fc.string(), // Valid model identifier
                fc.nat({ max: 10 }), // Array index
                (invalidTimestamp, model, index) => {
                    // Create array with invalid timestamp at specific index
                    const validRecords = Array.from({ length: index }, (_, i) => ({
                        datetime: '2024-01-15T10:00:00Z',
                        model: `model_${i}`,
                        area: 'Tokyo',
                        temperature_2m: 20,
                        relative_humidity_2m: 60,
                        precipitation: 0,
                        rain: 0,
                        snowfall: 0,
                        wind_speed_10m: 5,
                        wind_direction_10m: 'N',
                        cloud_cover: 50,
                        shortwave_radiation: 100,
                        weather_code_jwa: 1,
                        is_day: 1
                    }));

                    const invalidRecord = {
                        datetime: invalidTimestamp,
                        model: model || 'test_model',
                        area: 'Tokyo',
                        temperature_2m: 20,
                        relative_humidity_2m: 60,
                        precipitation: 0,
                        rain: 0,
                        snowfall: 0,
                        wind_speed_10m: 5,
                        wind_direction_10m: 'N',
                        cloud_cover: 50,
                        shortwave_radiation: 100,
                        weather_code_jwa: 1,
                        is_day: 1
                    };

                    const apiResponse = [...validRecords, invalidRecord];
                    const result = parseWeatherData(apiResponse);

                    // Property: Parser must return failure for invalid timestamps
                    expect(result.success).toBe(false);

                    // Property: Error message must be descriptive
                    expect(result.error).toBeDefined();
                    expect(typeof result.error).toBe('string');

                    // Property: Error message should indicate the problem
                    // (either missing, wrong type, or invalid format)
                    const errorLower = result.error!.toLowerCase();
                    const hasRelevantError =
                        errorLower.includes('timestamp') ||
                        errorLower.includes('datetime') ||
                        errorLower.includes('missing') ||
                        errorLower.includes('invalid') ||
                        errorLower.includes('format');

                    expect(hasRelevantError).toBe(true);

                    // Property: Error should reference the index where error occurred
                    expect(result.error).toContain(`${index}`);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should accept valid ISO8601 timestamps in various formats', () => {
        fc.assert(
            fc.property(
                // Generate valid ISO8601 timestamps
                fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
                fc.string({ minLength: 1 }), // Valid model identifier
                (date, model) => {
                    // Skip invalid dates that fast-check might generate
                    fc.pre(!isNaN(date.getTime()));

                    // Test multiple valid ISO8601 formats
                    const formats = [
                        date.toISOString(), // YYYY-MM-DDTHH:mm:ss.sssZ
                        date.toISOString().replace('.000Z', 'Z'), // YYYY-MM-DDTHH:mm:ssZ
                        date.toISOString().replace('Z', ''), // YYYY-MM-DDTHH:mm:ss.sss
                        date.toISOString().replace('.000Z', ''), // YYYY-MM-DDTHH:mm:ss
                        // Space instead of T (common in databases)
                        date.toISOString().replace('T', ' ').replace('.000Z', '')
                    ];

                    formats.forEach(timestamp => {
                        const apiResponse = [{
                            datetime: timestamp,
                            model: model,
                            area: 'Tokyo',
                            temperature_2m: 20,
                            relative_humidity_2m: 60,
                            precipitation: 0,
                            rain: 0,
                            snowfall: 0,
                            wind_speed_10m: 5,
                            wind_direction_10m: 'N',
                            cloud_cover: 50,
                            shortwave_radiation: 100,
                            weather_code_jwa: 1,
                            is_day: 1
                        }];

                        const result = parseWeatherData(apiResponse);

                        // Property: Valid ISO8601 timestamps should parse successfully
                        expect(result.success).toBe(true);
                        expect(result.data).toBeDefined();
                        expect(result.data!.length).toBe(1);
                        expect(result.data![0].datetime).toBe(timestamp);
                    });
                }
            ),
            { numRuns: 50 }
        );
    });

    it('should handle mixed valid and invalid timestamps correctly', () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        datetime: fc.date({
                            min: new Date('2000-01-01T00:00:00Z'),
                            max: new Date('2099-12-31T23:59:59Z')
                        }).filter(d => !isNaN(d.getTime())).map(d => d.toISOString()),
                        model: fc.string({ minLength: 1 })
                    }),
                    { minLength: 1, maxLength: 5 }
                ),
                fc.nat(), // Index to insert invalid record
                (validRecords, invalidIndex) => {
                    const index = invalidIndex % (validRecords.length + 1);

                    // Build API response with invalid record at specific position
                    const apiResponse = validRecords.map(r => ({
                        datetime: r.datetime,
                        model: r.model,
                        area: 'Tokyo',
                        temperature_2m: 20,
                        relative_humidity_2m: 60,
                        precipitation: 0,
                        rain: 0,
                        snowfall: 0,
                        wind_speed_10m: 5,
                        wind_direction_10m: 'N',
                        cloud_cover: 50,
                        shortwave_radiation: 100,
                        weather_code_jwa: 1,
                        is_day: 1
                    }));

                    // Insert invalid record
                    apiResponse.splice(index, 0, {
                        datetime: 'INVALID_TIMESTAMP',
                        model: 'test_model',
                        area: 'Tokyo',
                        temperature_2m: 20,
                        relative_humidity_2m: 60,
                        precipitation: 0,
                        rain: 0,
                        snowfall: 0,
                        wind_speed_10m: 5,
                        wind_direction_10m: 'N',
                        cloud_cover: 50,
                        shortwave_radiation: 100,
                        weather_code_jwa: 1,
                        is_day: 1
                    });

                    const result = parseWeatherData(apiResponse);

                    // Property: One invalid timestamp should fail entire parse
                    expect(result.success).toBe(false);

                    // Property: Error should indicate the position of invalid record
                    expect(result.error).toBeDefined();
                    expect(result.error).toContain('Invalid timestamp format');
                    expect(result.error).toContain(`index ${index}`);
                }
            ),
            { numRuns: 100 }
        );
    });
});
