'use client';

import { useState, useMemo } from 'react';
import { Box, Alert } from '@mui/material';
import { format } from 'date-fns';

import { FilterPanel } from '@/components/market-dashboard/FilterPanel';
import PriceChartSection from '@/components/market-dashboard/PriceChartSection';
import ModelPerformanceSection from '@/components/market-dashboard/ModelPerformanceSection';

import { useMarketData } from '@/hooks/useMarketData';
import { prepareChartData } from '@/utils/chartUtils';
import { downloadSpotCsv } from '@/services/api';

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
    isFetchingPredictions,
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

  // Local state for date selection (buffer before fetch)
  const [tempStartDate, setTempStartDate] = useState<Date | null>(startDate);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(endDate);

  // Sync local state with global state when global state changes (e.g. presets)
  useMemo(() => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
  }, [startDate, endDate]);

  const handleDownloadCsv = async () => {
    try {
      if (!startDate || !endDate || !selectedArea) {
        console.warn('Missing start/end date or selected area for CSV download');
        return;
      }

      const start = format(startDate, 'yyyyMMdd');
      const end = format(endDate, 'yyyyMMdd');
      const modelNames = selectedModels
        .map((m) => m.name)
        .filter(Boolean)
        .join(',');

      const blob = await downloadSpotCsv({
        start_date: start,
        end_date: end,
        area_name: selectedArea,
        model_names: modelNames || undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeArea = selectedArea || 'area';
      link.href = url;
      link.download = `spot_${safeArea}_${start}_${end}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to download CSV', e);
    }
  };

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
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      <FilterPanel
        areas={areas}
        selectedArea={selectedArea}
        startDate={tempStartDate}
        endDate={tempEndDate}
        dateRangePreset={dateRangePreset}
        onAreaChange={handleAreaChange}
        onDateRangePreset={handleDateRangePreset}
        onDateRangeChange={(ranges) => {
          const newStart = ranges.selection.startDate;
          const newEnd = ranges.selection.endDate;
          setTempStartDate(newStart);
          setTempEndDate(newEnd);

          if (newStart && newEnd && newStart.getTime() !== newEnd.getTime()) {
            setStartDate(newStart);
            setEndDate(newEnd);
            handleDateRangePreset(null);
          }
        }}
        onDateMenuClose={() => {
          if (tempStartDate && tempEndDate) {
            setStartDate(tempStartDate);
            setEndDate(tempEndDate);
          }
        }}
        onMoveMonthBackward={handleMoveMonthBackward}
        onMoveMonthForward={handleMoveMonthForward}
        onRefresh={() => { }} // Dummy refresh for now
        onDownloadCsv={handleDownloadCsv}
      />

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 10 }}>
          {/* Initial loading - show full page loading */}
          Loading...
        </Box>
      ) : (
        hasData ? (
          <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
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
              availableModels={models}
              calculatingDatesByModel={calculatingDatesByModel}
              startDate={startDate}
              endDate={endDate}
              selectedArea={selectedArea}
              isFetchingPredictions={isFetchingPredictions}
              onModelToggle={(modelId, modelName) => {
                const modelValue = `${modelId}|${modelName}`;
                const currentValues = selectedModels.map(m => `${m.id}|${m.name}`);
                const isSelected = currentValues.includes(modelValue);
                const newValues = isSelected
                  ? currentValues.filter(v => v !== modelValue)
                  : [...currentValues, modelValue];
                handleModelChange({ target: { value: newValues } } as any);
              }}
              onModelCalculatingDateChange={handleModelCalculatingDateChange}
            />

            <ModelPerformanceSection
              chartData={chartData}
              selectedModels={selectedModels}
              topBottomPairs={topBottomPairs}
              setTopBottomPairs={setTopBottomPairs}
            />
          </Box>
        ) : (
          <Box sx={{ mt: 4 }}>
            <Alert severity="info">No data available for the selected range.</Alert>
          </Box>
        )
      )}
    </>
  );
}
