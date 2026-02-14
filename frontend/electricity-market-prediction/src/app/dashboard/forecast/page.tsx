/**
 * 預測分析頁 | Forecast analysis page — price prediction chart with sidebar controls.
 */
'use client';

import { Suspense, useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { useSearchParams } from 'next/navigation';
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
import { PricePredictionSidebar } from '@/components/forecast/PricePredictionSidebar';
import { MainPriceChartTab } from '@/components/forecast/tabs/MainPriceChartTab';
import { ResizableLayout } from '@/components/layout/ResizableLayout';

// Hooks
import { useBufferedDateRange } from '@/hooks/useBufferedDateRange';
import { usePricePredictionData } from '@/components/forecast/hooks/usePricePredictionData';

function ForecastContent() {
  const searchParams = useSearchParams();
  const { darkMode } = useTheme();
  const colors = useChartColors();

  const {
    areas, models, calculatingDatesByModel, selectedArea, selectedModels,
    startDate, endDate, dateRangePreset, actualPrices, predictionsByModel,
    weatherActual, weatherForecast, imbalanceData, intradayData,
    interconnectionData, occtoAreaData, batteryData, bidPlansData, isLoading,
    handleAreaChange, handleModelChange, handleModelCalculatingDateChange,
    handleDateRangePreset, setStartDate, setEndDate, refreshData,
  } = useMarketDataContext();

  const { tempStartDate, tempEndDate, onDateRangeChange, onDateMenuClose } = useBufferedDateRange({
    startDate, endDate, setStartDate, setEndDate,
    clearPreset: () => handleDateRangePreset(null),
  });

  const areaFromUrl = searchParams.get('area') || '';
  const panelFromUrl = searchParams.get('panel') || '';
  const defaultPanelMarketInfo = panelFromUrl === 'market-info';

  // Sync Area URL param
  useEffect(() => {
    if (!areaFromUrl || areas.length === 0) return;
    if (areas.some((a) => a.name === areaFromUrl)) {
      handleAreaChange({ target: { value: areaFromUrl } } as any);
    }
  }, [areaFromUrl, areas, handleAreaChange]);

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
        darkMode={darkMode}
        colors={colors}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', gap: 0.5, p: 0.5 }}>
          <Box sx={{ flexShrink: 0 }}>
            <DashboardToolbar
              startDate={tempStartDate}
              endDate={tempEndDate}
              dateRangePreset={dateRangePreset}
              onDateRangeChange={onDateRangeChange}
              onDateRangePreset={handleDateRangePreset}
              onDateMenuClose={onDateMenuClose}
              onRefresh={handleRefresh}
              onDownloadCsv={handleDownloadCsv}
              currentTab="price"
            />
          </Box>

          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <ResizableLayout
              direction="horizontal"
              defaultSizes={[25, 75]}
              minSizes={[20, 50]}
              storageKey="forecast-page-layout"
            >
              <Box
                sx={{
                  height: '100%',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  borderRight: '1px solid var(--card-border)',
                  backgroundColor: 'var(--card-bg)',
                }}
              >
                <PricePredictionSidebar
                  areas={areas}
                  selectedArea={selectedArea}
                  onAreaChange={handleAreaChange}
                  models={models}
                  selectedModels={selectedModels}
                  calculatingDatesByModel={calculatingDatesByModel}
                  onModelToggle={handleModelToggle}
                  onModelCalculatingDateChange={handleModelCalculatingDateChange}
                />
              </Box>
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
                  defaultPanelMarketInfo={defaultPanelMarketInfo}
                />
              </Box>
            </ResizableLayout>
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
