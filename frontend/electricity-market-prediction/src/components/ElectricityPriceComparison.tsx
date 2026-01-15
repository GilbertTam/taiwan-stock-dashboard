'use client';

import { useState, useMemo } from 'react';
import { Container, Box, Alert } from '@mui/material';

import { FilterPanel } from '@/components/market-dashboard/FilterPanel';
import DashboardHeader from '@/components/market-dashboard/DashboardHeader';
import PriceChartSection from '@/components/market-dashboard/PriceChartSection';
import ModelPerformanceSection from '@/components/market-dashboard/ModelPerformanceSection';

import { useMarketData } from '@/hooks/useMarketData';
import { prepareChartData } from '@/utils/chartUtils';

export default function ElectricityPriceComparison() {
  // Custom Hook for Data Fetching
  const {
    areas,
    models,
    calculatingDatesByModel,
    selectedArea,
    selectedModels,
    startDate,
    endDate,
    dateRangePreset,
    actualPrices,
    predictionsByModel,
    weatherActual,
    weatherForecast,
    imbalanceData,
    intradayData,
    interconnectionData,
    occtoAreaData,
    isLoading,
    error,
    handleAreaChange,
    handleModelChange,
    handleModelCalculatingDateChange,
    handleDateRangePreset,
    setStartDate,
    setEndDate,
    handleMoveMonthBackward,
    handleMoveMonthForward
  } = useMarketData();

  // Analysis Settings
  const [topBottomPairs, setTopBottomPairs] = useState<number>(4);

  // Prepare Chart Data
  const chartData = useMemo(() => {
    const result = prepareChartData(actualPrices, predictionsByModel);
    return result;
  }, [actualPrices, predictionsByModel]);

  // Prepare Weather Chart Data
  const weatherChartData = useMemo(() => {
    const dataMap = new Map<string, any>();
    const getNormalizedKey = (dateStr: string) => {
      if (!dateStr) return '';
      try {
        return new Date(dateStr).toISOString();
      } catch (e) {
        return dateStr;
      }
    };

    weatherActual.forEach(item => {
      const key = getNormalizedKey(item.weather_datetime);
      if (!dataMap.has(key)) {
        dataMap.set(key, {
          weather_datetime: item.weather_datetime,
          temperature_actual: null,
          rainfall_actual: null,
          wind_speed_actual: null,
          temperature_forecast: null,
          rainfall_forecast: null,
          wind_speed_forecast: null
        });
      }
      const existing = dataMap.get(key);
      existing.temperature_actual = item.temperature;
      existing.rainfall_actual = item.rainfall;
      existing.wind_speed_actual = item.wind_speed;
    });

    weatherForecast.forEach(item => {
      const key = getNormalizedKey(item.weather_datetime);
      if (!dataMap.has(key)) {
        dataMap.set(key, {
          weather_datetime: item.weather_datetime,
          temperature_actual: null,
          rainfall_actual: null,
          wind_speed_actual: null,
          temperature_forecast: null,
          rainfall_forecast: null,
          wind_speed_forecast: null
        });
      }
      const existing = dataMap.get(key);
      existing.temperature_forecast = item.temperature;
      existing.rainfall_forecast = item.rainfall;
      existing.wind_speed_forecast = item.wind_speed;
    });

    return Array.from(dataMap.values()).sort((a, b) =>
      new Date(a.weather_datetime).getTime() - new Date(b.weather_datetime).getTime()
    );
  }, [weatherActual, weatherForecast]);

  const hasData = useMemo(() =>
    chartData.length > 0 ||
    imbalanceData.length > 0 ||
    intradayData.length > 0 ||
    interconnectionData.length > 0 ||
    occtoAreaData.length > 0,
    [chartData, imbalanceData, intradayData, interconnectionData, occtoAreaData]
  );

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <DashboardHeader />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}

        <FilterPanel
          areas={areas}
          models={models}
          selectedArea={selectedArea}
          selectedModels={selectedModels}
          calculatingDatesByModel={calculatingDatesByModel}
          startDate={startDate}
          endDate={endDate}
          dateRangePreset={dateRangePreset}
          onAreaChange={handleAreaChange}
          onModelChange={handleModelChange}
          onModelCalculatingDateChange={handleModelCalculatingDateChange}
          onDateRangePreset={handleDateRangePreset}
          onDateRangeChange={(ranges) => {
            setStartDate(ranges.selection.startDate);
            setEndDate(ranges.selection.endDate);
            if (ranges.selection.startDate !== ranges.selection.endDate) {
              handleDateRangePreset(null);
            }
          }}
          onMoveMonthBackward={handleMoveMonthBackward}
          onMoveMonthForward={handleMoveMonthForward}
          onRefresh={() => { }} // Dummy refresh for now
        />

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 10 }}>
            {/* Can add a loading skeleton here if needed, but FilterPanel has loading state too */}
            Loading...
          </Box>
        ) : (
          hasData ? (
            <>
              <PriceChartSection
                chartData={chartData}
                weatherChartData={weatherChartData}
                weatherActual={weatherActual}
                weatherForecast={weatherForecast}
                imbalanceData={imbalanceData}
                intradayData={intradayData}
                interconnectionData={interconnectionData}
                occtoAreaData={occtoAreaData}
                selectedModels={selectedModels}
                startDate={startDate}
                endDate={endDate}
                selectedArea={selectedArea}
              />

              <ModelPerformanceSection
                chartData={chartData}
                selectedModels={selectedModels}
                topBottomPairs={topBottomPairs}
                setTopBottomPairs={setTopBottomPairs}
              />
            </>
          ) : (
            <Box sx={{ mt: 4 }}>
              <Alert severity="info">No data available for the selected range.</Alert>
            </Box>
          )
        )}
      </Box>
    </Container>
  );
}
