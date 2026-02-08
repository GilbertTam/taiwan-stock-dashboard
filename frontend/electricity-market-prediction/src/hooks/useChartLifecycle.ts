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

interface UseChartLifecycleParams {
    containerRef: RefObject<HTMLDivElement | null>;
    colors: any;
    darkMode: boolean;
    timezone?: string;
    chartOptions?: DeepPartial<ChartOptions>;
}

export const useChartLifecycle = ({
    containerRef,
    colors,
    darkMode,
    timezone = 'UTC',
    chartOptions = {},
}: UseChartLifecycleParams) => {
    const chartRef = useRef<IChartApi | null>(null);
    // Use ref for chartOptions to avoid infinite re-renders from object reference changes
    const chartOptionsRef = useRef(chartOptions);
    chartOptionsRef.current = chartOptions;

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
    }, [colors, darkMode, timezone]); // Removed chartOptions - use ref instead

    return chartRef;
};
