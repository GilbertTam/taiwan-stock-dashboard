import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { createChart, IChartApi, DeepPartial, ChartOptions } from 'lightweight-charts';

export interface BaseChartProps {
    options?: DeepPartial<ChartOptions>;
    className?: string;
    style?: React.CSSProperties;
    onChartReady?: (chart: IChartApi) => void;
}

export const BaseChart = forwardRef<IChartApi | null, BaseChartProps>(({ options, className, style, onChartReady }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);

    // Expose chart instance via ref
    useImperativeHandle(ref, () => chartRef.current!, []);

    useEffect(() => {
        if (!containerRef.current) return;

        // Initialize chart
        const chart = createChart(containerRef.current, {
            ...options,
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
        });
        chartRef.current = chart;

        if (onChartReady) {
            onChartReady(chart);
        }

        // Resize handler
        const handleResize = () => {
            if (containerRef.current && chart) {
                chart.applyOptions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight,
                });
            }
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

BaseChart.displayName = 'BaseChart';
