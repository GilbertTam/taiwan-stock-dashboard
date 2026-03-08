/**
 * Property-Based Test: Weather Model State Independence
 * 
 * Feature: weather-forecast-models-and-chart
 * 
 * Property 1: For any weather model selection change on either the Forecast page
 * (actual or forecast) or Weather page, the other page's model selections SHALL
 * remain unchanged.
 * 
 * **Validates: Requirements 1.2, 1.3, 8.1, 8.2, 8.3, 8.5**
 * 
 * This test verifies that:
 * - selectedWeatherModelActual and selectedWeatherModelForecast are independent
 * - Changes to one do not affect the other
 * - Both can be set to null (show all models)
 * - Both can be set to specific model identifiers
 */

import { renderHook, act } from '@testing-library/react';
import fc from 'fast-check';
import { useMarketData } from '../useMarketData';
import * as services from '@/services';

// Mock all service dependencies
jest.mock('@/services', () => ({
    fetchAreas: jest.fn(),
    fetchPredictionModels: jest.fn(),
    fetchPredictions: jest.fn(),
    fetchActualPrices: jest.fn(),
    fetchAvailableCalculatingDates: jest.fn(),
    fetchSpecificPredictions: jest.fn(),
    fetchWeatherActual: jest.fn(),
    fetchWeatherForecast: jest.fn(),
    fetchWeatherModels: jest.fn(),
    fetchImbalance: jest.fn(),
    fetchIntraday: jest.fn(),
    fetchInterconnectionFlows: jest.fn(),
    fetchOcctoArea: jest.fn(),
    fetchBatteryData: jest.fn(),
    fetchBidPlans: jest.fn(),
    fetchWeatherActualDaily: jest.fn(),
}));

// Create stable mock functions outside the factory
const mockLogout = jest.fn();

jest.mock('@/context/AuthContext', () => ({
    useAuth: () => ({
        logout: mockLogout,
    }),
}));

// Create stable mock functions outside the factory
const mockLoadPreferences = jest.fn(() => ({}));
const mockUpdatePreference = jest.fn();
const mockSavePreferences = jest.fn();
const mockClearPreferences = jest.fn();
const mockIsInitialized = { current: false };

jest.mock('../useUserPreferences', () => ({
    useUserPreferences: () => ({
        loadPreferences: mockLoadPreferences,
        updatePreference: mockUpdatePreference,
        savePreferences: mockSavePreferences,
        clearPreferences: mockClearPreferences,
        isInitialized: mockIsInitialized,
    }),
}));

describe('Property Test: Weather Model State Independence', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup default mock implementations
        (services.fetchAreas as jest.Mock).mockResolvedValue([
            { name: 'tokyo', display_name: 'Tokyo' },
        ]);
        (services.fetchPredictionModels as jest.Mock).mockResolvedValue([]);
        (services.fetchWeatherModels as jest.Mock).mockResolvedValue([
            { model: 'jma', hourly_count: 100, daily_count: 10 },
            { model: 'ecmwf', hourly_count: 100, daily_count: 10 },
            { model: 'gfs', hourly_count: 100, daily_count: 10 },
        ]);
    });

    it('should maintain independent weather model selections for actual and forecast', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    initialActual: fc.option(fc.constantFrom('jma', 'ecmwf', 'gfs'), { nil: null }),
                    initialForecast: fc.option(fc.constantFrom('jma', 'ecmwf', 'gfs'), { nil: null }),
                    newActual: fc.option(fc.constantFrom('jma', 'ecmwf', 'gfs'), { nil: null }),
                    newForecast: fc.option(fc.constantFrom('jma', 'ecmwf', 'gfs'), { nil: null }),
                }),
                async ({ initialActual, initialForecast, newActual, newForecast }) => {
                    const { result } = renderHook(() => useMarketData());

                    // Wait for initial data fetch
                    await act(async () => {
                        await new Promise(resolve => setTimeout(resolve, 0));
                    });

                    // Set initial state for both actual and forecast models
                    act(() => {
                        result.current.setSelectedWeatherModelActual(initialActual);
                        result.current.setSelectedWeatherModelForecast(initialForecast);
                    });

                    // Verify initial state is set correctly
                    expect(result.current.selectedWeatherModelActual).toBe(initialActual);
                    expect(result.current.selectedWeatherModelForecast).toBe(initialForecast);

                    // Change actual model selection
                    act(() => {
                        result.current.setSelectedWeatherModelActual(newActual);
                    });

                    // Verify actual changed but forecast remained unchanged
                    expect(result.current.selectedWeatherModelActual).toBe(newActual);
                    expect(result.current.selectedWeatherModelForecast).toBe(initialForecast);

                    // Change forecast model selection
                    act(() => {
                        result.current.setSelectedWeatherModelForecast(newForecast);
                    });

                    // Verify forecast changed but actual remained unchanged
                    expect(result.current.selectedWeatherModelActual).toBe(newActual);
                    expect(result.current.selectedWeatherModelForecast).toBe(newForecast);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should allow both actual and forecast models to be null independently', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.boolean(),
                fc.boolean(),
                async (setActualToNull, setForecastToNull) => {
                    const { result } = renderHook(() => useMarketData());

                    // Wait for initial data fetch
                    await act(async () => {
                        await new Promise(resolve => setTimeout(resolve, 0));
                    });

                    // Set both to non-null values first
                    act(() => {
                        result.current.setSelectedWeatherModelActual('jma');
                        result.current.setSelectedWeatherModelForecast('ecmwf');
                    });

                    expect(result.current.selectedWeatherModelActual).toBe('jma');
                    expect(result.current.selectedWeatherModelForecast).toBe('ecmwf');

                    // Conditionally set to null based on property inputs
                    if (setActualToNull) {
                        act(() => {
                            result.current.setSelectedWeatherModelActual(null);
                        });
                    }

                    if (setForecastToNull) {
                        act(() => {
                            result.current.setSelectedWeatherModelForecast(null);
                        });
                    }

                    // Verify the expected state
                    expect(result.current.selectedWeatherModelActual).toBe(
                        setActualToNull ? null : 'jma'
                    );
                    expect(result.current.selectedWeatherModelForecast).toBe(
                        setForecastToNull ? null : 'ecmwf'
                    );
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should maintain independence across multiple sequential changes', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.array(
                    fc.record({
                        target: fc.constantFrom('actual', 'forecast'),
                        value: fc.option(fc.constantFrom('jma', 'ecmwf', 'gfs'), { nil: null }),
                    }),
                    { minLength: 1, maxLength: 10 }
                ),
                async (changes) => {
                    const { result } = renderHook(() => useMarketData());

                    // Wait for initial data fetch
                    await act(async () => {
                        await new Promise(resolve => setTimeout(resolve, 0));
                    });

                    let expectedActual: string | null = null;
                    let expectedForecast: string | null = null;

                    // Apply changes sequentially and track expected state
                    for (const change of changes) {
                        act(() => {
                            if (change.target === 'actual') {
                                result.current.setSelectedWeatherModelActual(change.value);
                                expectedActual = change.value;
                            } else {
                                result.current.setSelectedWeatherModelForecast(change.value);
                                expectedForecast = change.value;
                            }
                        });

                        // Verify state after each change
                        expect(result.current.selectedWeatherModelActual).toBe(expectedActual);
                        expect(result.current.selectedWeatherModelForecast).toBe(expectedForecast);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
});
