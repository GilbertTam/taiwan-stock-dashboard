/**
 * 預測分析頁 | Forecast analysis page — price prediction chart with sidebar controls.
 */
'use client';

import { Suspense, useEffect } from 'react';
import { Box, LinearProgress } from '@mui/material';
import { useMarketDataContext } from '@/context/MarketDataContext';
import { downloadSpotCsv } from '@/services/api';
import { format } from 'date-fns';
import { useTheme } from '@/app/ThemeProvider';
import { useChartColors } from '@/utils/chart-colors';

// Shared Components
import { DashboardToolbar } from '@/components/navigation/DashboardToolbar';
import { PriceChartProvider } from '@/components/price-chart/context/PriceChartContext';
import { LoadingOverlay } from '@/components/overlay/LoadingOverlay';

// Feature Components
import { ForecastControlBar } from '@/components/forecast/ForecastControlBar';
import { MainPriceChartTab } from '@/components/forecast/tabs/MainPriceChartTab';

// Hooks
import { usePricePredictionData } from '@/components/forecast/hooks/usePricePredictionData';

function ForecastContent() {
  const { darkMode } = useTheme();
  const colors = useChartColors();

  const {
    areas, models, calculatingDatesByModel, selectedArea, selectedModels,
    startDate, endDate, dateRangePreset, actualPrices, predictionsByModel,
    weatherActual, weatherForecast, imbalanceData, intradayData,
    interconnectionData, occtoAreaData, batteryData, bidPlansData, isLoading, isFetchingPredictions,
    handleAreaChange, handleModelChange, handleModelCalculatingDateChange,
    handleDateRangePreset, commitDateSelection, refreshData, registerPageNeeds, unregisterPageNeeds,
    selectedWeatherModelActual, selectedWeatherModelForecast,
  } = useMarketDataContext();

  // Register scopes required for ForecastPage
  useEffect(() => {
    registerPageNeeds('forecast', new Set(['price', 'weather', 'grid', 'batteryBid']), true);
    return () => unregisterPageNeeds('forecast');
  }, [registerPageNeeds, unregisterPageNeeds]);

  const defaultPanelMarketInfo = false; // panel param removed, defaulting to standard view logic if needed, or just relying on internal state.

  // Data Preparation
  const { chartData, weatherChartData, marketInfoWeatherChartData } = usePricePredictionData({
    actualPrices, predictionsByModel, weatherActual, weatherForecast
  });

  // Handlers
  const handleDownloadCsv = async () => {
    try {
      if (!startDate || !endDate || !selectedArea) return;
      const start = format(startDate, 'yyyyMMdd');
      const end = format(endDate, 'yyyyMMdd');
      const modelNames = selectedModels.map((m) => m.name).filter(Boolean).join(',');
      const blob = await downloadSpotCsv({
        start_date: start, end_date: end, area_name: selectedArea, model_names: modelNames || undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `spot_${selectedArea}_${start}_${end}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to download CSV', e);
    }
  };

  const handleRefresh = () => { refreshData ? refreshData() : window.location.reload(); };

  const handleModelToggle = (modelId: string | number, modelName: string) => {
    const modelValue = `${modelId}|${modelName}`;
    const currentValues = selectedModels.map((m) => `${m.id}|${m.name}`);
    const newValues = currentValues.includes(modelValue)
      ? currentValues.filter((v) => v !== modelValue)
      : [...currentValues, modelValue];
    handleModelChange({ target: { value: newValues } } as any);
  };

  return (
    <Box sx={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {isLoading && <LoadingOverlay />}
      <PriceChartProvider
        chartData={chartData}
        areaName={selectedArea}
        selectedModels={selectedModels}
        topBottomPairs={5}
        imbalanceData={imbalanceData}
        intradayData={intradayData}
        interconnectionData={interconnectionData}
        occtoAreaData={occtoAreaData}
        batteryData={batteryData}
        bidPlansData={bidPlansData}
        weatherActual={weatherActual}
        weatherForecast={weatherForecast}
        selectedWeatherModelActual={selectedWeatherModelActual}
        selectedWeatherModelForecast={selectedWeatherModelForecast}
        darkMode={darkMode}
        colors={colors}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', gap: 0.5, p: 0.5 }}>
          <Box sx={{ flexShrink: 0 }}>
            <DashboardToolbar
              startDate={startDate}
              endDate={endDate}
              dateRangePreset={dateRangePreset}
              onDateChange={commitDateSelection}
              onDateRangePreset={handleDateRangePreset}
              onRefresh={handleRefresh}
              downloadActions={[{ label: '下載價差 CSV', onClick: handleDownloadCsv }]}
              isLoading={isLoading || isFetchingPredictions}
            />
            {isFetchingPredictions && !isLoading && (
              <LinearProgress sx={{ height: 2 }} />
            )}
          </Box>

          <ForecastControlBar onModelToggle={handleModelToggle} />

          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <MainPriceChartTab
              areaName={selectedArea}
              chartData={chartData}
              selectedModels={selectedModels}
              isLoading={isLoading}
              startDate={startDate}
              endDate={endDate}
              weatherActual={weatherActual}
              weatherForecast={weatherForecast}
              marketInfoWeatherChartData={marketInfoWeatherChartData}
              intradayData={intradayData}
              defaultPanelMarketInfo={defaultPanelMarketInfo}
            />
          </Box>
        </Box>
      </PriceChartProvider>
    </Box>
  );
}

export default function ForecastPage() {
  return (
    <Suspense fallback={<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading...</Box>}>
      <ForecastContent />
    </Suspense>
  );
}
