import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { IChartApi, ISeriesApi, LineSeries, HistogramSeries, AreaSeries, DeepPartial, ChartOptions } from 'lightweight-charts';
import { LightweightBaseChart } from '@/shared/components/charts/LightweightBaseChart';
import { ProcessedDataPoint } from '@/utils/lightweightChartsHelpers';
import { StackedBarSeries } from '../plugins/StackedBarSeries';
import { createChartLayout, createCrosshairOptions } from '@/utils/lightweightChartsHelpers';
// Note: useSeriesManager hook available from './hooks' for future refactoring

export interface SeriesDefinition {
    id: string;
    type: 'Line' | 'Histogram' | 'Area' | 'Custom';
    data: any[];
    options: any; // specific series options
    customSeriesInstance?: any; // For custom series like StackedBarSeries
}

interface SecondaryChartProps {
    data: ProcessedDataPoint[];
    seriesDefinitions: SeriesDefinition[];
    colors: any;
    darkMode: boolean;
    height?: number; // explicit height or flex
    syncTimeScale?: (chart: IChartApi) => void;
    onCrosshairMove?: (time: number | null) => void;
}

export const SecondaryChart = forwardRef<IChartApi | null, SecondaryChartProps>(({ data, seriesDefinitions, colors, darkMode, height = 200, syncTimeScale, onCrosshairMove }, ref) => {
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRefs = useRef<Map<string, ISeriesApi<any> | any>>(new Map());

    // Expose chart
    useImperativeHandle(ref, () => chartRef.current!, []);

    const chartOptions: DeepPartial<ChartOptions> = {
        layout: createChartLayout(colors, darkMode),
        rightPriceScale: {
            visible: true, // Always right for secondary
            borderColor: colors.grid,
            entireTextOnly: false,
        },
        leftPriceScale: {
            visible: false,
        },
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
    };

    // Series Management Logic
    useEffect(() => {
        if (!chartRef.current) return;

        const chart = chartRef.current;
        const seriesMap = seriesRefs.current;
        const activeIds = new Set<string>();

        seriesDefinitions.forEach((def) => {
            activeIds.add(def.id);
            let series = seriesMap.get(def.id);

            // Recreate if type changed (simple approach: remove old)
            // Or create if new
            if (!series) {
                if (def.type === 'Line') {
                    series = chart.addSeries(LineSeries, def.options);
                } else if (def.type === 'Histogram') {
                    series = chart.addSeries(HistogramSeries, def.options);
                } else if (def.type === 'Area') {
                    series = chart.addSeries(AreaSeries, def.options);
                } else if (def.type === 'Custom' && def.customSeriesInstance) {
                    try {
                        // @ts-ignore
                        series = chart.addCustomSeries(def.customSeriesInstance, def.options);
                    } catch (e) {
                        console.error('Failed to add custom series', e);
                    }
                }

                if (series) {
                    seriesMap.set(def.id, series);
                }
            } else {
                series.applyOptions(def.options);
            }

            if (series) {
                // Check data validity
                if (def.data && def.data.length > 0) {
                    series.setData(def.data);
                }
            }
        });

        // Cleanup removed series
        const idsToRemove: string[] = [];
        seriesMap.forEach((_, id) => {
            if (!activeIds.has(id)) idsToRemove.push(id);
        });
        idsToRemove.forEach(id => {
            const s = seriesMap.get(id);
            if (s) {
                chart.removeSeries(s);
                seriesMap.delete(id);
            }
        });

        // Fit content if needed (optional)
        // chart.timeScale().fitContent();

        // Crosshair handler
        if (onCrosshairMove) {
            chart.subscribeCrosshairMove(param => {
                if (param.time) {
                    onCrosshairMove(param.time as number);
                } else {
                    onCrosshairMove(null);
                }
            });
        }

    }, [seriesDefinitions, colors, darkMode, onCrosshairMove]); // Re-run when definitions change

    return (
        <div style={{ height: height, width: '100%', marginBottom: '8px' }}>
            <LightweightBaseChart
                ref={chartRef}
                options={chartOptions}
                onChartReady={(chart) => {
                    chartRef.current = chart;
                    if (syncTimeScale) syncTimeScale(chart);
                }}
            />
        </div>
    );
});

SecondaryChart.displayName = 'SecondaryChart';
