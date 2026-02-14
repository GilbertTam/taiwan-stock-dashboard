/**
 * 案場收益頁 | Site revenue analysis page — battery simulation and revenue charts.
 */
'use client';

import { Suspense, useState, useEffect } from 'react';
import { Box, Alert, Snackbar } from '@mui/material';
import { useSearchParams } from 'next/navigation';
import { useMarketDataContext } from '@/context/MarketDataContext';
import { format } from 'date-fns';
import { useTheme } from '@/app/ThemeProvider';
import { useChartColors } from '@/utils/chart-colors';

// Shared Components
import { DashboardToolbar } from '@/components/navigation/DashboardToolbar';
import { PriceChartProvider } from '@/components/price-chart/context/PriceChartContext';
import { LoadingOverlay } from '@/components/overlay/LoadingOverlay';

// Feature Components
import { RevenueAnalysisSidebar } from '@/components/revenue/RevenueAnalysisSidebar';
import { RevenueAnalysisContainer } from '@/components/revenue/RevenueAnalysisContainer';
import { ResizableLayout } from '@/components/layout/ResizableLayout';

// Hooks
import { useBufferedDateRange } from '@/hooks/useBufferedDateRange';
import { usePricePredictionData } from '@/components/forecast/hooks/usePricePredictionData';

// Types & Services
import { BatteryConfig, DEFAULT_BATTERY_CONFIG, OptimizationResult, GanttChartData, GanttOperation, ViewOptions, DEFAULT_VIEW_OPTIONS } from '@/types/revenueAnalysis';
import { calculateRevenue } from '@/services/marketApi';
import { getJepxTimeCode } from '@/utils/jepxUtils';

interface ModelResult {
  optimization: OptimizationResult;
  realizedRevenue: number;
}

function SiteRevenueContent() {
  const searchParams = useSearchParams();
  const { darkMode } = useTheme();
  const colors = useChartColors();

  const {
    areas, models, calculatingDatesByModel, selectedArea, selectedModels,
    startDate, endDate, dateRangePreset, actualPrices, predictionsByModel,
    weatherActual, weatherForecast, imbalanceData, intradayData,
    interconnectionData, occtoAreaData, batteryData, bidPlansData, isLoading: isDataLoading,
    handleAreaChange, handleModelChange, handleModelCalculatingDateChange,
    handleDateRangePreset, setStartDate, setEndDate, refreshData,
  } = useMarketDataContext();

  const { tempStartDate, tempEndDate, onDateRangeChange, onDateMenuClose } = useBufferedDateRange({
    startDate, endDate, setStartDate, setEndDate,
    clearPreset: () => handleDateRangePreset(null),
  });

  const areaFromUrl = searchParams.get('area') || '';

  // Sync Area URL param
  useEffect(() => {
    if (!areaFromUrl || areas.length === 0) return;
    if (areas.some((a) => a.name === areaFromUrl)) {
      handleAreaChange({ target: { value: areaFromUrl } } as any);
    }
  }, [areaFromUrl, areas, handleAreaChange]);

  // Data Preparation
  const { chartData } = usePricePredictionData({
    actualPrices, predictionsByModel, weatherActual, weatherForecast
  });

  // Local State for Simulation
  const [config, setConfig] = useState<BatteryConfig>(DEFAULT_BATTERY_CONFIG);
  const [actualResult, setActualResult] = useState<OptimizationResult | null>(null);
  const [modelResults, setModelResults] = useState<Record<string, ModelResult>>({});
  const [ganttData, setGanttData] = useState<GanttChartData | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [viewOptions, setViewOptions] = useState<ViewOptions>(DEFAULT_VIEW_OPTIONS);
  const [error, setError] = useState<string | null>(null);

  // Clear results when core data changes
  useEffect(() => {
    setActualResult(null);
    setModelResults({});
    setGanttData(null);
    setError(null);
  }, [chartData.length, selectedModels.length]);

  // Handlers
  const handleDownloadCsv = async () => { /* reuse existing if needed or omit */ };
  const handleRefresh = () => { refreshData ? refreshData() : window.location.reload(); };

  const handleModelToggle = (modelId: string | number, modelName: string) => {
    const modelValue = `${modelId}|${modelName}`;
    const currentValues = selectedModels.map((m) => `${m.id}|${m.name}`);
    const newValues = currentValues.includes(modelValue)
      ? currentValues.filter((v) => v !== modelValue)
      : [...currentValues, modelValue];
    handleModelChange({ target: { value: newValues } } as any);
  };

  // --- Simulation Logic ---
  const handleCalculate = async () => {
    setIsSimulating(true);
    setError(null);
    try {
      // Relax filter: Allow points if they have actualPrice OR any model prediction
      const validData = chartData.filter(d =>
        d.actualPrice !== null || d.modelPredictions.length > 0
      );

      if (validData.length === 0) {
        setError("此期間無可用資料（無實際價格或預測結果）。請嘗試其他日期或區域。");
        return;
      }

      const runConfig = { ...config, T: validData.length };

      let optResult: OptimizationResult | null = null;

      // 1. Run Optimal (Actual) - Only if we have actual prices for all points (or enough to matter)
      const hasAllActuals = validData.every(d => d.actualPrice !== null);

      if (hasAllActuals) {
        const actualInputData = validData.map(d => ({
          Spot_Price: d.actualPrice as number,
          Bal_Price: 0,
          Mask_Ch: 1,
          Mask_Dis: 1
        }));
        optResult = await calculateRevenue(runConfig, actualInputData);
        if (optResult?.results) {
          optResult.results = optResult.results.map((res: any, idx: number) => ({
            ...res, time: validData[idx].time
          }));
        }
        setActualResult(optResult);
      } else {
        setActualResult(null); // Clear previous result if any
      }

      // 2. Run Models
      const newModelResults: Record<string, ModelResult> = {};
      for (const model of selectedModels) {
        const modelKey = `${model.id}|${model.name}`;
        const modelInputData = validData.map(d => {
          const pred = d.modelPredictions.find(p => `${p.modelId}|${p.modelName}` === modelKey);
          const price = pred?.predictedPrice ?? d.actualPrice ?? 0;
          return {
            Spot_Price: price,
            Bal_Price: 0, Mask_Ch: 1, Mask_Dis: 1
          };
        });
        const modelOpt = await calculateRevenue(runConfig, modelInputData);
        if (modelOpt?.results) {
          modelOpt.results = modelOpt.results.map((res: any, idx: number) => ({
            ...res, time: validData[idx].time
          }));
        }

        // Calculate Realized (or Projected) Revenue
        let revenue = 0;
        modelOpt.results.forEach((step, idx) => {
          if (idx < validData.length) {
            const actualP = validData[idx].actualPrice;
            const pred = validData[idx].modelPredictions.find(p => `${p.modelId}|${p.modelName}` === modelKey);
            const calculationPrice = actualP !== null ? actualP : (pred?.predictedPrice ?? 0);

            const rev = step.power_spot * calculationPrice * runConfig.dt;
            const cost = step.power_ch * calculationPrice * runConfig.dt;
            const deg_cost = ((step.power_spot * runConfig.dt) / runConfig.eff_dis + (step.power_bal * runConfig.dt) * runConfig.beta_bal) * runConfig.Cost_cycle;
            revenue += (rev - cost - deg_cost);
          }
        });
        newModelResults[modelKey] = { optimization: modelOpt, realizedRevenue: revenue };
      }
      setModelResults(newModelResults);

      // 3. Prepare Gantt Data
      const transformToGantt = (optimization: OptimizationResult): GanttOperation[] => {
        return optimization.results.map((r: any, idx: number) => {
          const time = validData[idx]?.time || new Date().toISOString();
          const timeCode = getJepxTimeCode(time);
          let action: GanttOperation['action'] = 'Idle';
          if (r.action === 'Charge') action = 'Charge';
          if (r.action === 'Spot') action = 'Spot';
          if (r.action === 'Balance') action = 'Balance';

          return {
            timeStep: r.time_step,
            timeCode: timeCode,
            datetime: time,
            action: action,
            power: action === 'Charge' ? r.power_ch : (r.power_spot + r.power_bal),
            soc: r.soc_pct,
            price: r.price_spot,
            revenue: r.revenue
          };
        });
      };

      const ganttOps: GanttChartData = {
        optimal: optResult ? transformToGantt(optResult) : [],
        models: {},
        dateRange: {
          start: validData[0]?.time || new Date().toISOString(),
          end: validData[validData.length - 1]?.time || new Date().toISOString()
        }
      };

      Object.entries(newModelResults).forEach(([key, val]) => {
        ganttOps.models[key] = transformToGantt(val.optimization);
      });

      setGanttData(ganttOps);

    } catch (e: any) {
      console.error("Simulation failed", e);
      setError(e.message || "Simulation failed");
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <Box sx={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {(isDataLoading || isSimulating) && <LoadingOverlay />}

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

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
                <RevenueAnalysisSidebar
                  areas={areas}
                  selectedArea={selectedArea}
                  onAreaChange={handleAreaChange}
                  models={models}
                  selectedModels={selectedModels}
                  calculatingDatesByModel={calculatingDatesByModel}
                  onModelToggle={handleModelToggle}
                  onModelCalculatingDateChange={handleModelCalculatingDateChange}
                  config={config}
                  onConfigChange={setConfig}
                  onRunSimulation={handleCalculate}
                  isLoading={isSimulating}
                  chartData={chartData}
                  viewOptions={viewOptions}
                  onViewOptionsChange={setViewOptions}
                />
              </Box>
              <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <RevenueAnalysisContainer
                  actualResult={actualResult}
                  modelResults={modelResults}
                  ganttData={ganttData}
                  selectedModels={selectedModels}
                  colors={colors}
                  dt={config.dt}
                  viewOptions={viewOptions}
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
