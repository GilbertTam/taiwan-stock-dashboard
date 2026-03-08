import { useEffect, useRef } from 'react';
import { IChartApi } from 'lightweight-charts';
import { usePriceChart } from '../context/PriceChartContext';
import { YAxisController } from '@/components/forecast-chart/y-axis/YAxisController';

export const useDualYAxis = (chartRef: React.MutableRefObject<IChartApi | null>) => {
    const {
        globalPrimaryRange,
        globalSecondaryRange,
        setGlobalPrimaryRange,
        setGlobalSecondaryRange
    } = usePriceChart();

    const controllerRef = useRef<YAxisController | null>(null);

    // Initialize controller and sync initial state
    useEffect(() => {
        if (!chartRef.current) return;

        // Initialize controller with a storage key (could be customized per chart type)
        const controller = new YAxisController(chartRef.current, undefined, 'yAxisConfig_v1');
        controllerRef.current = controller;

        // Read initial state from controller (which loads from ConfigStorage)
        const initialParams = controller.getStorageParams();
        if (initialParams?.primary) {
            setGlobalPrimaryRange(initialParams.primary);
        }
        if (initialParams?.secondary) {
            setGlobalSecondaryRange(initialParams.secondary);
        }

        // Listen for primary axis manual drag/zoom
        controller.onPrimaryRangeChange((range) => {
            setGlobalPrimaryRange(range);
        });

        // Start polling primary range since lightweight-charts lacks a drag event
        controller.startPrimaryRangePolling(1000);

        return () => {
            controller.stopPrimaryRangePolling();
            controllerRef.current = null;
        };
    }, [chartRef, setGlobalPrimaryRange, setGlobalSecondaryRange]);

    // Apply secondary range changes from global context to the chart via controller
    useEffect(() => {
        if (!controllerRef.current) return;
        const controller = controllerRef.current;

        if (globalSecondaryRange) {
            controller.setSecondaryRange(globalSecondaryRange).catch(err => {
                console.error('Failed to set secondary range from context:', err);
            });
        } else {
            // If it's cleared, we reset (auto-scale)
            try {
                controller.resetSecondaryRange();
            } catch (e) {
                // scale might not exist yet during init
            }
        }
    }, [globalSecondaryRange]);

    // Apply primary range reset from context
    useEffect(() => {
        if (!controllerRef.current) return;
        const controller = controllerRef.current;

        if (globalPrimaryRange === null) {
            try {
                controller.resetPrimaryRange();
            } catch (e) {
                // scale might not exist yet
            }
        }
    }, [globalPrimaryRange]);

    return controllerRef;
};
