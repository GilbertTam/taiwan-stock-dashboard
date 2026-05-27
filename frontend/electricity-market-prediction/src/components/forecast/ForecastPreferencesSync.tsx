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
    const { showRightAxisLabels, setShowRightAxisLabels } = usePriceChart();
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
        hydratedRef.current = true;
    }, [loaded, prefsRef, setShowTopBottomLabels, setTopBottomPairs, setShowRightAxisLabels]);

    useEffect(() => {
        if (!hydratedRef.current) return;
        updatePreferences({
            showTopBottomLabels,
            topBottomPairs,
            showRightAxisLabels,
        } satisfies ForecastChartPreferences);
    }, [showTopBottomLabels, topBottomPairs, showRightAxisLabels, updatePreferences]);

    return null;
}
