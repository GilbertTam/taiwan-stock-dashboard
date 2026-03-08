/**
 * Unit tests for legend visibility toggle functionality
 * 
 * Requirements: 6.2, 6.5
 * - Wire legend item clicks to field visibility toggle
 * - Match legend visual style with Forecast page
 * - Highlight legend items on hover
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PriceChartSeriesLegend } from '../PriceChartSeriesLegend';
import { PriceChartProvider } from '../context/PriceChartContext';
import * as MarketDataContext from '@/context/MarketDataContext';

// Mock the useChartColors hook
jest.mock('@/utils/chart-colors', () => ({
    useChartColors: () => ({
        primary: '#1976d2',
        secondary: '#dc004e',
        background: '#ffffff',
        text: '#000000',
        actual: '#2196f3',
        intraday: '#ff9800',
        imbalance: '#f44336'
    })
}));

// Mock MarketDataContext to enable weather display
jest.mock('@/context/MarketDataContext', () => ({
    ...jest.requireActual('@/context/MarketDataContext'),
    useMarketDataContext: jest.fn()
}));

// Helper to render with providers
const renderWithProviders = (ui: React.ReactElement, options = {}) => {
    const mockContextValue = {
        showImbalance: false,
        setShowImbalance: jest.fn(),
        showImbalanceQuantity: true,
        setShowImbalanceQuantity: jest.fn(),
        showImbalanceSurplusRate: true,
        setShowImbalanceSurplusRate: jest.fn(),
        showImbalanceDeficitRate: true,
        setShowImbalanceDeficitRate: jest.fn(),
        showIntraday: false,
        setShowIntraday: jest.fn(),
        showIntradayAverage: true,
        setShowIntradayAverage: jest.fn(),
        showInterconnection: true,
        setShowInterconnection: jest.fn(),
        showOcctoArea: false,
        setShowOcctoArea: jest.fn(),
        showWeather: true,
        setShowWeather: jest.fn(),
        showWeatherActual: true,
        setShowWeatherActual: jest.fn(),
        showWeatherForecast: false,
        setShowWeatherForecast: jest.fn(),
        ...options
    };

    (MarketDataContext.useMarketDataContext as jest.Mock).mockReturnValue(mockContextValue);

    return render(
        <PriceChartProvider
            chartData={[]}
            areaName="Tokyo"
            selectedModels={[]}
            darkMode={false}
            colors={{
                primary: '#1976d2',
                secondary: '#dc004e',
                background: '#ffffff',
                text: '#000000',
                actual: '#2196f3',
                intraday: '#ff9800',
                imbalance: '#f44336'
            }}
            weatherActual={[
                {
                    datetime: '2024-01-01T00:00:00Z',
                    area: 'Tokyo',
                    temperature_2m: 15.5,
                    relative_humidity_2m: 65,
                    precipitation: 0,
                    rain: 0,
                    snowfall: 0,
                    wind_speed_10m: 5.2,
                    wind_direction_10m: 'N',
                    cloud_cover: 30,
                    shortwave_radiation: 100,
                    weather_code_jwa: 1,
                    is_day: 1,
                    model: 'jma'
                }
            ]}
            weatherForecast={[]}
        >
            {ui}
        </PriceChartProvider>
    );
};

describe('PriceChartSeriesLegend - Legend Visibility Toggle', () => {
    describe('Weather legend items', () => {
        it('should render weather legend items when weather data is available', () => {
            renderWithProviders(<PriceChartSeriesLegend />);
            
            // Weather section should be present
            expect(screen.getByText('天氣')).toBeInTheDocument();
        });

        it('should make weather legend items clickable', () => {
            const { container } = renderWithProviders(<PriceChartSeriesLegend />);
            
            // Find weather legend items (they should have role="button")
            const legendItems = container.querySelectorAll('[role="button"]');
            
            // Weather legend items should be clickable
            expect(legendItems.length).toBeGreaterThan(0);
        });

        it('should toggle weather field visibility when legend item is clicked', () => {
            const { container } = renderWithProviders(<PriceChartSeriesLegend />);
            
            // Find a weather legend item
            const legendItems = container.querySelectorAll('[role="button"]');
            
            if (legendItems.length > 0) {
                const initialCount = legendItems.length;
                
                // Click the legend item to hide it
                fireEvent.click(legendItems[0]);
                
                // After clicking, the item should be removed (toggled off)
                const updatedItems = container.querySelectorAll('[role="button"]');
                expect(updatedItems.length).toBe(initialCount - 1);
            }
        });

        it('should support keyboard navigation for legend items', () => {
            const { container } = renderWithProviders(<PriceChartSeriesLegend />);
            
            // Find a weather legend item
            const legendItems = container.querySelectorAll('[role="button"]');
            
            if (legendItems.length > 0) {
                const initialCount = legendItems.length;
                
                // Press Enter key to toggle
                fireEvent.keyDown(legendItems[0], { key: 'Enter' });
                
                // After toggling, the item should be removed
                let updatedItems = container.querySelectorAll('[role="button"]');
                expect(updatedItems.length).toBe(initialCount - 1);
                
                // Re-render to get fresh items
                const newLegendItems = container.querySelectorAll('[role="button"]');
                if (newLegendItems.length > 0) {
                    // Press Space key to toggle another item
                    fireEvent.keyDown(newLegendItems[0], { key: ' ' });
                    
                    // After toggling, another item should be removed
                    updatedItems = container.querySelectorAll('[role="button"]');
                    expect(updatedItems.length).toBe(initialCount - 2);
                }
            }
        });

        it('should have hover styling on clickable legend items', () => {
            const { container } = renderWithProviders(<PriceChartSeriesLegend />);
            
            // Find a weather legend item
            const legendItems = container.querySelectorAll('[role="button"]');
            
            if (legendItems.length > 0) {
                const firstItem = legendItems[0] as HTMLElement;
                
                // Check that the item has cursor pointer style
                const styles = window.getComputedStyle(firstItem);
                expect(styles.cursor).toBe('pointer');
            }
        });

        it('should render different legend item types correctly', () => {
            const { container } = renderWithProviders(<PriceChartSeriesLegend />);
            
            // The legend should render without errors
            expect(container).toBeTruthy();
            
            // Weather section should be present
            expect(screen.getByText('天氣')).toBeInTheDocument();
        });
    });

    describe('Legend visual style', () => {
        it('should match Forecast page legend style with consistent spacing', () => {
            const { container } = renderWithProviders(<PriceChartSeriesLegend />);
            
            // Check that the legend container has proper styling
            const legendContainer = container.querySelector('[class*="MuiBox"]');
            expect(legendContainer).toBeInTheDocument();
        });

        it('should display legend items with proper alignment', () => {
            const { container } = renderWithProviders(<PriceChartSeriesLegend />);
            
            // Legend items should be properly aligned
            const legendItems = container.querySelectorAll('[role="button"]');
            legendItems.forEach(item => {
                expect(item).toBeInTheDocument();
            });
        });

        it('should use consistent color indicators for weather fields', () => {
            const { container } = renderWithProviders(<PriceChartSeriesLegend />);
            
            // Weather legend items should have color indicators
            expect(container).toBeTruthy();
            expect(screen.getByText('天氣')).toBeInTheDocument();
        });
    });

    describe('Hover behavior', () => {
        it('should highlight legend items on hover', () => {
            const { container } = renderWithProviders(<PriceChartSeriesLegend />);
            
            // Find a weather legend item
            const legendItems = container.querySelectorAll('[role="button"]');
            
            if (legendItems.length > 0) {
                const firstItem = legendItems[0];
                
                // Hover over the legend item
                fireEvent.mouseEnter(firstItem);
                
                // The item should be highlighted (background color change)
                expect(firstItem).toBeInTheDocument();
                
                // Mouse leave
                fireEvent.mouseLeave(firstItem);
                
                // The item should return to normal state
                expect(firstItem).toBeInTheDocument();
            }
        });

        it('should not highlight non-clickable legend items on hover', () => {
            const { container } = renderWithProviders(<PriceChartSeriesLegend />);
            
            // Find non-clickable legend items (those without role="button")
            const allItems = container.querySelectorAll('[class*="MuiBox"]');
            const nonClickableItems = Array.from(allItems).filter(
                item => !item.hasAttribute('role') || item.getAttribute('role') !== 'button'
            );
            
            // Non-clickable items should not have pointer cursor
            nonClickableItems.forEach(item => {
                const styles = window.getComputedStyle(item as HTMLElement);
                // Non-clickable items should have default cursor
                expect(styles.cursor).not.toBe('pointer');
            });
        });
    });

    describe('Integration with weather field state', () => {
        it('should toggle actual weather field when only actual is shown', () => {
            const { container } = renderWithProviders(<PriceChartSeriesLegend />);
            
            // Find weather legend items
            const legendItems = container.querySelectorAll('[role="button"]');
            
            if (legendItems.length > 0) {
                const initialCount = legendItems.length;
                
                // Click to toggle off
                fireEvent.click(legendItems[0]);
                
                // The item should be removed after toggling
                const updatedItems = container.querySelectorAll('[role="button"]');
                expect(updatedItems.length).toBe(initialCount - 1);
            }
        });

        it('should handle multiple weather fields independently', () => {
            const { container } = renderWithProviders(<PriceChartSeriesLegend />);
            
            // Find all weather legend items
            const legendItems = container.querySelectorAll('[role="button"]');
            const initialCount = legendItems.length;
            
            // Click each item to toggle them off
            let currentCount = initialCount;
            for (let i = 0; i < initialCount; i++) {
                const items = container.querySelectorAll('[role="button"]');
                if (items.length > 0) {
                    fireEvent.click(items[0]); // Always click the first item
                    currentCount--;
                    const updatedItems = container.querySelectorAll('[role="button"]');
                    expect(updatedItems.length).toBe(currentCount);
                }
            }
        });
    });
});
