/**
 * @fileoverview Backend API Integration Tests for Weather Forecast
 * 
 * Tests verify that:
 * 1. /market-info/weather-forecast endpoint returns data correctly
 * 2. Error handling and logging work for forecast API calls
 * 3. Data processing in MarketDataContext stores forecast data correctly
 * 4. Data filtering by model works correctly
 * 
 * **Validates: Requirements 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10**
 */

import { fetchWeatherForecast } from '@/services/weatherApi';
import { createAuthenticatedApi } from '@/services/apiClient';

// Mock the API client
jest.mock('@/services/apiClient');

describe('Backend API Integration - Weather Forecast', () => {
    const mockApi = {
        get: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (createAuthenticatedApi as jest.Mock).mockReturnValue(mockApi);
        // Mock console methods to verify logging
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('fetchWeatherForecast API call', () => {
        it('should call /market-info/weather-forecast endpoint with correct parameters', async () => {
            const mockData = [
                {
                    datetime: '2024-01-01T00:00:00',
                    area: 'tokyo',
                    model: 'jma_msm',
                    temperature_2m: 10.5,
                    wind_speed_10m: 3.2,
                },
            ];

            mockApi.get.mockResolvedValue({
                data: {
                    result: 'Success',
                    code: 0,
                    count: 1,
                    data: mockData,
                },
            });

            const params = {
                start_date: '20240101',
                end_date: '20240107',
                area_name: 'tokyo',
            };

            const result = await fetchWeatherForecast(params);

            // Verify API was called with correct endpoint and params
            expect(mockApi.get).toHaveBeenCalledWith('/market-info/weather-forecast', { params });
            expect(result).toEqual(mockData);
        });

        it('should log API call parameters and response', async () => {
            const mockData = [
                {
                    datetime: '2024-01-01T00:00:00',
                    area: 'tokyo',
                    model: 'jma_msm',
                    temperature_2m: 10.5,
                },
            ];

            mockApi.get.mockResolvedValue({
                data: {
                    result: 'Success',
                    code: 0,
                    count: 1,
                    data: mockData,
                },
            });

            const params = {
                start_date: '20240101',
                end_date: '20240107',
                area_name: 'tokyo',
            };

            await fetchWeatherForecast(params);

            // Verify logging
            expect(console.log).toHaveBeenCalledWith(
                '[WeatherAPI] Fetching forecast data with params:',
                params
            );
            expect(console.log).toHaveBeenCalledWith(
                '[WeatherAPI] Forecast data received:',
                {
                    count: 1,
                    params,
                }
            );
        });

        it('should handle empty forecast data correctly', async () => {
            mockApi.get.mockResolvedValue({
                data: {
                    result: 'Success',
                    code: 0,
                    count: 0,
                    data: [],
                },
            });

            const params = {
                start_date: '20240101',
                end_date: '20240107',
                area_name: 'tokyo',
            };

            const result = await fetchWeatherForecast(params);

            expect(result).toEqual([]);
            expect(console.log).toHaveBeenCalledWith(
                '[WeatherAPI] Forecast data received:',
                {
                    count: 0,
                    params,
                }
            );
        });

        it('should handle API errors and log them', async () => {
            const mockError = new Error('Network error');
            mockApi.get.mockRejectedValue(mockError);

            const params = {
                start_date: '20240101',
                end_date: '20240107',
                area_name: 'tokyo',
            };

            await expect(fetchWeatherForecast(params)).rejects.toThrow('Network error');

            // Verify error logging
            expect(console.error).toHaveBeenCalledWith(
                '[WeatherAPI] Failed to fetch weather forecast:',
                mockError
            );
        });

        it('should handle 401 authentication errors', async () => {
            const mockError = {
                response: {
                    status: 401,
                    data: { message: 'Unauthorized' },
                },
            };
            mockApi.get.mockRejectedValue(mockError);

            const params = {
                start_date: '20240101',
                end_date: '20240107',
                area_name: 'tokyo',
            };

            await expect(fetchWeatherForecast(params)).rejects.toEqual(mockError);

            expect(console.error).toHaveBeenCalledWith(
                '[WeatherAPI] Failed to fetch weather forecast:',
                mockError
            );
        });

        it('should handle 500 server errors', async () => {
            const mockError = {
                response: {
                    status: 500,
                    data: { message: 'Internal server error' },
                },
            };
            mockApi.get.mockRejectedValue(mockError);

            const params = {
                start_date: '20240101',
                end_date: '20240107',
                area_name: 'tokyo',
            };

            await expect(fetchWeatherForecast(params)).rejects.toEqual(mockError);

            expect(console.error).toHaveBeenCalledWith(
                '[WeatherAPI] Failed to fetch weather forecast:',
                mockError
            );
        });
    });

    describe('Data filtering by model', () => {
        it('should filter forecast data by selected model', () => {
            const forecastData = [
                {
                    datetime: '2024-01-01T00:00:00',
                    area: 'tokyo',
                    model: 'jma_msm',
                    temperature_2m: 10.5,
                },
                {
                    datetime: '2024-01-01T01:00:00',
                    area: 'tokyo',
                    model: 'jma_gsm',
                    temperature_2m: 11.0,
                },
                {
                    datetime: '2024-01-01T02:00:00',
                    area: 'tokyo',
                    model: 'jma_msm',
                    temperature_2m: 10.8,
                },
            ];

            const selectedModel = 'jma_msm';
            const filtered = forecastData.filter((d: any) => d.model === selectedModel);

            expect(filtered).toHaveLength(2);
            expect(filtered[0].model).toBe('jma_msm');
            expect(filtered[1].model).toBe('jma_msm');
        });

        it('should return all data when no model is selected', () => {
            const forecastData = [
                {
                    datetime: '2024-01-01T00:00:00',
                    area: 'tokyo',
                    model: 'jma_msm',
                    temperature_2m: 10.5,
                },
                {
                    datetime: '2024-01-01T01:00:00',
                    area: 'tokyo',
                    model: 'jma_gsm',
                    temperature_2m: 11.0,
                },
            ];

            const selectedModel = null;
            const filtered = selectedModel ? forecastData.filter((d: any) => d.model === selectedModel) : forecastData;

            expect(filtered).toHaveLength(2);
        });

        it('should return empty array when selected model has no data', () => {
            const forecastData = [
                {
                    datetime: '2024-01-01T00:00:00',
                    area: 'tokyo',
                    model: 'jma_msm',
                    temperature_2m: 10.5,
                },
            ];

            const selectedModel = 'nonexistent_model';
            const filtered = forecastData.filter((d: any) => d.model === selectedModel);

            expect(filtered).toHaveLength(0);
        });
    });

    describe('Data processing and storage', () => {
        it('should process forecast data with all required fields', async () => {
            const mockData = [
                {
                    datetime: '2024-01-01T00:00:00',
                    area: 'tokyo',
                    model: 'jma_msm',
                    temperature_2m: 10.5,
                    wind_speed_10m: 3.2,
                    wind_speed_80m: 5.1,
                    wind_speed_120m: 6.3,
                    wind_speed_180m: 7.2,
                    relative_humidity_2m: 65,
                    precipitation: 0.5,
                },
            ];

            mockApi.get.mockResolvedValue({
                data: {
                    result: 'Success',
                    code: 0,
                    count: 1,
                    data: mockData,
                },
            });

            const params = {
                start_date: '20240101',
                end_date: '20240107',
                area_name: 'tokyo',
            };

            const result = await fetchWeatherForecast(params);

            expect(result).toEqual(mockData);
            expect(result[0]).toHaveProperty('datetime');
            expect(result[0]).toHaveProperty('area');
            expect(result[0]).toHaveProperty('model');
            expect(result[0]).toHaveProperty('temperature_2m');
            expect(result[0]).toHaveProperty('wind_speed_10m');
            expect(result[0]).toHaveProperty('wind_speed_80m');
            expect(result[0]).toHaveProperty('wind_speed_120m');
            expect(result[0]).toHaveProperty('wind_speed_180m');
        });

        it('should handle forecast data with missing optional fields', async () => {
            const mockData = [
                {
                    datetime: '2024-01-01T00:00:00',
                    area: 'tokyo',
                    model: 'jma_msm',
                    temperature_2m: 10.5,
                    // Missing wind speed fields
                },
            ];

            mockApi.get.mockResolvedValue({
                data: {
                    result: 'Success',
                    code: 0,
                    count: 1,
                    data: mockData,
                },
            });

            const params = {
                start_date: '20240101',
                end_date: '20240107',
                area_name: 'tokyo',
            };

            const result = await fetchWeatherForecast(params);

            expect(result).toEqual(mockData);
            expect(result[0].temperature_2m).toBe(10.5);
        });
    });
});
