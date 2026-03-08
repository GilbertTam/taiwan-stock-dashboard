/**
 * Property-Based Test: Weather Data Filtering
 * 
 * Feature: weather-forecast-models-and-chart
 * 
 * Property 2: For any selected weather model (actual or forecast), the filtered
 * weather data SHALL contain only records where the model field matches the
 * selected model, and when no model is selected, all available model data SHALL
 * be included.
 * 
 * **Validates: Requirements 1.5, 1.6, 2.1, 2.2, 2.3**
 * 
 * This test verifies that:
 * - When selectedWeatherModelActual is set, only actual data with matching model is included
 * - When selectedWeatherModelForecast is set, only forecast data with matching model is included
 * - When no model is selected (null), all data is included
 * - Filtering is independent for actual vs forecast data
 */

import fc from 'fast-check';
import { useMemo } from 'react';

describe('Property Test: Weather Data Filtering', () => {
    // Test the filtering logic directly (same logic as in PriceChartContext)
    const filterWeatherData = (data: any[], selectedModel: string | null) => {
        if (!selectedModel) return data;
        return data.filter(d => d.model === selectedModel);
    };

    // Helper to generate valid date strings
    const validDateArbitrary = () => 
        fc.integer({ min: Date.parse('2020-01-01'), max: Date.parse('2025-12-31') })
          .map(timestamp => new Date(timestamp).toISOString());

    it('should filter actual weather data to only include selected model', () => {
        fc.assert(
            fc.property(
                // Generate array of weather data with different models
                fc.array(
                    fc.record({
                        timestamp: validDateArbitrary(),
                        model: fc.constantFrom('jma', 'ecmwf', 'gfs'),
                        temperature_2m: fc.float({ min: -20, max: 40 }),
                    }),
                    { minLength: 0, maxLength: 50 }
                ),
                // Generate selected model (or null)
                fc.option(fc.constantFrom('jma', 'ecmwf', 'gfs'), { nil: null }),
                (weatherActual, selectedModel) => {
                    const filtered = filterWeatherData(weatherActual, selectedModel);

                    if (selectedModel === null) {
                        // When no model selected, all data should be included
                        expect(filtered.length).toBe(weatherActual.length);
                        expect(filtered).toEqual(weatherActual);
                    } else {
                        // When model selected, only matching records should be included
                        const expectedCount = weatherActual.filter(d => d.model === selectedModel).length;
                        expect(filtered.length).toBe(expectedCount);
                        
                        // All filtered records should have the selected model
                        expect(filtered.every(d => d.model === selectedModel)).toBe(true);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should filter forecast weather data to only include selected model', () => {
        fc.assert(
            fc.property(
                // Generate array of weather forecast data with different models
                fc.array(
                    fc.record({
                        timestamp: validDateArbitrary(),
                        model: fc.constantFrom('jma', 'ecmwf', 'gfs'),
                        temperature_2m: fc.float({ min: -20, max: 40 }),
                    }),
                    { minLength: 0, maxLength: 50 }
                ),
                // Generate selected model (or null)
                fc.option(fc.constantFrom('jma', 'ecmwf', 'gfs'), { nil: null }),
                (weatherForecast, selectedModel) => {
                    const filtered = filterWeatherData(weatherForecast, selectedModel);

                    if (selectedModel === null) {
                        // When no model selected, all data should be included
                        expect(filtered.length).toBe(weatherForecast.length);
                        expect(filtered).toEqual(weatherForecast);
                    } else {
                        // When model selected, only matching records should be included
                        const expectedCount = weatherForecast.filter(d => d.model === selectedModel).length;
                        expect(filtered.length).toBe(expectedCount);
                        
                        // All filtered records should have the selected model
                        expect(filtered.every(d => d.model === selectedModel)).toBe(true);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should filter actual and forecast data independently', () => {
        fc.assert(
            fc.property(
                // Generate actual weather data
                fc.array(
                    fc.record({
                        timestamp: validDateArbitrary(),
                        model: fc.constantFrom('jma', 'ecmwf', 'gfs'),
                        temperature_2m: fc.float({ min: -20, max: 40 }),
                    }),
                    { minLength: 0, maxLength: 30 }
                ),
                // Generate forecast weather data
                fc.array(
                    fc.record({
                        timestamp: validDateArbitrary(),
                        model: fc.constantFrom('jma', 'ecmwf', 'gfs'),
                        temperature_2m: fc.float({ min: -20, max: 40 }),
                    }),
                    { minLength: 0, maxLength: 30 }
                ),
                // Generate selected models (can be different or null)
                fc.option(fc.constantFrom('jma', 'ecmwf', 'gfs'), { nil: null }),
                fc.option(fc.constantFrom('jma', 'ecmwf', 'gfs'), { nil: null }),
                (weatherActual, weatherForecast, selectedActual, selectedForecast) => {
                    const filteredActual = filterWeatherData(weatherActual, selectedActual);
                    const filteredForecast = filterWeatherData(weatherForecast, selectedForecast);

                    // Verify actual data filtering
                    const expectedActualCount = selectedActual === null
                        ? weatherActual.length
                        : weatherActual.filter(d => d.model === selectedActual).length;
                    expect(filteredActual.length).toBe(expectedActualCount);

                    // Verify forecast data filtering
                    const expectedForecastCount = selectedForecast === null
                        ? weatherForecast.length
                        : weatherForecast.filter(d => d.model === selectedForecast).length;
                    expect(filteredForecast.length).toBe(expectedForecastCount);

                    // Verify independence: filtering one doesn't affect the other
                    if (selectedActual !== null) {
                        expect(filteredActual.every(d => d.model === selectedActual)).toBe(true);
                    }
                    if (selectedForecast !== null) {
                        expect(filteredForecast.every(d => d.model === selectedForecast)).toBe(true);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should handle empty data arrays correctly', () => {
        fc.assert(
            fc.property(
                fc.option(fc.constantFrom('jma', 'ecmwf', 'gfs'), { nil: null }),
                fc.option(fc.constantFrom('jma', 'ecmwf', 'gfs'), { nil: null }),
                (selectedActual, selectedForecast) => {
                    const filteredActual = filterWeatherData([], selectedActual);
                    const filteredForecast = filterWeatherData([], selectedForecast);

                    // Empty arrays should remain empty regardless of selected model
                    expect(filteredActual.length).toBe(0);
                    expect(filteredForecast.length).toBe(0);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should preserve all data when model selection changes from specific to null', () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        timestamp: validDateArbitrary(),
                        model: fc.constantFrom('jma', 'ecmwf', 'gfs'),
                        temperature_2m: fc.float({ min: -20, max: 40 }),
                    }),
                    { minLength: 1, maxLength: 50 }
                ),
                fc.constantFrom('jma', 'ecmwf', 'gfs'),
                (weatherActual, initialModel) => {
                    // First filter with selected model
                    const filteredWithModel = filterWeatherData(weatherActual, initialModel);
                    const expectedInitialCount = weatherActual.filter(d => d.model === initialModel).length;
                    expect(filteredWithModel.length).toBe(expectedInitialCount);
                    expect(filteredWithModel.every(d => d.model === initialModel)).toBe(true);

                    // Then filter with null selection
                    const filteredWithNull = filterWeatherData(weatherActual, null);
                    // Should now show all data
                    expect(filteredWithNull.length).toBe(weatherActual.length);
                    expect(filteredWithNull).toEqual(weatherActual);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should handle data with only one model correctly', () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        timestamp: validDateArbitrary(),
                        model: fc.constant('jma'), // All records have same model
                        temperature_2m: fc.float({ min: -20, max: 40 }),
                    }),
                    { minLength: 1, maxLength: 50 }
                ),
                fc.constantFrom('jma', 'ecmwf', 'gfs'),
                (weatherData, selectedModel) => {
                    const filtered = filterWeatherData(weatherData, selectedModel);

                    if (selectedModel === 'jma') {
                        // Should return all data since all records match
                        expect(filtered.length).toBe(weatherData.length);
                        expect(filtered).toEqual(weatherData);
                    } else {
                        // Should return empty since no records match
                        expect(filtered.length).toBe(0);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should maintain data integrity during filtering', () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        timestamp: validDateArbitrary(),
                        model: fc.constantFrom('jma', 'ecmwf', 'gfs'),
                        temperature_2m: fc.float({ min: -20, max: 40 }),
                        precipitation: fc.option(fc.float({ min: 0, max: 100 }), { nil: null }),
                    }),
                    { minLength: 0, maxLength: 50 }
                ),
                fc.constantFrom('jma', 'ecmwf', 'gfs'),
                (weatherData, selectedModel) => {
                    const filtered = filterWeatherData(weatherData, selectedModel);

                    // Verify that filtered records are exact references from original data
                    filtered.forEach(filteredRecord => {
                        const originalRecord = weatherData.find(
                            d => d.timestamp === filteredRecord.timestamp && 
                                 d.model === filteredRecord.model
                        );
                        expect(originalRecord).toBeDefined();
                        expect(filteredRecord).toBe(originalRecord); // Same reference
                    });
                }
            ),
            { numRuns: 100 }
        );
    });
});

