import {
    buildWeatherSeriesPair,
    hasChartData,
    groupTooltipByField,
    weatherColors
} from '../weatherCategories';

describe('weatherCategories utility functions', () => {
    describe('weatherColors', () => {
        it('should have all required color pairs', () => {
            expect(weatherColors.tempActual).toBe('#ff7043');
            expect(weatherColors.tempForecast).toBe('#ffab91');
            expect(weatherColors.humidityActual).toBe('#42a5f5');
            expect(weatherColors.humidityForecast).toBe('#90caf9');
            expect(weatherColors.precipActual).toBe('#42a5f5');
            expect(weatherColors.precipForecast).toBe('#90caf9');
            expect(weatherColors.windActual).toBe('#66bb6a');
            expect(weatherColors.windForecast).toBe('#a5d6a7');
            expect(weatherColors.cloudActual).toBe('#90a4ae');
            expect(weatherColors.cloudForecast).toBe('#cfd8dc');
            expect(weatherColors.radiationActual).toBe('#ffca28');
            expect(weatherColors.radiationForecast).toBe('#ffe082');
            expect(weatherColors.pressureMslActual).toBe('#ab47bc');
            expect(weatherColors.pressureMslForecast).toBe('#ce93d8');
            expect(weatherColors.soilTempActual).toBe('#8d6e63');
            expect(weatherColors.soilTempForecast).toBe('#bcaaa4');
        });
    });

    describe('buildWeatherSeriesPair', () => {
        const mockActualData = [
            { datetime: '2024-01-01T00:00:00Z', temperature_2m: 20 },
            { datetime: '2024-01-01T01:00:00Z', temperature_2m: 21 },
            { datetime: '2024-01-01T02:00:00Z', temperature_2m: null }
        ];

        const mockForecastData = [
            { datetime: '2024-01-01T00:00:00Z', temperature_2m: 19 },
            { datetime: '2024-01-01T01:00:00Z', temperature_2m: 20 }
        ];

        it('should build series with actual data only', () => {
            const series = buildWeatherSeriesPair(
                'temperature_2m',
                mockActualData,
                [],
                { actual: '#ff0000', forecast: '#00ff00' },
                '°C'
            );

            expect(series).toHaveLength(1);
            expect(series[0].name).toContain('Actual');
            expect(series[0].lineStyle.type).toBe('solid');
            expect(series[0].lineStyle.width).toBe(2);
            expect(series[0].itemStyle.color).toBe('#ff0000');
            expect(series[0].data).toHaveLength(2); // null values filtered out
        });

        it('should build series with forecast data only', () => {
            const series = buildWeatherSeriesPair(
                'temperature_2m',
                [],
                mockForecastData,
                { actual: '#ff0000', forecast: '#00ff00' },
                '°C'
            );

            expect(series).toHaveLength(1);
            expect(series[0].name).toContain('Forecast');
            expect(series[0].lineStyle.type).toBe('dashed');
            expect(series[0].lineStyle.width).toBe(2);
            expect(series[0].itemStyle.color).toBe('#00ff00');
            expect(series[0].data).toHaveLength(2);
        });

        it('should build series with both actual and forecast data', () => {
            const series = buildWeatherSeriesPair(
                'temperature_2m',
                mockActualData,
                mockForecastData,
                { actual: '#ff0000', forecast: '#00ff00' },
                '°C'
            );

            expect(series).toHaveLength(2);
            expect(series[0].name).toContain('Actual');
            expect(series[1].name).toContain('Forecast');
            expect(series[0].lineStyle.type).toBe('solid');
            expect(series[1].lineStyle.type).toBe('dashed');
        });

        it('should filter out null and undefined values', () => {
            const dataWithNulls = [
                { datetime: '2024-01-01T00:00:00Z', temperature_2m: 20 },
                { datetime: '2024-01-01T01:00:00Z', temperature_2m: null },
                { datetime: '2024-01-01T02:00:00Z', temperature_2m: undefined },
                { datetime: '2024-01-01T03:00:00Z', temperature_2m: 22 }
            ];

            const series = buildWeatherSeriesPair(
                'temperature_2m',
                dataWithNulls,
                [],
                { actual: '#ff0000', forecast: '#00ff00' },
                '°C'
            );

            expect(series[0].data).toHaveLength(2);
        });

        it('should apply custom options', () => {
            const series = buildWeatherSeriesPair(
                'temperature_2m',
                mockActualData,
                [],
                { actual: '#ff0000', forecast: '#00ff00' },
                '°C',
                {
                    type: 'bar',
                    yAxisIndex: 1,
                    smooth: false,
                    areaStyle: { opacity: 0.3 }
                }
            );

            expect(series[0].type).toBe('bar');
            expect(series[0].yAxisIndex).toBe(1);
            expect(series[0].smooth).toBe(false);
            expect(series[0].areaStyle).toEqual({ opacity: 0.3 });
        });

        it('should return empty array when no data has values', () => {
            const emptyData = [
                { datetime: '2024-01-01T00:00:00Z', temperature_2m: null }
            ];

            const series = buildWeatherSeriesPair(
                'temperature_2m',
                emptyData,
                [],
                { actual: '#ff0000', forecast: '#00ff00' },
                '°C'
            );

            expect(series).toHaveLength(0);
        });
    });

    describe('hasChartData', () => {
        it('should return true when series has data', () => {
            const series = [
                { data: [[1, 2], [3, 4]] },
                { data: [] }
            ];

            expect(hasChartData(series)).toBe(true);
        });

        it('should return false when all series are empty', () => {
            const series = [
                { data: [] },
                { data: [] }
            ];

            expect(hasChartData(series)).toBe(false);
        });

        it('should return false when series array is empty', () => {
            expect(hasChartData([])).toBe(false);
        });

        it('should return false when series have no data property', () => {
            const series = [
                { name: 'test' },
                { name: 'test2' }
            ];

            expect(hasChartData(series)).toBe(false);
        });

        it('should return true when at least one series has data', () => {
            const series = [
                { data: [] },
                { data: [[1, 2]] },
                { data: [] }
            ];

            expect(hasChartData(series)).toBe(true);
        });
    });

    describe('groupTooltipByField', () => {
        it('should group actual and forecast values by field name', () => {
            const params = [
                {
                    seriesName: 'temperature_2m (Actual) (°C)',
                    value: [1234567890000, 20],
                    marker: '<span>●</span>'
                },
                {
                    seriesName: 'temperature_2m (Forecast) (°C)',
                    value: [1234567890000, 19],
                    marker: '<span>○</span>'
                },
                {
                    seriesName: 'relative_humidity_2m (Actual) (%)',
                    value: [1234567890000, 60],
                    marker: '<span>●</span>'
                }
            ];

            const grouped = groupTooltipByField(params);

            expect(Object.keys(grouped)).toHaveLength(2);
            expect(grouped['temperature_2m']).toBeDefined();
            expect(grouped['temperature_2m'].actual).toBeDefined();
            expect(grouped['temperature_2m'].forecast).toBeDefined();
            expect(grouped['relative_humidity_2m']).toBeDefined();
            expect(grouped['relative_humidity_2m'].actual).toBeDefined();
            expect(grouped['relative_humidity_2m'].forecast).toBeUndefined();
        });

        it('should handle series without actual/forecast suffix', () => {
            const params = [
                {
                    seriesName: 'temperature_2m (°C)',
                    value: [1234567890000, 20],
                    marker: '<span>●</span>'
                }
            ];

            const grouped = groupTooltipByField(params);

            expect(Object.keys(grouped)).toHaveLength(1);
            expect(grouped['temperature_2m']).toBeDefined();
            expect(grouped['temperature_2m'].actual).toBeDefined();
        });

        it('should handle empty params array', () => {
            const grouped = groupTooltipByField([]);

            expect(Object.keys(grouped)).toHaveLength(0);
        });

        it('should correctly extract field names with parentheses', () => {
            const params = [
                {
                    seriesName: 'temperature_2m (Actual) (°C)',
                    value: [1234567890000, 20],
                    marker: '<span>●</span>'
                }
            ];

            const grouped = groupTooltipByField(params);

            expect(grouped['temperature_2m']).toBeDefined();
        });

        it('should handle multiple fields with both actual and forecast', () => {
            const params = [
                { seriesName: 'temperature_2m (Actual) (°C)', value: [1, 20], marker: '●' },
                { seriesName: 'temperature_2m (Forecast) (°C)', value: [1, 19], marker: '○' },
                { seriesName: 'relative_humidity_2m (Actual) (%)', value: [1, 60], marker: '●' },
                { seriesName: 'relative_humidity_2m (Forecast) (%)', value: [1, 58], marker: '○' }
            ];

            const grouped = groupTooltipByField(params);

            expect(Object.keys(grouped)).toHaveLength(2);
            expect(grouped['temperature_2m'].actual).toBeDefined();
            expect(grouped['temperature_2m'].forecast).toBeDefined();
            expect(grouped['relative_humidity_2m'].actual).toBeDefined();
            expect(grouped['relative_humidity_2m'].forecast).toBeDefined();
        });
    });
});
