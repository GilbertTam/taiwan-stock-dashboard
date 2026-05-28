'use client';

import { useEffect, useRef } from 'react';

import { useMarketDataContext } from '@/context/MarketDataContext';
import { usePriceChart } from '@/components/price-chart/context/PriceChartContext';
import { useBackendUserPreferences } from '@/hooks/useBackendUserPreferences';
import type { ForecastChartPreferences } from '@/types/userPreferences';

/**
 * Bidirectional sync between forecast chart UI state and backend
 * `user_preferences` row. Hydrates state once after the initial fetch,
 * then pushes any subsequent changes with debounced PUT.
 *
 * Must be rendered inside both MarketDataProvider and PriceChartProvider.
 */
export function ForecastPreferencesSync() {
    const {
        showTopBottomLabels, setShowTopBottomLabels,
        topBottomPairs, setTopBottomPairs,
    } = useMarketDataContext();
    const {
        showRightAxisLabels, setShowRightAxisLabels,
        seriesAxisConfig, setSeriesAxisConfig,
    } = usePriceChart();
    const { loaded, prefsRef, updatePreferences } = useBackendUserPreferences();

    const hydratedRef = useRef(false);

    useEffect(() => {
        if (!loaded || hydratedRef.current) return;
        const prefs = prefsRef.current as ForecastChartPreferences;
        if (typeof prefs.showTopBottomLabels === 'boolean') {
            setShowTopBottomLabels(prefs.showTopBottomLabels);
        }
        if (typeof prefs.topBottomPairs === 'number') {
            setTopBottomPairs(prefs.topBottomPairs);
        }
        if (typeof prefs.showRightAxisLabels === 'boolean') {
            setShowRightAxisLabels(prefs.showRightAxisLabels);
        }
        if (prefs.seriesLineTypes) {
            setSeriesAxisConfig(prev => {
                const next = { ...prev };
                Object.entries(prefs.seriesLineTypes!).forEach(([k, v]) => {
                    next[k] = { ...next[k], lineType: v };
                });
                return next;
            });
        }
        hydratedRef.current = true;
    }, [loaded, prefsRef, setShowTopBottomLabels, setTopBottomPairs, setShowRightAxisLabels, setSeriesAxisConfig]);

    useEffect(() => {
        if (!hydratedRef.current) return;
        const seriesLineTypes: Record<string, 'line' | 'steps'> = {};
        Object.entries(seriesAxisConfig).forEach(([k, v]) => {
            if (v?.lineType) seriesLineTypes[k] = v.lineType;
        });
        updatePreferences({
            showTopBottomLabels,
            topBottomPairs,
            showRightAxisLabels,
            seriesLineTypes,
        } satisfies ForecastChartPreferences);
    }, [showTopBottomLabels, topBottomPairs, showRightAxisLabels, seriesAxisConfig, updatePreferences]);

    return null;
}
