import React, { useMemo, useRef, useEffect } from 'react';
import { createChart, IChartApi, ISeriesApi, UTCTimestamp, LineSeries } from 'lightweight-charts';
import { Box, Typography } from '@mui/material';
import {
    convertToLineSeriesData,
    createMarkAreaRanges,
    createChartLayout,
    createCrosshairOptions,
    toUTCTimestamp,
    ProcessedDataPoint,
} from '@/utils/lightweightChartsHelpers';

interface ZScoreChartLightweightProps {
    showZScore: boolean;
    processedChartData: ProcessedDataPoint[];
    colors: any;
    selectedModels: any[];
    modelColorMap: Record<string, string>;
    darkMode?: boolean;
}

export const ZScoreChartLightweight: React.FC<ZScoreChartLightweightProps> = ({
    showZScore,
    processedChartData,
    colors,
    selectedModels,
    modelColorMap,
    darkMode
}) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRefs = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());

    // Initialize chart
    useEffect(() => {
        if (!showZScore || !chartContainerRef.current) return;

        const container = chartContainerRef.current;

        const initChart = () => {
            if (!container || container.clientWidth === 0 || container.clientHeight === 0) {
                requestAnimationFrame(initChart);
                return;
            }

            const chart = createChart(container, {
                layout: createChartLayout(colors, !!darkMode),
                width: container.clientWidth,
                height: container.clientHeight,
                rightPriceScale: {
                    visible: false,
                },
                leftPriceScale: {
                    visible: true,
                    borderColor: colors.grid,
                },
                timeScale: {
                    visible: true,
                    borderColor: colors.grid,
                    timeVisible: false, // Hide time labels for Z-Score chart
                },
                crosshair: createCrosshairOptions(colors),
                grid: {
                    vertLines: {
                        color: colors.grid,
                        style: 1, // Dashed
                    },
                    horzLines: {
                        color: colors.grid,
                        style: 1, // Dashed
                    },
                },
            });

            chartRef.current = chart;

            // Handle resize
            const handleResize = () => {
                if (container && chart) {
                    chart.applyOptions({
                        width: container.clientWidth,
                        height: container.clientHeight,
                    });
                }
            };

            const resizeObserver = new ResizeObserver(handleResize);
            resizeObserver.observe(container);
            window.addEventListener('resize', handleResize);

            return () => {
                resizeObserver.disconnect();
                window.removeEventListener('resize', handleResize);
                chart.remove();
            };
        };

        const cleanup = initChart();
        return cleanup;
    }, [showZScore, colors, darkMode]);

    // Render series
    useEffect(() => {
        if (!showZScore || !chartRef.current || !processedChartData || processedChartData.length === 0) {
            return;
        }

        const chart = chartRef.current;
        const seriesMap = seriesRefs.current;

        // Clear existing series
        seriesMap.forEach((series) => {
            chart.removeSeries(series);
        });
        seriesMap.clear();

        // Mark area ranges for background shading
        // TODO: Implement using Canvas Overlay (refactoring disabled broken LineSeries implementation)
        /*
        const timestamps = processedChartData.map(d => d.timestamp);
        const markAreaRanges = createMarkAreaRanges(timestamps);
        
        if (markAreaRanges.length > 0) {
            markAreaRanges.forEach((range, index) => {
                const bgSeries = chart.addSeries(LineSeries, {
                    color: 'transparent',
                    lineWidth: 0,
                    priceScaleId: 'left',
                    visible: true,
                });
                const bgData = [
                    { time: range.from, value: 5 },
                    { time: range.to, value: 5 },
                    { time: range.to, value: -5 },
                    { time: range.from, value: -5 },
                ];
                bgSeries.setData(bgData);
                seriesMap.set(`bg-${index}`, bgSeries as any);
            });
        }
        */

        // Reference lines: +2σ, -2σ, 0
        const plus2SigmaSeries = chart.addSeries(LineSeries, {
            color: colors.text,
            lineWidth: 1,
            lineStyle: 1, // Dashed
            priceScaleId: 'left',
            visible: true,
        });
        plus2SigmaSeries.setData(processedChartData.map(d => ({
            time: toUTCTimestamp(d.timestamp),
            value: 2,
        })));
        seriesMap.set('ref-plus2', plus2SigmaSeries);

        const minus2SigmaSeries = chart.addSeries(LineSeries, {
            color: colors.text,
            lineWidth: 1,
            lineStyle: 1, // Dashed
            priceScaleId: 'left',
            visible: true,
        });
        minus2SigmaSeries.setData(processedChartData.map(d => ({
            time: toUTCTimestamp(d.timestamp),
            value: -2,
        })));
        seriesMap.set('ref-minus2', minus2SigmaSeries);

        const zeroSeries = chart.addSeries(LineSeries, {
            color: colors.text,
            lineWidth: 1,
            lineStyle: 0, // Solid
            priceScaleId: 'left',
            visible: true,
        });
        zeroSeries.setData(processedChartData.map(d => ({
            time: toUTCTimestamp(d.timestamp),
            value: 0,
        })));
        seriesMap.set('ref-zero', zeroSeries);

        // Actual Z-Score
        const actualZScoreData = convertToLineSeriesData(
            processedChartData,
            (point) => point.zScore ?? null
        );
        if (actualZScoreData.length > 0) {
            const actualSeries = chart.addSeries(LineSeries, {
                color: colors.actual,
                lineWidth: 2,
                priceScaleId: 'left',
                visible: true,
            });
            actualSeries.setData(actualZScoreData);
            seriesMap.set('actual', actualSeries);
        }

        // Model Z-Scores
        selectedModels.forEach((model) => {
            const modelKey = `${model.id}|${model.name}`;
            const modelColor = modelColorMap[modelKey];

            const modelZScoreData = convertToLineSeriesData(
                processedChartData,
                (point) => point.modelZScores?.[modelKey] ?? null
            );

            if (modelZScoreData.length > 0) {
                const modelSeries = chart.addSeries(LineSeries, {
                    color: modelColor,
                    lineWidth: 1,
                    priceScaleId: 'left',
                    visible: true,
                });
                modelSeries.setData(modelZScoreData);
                seriesMap.set(`model-${modelKey}`, modelSeries);
            }
        });
    }, [showZScore, processedChartData, colors, selectedModels, modelColorMap, darkMode]);

    if (!showZScore) return null;

    return (
        <Box sx={{ mt: 1, height: 200 }}>
            <Typography variant="subtitle2" sx={{ ml: 2, mb: 0.5, color: colors.text }}>
                Z-Score Analysis (Actual Price vs Models)
            </Typography>
            <Box
                ref={chartContainerRef}
                sx={{
                    width: '100%',
                    height: 'calc(100% - 32px)',
                    position: 'relative',
                }}
            />
        </Box>
    );
};
