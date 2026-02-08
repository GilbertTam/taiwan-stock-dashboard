import { useEffect, useRef, useState } from 'react';
import { IChartApi } from 'lightweight-charts';
import { fromChartTime, ProcessedDataPoint } from '@/utils/lightweightChartsHelpers';

interface UseChartCrosshairParams {
    chartRef: React.MutableRefObject<IChartApi | null>;
    data: ProcessedDataPoint[];
    setHoveredData: (data: ProcessedDataPoint | null) => void;
    timezone: string;
}

export const useChartCrosshair = ({
    chartRef,
    data,
    setHoveredData,
    timezone,
}: UseChartCrosshairParams) => {
    // Solve closure staleness
    const latestDataRef = useRef(data);
    useEffect(() => { latestDataRef.current = data; }, [data]);

    // Track chart instance to detect changes
    const [chartInstance, setChartInstance] = useState<IChartApi | null>(null);

    // Sync chartRef.current to chartInstance state (triggers re-subscription)
    useEffect(() => {
        const interval = setInterval(() => {
            if (chartRef.current !== chartInstance) {
                setChartInstance(chartRef.current);
            }
        }, 100); // Poll for chart changes
        return () => clearInterval(interval);
    }, [chartRef, chartInstance]);

    useEffect(() => {
        const chart = chartInstance;
        if (!chart) return;

        // Binary Search for nearest data point
        const findNearest = (targetTimestamp: number) => {
            const currentData = latestDataRef.current;
            if (!currentData || currentData.length === 0) return null;
            let left = 0, right = currentData.length - 1;
            let nearest = currentData[0];
            let minDiff = Math.abs(currentData[0].timestamp - targetTimestamp);

            while (left <= right) {
                const mid = Math.floor((left + right) / 2);
                const currentTimestamp = currentData[mid].timestamp;
                const diff = Math.abs(currentTimestamp - targetTimestamp);
                if (diff < minDiff) { minDiff = diff; nearest = currentData[mid]; }
                if (currentTimestamp < targetTimestamp) left = mid + 1;
                else right = mid - 1;
            }
            return nearest;
        };

        const handleCrosshairMove = (param: any) => {
            if (param.time) {
                const actualMs = fromChartTime(param.time as number, timezone);
                const nearest = findNearest(actualMs);
                if (nearest) setHoveredData(nearest);
            } else {
                setHoveredData(null);
            }
        };

        chart.subscribeCrosshairMove(handleCrosshairMove);

        return () => {
            try {
                chart.unsubscribeCrosshairMove(handleCrosshairMove);
            } catch (e) {
                // Chart may already be disposed
            }
        };
    }, [chartInstance, timezone, setHoveredData]); // Subscribe to chartInstance state
};
