'use client';

import React from 'react';
import { usePriceChart } from '../context/PriceChartContext';
import { WeatherDataTable } from '../../weather/WeatherDataTable';

export const WeatherDataTableWrapper: React.FC = () => {
    const {
        processedChartData,
        selectedWeatherFieldsActual,
        selectedWeatherFieldsForecast,
        darkMode,
        colors,
        startDate,
        endDate
    } = usePriceChart();

    return (
        <WeatherDataTable
            data={processedChartData}
            selectedFieldsActual={selectedWeatherFieldsActual}
            selectedFieldsForecast={selectedWeatherFieldsForecast}
            darkMode={darkMode}
            colors={colors}
            startDate={startDate ?? null}
            endDate={endDate ?? null}
        />
    );
};
