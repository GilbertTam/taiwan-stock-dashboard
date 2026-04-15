'use client';

import { useCallback } from 'react';
import { useMarketDataContext } from '@/context/MarketDataContext';
import { usePriceChart } from '@/components/price-chart/context/PriceChartContext';
import { useDataPresets } from '@/hooks/useDataPresets';
import type { ForecastPresetData } from '@/types/presets';

/**
 * Bridge hook that connects the generic preset system to the
 * Forecast page's two context sources (MarketDataContext + PriceChartContext).
 *
 * Must be called inside both MarketDataProvider and PriceChartProvider subtrees.
 */
export function useForecastPresets() {
    const {
        showActualPrice, setShowActualPrice,
        showImbalance, setShowImbalance,
        showImbalanceQuantity, setShowImbalanceQuantity,
        showImbalanceSurplusRate, setShowImbalanceSurplusRate,
        showImbalanceDeficitRate, setShowImbalanceDeficitRate,
        showIntraday, setShowIntraday,
        showIntradayAverage, setShowIntradayAverage,
        showWeather, setShowWeather,
        showWeatherActual, setShowWeatherActual,
        showWeatherForecast, setShowWeatherForecast,
        showOcctoArea, setShowOcctoArea,
        selectedModels,
        selectedWeatherModelActual, setSelectedWeatherModelActual,
        selectedWeatherModelForecast, setSelectedWeatherModelForecast,
    } = useMarketDataContext();

    // Field-level selections from PriceChartContext (with any-cast for optional props)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chartCtx = usePriceChart() as any;

    const selectedOcctoFields: Set<string> = chartCtx.selectedOcctoFields ?? new Set();
    const setSelectedOcctoFields = chartCtx.setSelectedOcctoFields ?? (() => {});
    const occtoChartType: 'stacked' | 'area' = chartCtx.occtoChartType ?? 'stacked';
    const setOcctoChartType = chartCtx.setOcctoChartType ?? (() => {});
    const selectedInterconnectionFields: Set<string> = chartCtx.selectedInterconnectionFields ?? new Set();
    const setSelectedInterconnectionFields = chartCtx.setSelectedInterconnectionFields ?? (() => {});
    const selectedBatteryFields: Set<string> = chartCtx.selectedBatteryFields ?? new Set();
    const setSelectedBatteryFields = chartCtx.setSelectedBatteryFields ?? (() => {});
    const selectedBidPlanFields: Set<string> = chartCtx.selectedBidPlanFields ?? new Set();
    const setSelectedBidPlanFields = chartCtx.setSelectedBidPlanFields ?? (() => {});
    const selectedBidPlanCategories: Set<string> = chartCtx.selectedBidPlanCategories ?? new Set();
    const setSelectedBidPlanCategories = chartCtx.setSelectedBidPlanCategories ?? (() => {});
    const selectedSiteIds: Set<string> = chartCtx.selectedSiteIds ?? new Set();
    const setSelectedSiteIds = chartCtx.setSelectedSiteIds ?? (() => {});
    const selectedTdgcFields: Set<string> = chartCtx.selectedTdgcFields ?? new Set();
    const setSelectedTdgcFields = chartCtx.setSelectedTdgcFields ?? (() => {});
    const selectedTdgcCategories: Set<string> = chartCtx.selectedTdgcCategories ?? new Set();
    const setSelectedTdgcCategories = chartCtx.setSelectedTdgcCategories ?? (() => {});
    const selectedWeatherFieldsActual: Set<string> = chartCtx.selectedWeatherFieldsActual ?? new Set();
    const setSelectedWeatherFieldsActual = chartCtx.setSelectedWeatherFieldsActual ?? (() => {});
    const selectedWeatherFieldsForecast: Set<string> = chartCtx.selectedWeatherFieldsForecast ?? new Set();
    const setSelectedWeatherFieldsForecast = chartCtx.setSelectedWeatherFieldsForecast ?? (() => {});

    // Generic presets hook
    const presetsHook = useDataPresets<ForecastPresetData>('forecast');

    const captureState = useCallback((): ForecastPresetData => ({
        showActualPrice,
        showImbalance,
        showImbalanceQuantity,
        showImbalanceSurplusRate,
        showImbalanceDeficitRate,
        showIntraday,
        showIntradayAverage,
        showWeather,
        showWeatherActual,
        showWeatherForecast,
        showOcctoArea,
        selectedModels: selectedModels.map(m => ({
            id: m.id,
            name: m.name,
            color: m.color,
            calculatingDate: m.calculatingDate,
        })),
        selectedWeatherModelActual,
        selectedWeatherModelForecast,
        selectedOcctoFields: Array.from(selectedOcctoFields),
        occtoChartType,
        selectedInterconnectionFields: Array.from(selectedInterconnectionFields),
        selectedBatteryFields: Array.from(selectedBatteryFields),
        selectedBidPlanFields: Array.from(selectedBidPlanFields),
        selectedBidPlanCategories: Array.from(selectedBidPlanCategories),
        selectedSiteIds: Array.from(selectedSiteIds),
        selectedTdgcFields: Array.from(selectedTdgcFields),
        selectedTdgcCategories: Array.from(selectedTdgcCategories),
        selectedWeatherFieldsActual: Array.from(selectedWeatherFieldsActual),
        selectedWeatherFieldsForecast: Array.from(selectedWeatherFieldsForecast),
    }), [
        showActualPrice, showImbalance, showImbalanceQuantity, showImbalanceSurplusRate, showImbalanceDeficitRate,
        showIntraday, showIntradayAverage, showWeather, showWeatherActual, showWeatherForecast, showOcctoArea,
        selectedModels, selectedWeatherModelActual, selectedWeatherModelForecast,
        selectedOcctoFields, occtoChartType, selectedInterconnectionFields, selectedBatteryFields,
        selectedBidPlanFields, selectedBidPlanCategories, selectedSiteIds,
        selectedTdgcFields, selectedTdgcCategories,
        selectedWeatherFieldsActual, selectedWeatherFieldsForecast,
    ]);

    const applyPreset = useCallback((data: ForecastPresetData) => {
        // Data layer toggles
        setShowActualPrice(data.showActualPrice);
        setShowImbalance(data.showImbalance);
        setShowImbalanceQuantity(data.showImbalanceQuantity);
        setShowImbalanceSurplusRate(data.showImbalanceSurplusRate);
        setShowImbalanceDeficitRate(data.showImbalanceDeficitRate);
        setShowIntraday(data.showIntraday);
        setShowIntradayAverage(data.showIntradayAverage);
        setShowWeather(data.showWeather);
        setShowWeatherActual(data.showWeatherActual);
        setShowWeatherForecast(data.showWeatherForecast);
        setShowOcctoArea(data.showOcctoArea);

        // Weather models
        if (data.selectedWeatherModelActual !== undefined) setSelectedWeatherModelActual(data.selectedWeatherModelActual);
        if (data.selectedWeatherModelForecast !== undefined) setSelectedWeatherModelForecast(data.selectedWeatherModelForecast);

        // Field selections (restore Sets)
        if (data.selectedOcctoFields) setSelectedOcctoFields(new Set(data.selectedOcctoFields));
        if (data.occtoChartType) setOcctoChartType(data.occtoChartType);
        if (data.selectedInterconnectionFields) setSelectedInterconnectionFields(new Set(data.selectedInterconnectionFields));
        if (data.selectedBatteryFields) setSelectedBatteryFields(new Set(data.selectedBatteryFields));
        if (data.selectedBidPlanFields) setSelectedBidPlanFields(() => new Set(data.selectedBidPlanFields));
        if (data.selectedBidPlanCategories) setSelectedBidPlanCategories(() => new Set(data.selectedBidPlanCategories));
        if (data.selectedSiteIds) setSelectedSiteIds(() => new Set(data.selectedSiteIds));
        setSelectedTdgcFields(() => new Set(data.selectedTdgcFields ?? []));
        setSelectedTdgcCategories(() => new Set(data.selectedTdgcCategories ?? ['1000']));
        if (data.selectedWeatherFieldsActual) setSelectedWeatherFieldsActual(() => new Set(data.selectedWeatherFieldsActual));
        if (data.selectedWeatherFieldsForecast) setSelectedWeatherFieldsForecast(() => new Set(data.selectedWeatherFieldsForecast));

        // Note: selectedModels are not restored here because model availability
        // depends on the backend and may have changed. The user's model selection
        // is preserved via useUserPreferences auto-save instead.
    }, [
        setShowActualPrice, setShowImbalance, setShowImbalanceQuantity, setShowImbalanceSurplusRate, setShowImbalanceDeficitRate,
        setShowIntraday, setShowIntradayAverage, setShowWeather, setShowWeatherActual, setShowWeatherForecast, setShowOcctoArea,
        setSelectedWeatherModelActual, setSelectedWeatherModelForecast,
        setSelectedOcctoFields, setOcctoChartType, setSelectedInterconnectionFields, setSelectedBatteryFields,
        setSelectedBidPlanFields, setSelectedBidPlanCategories, setSelectedSiteIds,
        setSelectedTdgcFields, setSelectedTdgcCategories,
        setSelectedWeatherFieldsActual, setSelectedWeatherFieldsForecast,
    ]);

    return {
        ...presetsHook,
        captureState,
        applyPreset,
    };
}
