/**
 * @fileoverview Chart Series Manager Hook
 *
 * Manages creation, update, and cleanup of lightweight-charts series.
 * Extracts series management logic from PriceChartLightweight.
 */

import { useRef, useCallback } from 'react';
import { IChartApi, ISeriesApi } from 'lightweight-charts';

/**
 * Hook for managing chart series lifecycle.
 */
export const useSeriesManager = () => {
    const seriesRefs = useRef<Map<string, ISeriesApi<any>>>(new Map());
    const activeKeysRef = useRef<Set<string>>(new Set());

    /**
     * Create or update a series.
     */
    const updateOrAddSeries = useCallback((
        chart: IChartApi,
        key: string,
        type: any,
        data: any[],
        opts: any
    ): ISeriesApi<any> | null => {
        const seriesMap = seriesRefs.current;
        activeKeysRef.current.add(key);

        let s = seriesMap.get(key);
        if (!s) {
            if (type === 'Custom' && opts.customSeriesInstance) {
                s = chart.addCustomSeries(opts.customSeriesInstance, opts);
            } else {
                s = chart.addSeries(type, opts);
            }
            seriesMap.set(key, s);
        } else {
            s.applyOptions(opts);
        }

        try {
            if (data.length > 0) s.setData(data);
        } catch (e) {
            console.warn(`SetData failed for ${key}`, e);
        }

        return s;
    }, []);

    /**
     * Remove inactive series (those not in current active set).
     */
    const cleanupUnusedSeries = useCallback((chart: IChartApi) => {
        const seriesMap = seriesRefs.current;
        const activeKeys = activeKeysRef.current;
        const toRemove: string[] = [];

        seriesMap.forEach((_, k) => {
            if (!activeKeys.has(k)) toRemove.push(k);
        });

        toRemove.forEach(k => {
            const s = seriesMap.get(k);
            if (s) {
                chart.removeSeries(s);
                seriesMap.delete(k);
            }
        });
    }, []);

    /**
     * Clear all series.
     */
    const clearAllSeries = useCallback(() => {
        seriesRefs.current.clear();
        activeKeysRef.current.clear();
    }, []);

    /**
     * Reset active keys for a new render cycle.
     */
    const resetActiveKeys = useCallback(() => {
        activeKeysRef.current.clear();
    }, []);

    /**
     * Get a series by key.
     */
    const getSeries = useCallback((key: string): ISeriesApi<any> | undefined => {
        return seriesRefs.current.get(key);
    }, []);

    /**
     * Check if a series exists.
     */
    const hasSeries = useCallback((key: string): boolean => {
        return seriesRefs.current.has(key);
    }, []);

    return {
        updateOrAddSeries,
        cleanupUnusedSeries,
        clearAllSeries,
        resetActiveKeys,
        getSeries,
        hasSeries,
        seriesMap: seriesRefs.current,
    };
};
