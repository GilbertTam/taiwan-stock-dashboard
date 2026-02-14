/**
 * 案場收益頁 | Site revenue analysis page — battery simulation and revenue charts.
 */
'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
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
import { BatteryConfig, DEFAULT_BATTERY_CONFIG, OptimizationResult, GanttChartData, GanttOperation } from '@/types/revenueAnalysis';
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

  const [error, setError] = useState<string | null>(null);

  // Clear results when core data changes (date/area/model); allow auto re-run after
  const initialSimulationRun = useRef(false);
  useEffect(() => {
    setActualResult(null);
    setModelResults({});
    setGanttData(null);
    setError(null);
    initialSimulationRun.current = false;
  }, [chartData.length, selectedModels.length]);

  // Auto-run simulation when page has valid data (including after date/area change)
  useEffect(() => {
    if (initialSimulationRun.current) return;
    const validData = chartData.filter(d => d.actualPrice !== null || (d.modelPredictions?.length ?? 0) > 0);
    if (validData.length > 0 && selectedModels.length > 0 && !ganttData && !isSimulating) {
      initialSimulationRun.current = true;
      handleCalculate();
    }
  }, [chartData, selectedModels.length, ganttData, isSimulating]);

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

      // Group data by date
      const dataByDate: Record<string, any[]> = {};
      validData.forEach(d => {
        const dateStr = d.dateTime.substring(0, 10);
        if (!dataByDate[dateStr]) dataByDate[dateStr] = [];
        dataByDate[dateStr].push(d);
      });

      const dates = Object.keys(dataByDate).sort();

      // Helper to run optimization for a specific set of data (one day)
      const runDailyOptimization = async (dayData: any[], useActuals: boolean, modelKey?: string) => {
        const T = dayData.length;
        const currentConfig = { ...config, T }; // Independent daily config

        const inputData = dayData.map(d => {
          let price = 0;
          if (useActuals) {
            price = d.actualPrice ?? 0;
          } else if (modelKey) {
            const pred = d.modelPredictions.find((p: any) => `${p.modelId}|${p.modelName}` === modelKey);
            // If prediction missing, fallback to actual or 0 (but usually we filter for valid points)
            price = pred?.predictedPrice ?? d.actualPrice ?? 0;
          }
          return {
            Spot_Price: price,
            Bal_Price: 0,
            Mask_Ch: 1,
            Mask_Dis: 1
          };
        });

        const res = await calculateRevenue(currentConfig, inputData);
        // Map back to global time
        if (res?.results) {
          res.results = res.results.map((r: any, idx: number) => ({
            ...r,
            time: dayData[idx].time // Keep original time reference if needed
          }));
        }
        return res;
      };

      // 1. Run Optimal (Actual) - day by day
      let optResult: OptimizationResult | null = null;
      const hasAllActuals = validData.every(d => d.actualPrice !== null);

      if (hasAllActuals) {
        let combinedActualResults: any[] = [];
        let totalActualRevenue = 0;
        for (const date of dates) {
          const dayData = dataByDate[date];
          const result = await runDailyOptimization(dayData, true);
          if (result?.results) {
            combinedActualResults = [...combinedActualResults, ...result.results];
            totalActualRevenue += result.summary.total_revenue;
          }
        }
        optResult = {
          status: 'Optimal',
          summary: { total_revenue: totalActualRevenue },
          results: combinedActualResults
        };
        setActualResult(optResult);
      } else {
        setActualResult(null);
      }

      // 2. Run Models - day by day
      const newModelResults: Record<string, ModelResult> = {};
      for (const model of selectedModels) {
        const modelKey = `${model.id}|${model.name}`;
        let combinedModelResults: any[] = [];
        let totalModelRevenue = 0;
        for (const date of dates) {
          const dayData = dataByDate[date];
          const result = await runDailyOptimization(dayData, false, modelKey);
          if (result?.results) {
            combinedModelResults = [...combinedModelResults, ...result.results];
            totalModelRevenue += result.summary.total_revenue;
          }
        }
        const modelOpt = {
          status: 'model',
          summary: { total_revenue: totalModelRevenue },
          results: combinedModelResults
        };

        // Calculate Realized Revenue (using Actual Price)
        let totalRealizedRevenue = 0;
        modelOpt.results.forEach((step, idx) => {
          if (idx < validData.length) {
            const actualP = validData[idx].actualPrice;
            const pred = validData[idx].modelPredictions.find(p => `${p.modelId}|${p.modelName}` === modelKey);

            const calcPrice = actualP !== null ? actualP : 0;

            const p_spot_kW = step.power_spot * 1000;
            const p_ch_kW = step.power_ch * 1000;
            const rev = p_spot_kW * calcPrice * config.dt;
            const cost = p_ch_kW * calcPrice * config.dt;
            const deg_cost = ((step.power_spot * config.dt) / config.eff_dis + (step.power_bal * config.dt) * config.beta_bal) * config.Cost_cycle;

            const realizedStepRevenue = (rev - cost - deg_cost);
            totalRealizedRevenue += realizedStepRevenue;

            (step as any)._realizedRevenue = realizedStepRevenue;
            (step as any)._actualPrice = actualP;
            (step as any)._predictedPrice = pred?.predictedPrice ?? null;
          }
        });
        newModelResults[modelKey] = { optimization: modelOpt, realizedRevenue: totalRealizedRevenue };
      }
      setModelResults(newModelResults);

      // 3. Prepare Gantt Data
      const transformToGantt = (optimization: OptimizationResult, isOptimal: boolean = false): GanttOperation[] => {
        return optimization.results.map((r: any, idx: number) => {
          // Fix 6: Use dateTime (YYYY-MM-DD HH:mm) instead of time (HH:mm) for accurate parsing
          const dateTime = validData[idx]?.dateTime || new Date().toISOString();
          const timeCode = getJepxTimeCode(dateTime);

          let action: GanttOperation['action'] = 'Idle';
          if (r.action === 'Charge') action = 'Charge';
          if (r.action === 'Spot') action = 'Spot';
          if (r.action === 'Balance') action = 'Balance';

          // Backend returns soc_pct 0-100; normalize to 0-1 for frontend
          const soc = Math.min(1, Math.max(0, (r.soc_pct ?? 0) / 100));

          // Determine prices and realized revenue
          let priceActual = validData[idx]?.actualPrice ?? null;
          let pricePredicted = (r as any)._predictedPrice ?? r.price_spot; // Default to spot if not set
          let revenueRealized = (r as any)._realizedRevenue ?? r.revenue;

          if (isOptimal) {
            // For Optimal, Predicted = Actual
            pricePredicted = priceActual;
            // Recalculate for Optimal (since we built it from combined daily results)

            const calcPrice = priceActual || 0;
            const p_spot_kW = r.power_spot * 1000;
            const p_ch_kW = r.power_ch * 1000;
            const rev = (p_spot_kW * config.dt) * calcPrice;
            const cost = (p_ch_kW * config.dt) * calcPrice;
            const deg_cost = ((r.power_spot * config.dt) / config.eff_dis + (r.power_bal * config.dt) * config.beta_bal) * config.Cost_cycle;
            revenueRealized = rev - cost - deg_cost;
          }

          return {
            timeStep: r.time_step,
            timeCode: timeCode,
            datetime: dateTime,
            action: action,
            power: action === 'Charge' ? r.power_ch : (r.power_spot + r.power_bal),
            soc: soc,
            price: r.price_spot, // Keep original "price used for decision" or just spot
            revenue: r.revenue,  // Keep original "projected revenue"

            // New fields
            priceActual: priceActual,
            pricePredicted: pricePredicted,
            revenueRealized: revenueRealized
          };
        });
      };

      const ganttOps: GanttChartData = {
        optimal: optResult ? transformToGantt(optResult, true) : [],
        models: {},
        dateRange: {
          // Fix 8: Use dateTime to ensure valid date parsing in Gantt chart
          start: validData[0]?.dateTime || new Date().toISOString(),
          end: validData[validData.length - 1]?.dateTime || new Date().toISOString()
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
