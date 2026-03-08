/**
 * Lightweight Charts 生命週期管理 Hook
 * Lightweight Charts lifecycle management hook.
 *
 * 處理圖表實例的建立、掛載、調整尺寸（ResizeObserver）及清理。
 * Handles the creation, mounting, responsive resizing, and cleanup of chart instances.
 */
import { useEffect, useRef, RefObject } from 'react';
import {
    createChart,
    IChartApi,
    LineStyle,
    ChartOptions,
    DeepPartial,
} from 'lightweight-charts';
import {
    createChartLayout,
    createCrosshairOptions,
} from '@/utils/lightweightChartsHelpers';
import { formatInTimezone } from '@/utils/chartUtils';

/**
 * Hook 參數介面
 * Hook parameters interface
 */
interface UseChartLifecycleParams {
    /** 圖表容器的 DOM 參考 / DOM ref for the chart container */
    containerRef: RefObject<HTMLDivElement | null>;
    /** 圖表顏色設定 / Chart color configuration */
    colors: any;
    /** 是否為深色模式 / Whether dark mode is enabled */
    darkMode: boolean;
    /** 顯示時區（預設 UTC）/ Display timezone (default UTC) */
    timezone?: string;
    /** 額外的圖表設定選項 / Additional chart configuration options */
    chartOptions?: DeepPartial<ChartOptions>;
}

export const useChartLifecycle = ({
    containerRef,
    colors,
    darkMode,
    timezone = 'UTC',
    chartOptions = {},
    showRightAxisLabels = true,
}: UseChartLifecycleParams & { showRightAxisLabels?: boolean }) => {
    const chartRef = useRef<IChartApi | null>(null);
    // Use ref for chartOptions to avoid infinite re-renders from object reference changes
    const chartOptionsRef = useRef(chartOptions);
    chartOptionsRef.current = chartOptions;

    // NOTE: right price scale is kept always visible.
    // The `showRightAxisLabels` flag is used by series/options to control
    // label visibility (names) instead of hiding the entire axis.

    useEffect(() => {
        if (!containerRef.current) return;

        // Clean up previous instance
        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
        }

        const defaultOptions: DeepPartial<ChartOptions> = {
            layout: createChartLayout(colors, darkMode),
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
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
                secondsVisible: true,
                tickMarkFormatter: (time: number) => {
                    return formatInTimezone(time, timezone, {
                        month: 'numeric', day: 'numeric',
                        hour: 'numeric', minute: 'numeric', hour12: false
                    }).replace(',', '');
                },
            },
            crosshair: createCrosshairOptions(colors),
            grid: {
                vertLines: { color: colors.grid, style: LineStyle.Dotted },
                horzLines: { color: colors.grid, style: LineStyle.Dotted },
            },
        };

        // Merge default options with user options
        // Note: Simple merge, deep merge might be needed if deeply nested options are partially overridden
        // For now, spread operator on top properties should suffice if careful, 
        // but lightweight-charts applyOptions merges recursively.
        // Here we are passing to createChart.

        // Let's rely on basic spreading for now, but applyOptions is safer for updates.
        // Since we are creating fresh, we can construct the options object.

        const finalOptions = {
            ...defaultOptions,
            ...chartOptions,
            layout: { ...defaultOptions.layout, ...chartOptions.layout },
            grid: { ...defaultOptions.grid, ...chartOptions.grid },
            timeScale: { ...defaultOptions.timeScale, ...chartOptions.timeScale },
            rightPriceScale: { ...defaultOptions.rightPriceScale, ...chartOptions.rightPriceScale },
            leftPriceScale: { ...defaultOptions.leftPriceScale, ...chartOptions.leftPriceScale },
            crosshair: { ...defaultOptions.crosshair, ...chartOptions.crosshair },
        };

        const chart = createChart(containerRef.current, finalOptions);

        chartRef.current = chart;

        // Resize Observer
        const resizeObserver = new ResizeObserver(() => {
            if (containerRef.current && chartRef.current) {
                chartRef.current.applyOptions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight,
                });
                // In some cases, we might want to fitContent on resize
            }
        });
        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
            chartRef.current?.remove();
            chartRef.current = null;
        };
    }, [colors, darkMode, timezone]); // chartOptions and showRightAxisLabels are purposefully excluded from reconstruction dependency to avoid flicker

    return chartRef;
};
