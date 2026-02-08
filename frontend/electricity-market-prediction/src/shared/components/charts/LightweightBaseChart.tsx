import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { createChart, IChartApi, DeepPartial, ChartOptions } from 'lightweight-charts';

export interface BaseChartProps {
    options?: DeepPartial<ChartOptions>;
    className?: string;
    style?: React.CSSProperties;
    onChartReady?: (chart: IChartApi) => void;
}

export const LightweightBaseChart = forwardRef<IChartApi | null, BaseChartProps>(({ options, className, style, onChartReady }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);

    // Expose chart instance via ref
    useImperativeHandle(ref, () => chartRef.current!, []);

    useEffect(() => {
        if (!containerRef.current) return;

        // Initialize chart
        const chart = createChart(containerRef.current, {
            ...options,
            layout: { ...(options?.layout ?? {}), attributionLogo: false },
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
        });
        chartRef.current = chart;

        if (onChartReady) {
            onChartReady(chart);
        }

        // Resize handler (throttled with rAF to avoid jitter during layout resize)
        let rafId: number | null = null;
        const handleResize = () => {
            if (rafId !== null) return;
            rafId = requestAnimationFrame(() => {
                rafId = null;
                const el = containerRef.current;
                if (el && chart) {
                    chart.applyOptions({
                        width: el.clientWidth,
                        height: el.clientHeight,
                    });
                }
            });
        };

        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
            chartRef.current = null;
        };
    }, []); // Init only once

    // Update options dynamically
    useEffect(() => {
        if (chartRef.current && options) {
            chartRef.current.applyOptions(options);
        }
    }, [options]);

    return (
        <div
            ref={containerRef}
            className={className}
            style={{ width: '100%', height: '100%', ...style }}
        />
    );
});

LightweightBaseChart.displayName = 'LightweightBaseChart';
