'use client';

import { Suspense, useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { useSearchParams } from 'next/navigation';
import { useMarketDataContext } from '@/context/MarketDataContext';
import { format } from 'date-fns';
import { useTheme } from '@/app/ThemeProvider';
import { useChartColors } from '@/utils/chart-colors';

// Shared Components
import { DashboardToolbar } from '@/components/features/navigation/DashboardToolbar';
import { PriceChartProvider } from '@/components/features/price-chart/context/PriceChartContext';

// Feature Components
import { PricePredictionSidebar } from '@/components/features/analysis/components/PricePredictionSidebar';
import { MainPriceChartTab } from '@/components/features/analysis/components/tabs/MainPriceChartTab';
import { ResizableLayout } from '@/shared/components/layout/ResizableLayout';

// Hooks
import { useBufferedDateRange } from '@/hooks/useBufferedDateRange';
import { usePricePredictionData } from '@/components/features/analysis/hooks/usePricePredictionData';

// 與首頁一致的載入轉圈
const LoadingSpinner = () => (
  <>
    <Box
      sx={{
        position: 'relative',
        width: 56,
        height: 56,
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '3px solid',
          borderColor: 'var(--card-border)',
          opacity: 0.3,
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '3px solid transparent',
          borderTopColor: 'var(--primary)',
          borderRightColor: 'var(--primary)',
          animation: 'spin 0.8s linear infinite',
        },
        '@keyframes spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      }}
    />
    <Typography sx={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500 }}>
      載入市場資料...
    </Typography>
  </>
);

const LoadingOverlay = () => (
  <Box
    sx={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      zIndex: 10,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
    }}
  >
    <LoadingSpinner />
  </Box>
);

function SiteRevenueContent() {
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
    selectedSiteIds, setSelectedSiteIds, availableSiteIds,
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
      // Note: CSV download for bid plans would need a separate endpoint
      // For now, using the same endpoint structure
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
              currentTab="site-revenue"
            />
          </Box>

          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <ResizableLayout
              direction="horizontal"
              defaultSizes={[25, 75]}
              minSizes={[20, 50]}
              storageKey="site-revenue-page-layout"
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

export default function SiteRevenuePage() {
  return (
    <Suspense fallback={<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading...</Box>}>
      <SiteRevenueContent />
    </Suspense>
  );
}
