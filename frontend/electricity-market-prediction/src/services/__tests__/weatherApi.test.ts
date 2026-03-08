import {
    fetchWeatherForecastDaily,
    fetchWeatherActualModels,
    fetchWeatherActualDailyModels,
    fetchWeatherForecastModels,
    fetchWeatherForecastDailyModels
} from '../weatherApi';
import { createAuthenticatedApi } from '../apiClient';

// Mock apiClient
jest.mock('../apiClient', () => ({
    createAuthenticatedApi: jest.fn()
}));

describe('weatherApi tests for new phase 1 endpoints', () => {
    let mockGet: jest.Mock;

    beforeEach(() => {
        mockGet = jest.fn();
        (createAuthenticatedApi as jest.Mock).mockReturnValue({
            get: mockGet
        });
        jest.clearAllMocks();
    });

    it('should call fetchWeatherForecastDaily correctly', async () => {
        const mockData = [{ datetime: '2024-01-01', area: 'tokyo', temperature_2m_mean: 20 }];
        mockGet.mockResolvedValueOnce({ data: { data: mockData } });

        const result = await fetchWeatherForecastDaily({
            start_date: '2024-01-01',
            end_date: '2024-01-02',
            area_name: 'tokyo',
        });

        expect(mockGet).toHaveBeenCalledWith('/market-info/weather-forecast-daily', {
            params: {
                start_date: '2024-01-01',
                end_date: '2024-01-02',
                area_name: 'tokyo',
            }
        });
        expect(result).toEqual(mockData);
    });

    it('should call fetchWeatherActualModels correctly', async () => {
        const mockModels = [{ model: 'modelA', doc_count: 10 }];
        mockGet.mockResolvedValueOnce({ data: { data: mockModels } });

        const result = await fetchWeatherActualModels({ area_name: 'osaka' });

        expect(mockGet).toHaveBeenCalledWith('/market-info/weather-actual-models', {
            params: { area_name: 'osaka' }
        });
        expect(result).toEqual(mockModels);
    });

    it('should call fetchWeatherActualDailyModels correctly', async () => {
        const mockModels = [{ model: 'modelB', doc_count: 15 }];
        mockGet.mockResolvedValueOnce({ data: { data: mockModels } });

        const result = await fetchWeatherActualDailyModels({ area_name: 'tokyo' });

        expect(mockGet).toHaveBeenCalledWith('/market-info/weather-actual-daily-models', {
            params: { area_name: 'tokyo' }
        });
        expect(result).toEqual(mockModels);
    });

    it('should call fetchWeatherForecastModels correctly', async () => {
        const mockModels = [{ model: 'modelA', doc_count: 5 }];
        mockGet.mockResolvedValueOnce({ data: { data: mockModels } });

        const result = await fetchWeatherForecastModels({ area_name: 'hokkaido' });

        expect(mockGet).toHaveBeenCalledWith('/market-info/weather-forecast-models', {
            params: { area_name: 'hokkaido' }
        });
        expect(result).toEqual(mockModels);
    });

    it('should call fetchWeatherForecastDailyModels correctly', async () => {
        const mockModels = [{ model: 'modelC', doc_count: 2 }];
        mockGet.mockResolvedValueOnce({ data: { data: mockModels } });

        const result = await fetchWeatherForecastDailyModels({ area_name: 'tokyo' });

        expect(mockGet).toHaveBeenCalledWith('/market-info/weather-forecast-daily-models', {
            params: { area_name: 'tokyo' }
        });
        expect(result).toEqual(mockModels);
    });
});
