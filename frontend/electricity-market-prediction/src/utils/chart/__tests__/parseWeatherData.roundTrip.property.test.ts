import fc from 'fast-check';
import { parseWeatherData, formatWeatherData } from '../converters';

/**
 * Feature: weather-forecast-models-and-chart
 * 
 * **Validates: Requirements 11.4**
 * 
 * Property 13: Weather Data Round-Trip
 * 
 * For any valid Weather_Field object, the sequence of operations format(parse(data)) 
 * SHALL produce data equivalent to the original input, preserving all field values 
 * and structure.
 */
describe('parseWeatherData - Property 13: Round-Trip Consistency', () => {
    // Arbitrary for generating valid weather data
    const weatherDataArbitrary = fc.array(
        fc.record({
            datetime: fc.date({ 
                min: new Date('2020-01-01'), 
                max: new Date('2025-12-31') 
            })
            .filter(d => !isNaN(d.getTime())) // Filter out invalid dates
            .map(d => d.toISOString()),
            area: fc.constantFrom('Tokyo', 'Osaka', 'Nagoya', 'Fukuoka'),
            model: fc.constantFrom('jma', 'ecmwf', 'gfs', 'icon'),
            temperature_2m: fc.option(fc.float({ min: -30, max: 50 }), { nil: null }),
            relative_humidity_2m: fc.option(fc.float({ min: 0, max: 100 }), { nil: null }),
            precipitation: fc.option(fc.float({ min: 0, max: 200 }), { nil: null }),
            rain: fc.option(fc.float({ min: 0, max: 200 }), { nil: null }),
            snowfall: fc.option(fc.float({ min: 0, max: 100 }), { nil: null }),
            wind_speed_10m: fc.option(fc.float({ min: 0, max: 50 }), { nil: null }),
            wind_direction_10m: fc.constantFrom('N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'),
            cloud_cover: fc.option(fc.float({ min: 0, max: 100 }), { nil: null }),
            shortwave_radiation: fc.option(fc.float({ min: 0, max: 1000 }), { nil: null }),
            weather_code_jwa: fc.option(fc.integer({ min: 0, max: 99 }), { nil: null }),
            is_day: fc.option(fc.constantFrom(0, 1), { nil: null }),
            // Optional fields
            area_ch: fc.option(fc.string(), { nil: undefined }),
            city: fc.option(fc.string(), { nil: undefined }),
            apparent_temperature: fc.option(fc.float({ min: -30, max: 50 }), { nil: null }),
            dew_point_2m: fc.option(fc.float({ min: -30, max: 50 }), { nil: null }),
            pressure_msl: fc.option(fc.float({ min: 900, max: 1100 }), { nil: null }),
            surface_pressure: fc.option(fc.float({ min: 900, max: 1100 }), { nil: null }),
            wind_gusts_10m: fc.option(fc.float({ min: 0, max: 100 }), { nil: null }),
            snow_depth: fc.option(fc.float({ min: 0, max: 500 }), { nil: null }),
            soil_temperature_0_to_7cm: fc.option(fc.float({ min: -10, max: 40 }), { nil: null }),
            soil_moisture_0_to_7cm: fc.option(fc.float({ min: 0, max: 1 }), { nil: null }),
            sunshine_duration: fc.option(fc.float({ min: 0, max: 3600 }), { nil: null }),
            daylight_duration: fc.option(fc.float({ min: 0, max: 86400 }), { nil: null }),
            precipitation_hours: fc.option(fc.float({ min: 0, max: 24 }), { nil: null })
        }),
        { minLength: 1, maxLength: 20 }
    );

    it('should preserve data through parse -> format -> parse cycle', () => {
        fc.assert(
            fc.property(
                weatherDataArbitrary,
                (originalData) => {
                    // First parse
                    const parseResult1 = parseWeatherData(originalData);
                    
                    // Property: Valid data should parse successfully
                    expect(parseResult1.success).toBe(true);
                    expect(parseResult1.data).toBeDefined();
                    
                    // Format the parsed data
                    const formatted = formatWeatherData(parseResult1.data!);
                    
                    // Parse again
                    const parseResult2 = parseWeatherData(formatted);
                    
                    // Property: Formatted data should parse successfully
                    expect(parseResult2.success).toBe(true);
                    expect(parseResult2.data).toBeDefined();
                    
                    // Property: Round-trip should preserve all data
                    expect(parseResult2.data).toEqual(parseResult1.data);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should preserve null values through round-trip', () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        datetime: fc.date({ 
                            min: new Date('2020-01-01'), 
                            max: new Date('2025-12-31') 
                        })
                        .filter(d => !isNaN(d.getTime()))
                        .map(d => d.toISOString()),
                        area: fc.string(),
                        model: fc.string({ minLength: 1 }),
                        // All optional fields as null
                        temperature_2m: fc.constant(null),
                        relative_humidity_2m: fc.constant(null),
                        precipitation: fc.constant(null),
                        rain: fc.constant(null),
                        snowfall: fc.constant(null),
                        wind_speed_10m: fc.constant(null),
                        wind_direction_10m: fc.string(),
                        cloud_cover: fc.constant(null),
                        shortwave_radiation: fc.constant(null),
                        weather_code_jwa: fc.constant(null),
                        is_day: fc.constant(null)
                    }),
                    { minLength: 1, maxLength: 10 }
                ),
                (originalData) => {
                    const parseResult1 = parseWeatherData(originalData);
                    expect(parseResult1.success).toBe(true);
                    
                    const formatted = formatWeatherData(parseResult1.data!);
                    const parseResult2 = parseWeatherData(formatted);
                    
                    expect(parseResult2.success).toBe(true);
                    
                    // Property: Null values should be preserved
                    parseResult2.data!.forEach((record, index) => {
                        expect(record.temperature_2m).toBeNull();
                        expect(record.relative_humidity_2m).toBeNull();
                        expect(record.precipitation).toBeNull();
                        expect(record.rain).toBeNull();
                        expect(record.snowfall).toBeNull();
                        expect(record.wind_speed_10m).toBeNull();
                        expect(record.cloud_cover).toBeNull();
                        expect(record.shortwave_radiation).toBeNull();
                        expect(record.weather_code_jwa).toBeNull();
                        expect(record.is_day).toBeNull();
                    });
                }
            ),
            { numRuns: 50 }
        );
    });

    it('should preserve array length through round-trip', () => {
        fc.assert(
            fc.property(
                weatherDataArbitrary,
                (originalData) => {
                    const parseResult1 = parseWeatherData(originalData);
                    expect(parseResult1.success).toBe(true);
                    
                    const formatted = formatWeatherData(parseResult1.data!);
                    const parseResult2 = parseWeatherData(formatted);
                    
                    expect(parseResult2.success).toBe(true);
                    
                    // Property: Array length should be preserved
                    expect(parseResult2.data!.length).toBe(originalData.length);
                    expect(parseResult2.data!.length).toBe(parseResult1.data!.length);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should preserve field types through round-trip', () => {
        fc.assert(
            fc.property(
                weatherDataArbitrary,
                (originalData) => {
                    const parseResult1 = parseWeatherData(originalData);
                    expect(parseResult1.success).toBe(true);
                    
                    const formatted = formatWeatherData(parseResult1.data!);
                    const parseResult2 = parseWeatherData(formatted);
                    
                    expect(parseResult2.success).toBe(true);
                    
                    // Property: Field types should be preserved
                    parseResult2.data!.forEach((record, index) => {
                        expect(typeof record.datetime).toBe('string');
                        expect(typeof record.area).toBe('string');
                        expect(typeof record.model).toBe('string');
                        expect(typeof record.wind_direction_10m).toBe('string');
                        
                        // Numeric fields should be number or null
                        const numericFields = [
                            'temperature_2m', 'relative_humidity_2m', 'precipitation',
                            'rain', 'snowfall', 'wind_speed_10m', 'cloud_cover',
                            'shortwave_radiation', 'weather_code_jwa', 'is_day'
                        ];
                        
                        numericFields.forEach(field => {
                            const value = (record as any)[field];
                            expect(value === null || typeof value === 'number').toBe(true);
                        });
                    });
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should handle empty arrays through round-trip', () => {
        const emptyData: any[] = [];
        
        const parseResult1 = parseWeatherData(emptyData);
        expect(parseResult1.success).toBe(true);
        expect(parseResult1.data).toEqual([]);
        
        const formatted = formatWeatherData(parseResult1.data!);
        expect(formatted).toEqual([]);
        
        const parseResult2 = parseWeatherData(formatted);
        expect(parseResult2.success).toBe(true);
        expect(parseResult2.data).toEqual([]);
    });

    it('should preserve timestamp precision through round-trip', () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        datetime: fc.date({ 
                            min: new Date('2020-01-01'), 
                            max: new Date('2025-12-31') 
                        })
                        .filter(d => !isNaN(d.getTime()))
                        .map(d => d.toISOString()), // Includes milliseconds
                        area: fc.string(),
                        model: fc.string({ minLength: 1 }),
                        temperature_2m: fc.float(),
                        relative_humidity_2m: fc.float(),
                        precipitation: fc.float(),
                        rain: fc.float(),
                        snowfall: fc.float(),
                        wind_speed_10m: fc.float(),
                        wind_direction_10m: fc.string(),
                        cloud_cover: fc.float(),
                        shortwave_radiation: fc.float(),
                        weather_code_jwa: fc.integer(),
                        is_day: fc.constantFrom(0, 1)
                    }),
                    { minLength: 1, maxLength: 10 }
                ),
                (originalData) => {
                    const parseResult1 = parseWeatherData(originalData);
                    expect(parseResult1.success).toBe(true);
                    
                    const formatted = formatWeatherData(parseResult1.data!);
                    const parseResult2 = parseWeatherData(formatted);
                    
                    expect(parseResult2.success).toBe(true);
                    
                    // Property: Timestamps should be preserved exactly
                    parseResult2.data!.forEach((record, index) => {
                        expect(record.datetime).toBe(parseResult1.data![index].datetime);
                    });
                }
            ),
            { numRuns: 50 }
        );
    });
});
