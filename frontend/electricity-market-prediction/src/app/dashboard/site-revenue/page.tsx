/**
 * 案場收益頁 | Site revenue analysis page — battery simulation and revenue charts.
 */
'use client';

import { Suspense, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Box, Alert, Snackbar, Drawer, IconButton, Typography, Divider } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CloseIcon from '@mui/icons-material/Close';
import { useSearchParams } from 'next/navigation';
import { useMarketDataContext } from '@/context/MarketDataContext';
import { format } from 'date-fns';
import { useTheme } from '@/app/ThemeProvider';
import { useChartColors } from '@/utils/chart-colors';

// Shared Components
import { DashboardToolbar } from '@/components/navigation/DashboardToolbar';
import { PriceChartProvider } from '@/components/price-chart/context/PriceChartContext';

// Feature Components
import { RevenueControlBar } from '@/components/revenue/RevenueControlBar';
import { RevenueAnalysisContainer } from '@/components/revenue/RevenueAnalysisContainer';
import { RevenueParameterPanel } from '@/components/revenue/RevenueParameterPanel';
import ManualScheduleSidebar from '@/components/revenue/ManualScheduleSidebar';

// Hooks
import { usePricePredictionData } from '@/components/forecast/hooks/usePricePredictionData';
import { useRevenuePageData } from '@/hooks/useRevenuePageData';

// Types & Services
import { BatteryConfig, DEFAULT_BATTERY_CONFIG, OptimizationResult, GanttChartData, GanttOperation, ManualSchedule, ManualSlot } from '@/types/revenueAnalysis';
import { calculateRevenue, simulateManual } from '@/services/marketApi';
import { getJepxTimeCode } from '@/utils/jepxUtils';
import { simulateManualClient } from '@/utils/manualSimulationClient';
import { useTranslation } from 'react-i18next';

interface ModelResult {
  optimization: OptimizationResult;
  realizedRevenue: number;
}

function SiteRevenueContent() {
  const searchParams = useSearchParams();
  const { darkMode } = useTheme();
  const { t } = useTranslation('siteRevenue');
  const colors = useChartColors();

  const {
    areas, models, calculatingDatesByModel, selectedArea, selectedModels,
    startDate, endDate, dateRangePreset,
    weatherActual, weatherForecast, imbalanceData, intradayData,
    interconnectionData, occtoAreaData, batteryData, bidPlansData,
    handleAreaChange, handleModelChange, handleModelCalculatingDateChange,
    handleDateRangePreset, refreshData, registerPageNeeds, unregisterPageNeeds,
    selectionVersion, commitDateSelection,
    selectedWeatherModelActual, selectedWeatherModelForecast,
  } = useMarketDataContext();

  const revenueData = useRevenuePageData({
    area: selectedArea,
    startDate,
    endDate,
    selectedModels,
    dateVersion: selectionVersion,
  });

  // Register scopes required for SiteRevenuePage — price only; weather/grid/batteryBid are not used here
  useEffect(() => {
    registerPageNeeds('siteRevenue', new Set(['price']), true);
    return () => unregisterPageNeeds('siteRevenue');
  }, [registerPageNeeds, unregisterPageNeeds]);

  const handleDateChange = (start: Date, end: Date, preset: string | null) => {
    commitDateSelection(start, end, preset);
  };

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
    actualPrices: revenueData.actualPrices,
    predictionsByModel: revenueData.predictionsByModel,
    weatherActual,
    weatherForecast,
  });

  // Local State for Simulation
  const [config, setConfig] = useState<BatteryConfig>(DEFAULT_BATTERY_CONFIG);
  const [actualResult, setActualResult] = useState<OptimizationResult | null>(null);
  const [modelResults, setModelResults] = useState<Record<string, ModelResult>>({});
  const [ganttData, setGanttData] = useState<GanttChartData | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Manual schedule state
  const [manualSchedule, setManualSchedule] = useState<ManualSchedule>({});
  const [manualResult, setManualResult] = useState<{ optimization: OptimizationResult; realizedRevenue: number } | null>(null);
  const [isManualSimulating, setIsManualSimulating] = useState(false);
  const [manualExpanded, setManualExpanded] = useState(false);
  // Reference price source for manual schedule (used by ScenarioGenerator to suggest charge/discharge slots)
  const [manualPriceSource, setManualPriceSource] = useState<string>('actual');
  // Global revenue/price basis — shared between KPI metrics and manual revenue calculation
  const [priceBasis, setPriceBasis] = useState<string>('actual');

  // True until first ganttData arrives — prevents flash of empty state on initial load
  const [isInitializing, setIsInitializing] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [batteryDrawerOpen, setBatteryDrawerOpen] = useState(false);

  // Simulation ID — incremented before every handleCalculate call.
  // handleCalculate reads its own ID at start and discards the result if a newer
  // simulation was started while it was running (prevents async race conditions).
  const currentSimIdRef = useRef(0);

  // Single clearing effect keyed on the revenue session. sessionKey encodes area, dates,
  // models, and selectionVersion — so this fires exactly once for any combination of changes,
  // eliminating the dual-effect race window of the previous design.
  const initialSimulationRun = useRef(false);
  const prevSessionKeyRef = useRef('');
  useEffect(() => {
    if (revenueData.sessionKey === prevSessionKeyRef.current) return;
    prevSessionKeyRef.current = revenueData.sessionKey;
    currentSimIdRef.current += 1;
    setActualResult(null);
    setModelResults({});
    setGanttData(null);
    setManualSchedule({});
    setError(null);
    setIsInitializing(true);
    initialSimulationRun.current = false;
  }, [revenueData.sessionKey]);

  // Models that actually have prediction data in the current date range
  const modelsWithPredictionData = useMemo(() =>
    selectedModels.filter(m => {
      const key = `${m.id}|${m.name}`;
      return chartData.some(d =>
        d.modelPredictions?.some((p: any) =>
          `${p.modelId}|${p.modelName}` === key && p.predictedPrice !== null
        )
      );
    }),
    [selectedModels, chartData]
  );

  // Reset manualPriceSource when the selected model no longer has data in the current range
  useEffect(() => {
    if (manualPriceSource === 'actual') return;
    const validKeys = new Set(modelsWithPredictionData.map(m => `${m.id}|${m.name}`));
    if (!validKeys.has(manualPriceSource)) {
      setManualPriceSource('actual');
    }
  }, [modelsWithPredictionData, manualPriceSource]);

  // Auto-run simulation once all data (actual prices + all selected model predictions) is ready.
  // revenueData.isReady is the single gate — it only becomes true after Promise.allSettled
  // completes for the current session, so partial-model race conditions cannot occur.
  useEffect(() => {
    if (initialSimulationRun.current) return;
    if (!revenueData.isReady || ganttData || isSimulating) return;
    const validData = chartData.filter(d => d.actualPrice !== null || (d.modelPredictions?.length ?? 0) > 0);
    if (validData.length === 0) {
      setIsInitializing(false);
      return;
    }
    initialSimulationRun.current = true;
    handleCalculate();
  }, [revenueData.isReady, ganttData, isSimulating, chartData]);

  // Re-run simulation when battery config changes (debounced 500ms), but only if we had results
  const configDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!ganttData) return;
    if (configDebounceRef.current) clearTimeout(configDebounceRef.current);
    configDebounceRef.current = setTimeout(() => {
      setActualResult(null);
      setModelResults({});
      setGanttData(null);
      setError(null);
      initialSimulationRun.current = false;
    }, 500);
    return () => { if (configDebounceRef.current) clearTimeout(configDebounceRef.current); };
  }, [config]);

  // Handlers
  const handleDownloadRevenueCsv = useCallback(() => {
    if (!ganttData) return;
    const escape = (v: string | number | null | undefined): string => {
      const s = v === null || v === undefined ? '' : String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const rows: string[] = [];

    // Summary section
    rows.push(t('csv.reportTitle'));
    rows.push('');
    if (startDate && endDate) {
      rows.push(`${t('csv.dateRange')},${format(startDate, 'yyyy-MM-dd')},${format(endDate, 'yyyy-MM-dd')}`);
    }
    rows.push(`${t('csv.area')},${escape(selectedArea)}`);
    rows.push(`${t('csv.capacityMwh')},${escape(config.E_cap)}`);
    rows.push(`${t('csv.maxDischargeMw')},${escape(config.P_max_dis)}`);
    rows.push(`${t('csv.maxChargeMw')},${escape(config.P_max_ch)}`);
    rows.push(`${t('csv.timestepH')},${escape(config.dt)}`);
    rows.push('');

    const sumRevenue = (ops: { revenueRealized?: number | null; revenue?: number | null }[]) =>
      ops.reduce((sum, op) => sum + (op.revenueRealized ?? op.revenue ?? 0), 0);

    const optimalRev = ganttData.optimal?.length ? sumRevenue(ganttData.optimal) : 0;
    rows.push(t('csv.summary'));
    rows.push(t('csv.summaryHeader'));
    rows.push(`${escape(t('actions.optimal'))},${escape(optimalRev)},${escape(optimalRev)}`);

    selectedModels.forEach((m) => {
      const key = `${m.id}|${m.name}`;
      const ops = ganttData.models?.[key];
      if (ops?.length) {
        const rev = sumRevenue(ops);
        const realized = modelResults[key]?.realizedRevenue ?? rev;
        rows.push(`${escape(m.name)},${escape(rev)},${escape(realized)}`);
      }
    });

    rows.push('');
    rows.push(t('csv.details'));
    rows.push(t('csv.detailsHeader'));

    const writeOps = (ops: typeof ganttData.optimal, type: string) => {
      if (!ops) return;
      ops.forEach((op) => {
        rows.push([
          escape(type),
          escape(op.datetime),
          escape(op.action),
          escape(op.power),
          escape(op.soc),
          escape(op.price),
          escape(op.revenue),
          escape(op.priceActual),
          escape(op.pricePredicted),
          escape(op.revenueRealized),
        ].join(','));
      });
    };

    writeOps(ganttData.optimal, t('actions.optimal'));
    selectedModels.forEach((m) => {
      const key = `${m.id}|${m.name}`;
      writeOps(ganttData.models?.[key], m.name);
    });

    const csv = rows.join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `revenue_report_${selectedArea || 'site'}_${startDate ? format(startDate, 'yyyyMMdd') : ''}_${endDate ? format(endDate, 'yyyyMMdd') : ''}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, [ganttData, modelResults, config, selectedArea, startDate, endDate, selectedModels]);

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
    // Capture simulation ID at start; discard result if a newer simulation supersedes this one.
    const mySimId = ++currentSimIdRef.current;
    setIsSimulating(true);
    setError(null);
    try {
      // Relax filter: Allow points if they have actualPrice OR any model prediction
      const validData = chartData.filter(d =>
        d.actualPrice !== null || d.modelPredictions.length > 0
      );

      if (validData.length === 0) {
        setError(t('noDataError'));
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
            // If prediction missing, DO NOT fallback to actual prices! Use 0 to prevent "ghost" actual optimizations.
            price = pred?.predictedPrice ?? 0;
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

      // 1. Run Optimal (Actual) - all dates in parallel
      let optResult: OptimizationResult | null = null;
      const hasAllActuals = validData.every(d => d.actualPrice !== null);

      if (hasAllActuals) {
        const optDayResults = await Promise.all(
          dates.map(date => runDailyOptimization(dataByDate[date], true))
        );
        let combinedActualResults: any[] = [];
        let totalActualRevenue = 0;
        for (const result of optDayResults) {
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

      // 2. Run Models - all models and all dates in parallel
      const newModelResults: Record<string, ModelResult> = {};
      const modelResultEntries = await Promise.all(selectedModels.map(async (model) => {
        const modelKey = `${model.id}|${model.name}`;
        const modelDayResults = await Promise.all(
          dates.map(date => runDailyOptimization(dataByDate[date], false, modelKey))
        );
        let combinedModelResults: any[] = [];
        let totalModelRevenue = 0;
        for (const result of modelDayResults) {
          if (result?.results) {
            combinedModelResults = [...combinedModelResults, ...result.results];
            totalModelRevenue += result.summary.total_revenue;
          }
        }
        return { model, modelKey, combinedModelResults, totalModelRevenue };
      }));

      for (const { model, modelKey, combinedModelResults, totalModelRevenue } of modelResultEntries) {
        const modelOpt = {
          status: 'model',
          summary: { total_revenue: totalModelRevenue },
          results: combinedModelResults
        };

        // Calculate Realized Revenue (using Actual Price) & Estimated Revenue (using Predicted Price)
        let totalRealizedRevenue = 0;
        modelOpt.results.forEach((step, idx) => {
          if (idx < validData.length) {
            const actualP = validData[idx].actualPrice;
            const pred = validData[idx].modelPredictions.find(p => `${p.modelId}|${p.modelName}` === modelKey);
            const predictedP = pred?.predictedPrice ?? null;

            const calcPrice = actualP !== null ? actualP : 0;

            const p_spot_kW = step.power_spot * 1000;
            const p_ch_kW = step.power_ch * 1000;
            const deg_cost = ((step.power_spot * config.dt) / config.eff_dis + (step.power_bal * config.dt) * config.beta_bal) * config.Cost_cycle;

            const rev = p_spot_kW * calcPrice * config.dt;
            const cost = p_ch_kW * calcPrice * config.dt;
            const realizedStepRevenue = (rev - cost - deg_cost);
            totalRealizedRevenue += realizedStepRevenue;

            // Estimated revenue: same schedule, but priced at model's predicted price
            let estimatedStepRevenue: number | null = null;
            if (predictedP !== null) {
              const revEst = p_spot_kW * predictedP * config.dt;
              const costEst = p_ch_kW * predictedP * config.dt;
              estimatedStepRevenue = revEst - costEst - deg_cost;
            }

            (step as any)._realizedRevenue = realizedStepRevenue;
            (step as any)._estimatedRevenue = estimatedStepRevenue;
            (step as any)._actualPrice = actualP;
            (step as any)._predictedPrice = predictedP;
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
          // For optimal runs, pricePredicted should be null so it shows "-" in the table instead of the actual price itself
          let pricePredicted = isOptimal ? null : ((r as any)._predictedPrice ?? null);
          let revenueRealized = (r as any)._realizedRevenue ?? r.revenue;

          if (isOptimal) {
            // Recalculate for Optimal (since we built it from combined daily results)
            const calcPrice = priceActual || 0;
            const p_spot_kW = r.power_spot * 1000;
            const p_ch_kW = r.power_ch * 1000;
            const rev = (p_spot_kW * config.dt) * calcPrice;
            const cost = (p_ch_kW * config.dt) * calcPrice;
            const deg_cost = ((r.power_spot * config.dt) / config.eff_dis + (r.power_bal * config.dt) * config.beta_bal) * config.Cost_cycle;
            revenueRealized = rev - cost - deg_cost;
          }

          const isMissingPrediction = !isOptimal && (pricePredicted == null);
          const revenueEstimated = isOptimal ? null : ((r as any)._estimatedRevenue ?? null);

          return {
            timeStep: r.time_step,
            timeCode: timeCode,
            datetime: dateTime,
            action: isMissingPrediction ? null : action,
            power: isMissingPrediction ? null : (action === 'Charge' ? r.power_ch : (r.power_spot + r.power_bal)),
            soc: isMissingPrediction ? null : soc,
            price: isMissingPrediction ? null : r.price_spot,
            revenue: isMissingPrediction ? null : r.revenue,

            // Actual vs Predicted price/revenue fields
            priceActual: isMissingPrediction ? null : priceActual,
            pricePredicted: pricePredicted,
            revenueRealized: isMissingPrediction ? null : revenueRealized,
            revenueEstimated: isMissingPrediction ? null : revenueEstimated,
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

      // Discard result if a newer simulation was started while this one was running
      if (mySimId !== currentSimIdRef.current) return;

      setGanttData(ganttOps);
      setIsInitializing(false);

    } catch (e: any) {
      if (mySimId !== currentSimIdRef.current) return;
      console.error("Simulation failed", e);
      setError(e.message || "Simulation failed");
      setIsInitializing(false);
    } finally {
      if (mySimId === currentSimIdRef.current) {
        setIsSimulating(false);
      }
    }
  };

  // Available dates from loaded data
  const availableDates = useMemo(() => {
    const dateSet = new Set<string>();
    chartData.forEach(d => {
      if (d.dateTime) dateSet.add(d.dateTime.substring(0, 10));
    });
    return Array.from(dateSet).sort();
  }, [chartData]);

  // Spot prices indexed by date for SoC preview in ManualScheduleEditor
  // Source depends on manualPriceSource: 'actual' uses real JEPX prices; a modelKey uses predicted prices
  const spotPricesByDate = useMemo(() => {
    const map: Record<string, number[]> = {};
    chartData.forEach(d => {
      if (!d.dateTime) return;
      const date = d.dateTime.substring(0, 10);
      if (!map[date]) map[date] = [];
      if (manualPriceSource === 'actual') {
        map[date].push(d.actualPrice ?? 0);
      } else {
        const pred = d.modelPredictions?.find((p: any) => `${p.modelId}|${p.modelName}` === manualPriceSource);
        map[date].push(pred?.predictedPrice ?? d.actualPrice ?? 0);
      }
    });
    return map;
  }, [chartData, manualPriceSource]);

  // Revenue prices indexed by date — used in simulateManualClient to calculate revenue for manual schedule
  const revenuePricesByDate = useMemo(() => {
    const map: Record<string, number[]> = {};
    chartData.forEach(d => {
      if (!d.dateTime) return;
      const date = d.dateTime.substring(0, 10);
      if (!map[date]) map[date] = [];
      if (priceBasis === 'actual') {
        map[date].push(d.actualPrice ?? 0);
      } else {
        const pred = d.modelPredictions?.find((p: any) => `${p.modelId}|${p.modelName}` === priceBasis);
        map[date].push(pred?.predictedPrice ?? d.actualPrice ?? 0);
      }
    });
    return map;
  }, [chartData, priceBasis]);

  // Auto-update ganttData.manual immediately on schedule/config change (client-side simulation)
  const manualScheduleRef = useRef(manualSchedule);
  manualScheduleRef.current = manualSchedule;
  useEffect(() => {
    if (availableDates.length === 0) return;

    const timer = setTimeout(() => {
      const manualGanttOps: GanttOperation[] = [];
      let carryOverSoc: number | undefined;

      for (const date of availableDates) {
        const dayData = chartData.filter(d => d.dateTime?.startsWith(date));
        if (dayData.length === 0) continue;

        const slots: ManualSlot[] = manualScheduleRef.current[date]
          ?? Array.from({ length: dayData.length }, (_, i) => ({ timeStep: i, action: 'Idle' as const, power: null }));

        // Reference prices: for display (ScenarioGenerator / slot selection)
        const refPrices = spotPricesByDate[date] ?? dayData.map(d => d.actualPrice ?? 0);
        // Revenue prices: for revenue calculation (收益計算基準)
        const revPrices = revenuePricesByDate[date] ?? dayData.map(d => d.actualPrice ?? 0);
        const preview = simulateManualClient(slots, config, revPrices, carryOverSoc);
        // Carry SoC forward to next day
        const lastSlot = preview.slots[preview.slots.length - 1];
        if (lastSlot) carryOverSoc = lastSlot.socAfter;

        const currentSlots = manualScheduleRef.current[date] ?? [];
        const slotMap = new Map(currentSlots.map(sl => [sl.timeStep, sl]));
        preview.slots.forEach((s, idx) => {
          const slotDatetime = dayData[idx]?.dateTime || `${date}T00:00:00`;
          const originalSlot = slotMap.get(s.timeStep);
          const requestedPower = originalSlot && originalSlot.action !== 'Idle'
            ? (originalSlot.power ?? (originalSlot.action === 'Charge' ? config.P_max_ch : config.P_max_dis))
            : null;

          // revenueRealized: re-compute revenue using actual price so it's always
          // at actual settlement prices regardless of the current priceBasis.
          const actualPrice = dayData[idx]?.actualPrice ?? null;
          let revenueRealized: number | null = null;
          if (actualPrice !== null && s.action !== 'Idle') {
            if (s.action === 'Charge') {
              revenueRealized = -(s.effectivePower * 1000 * actualPrice * config.dt);
            } else {
              const effDis = config.eff_dis > 0 ? config.eff_dis : 1;
              const degCost = (s.effectivePower * config.dt / effDis) * config.Cost_cycle;
              revenueRealized = s.effectivePower * 1000 * actualPrice * config.dt - degCost;
            }
          } else if (s.action === 'Idle') {
            revenueRealized = 0;
          }

          manualGanttOps.push({
            timeStep: s.timeStep,
            timeCode: getJepxTimeCode(slotDatetime),
            datetime: slotDatetime,
            action: s.action === 'Idle' ? 'Idle' : s.action,
            power: s.effectivePower,
            soc: config.E_cap > 0 ? s.socAfter / config.E_cap : 0,
            price: revPrices[idx] ?? null,
            revenue: s.revenue,
            priceActual: actualPrice,
            pricePredicted: refPrices[idx] ?? null,
            revenueRealized,
            requestedPower,
            wasClamped: s.wasClamped && (originalSlot?.action !== 'Idle'),
          });
        });
      }

      setGanttData(prev => {
        if (!prev) return null;
        return { ...prev, manual: manualGanttOps };
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [manualSchedule, config, availableDates, spotPricesByDate, revenuePricesByDate, chartData]);

  // Manual simulation handler
  const handleManualSimulate = useCallback(async () => {
    setIsManualSimulating(true);
    setError(null);
    try {
      const validData = chartData.filter(d => d.actualPrice !== null || d.modelPredictions.length > 0);
      if (validData.length === 0) {
        setError(t('noManualDataError'));
        return;
      }

      const dataByDate: Record<string, any[]> = {};
      validData.forEach(d => {
        const dateStr = d.dateTime.substring(0, 10);
        if (!dataByDate[dateStr]) dataByDate[dateStr] = [];
        dataByDate[dateStr].push(d);
      });

      const dates = Object.keys(dataByDate).sort();
      let combinedResults: any[] = [];
      let totalRevenue = 0;

      for (const date of dates) {
        const dayData = dataByDate[date];
        const T = dayData.length;
        const currentConfig = { ...config, T };

        const inputData = dayData.map(d => ({
          Spot_Price: d.actualPrice ?? 0,
          Bal_Price: 0,
          Mask_Ch: 1,
          Mask_Dis: 1,
        }));

        // Get slots for this date (default all-Idle)
        const daySlots: ManualSlot[] = manualSchedule[date]
          ?? Array.from({ length: T }, (_, i) => ({ timeStep: i, action: 'Idle' as const, power: null }));

        const schedule = daySlots.slice(0, T).map(s => ({
          time_step: s.timeStep,
          action: s.action,
          power: s.power,
        }));

        const res = await simulateManual(currentConfig, inputData, schedule);
        if (res?.results) {
          combinedResults = [...combinedResults, ...res.results];
          totalRevenue += res.summary.total_revenue;
        }
      }

      const manualOpt: OptimizationResult = {
        status: 'manual',
        summary: { total_revenue: totalRevenue },
        results: combinedResults,
      };

      // Calculate realized revenue & build GanttOperation[]
      let totalRealizedRevenue = 0;
      const manualGanttOps: GanttOperation[] = manualOpt.results.map((r: any, idx: number) => {
        const dateTime = validData[idx]?.dateTime || new Date().toISOString();
        const timeCode = getJepxTimeCode(dateTime);
        const actualP = validData[idx]?.actualPrice ?? null;

        const calcPrice = actualP ?? 0;
        const p_spot_kW = r.power_spot * 1000;
        const p_ch_kW = r.power_ch * 1000;
        const rev = (p_spot_kW * config.dt) * calcPrice;
        const cost = (p_ch_kW * config.dt) * calcPrice;
        const deg_cost = ((r.power_spot * config.dt) / config.eff_dis + (r.power_bal * config.dt) * config.beta_bal) * config.Cost_cycle;
        const stepRealized = rev - cost - deg_cost;
        totalRealizedRevenue += stepRealized;

        const soc = Math.min(1, Math.max(0, (r.soc_pct ?? 0) / 100));
        let action: GanttOperation['action'] = 'Idle';
        if (r.action === 'Charge') action = 'Charge';
        if (r.action === 'Discharge') action = 'Discharge';
        if (r.action === 'Spot') action = 'Spot';

        return {
          timeStep: r.time_step,
          timeCode,
          datetime: dateTime,
          action,
          power: action === 'Charge' ? r.power_ch : (r.power_spot + r.power_bal),
          soc,
          price: r.price_spot,
          revenue: r.revenue,
          priceActual: actualP,
          pricePredicted: null,
          revenueRealized: stepRealized,
        };
      });

      setGanttData(prev => prev ? { ...prev, manual: manualGanttOps } : {
        optimal: [],
        models: {},
        manual: manualGanttOps,
        dateRange: { start: validData[0]?.dateTime || '', end: validData[validData.length - 1]?.dateTime || '' },
      });
      setManualResult({ optimization: manualOpt, realizedRevenue: totalRealizedRevenue });

    } catch (e: any) {
      console.error("Manual simulation failed", e);
      setError(e.message || "Manual simulation failed");
    } finally {
      setIsManualSimulating(false);
    }
  }, [chartData, config, manualSchedule]);

  return (
    <Box sx={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
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
              onDateChange={handleDateChange}
              onDateRangePreset={handleDateRangePreset}
              onRefresh={handleRefresh}
              downloadActions={ganttData ? [{ label: t('downloadCsv'), onClick: handleDownloadRevenueCsv }] : []}
              currentTab="site-revenue"
              isLoading={revenueData.isFetching || isSimulating}
            />
          </Box>

          <RevenueControlBar
            onModelToggle={handleModelToggle}
            chartData={chartData}
            onOpenBatteryConfig={() => setBatteryDrawerOpen(v => !v)}
            batteryConfigOpen={batteryDrawerOpen}
          />

          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {error && (
              <Alert onClose={() => setError(null)} severity="error" sx={{ mb: 0.5, borderRadius: 1 }}>
                {error}
              </Alert>
            )}
            <Box sx={{ flex: 1, flexShrink: 0, minHeight: 350, overflow: 'hidden' }}>
              <RevenueAnalysisContainer
                actualResult={actualResult}
                modelResults={modelResults}
                ganttData={ganttData}
                selectedModels={selectedModels}
                colors={colors}
                dt={config.dt}
                batteryECap={config.E_cap}
                cycleLimit={config.Cycle_limit}
                isSimulating={isSimulating}
                isDataLoading={revenueData.isFetching}
                isInitializing={isInitializing}
                onRunSimulation={handleCalculate}
                manualResult={manualResult}
                priceBasis={priceBasis}
                onPriceBasisChange={setPriceBasis}
              />
            </Box>
            {/* Manual Schedule — below charts, collapsible */}
            <Box sx={{ flexShrink: 0, borderTop: '1px solid var(--card-border)', bgcolor: 'var(--card-bg)' }}>
              <ManualScheduleSidebar
                manualSchedule={manualSchedule}
                onManualScheduleChange={setManualSchedule}
                config={config}
                availableDates={availableDates}
                spotPricesByDate={spotPricesByDate}
                revenuePricesByDate={revenuePricesByDate}
                expanded={manualExpanded}
                onToggleExpanded={() => setManualExpanded(prev => !prev)}
                priceSource={manualPriceSource}
                onPriceSourceChange={setManualPriceSource}
                area={selectedArea}
                availableModels={modelsWithPredictionData.map(m => ({
                  id: String(m.id),
                  name: m.name,
                }))}
              />
            </Box>
          </Box>

          {/* Battery Config Drawer */}
          <Drawer
            anchor="right"
            open={batteryDrawerOpen}
            onClose={() => setBatteryDrawerOpen(false)}
            PaperProps={{
              sx: {
                width: 320,
                bgcolor: 'var(--card-bg)',
                borderLeft: '1px solid var(--card-border)',
                display: 'flex',
                flexDirection: 'column',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, borderBottom: '1px solid var(--card-border)', flexShrink: 0 }}>
              <Typography variant="subtitle2" fontWeight={700}>{t('batteryConfig')}</Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <IconButton
                  size="small"
                  onClick={() => setConfig(DEFAULT_BATTERY_CONFIG)}
                  title={t('resetDefaults')}
                  sx={{ color: 'var(--text-secondary)', '&:hover': { color: 'var(--primary)' } }}
                >
                  <RestartAltIcon sx={{ fontSize: '1rem' }} />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => setBatteryDrawerOpen(false)}
                  sx={{ color: 'var(--text-secondary)' }}
                >
                  <CloseIcon sx={{ fontSize: '1rem' }} />
                </IconButton>
              </Box>
            </Box>
            <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
              <RevenueParameterPanel config={config} onChange={setConfig} />
            </Box>
          </Drawer>
        </Box>
      </PriceChartProvider>
    </Box>
  );
}

function SiteRevenueFallback() {
  const { t } = useTranslation('common');
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>{t('loading')}</Box>
  );
}

export default function SiteRevenuePage() {
  return (
    <Suspense fallback={<SiteRevenueFallback />}>
      <SiteRevenueContent />
    </Suspense>
  );
}
