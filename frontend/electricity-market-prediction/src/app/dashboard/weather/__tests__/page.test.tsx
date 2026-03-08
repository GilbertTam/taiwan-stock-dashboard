import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import WeatherPage from '../page';
import { useMarketDataContext } from '@/context/MarketDataContext';
import { useTheme } from '@/app/ThemeProvider';

// Mock the context
jest.mock('@/context/MarketDataContext');
jest.mock('@/app/ThemeProvider', () => ({
    useTheme: jest.fn()
}));

// Mock child components
jest.mock('@/components/navigation/DashboardToolbar', () => ({
    DashboardToolbar: () => <div data-testid="dashboard-toolbar">Toolbar</div>
}));

jest.mock('@/components/layout/ResizableLayout', () => ({
    ResizableLayout: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="resizable-layout">{children}</div>
    )
}));

jest.mock('@/components/weather/WeatherUnifiedSidebar', () => ({
    WeatherUnifiedSidebar: () => <div data-testid="weather-unified-sidebar">Sidebar</div>
}));

// Mock the PriceChartProvider as a pass-through that exposes its props for assertions
jest.mock('@/components/price-chart/context/PriceChartContext', () => {
    return {
        PriceChartProvider: ({ children, weatherActual, weatherForecast }: any) => (
            <div data-testid="price-chart-provider" data-actual-count={weatherActual?.length || 0} data-forecast-count={weatherForecast?.length || 0}>
                {children}
            </div>
        ),
        usePriceChart: jest.fn().mockReturnValue({
            yAxisLeftState: { min: null, max: null },
            yAxisRightState: { min: null, max: null },
            setYAxisLeftState: jest.fn(),
            setYAxisRightState: jest.fn(),
            selectedWeatherFieldsActual: new Set(),
            selectedWeatherFieldsForecast: new Set(),
            selectedWeatherModelsActual: new Set(),
            selectedWeatherModelsForecast: new Set()
        })
    };
});

jest.mock('@/components/price-chart/ChartLightweight', () => ({
    ChartLightweight: () => <div data-testid="chart-lightweight">Lightweight Chart</div>
}));

jest.mock('@/services/weatherApi', () => ({
    fetchWeatherActualModels: jest.fn().mockResolvedValue([{ model: 'ecmwf_ifs', doc_count: 10 }]),
    fetchWeatherActualDailyModels: jest.fn().mockResolvedValue([{ model: 'ecmwf_ifs', doc_count: 10 }]),
    fetchWeatherForecastModels: jest.fn().mockResolvedValue([{ model: 'ecmwf_ifs', doc_count: 10 }]),
    fetchWeatherForecastDailyModels: jest.fn().mockResolvedValue([{ model: 'ecmwf_ifs', doc_count: 10 }])
}));

describe('WeatherPage Integration Tests (Unified Chart Stack)', () => {
    const mockContextValue = {
        areas: [
            { name: 'tokyo', name_ch: '東京' },
            { name: 'osaka', name_ch: '大阪' }
        ],
        selectedArea: 'tokyo',
        handleAreaChange: jest.fn(),
        weatherActual: [{ datetime: '2024-01-01T00:00:00Z', area: 'tokyo', model: 'ecmwf_ifs', temperature_2m: 20 }],
        weatherActualDaily: [],
        weatherForecast: [],
        weatherForecastDaily: [],
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        dateRangePreset: 'last30days',
        setStartDate: jest.fn(),
        setEndDate: jest.fn(),
        setDateRangePreset: jest.fn(),
        refreshData: jest.fn(),
        isLoading: false,
        dataFetchWarnings: [],
        registerPageNeeds: jest.fn(),
        unregisterPageNeeds: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useMarketDataContext as jest.Mock).mockReturnValue(mockContextValue);
        (useTheme as jest.Mock).mockReturnValue({ darkMode: false });
    });

    describe('Rendering and Initialization', () => {
        it('should render the unified sidebar and lightweight chart', async () => {
            render(<WeatherPage />);

            await waitFor(() => {
                expect(screen.getByTestId('dashboard-toolbar')).toBeInTheDocument();
                expect(screen.getAllByTestId('resizable-layout').length).toBeGreaterThan(0);
                // Check for new unified components
                expect(screen.getByTestId('weather-unified-sidebar')).toBeInTheDocument();
                expect(screen.getByTestId('price-chart-provider')).toBeInTheDocument();
                expect(screen.getByTestId('chart-lightweight')).toBeInTheDocument();
            });
        });

        it('should register page needs on mount', async () => {
            render(<WeatherPage />);

            await waitFor(() => {
                expect(mockContextValue.registerPageNeeds).toHaveBeenCalledWith(
                    'weather',
                    new Set(['weather']),
                    false
                );
            });
        });
    });

    describe('Data Context Integration', () => {
        it('should pass weather Actual and Forecast data to PriceChartProvider', async () => {
            const weatherActual = [
                { datetime: '2024-01-01T00:00:00Z', area: 'tokyo', model: 'ecmwf_ifs', temperature_2m: 20 }
            ];

            const weatherForecast = [
                { datetime: '2024-01-01T00:00:00Z', area: 'tokyo', model: 'jma_seamless', temperature_2m: 19 },
                { datetime: '2024-01-01T01:00:00Z', area: 'tokyo', model: 'jma_seamless', temperature_2m: 20 }
            ];

            (useMarketDataContext as jest.Mock).mockReturnValue({
                ...mockContextValue,
                weatherActual,
                weatherForecast
            });

            render(<WeatherPage />);

            await waitFor(() => {
                const provider = screen.getByTestId('price-chart-provider');
                // The mock provider includes data-* attributes based on the length of array props
                expect(provider).toHaveAttribute('data-actual-count', '1');
                expect(provider).toHaveAttribute('data-forecast-count', '2');
            });
        });

        it('should display no-data empty state when all datasets are missing data', async () => {
            (useMarketDataContext as jest.Mock).mockReturnValue({
                ...mockContextValue,
                weatherActual: [],
                weatherForecast: [],
                weatherActualDaily: [],
                weatherForecastDaily: []
            });

            render(<WeatherPage />);

            await waitFor(() => {
                expect(screen.getByText(/此日期區間尚無天氣資料/)).toBeInTheDocument();
                // Chart should not be rendered
                expect(screen.queryByTestId('chart-lightweight')).not.toBeInTheDocument();
            });
        });
    });
});
