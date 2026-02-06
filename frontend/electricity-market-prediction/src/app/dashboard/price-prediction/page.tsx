'use client';

import { useMemo } from 'react';
import { Box, Snackbar } from '@mui/material';
import { useMarketDataContext } from '@/context/MarketDataContext';
import { prepareChartData } from '@/utils/chartUtils';
import { downloadSpotCsv } from '@/services/api';
import { format } from 'date-fns';
import { PriceChartContainer } from '@/components/tradingview/PriceChartContainer';
import { SimpleToolbar } from '@/components/tradingview/SimpleToolbar';
import { PricePredictionSidebar } from '@/components/tradingview/PricePredictionSidebar';
import { ResizableLayout } from '@/components/tradingview/ResizableLayout';
import { useBufferedDateRange } from '@/hooks/useBufferedDateRange';

// Import PriceChartProvider to share state between Sidebar and Chart
import { PriceChartProvider } from '@/components/price-chart/context/PriceChartContext';
import { useTheme } from '@/app/ThemeProvider';
import { useChartColors } from '@/utils/chartColors';

export default function PricePredictionPage() {
  const { darkMode } = useTheme();
  const colors = useChartColors();

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
    handleMoveMonthForward,
    refreshData // Destructure refreshData
  } = useMarketDataContext();

  // Local state for date selection (buffer before fetch)
  const { tempStartDate, tempEndDate, onDateRangeChange, onDateMenuClose } = useBufferedDateRange({
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    clearPreset: () => handleDateRangePreset(null),
  });

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

  const handleRefresh = () => {
    if (refreshData) {
      refreshData();
    } else {
      window.location.reload();
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
      // 統一轉為 YYYY-MM-DD HH:mm
      if (!dateStr) return '';
      try {
        return new Date(dateStr).toISOString();
      } catch (e) {
        return dateStr;
      }
    };

    // 1. Process Actual Data
    weatherActual.forEach(item => {
      if (!item.weather_datetime) return;
      const key = getNormalizedKey(item.weather_datetime);
      if (!dataMap.has(key)) {
        dataMap.set(key, {
          time: key,
          originalTime: item.weather_datetime,
          temperature: null,
          rainfall: null,
          snowfall: null,
          windSpeed: null,
          humidity: null,
          cloudCover: null,
          isForecast: false
        });
      }
      const data = dataMap.get(key);
      if (item.temperature !== null) data.temperature = item.temperature;
      if (item.rainfall !== null) data.rainfall = item.rainfall;
      if (item.snowfall !== null) data.snowfall = item.snowfall;
      if (item.wind_speed !== null) data.windSpeed = item.wind_speed;
      if (item.relative_humidity !== null) data.humidity = item.relative_humidity;
      if (item.clouds_all !== null) data.cloudCover = item.clouds_all;
    });

    // 2. Process Forecast Data (Similar logic...)
    weatherForecast.forEach(item => {
      if (!item.weather_datetime) return;
      const key = getNormalizedKey(item.weather_datetime);
      if (!dataMap.has(key)) {
        dataMap.set(key, {
          time: key,
          originalTime: item.weather_datetime,
          temperature: null,
          rainfall: null,
          snowfall: null,
          windSpeed: null,
          humidity: null,
          cloudCover: null,
          isForecast: true
        });
      }
      const data = dataMap.get(key);
      if (item.temperature !== null) data.temperature = item.temperature;
      if (item.rainfall !== null) data.rainfall = item.rainfall;
      if (item.snowfall !== null) data.snowfall = item.snowfall;
      if (item.wind_speed !== null) data.windSpeed = item.wind_speed;
      if (item.relative_humidity !== null) data.humidity = item.relative_humidity;
      if (item.clouds_all !== null) data.cloudCover = item.clouds_all;
    });

    return Array.from(dataMap.values()).sort((a, b) => a.time.localeCompare(b.time));
  }, [weatherActual, weatherForecast]);

  const handleModelToggle = (modelId: string | number, modelName: string) => {
    const modelValue = `${modelId}|${modelName}`;
    const currentValues = selectedModels.map((m) => `${m.id}|${m.name}`);
    const isSelected = currentValues.includes(modelValue);
    const newValues = isSelected
      ? currentValues.filter((v) => v !== modelValue)
      : [...currentValues, modelValue];
    handleModelChange({ target: { value: newValues } } as any);
  };

  return (
    <Box sx={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <PriceChartProvider
        chartData={chartData}
        areaName={selectedArea}
        selectedModels={selectedModels}
        topBottomPairs={5}
        imbalanceData={imbalanceData}
        intradayData={intradayData}
        interconnectionData={interconnectionData}
        occtoAreaData={occtoAreaData}
        weatherActual={weatherActual}
        weatherForecast={weatherForecast}
        darkMode={darkMode}
        colors={colors}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', gap: 0.5, p: 0.5 }}>
          {/* Top Toolbar: Menu Button, Time Selection, Quick Presets, Refresh, Download CSV */}
          <Box sx={{ flexShrink: 0 }}>
            <SimpleToolbar
              // 使用暫存日期，避免第一次點擊就立即提交，並正確反映使用者在日曆中的當前選擇
              startDate={tempStartDate}
              endDate={tempEndDate}
              dateRangePreset={dateRangePreset}
              onDateRangeChange={onDateRangeChange}
              onDateRangePreset={handleDateRangePreset}
              onDateMenuClose={onDateMenuClose}
              onRefresh={handleRefresh}
              onDownloadCsv={handleDownloadCsv}
            />
          </Box>

          {/* Main Content: Chart (Left) + Sidebar (Right) */}
          <Box sx={{ flex: 1, display: 'flex', gap: 0.5, minHeight: 0, overflow: 'hidden' }}>
            <ResizableLayout direction="horizontal" defaultSizes={[75, 25]} minSizes={[60, 20]}>
              {/* Left: Large Chart */}
              <PriceChartContainer areaName={selectedArea} />

              {/* Right: Four Sections Sidebar */}
              <Box sx={{ 
                height: '100%', 
                overflowY: 'auto', 
                overflowX: 'hidden',
                borderLeft: '1px solid var(--card-border)',
                backgroundColor: 'var(--card-bg)',
              }}>
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
            </ResizableLayout>
          </Box>
        </Box>
      </PriceChartProvider>

      {/* Loading Overlay for Initial Load */}
      <Snackbar
        open={isLoading}
        message="Loading market data..."
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      />
    </Box>
  );
}
