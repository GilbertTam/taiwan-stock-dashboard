'use client';

import { useMemo, useEffect, useState, Suspense } from 'react';
import { Box, Snackbar, Tabs, Tab, Paper } from '@mui/material';
import { useSearchParams } from 'next/navigation';
import { useMarketDataContext } from '@/context/MarketDataContext';
import { prepareChartData } from '@/utils/chartUtils';
import { downloadSpotCsv } from '@/services/api';
import { format } from 'date-fns';
import { PriceChartContainer } from '@/components/features/analysis/PriceChartContainer';
import { DashboardToolbar } from '@/components/features/nav/DashboardToolbar';
import { PricePredictionSidebar } from '@/components/features/analysis/PricePredictionSidebar';
import { ResizableLayout } from '@/components/ui/ResizableLayout';
import { useBufferedDateRange } from '@/hooks/useBufferedDateRange';
import ProfitAnalysis from '@/components/features/analysis/ProfitAnalysis/ProfitAnalysis';
import MaeAnalysis from '@/components/features/analysis/MaeAnalysis/MaeAnalysis';
import OutagesPanel from '@/components/features/market-info/OutagesPanel';
import InterconnectionPanel from '@/components/features/market-info/InterconnectionPanel';
import WeatherChartSection from '@/components/features/market-info/WeatherChartSection';

import { PriceChartProvider } from '@/components/price-chart/context/PriceChartContext';
import { useTheme } from '@/app/ThemeProvider';
import { useChartColors } from '@/utils/chartColors';

const TAB_KEYS = ['price', 'model-performance', 'market-info'] as const;
type TabKey = (typeof TAB_KEYS)[number];

function tabKeyToIndex(key: TabKey): number {
  const i = TAB_KEYS.indexOf(key);
  return i >= 0 ? i : 0;
}

function indexToTabKey(index: number): TabKey {
  return TAB_KEYS[Math.max(0, Math.min(index, TAB_KEYS.length - 1))];
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  id: string;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, id, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={id}
      aria-labelledby={`main-tab-${index}`}
      style={{
        height: value === index ? '100%' : 0,
        display: value === index ? 'flex' : 'none',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden'
      }}
      {...other}
    >
      {value === index && children}
    </div>
  );
}

function PricePredictionContent() {
  const searchParams = useSearchParams();
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
    refreshData,
  } = useMarketDataContext();

  const { tempStartDate, tempEndDate, onDateRangeChange, onDateMenuClose } = useBufferedDateRange({
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    clearPreset: () => handleDateRangePreset(null),
  });

  const tabFromUrl = (searchParams.get('tab') || 'price') as TabKey;
  const areaFromUrl = searchParams.get('area') || '';
  const mainTabValue = tabKeyToIndex(TAB_KEYS.includes(tabFromUrl) ? tabFromUrl : 'price');
  const [mainTab, setMainTab] = useState(mainTabValue);

  const [modelPerfSubTab, setModelPerfSubTab] = useState(0);
  const [topBottomPairs, setTopBottomPairs] = useState(4);
  const [marketInfoSubTab, setMarketInfoSubTab] = useState(0);

  useEffect(() => {
    setMainTab(mainTabValue);
  }, [mainTabValue]);

  useEffect(() => {
    if (!areaFromUrl || areas.length === 0) return;
    const valid = areas.some((a) => a.name === areaFromUrl);
    if (valid) {
      handleAreaChange({ target: { value: areaFromUrl } } as any);
    }
  }, [areaFromUrl, areas, handleAreaChange]);

  const handleDownloadCsv = async () => {
    try {
      if (!startDate || !endDate || !selectedArea) return;
      const start = format(startDate, 'yyyyMMdd');
      const end = format(endDate, 'yyyyMMdd');
      const modelNames = selectedModels.map((m) => m.name).filter(Boolean).join(',');
      const blob = await downloadSpotCsv({
        start_date: start,
        end_date: end,
        area_name: selectedArea,
        model_names: modelNames || undefined,
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

  const handleRefresh = () => {
    if (refreshData) refreshData();
    else window.location.reload();
  };

  const chartData = useMemo(
    () => prepareChartData(actualPrices, predictionsByModel),
    [actualPrices, predictionsByModel]
  );

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
    weatherActual.forEach((item) => {
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
          isForecast: false,
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
    weatherForecast.forEach((item) => {
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
          isForecast: true,
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

  const marketInfoWeatherChartData = useMemo(() => {
    const dataMap = new Map<string, any>();
    const getNormalizedKey = (dateStr: string) => {
      if (!dateStr) return '';
      try {
        return new Date(dateStr).toISOString();
      } catch (e) {
        return dateStr;
      }
    };
    weatherActual.forEach((item) => {
      const key = getNormalizedKey(item.weather_datetime);
      if (!dataMap.has(key)) {
        dataMap.set(key, {
          weather_datetime: item.weather_datetime,
          temperature_actual: null,
          rainfall_actual: null,
          wind_speed_actual: null,
          temperature_forecast: null,
          rainfall_forecast: null,
          wind_speed_forecast: null,
        });
      }
      const existing = dataMap.get(key);
      existing.temperature_actual = item.temperature;
      existing.rainfall_actual = item.rainfall;
      existing.wind_speed_actual = item.wind_speed;
    });
    weatherForecast.forEach((item) => {
      const key = getNormalizedKey(item.weather_datetime);
      if (!dataMap.has(key)) {
        dataMap.set(key, {
          weather_datetime: item.weather_datetime,
          temperature_actual: null,
          rainfall_actual: null,
          wind_speed_actual: null,
          temperature_forecast: null,
          rainfall_forecast: null,
          wind_speed_forecast: null,
        });
      }
      const existing = dataMap.get(key);
      existing.temperature_forecast = item.temperature;
      existing.rainfall_forecast = item.rainfall;
      existing.wind_speed_forecast = item.wind_speed;
    });
    return Array.from(dataMap.values()).sort(
      (a, b) => new Date(a.weather_datetime).getTime() - new Date(b.weather_datetime).getTime()
    );
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

  const currentTabKey = indexToTabKey(mainTab);

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
              currentTab={currentTabKey}
            />
          </Box>

          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <TabPanel value={mainTab} index={0} id="main-tabpanel-0">
              <ResizableLayout direction="horizontal" defaultSizes={[75, 25]} minSizes={[60, 20]}>
                <PriceChartContainer areaName={selectedArea} />
                <Box
                  sx={{
                    height: '100%',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    borderLeft: '1px solid var(--card-border)',
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
              </ResizableLayout>
            </TabPanel>

            <TabPanel value={mainTab} index={1} id="main-tabpanel-1">
              <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
                {isLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', my: 10 }}>Loading...</Box>
                ) : (
                  <Paper>
                    <Tabs
                      value={modelPerfSubTab}
                      onChange={(_, v) => setModelPerfSubTab(v)}
                      sx={{
                        borderBottom: 1,
                        borderColor: 'divider',
                        '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
                      }}
                    >
                      <Tab label="收益分析" />
                      <Tab label="MAE 分析" />
                    </Tabs>
                    {modelPerfSubTab === 0 && (
                      <Box sx={{ p: 3 }}>
                        <ProfitAnalysis
                          chartData={chartData}
                          selectedModels={selectedModels}
                          topBottomPairs={topBottomPairs}
                          setTopBottomPairs={setTopBottomPairs}
                        />
                      </Box>
                    )}
                    {modelPerfSubTab === 1 && (
                      <Box sx={{ p: 3 }}>
                        <MaeAnalysis chartData={chartData} selectedModels={selectedModels} />
                      </Box>
                    )}
                  </Paper>
                )}
              </Box>
            </TabPanel>

            <TabPanel value={mainTab} index={2} id="main-tabpanel-2">
              <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
                <Paper>
                  <Tabs
                    value={marketInfoSubTab}
                    onChange={(_, v) => setMarketInfoSubTab(v)}
                    sx={{
                      borderBottom: 1,
                      borderColor: 'divider',
                      '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
                    }}
                  >
                    <Tab label="停機資訊" />
                    <Tab label="互連流量" />
                    <Tab label="天氣資料" />
                  </Tabs>
                  {marketInfoSubTab === 0 && (
                    <Box sx={{ p: 3 }}>
                      <OutagesPanel
                        startDate={startDate}
                        endDate={endDate}
                        selectedArea={selectedArea}
                      />
                    </Box>
                  )}
                  {marketInfoSubTab === 1 && (
                    <Box sx={{ p: 3 }}>
                      <InterconnectionPanel
                        startDate={startDate}
                        endDate={endDate}
                        selectedArea={selectedArea}
                      />
                    </Box>
                  )}
                  {marketInfoSubTab === 2 && (
                    <Box sx={{ p: 3 }}>
                      <WeatherChartSection
                        weatherActual={weatherActual}
                        weatherForecast={weatherForecast}
                        weatherChartData={marketInfoWeatherChartData}
                      />
                    </Box>
                  )}
                </Paper>
              </Box>
            </TabPanel>
          </Box>
        </Box>
      </PriceChartProvider>

      <Snackbar
        open={isLoading}
        message="Loading market data..."
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      />
    </Box>
  );
}

export default function PricePredictionPage() {
  return (
    <Suspense fallback={<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading...</Box>}>
      <PricePredictionContent />
    </Suspense>
  );
}
