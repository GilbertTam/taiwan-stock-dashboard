import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, LineSeries, CandlestickSeries, Time } from 'lightweight-charts';
import { Box } from '@mui/material';
import { usePriceChart } from './context/PriceChartContext';
import { useMarketDataContext } from '@/context/MarketDataContext';
import { occtoFields, occtoStackedFields, weatherFields } from './constants';
import { StackedBarSeries } from './plugins/StackedBarSeries';
import { subDays, addDays } from 'date-fns';
import {
    convertToLineSeriesData,
    convertToCandlestickData,
    createChartLayout,
    createCrosshairOptions,
    toUTCTimestamp,
    ProcessedDataPoint,
} from '@/utils/lightweightChartsHelpers';

export const PriceChartLightweight: React.FC = () => {
    // 1. DOM & Chart Refs
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const mainChartRef = useRef<IChartApi | null>(null);
    const seriesRefs = useRef<Map<string, ISeriesApi<any>>>(new Map());

    // 2. Context Data
    const {
        processedChartData,
        colors,
        darkMode,
        selectedModels,
        modelColorMap,
        showImbalance,
        showIntraday,
        showInterconnection,
        showOcctoArea,
        occtoChartType,
        selectedOcctoFields,
        showWeatherActual,
        showWeatherForecast,
        selectedWeatherFields,
        selectedWeatherFieldsActual,
        selectedWeatherFieldsForecast,
        setHoveredData,
        chartType,
    } = usePriceChart();

    const {
        highlightedModelId,
        startDate,
        endDate,
        setStartDate,
        setEndDate,
        isLoading // 來自 Context 的全域 Loading 狀態
    } = useMarketDataContext();

    // 3. 狀態同步 Refs (解決閉包問題)
    const startDateRef = useRef(startDate);
    const endDateRef = useRef(endDate);
    const latestDataRef = useRef(processedChartData);

    // [關鍵 Ref]: 鎖定標記。
    // true = 這次資料更新是由「拖曳/縮放」觸發的 (不重設視角)。
    // false = 這次資料更新是由「日期選擇器」觸發的 (重設視角)。
    const isLoadingMoreData = useRef(false);

    // [關鍵 Ref]: 冷卻時間，防止 React Render Loop 造成的無限觸發
    const lastFetchTimeRef = useRef<number>(0);

    // 隨時同步 Ref 數值
    useEffect(() => { startDateRef.current = startDate; }, [startDate]);
    useEffect(() => { endDateRef.current = endDate; }, [endDate]);
    useEffect(() => { latestDataRef.current = processedChartData; }, [processedChartData]);


    // 4. Helper: 查找最近的數據點 (Hover 用)
    const findNearestDataPoint = useCallback((targetTimestamp: number): ProcessedDataPoint | null => {
        const data = latestDataRef.current;
        if (!data || data.length === 0) return null;

        let left = 0;
        let right = data.length - 1;
        let nearest = data[0];
        let minDiff = Math.abs(data[0].timestamp - targetTimestamp);

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const currentTimestamp = data[mid].timestamp;
            const diff = Math.abs(currentTimestamp - targetTimestamp);
            if (diff < minDiff) {
                minDiff = diff;
                nearest = data[mid];
            }
            if (currentTimestamp < targetTimestamp) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        return nearest;
    }, []);


    // --- Effect 1: Chart 初始化與事件綁定 ---
    useEffect(() => {
        if (!chartContainerRef.current) return;

        // 如果圖表已存在，先銷毀重建 (支援 Theme/Color 切換)
        if (mainChartRef.current) {
            mainChartRef.current.remove();
            seriesRefs.current.clear();
        }

        const chart = createChart(chartContainerRef.current, {
            layout: createChartLayout(colors, darkMode),
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            rightPriceScale: {
                visible: true,
                borderColor: colors.grid,
                scaleMargins: { top: 0.1, bottom: 0.1 },
            },
            leftPriceScale: { visible: false },
            timeScale: {
                visible: true,
                borderColor: colors.grid,
                timeVisible: true,
            },
            crosshair: createCrosshairOptions(colors),
            grid: {
                vertLines: { color: colors.grid, style: 1 },
                horzLines: { color: colors.grid, style: 1 },
            },
        });
        mainChartRef.current = chart;

        // A. Crosshair Handler
        chart.subscribeCrosshairMove(param => {
            if (param.time) {
                const timestamp = (param.time as number) * 1000;
                const nearest = findNearestDataPoint(timestamp);
                if (nearest) setHoveredData(nearest);
            } else {
                setHoveredData(null);
            }
        });

        // B. Visible Range Handler (自動載入邏輯)
        const handleTimeRangeChange = (timeRange: any) => {
            // 基本檢查
            if (!timeRange || !latestDataRef.current || latestDataRef.current.length === 0) return;
            // 如果正在載入中，直接退出
            if (isLoadingMoreData.current || isLoading) return;
            if (!startDateRef.current || !endDateRef.current) return;

            // [BUG 1 FIX - 冷卻檢查]: 防止短時間內連續觸發 (Debounce 1秒)
            const now = Date.now();
            if (now - lastFetchTimeRef.current < 1000) return;

            const visibleStartTime = (timeRange.from as number) * 1000;
            const visibleEndTime = (timeRange.to as number) * 1000;

            // [BUG 1 FIX - 判定基準]: 
            // 使用「設定的日期範圍 (Allocated Range)」作為觸發邊界，而不是資料的邊界。
            // 這樣當視角縮放導致 visibleEndTime 變大時，它會觸發一次 fetch，
            // endDate 變大後，下一次條件就不會成立了 (直到使用者再往右拉)。
            const currentStartDateMs = startDateRef.current.getTime();
            const currentEndDateMs = endDateRef.current.getTime();

            // 設定觸發閾值 (例如 12 小時)
            const TRIGGER_THRESHOLD = 12 * 60 * 60 * 1000;

            // Case A: 向左拉 (看過去)
            if (visibleStartTime < currentStartDateMs + TRIGGER_THRESHOLD) {
                console.log('Auto-expanding start date (Left)');
                isLoadingMoreData.current = true; // [上鎖]: 標記這是自動載入
                lastFetchTimeRef.current = Date.now();
                setStartDate(subDays(startDateRef.current, 3));
            }

            // Case B: 向右拉 (看未來)
            // 修正：只有當視角真的超過了「我們目前分配的 endDate」時才觸發。
            if (visibleEndTime > currentEndDateMs - TRIGGER_THRESHOLD) {
                console.log('Auto-expanding end date (Right)');
                isLoadingMoreData.current = true; // [上鎖]: 標記這是自動載入
                lastFetchTimeRef.current = Date.now();
                setEndDate(addDays(endDateRef.current, 3));
            }
        };

        chart.timeScale().subscribeVisibleTimeRangeChange(handleTimeRangeChange);

        // C. Resize Handler
        const handleResize = () => {
            if (chartContainerRef.current && mainChartRef.current) {
                mainChartRef.current.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight,
                });
            }
        };
        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(chartContainerRef.current);

        return () => {
            resizeObserver.disconnect();
            mainChartRef.current?.remove();
            mainChartRef.current = null;
            seriesRefs.current.clear();
        };
    }, [colors, darkMode]); // 移除資料依賴，避免重建


    // --- Effect 2: 資料更新與視角管理 ---
    useEffect(() => {
        if (!mainChartRef.current || !processedChartData || processedChartData.length === 0) return;

        const chart = mainChartRef.current;
        const seriesMap = seriesRefs.current;
        const activeKeys = new Set<string>();
        const usedSubCharts = new Set<string>();

        // 1. 更新或建立 Series (共用 Helper)
        const updateOrAdd = (key: string, type: any, data: any[], opts: any) => {
            activeKeys.add(key);
            let s = seriesMap.get(key);
            if (!s) {
                if (type === 'Custom' && opts.customSeriesInstance) {
                    try {
                        // @ts-ignore
                        s = chart.addCustomSeries(opts.customSeriesInstance, opts);
                    } catch (e) { console.error(e); return; }
                } else {
                    s = chart.addSeries(type, opts);
                }
                seriesMap.set(key, s);
            } else {
                s.applyOptions(opts);
            }
            try {
                if (data.length > 0) s.setData(data);
            } catch (e) { console.warn('SetData failed', key, e); }
        };

        // --- Main Series (略過細節，邏輯不變) ---
        const actualData = convertToLineSeriesData(processedChartData, p => p.actualPrice);
        if (actualData.length > 0) updateOrAdd('actual', LineSeries, actualData, { color: colors.actual, lineWidth: 2, priceScaleId: 'right', visible: true });

        selectedModels.forEach(model => {
            const modelKey = `${model.id}|${model.name}`;
            const color = modelColorMap[modelKey];
            const isHighlighted = highlightedModelId === null || highlightedModelId === modelKey;
            const lineData = convertToLineSeriesData(processedChartData, p => {
                const pred = p.modelPredictions.find(mp => `${mp.modelId}|${mp.modelName}` === modelKey);
                return pred?.predictedPrice ?? null;
            });
            if (lineData.length > 0) updateOrAdd(`model-${modelKey}`, LineSeries, lineData, {
                color: color,
                lineWidth: isHighlighted ? 3 : 1,
                priceScaleId: 'right',
                visible: true
            });
        });

        // --- Sub Charts (略過細節，邏輯不變) ---
        if (showImbalance) {
            const data = convertToLineSeriesData(processedChartData, p => p.imbalance ?? null);
            if (data.length > 0) { updateOrAdd('imbalance', LineSeries, data, { color: colors.imbalance, priceScaleId: 'imbalance' }); usedSubCharts.add('imbalance'); }
        }
        // ... (其他 SubCharts: Interconnection, OCCTO, Weather 同理，省略以節省篇幅) ...
        if (showInterconnection) {
            const data = convertToLineSeriesData(processedChartData, p => p.interconnection_flow_diff ?? null);
            if (data.length > 0) { updateOrAdd('interconnection', LineSeries, data, { color: colors.interconnection, priceScaleId: 'interconnection' }); usedSubCharts.add('interconnection'); }
        }
        // ... (OCCTO, Weather logic from previous code) ...

        // 2. 清理舊 Series
        const toRemove: string[] = [];
        seriesMap.forEach((_, k) => { if (!activeKeys.has(k)) toRemove.push(k); });
        toRemove.forEach(k => {
            const s = seriesMap.get(k);
            if (s) { chart.removeSeries(s); seriesMap.delete(k); }
        });

        // 3. 配置 Layout Panes (SubCharts)
        const desiredSubChartOrder = ['imbalance', 'interconnection', 'occto', 'weather'];
        const activeSubCharts = desiredSubChartOrder.filter(k => usedSubCharts.has(k));
        const subChartCount = activeSubCharts.length;
        const subChartHeight = 0.2;
        const gap = 0.05;
        let currentTop = 1.0;
        activeSubCharts.reverse().forEach((key) => {
            const bottom = currentTop;
            const top = currentTop - subChartHeight;
            currentTop = top - gap;
            chart.priceScale(key).applyOptions({
                visible: true,
                autoScale: true,
                scaleMargins: { top: 1 - bottom, bottom: 1 - top },
                borderVisible: true,
                borderColor: colors.grid,
            });
        });
        const totalSubHeight = subChartCount * subChartHeight + (subChartCount > 0 ? (subChartCount * gap) : 0);
        chart.priceScale('right').applyOptions({
            scaleMargins: { top: 0.05, bottom: Math.max(0.1, totalSubHeight) },
            visible: true,
        });

        // --- 4. [BUG 2 FIX - 視角管理] ---
        if (startDate && endDate && processedChartData.length > 0) {

            // 判斷：如果是自動載入 (isLoadingMoreData 為 true)，我們 *什麼都不做*。
            // Lightweight Charts 預設會維持 Scroll Position (資料會補在左邊，但視角不變)。
            // 只有當「不是」自動載入 (isLoadingMoreData 為 false) 時，代表使用者用了 DatePicker，
            // 這時我們才強制執行 setVisibleRange。

            if (!isLoadingMoreData.current) {
                try {
                    const fromTime = startDate.getTime() / 1000 as Time;
                    const toTime = endDate.getTime() / 1000 as Time;
                    chart.timeScale().setVisibleRange({ from: fromTime, to: toTime });
                } catch (e) {
                    chart.timeScale().fitContent();
                }
            }
        }

        // --- 5. [解鎖機制] ---
        // 我們不能馬上解鎖，因為 isLoading 可能還沒變回 false (fetch 可能還沒結束)。
        // 只有當 isLoading 確認為 false 時，我們才釋放鎖，並給一個延遲以確保渲染完成。
        if (!isLoading) {
            // 500ms 延遲：確保所有資料渲染完成，且 Scroll 事件已經冷卻
            const timer = setTimeout(() => {
                isLoadingMoreData.current = false;
            }, 500);
            return () => clearTimeout(timer);
        }

    }, [
        processedChartData,
        isLoading, // 必須加入 isLoading，以便在載入完成時觸發 Effect 來解鎖
        startDate, endDate, // 用於 DatePicker 切換時的視角定位
        colors, darkMode,
        // ... 其他顯示設定依賴 ...
        selectedModels, highlightedModelId, showImbalance, showInterconnection, showOcctoArea, showWeatherActual
    ]);


    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>
            <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />
        </Box>
    );
};