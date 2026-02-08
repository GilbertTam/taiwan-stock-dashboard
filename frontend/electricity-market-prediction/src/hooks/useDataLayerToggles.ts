/**
 * @fileoverview Data Layer Toggles Hook
 *
 * Manages visibility state for various data layers on the dashboard chart.
 * Integrates with user preferences for persistence.
 */

import { useState, useEffect, useRef } from 'react';
import { useUserPreferences } from './useUserPreferences';

/** Return type for useDataLayerToggles hook */
export interface UseDataLayerTogglesReturn {
    // Toggle states
    showImbalance: boolean;
    setShowImbalance: React.Dispatch<React.SetStateAction<boolean>>;
    showIntraday: boolean;
    setShowIntraday: React.Dispatch<React.SetStateAction<boolean>>;
    showIntradayAverage: boolean;
    setShowIntradayAverage: React.Dispatch<React.SetStateAction<boolean>>;
    showInterconnection: boolean;
    setShowInterconnection: React.Dispatch<React.SetStateAction<boolean>>;
    showWeather: boolean;
    setShowWeather: React.Dispatch<React.SetStateAction<boolean>>;
    showWeatherActual: boolean;
    setShowWeatherActual: React.Dispatch<React.SetStateAction<boolean>>;
    showWeatherForecast: boolean;
    setShowWeatherForecast: React.Dispatch<React.SetStateAction<boolean>>;
    showOcctoArea: boolean;
    setShowOcctoArea: React.Dispatch<React.SetStateAction<boolean>>;
    showActualPrice: boolean;
    setShowActualPrice: React.Dispatch<React.SetStateAction<boolean>>;

    // Chart highlight state
    highlightedModelId: string | null;
    setHighlightedModelId: React.Dispatch<React.SetStateAction<string | null>>;
    focusedDataSource: string | null;
    setFocusedDataSource: React.Dispatch<React.SetStateAction<string | null>>;

    // Preference loading helpers
    applyPreferences: (prefs: Record<string, unknown>) => void;
    markPreferencesLoaded: () => void;
}

/**
 * Custom hook for managing data layer visibility toggles.
 *
 * Automatically persists toggle state to user preferences.
 *
 * @returns Toggle states and setters
 */
export const useDataLayerToggles = (): UseDataLayerTogglesReturn => {
    const { updatePreference } = useUserPreferences();
    const prefsLoadedRef = useRef(false);

    // Data layer toggles
    const [showImbalance, setShowImbalance] = useState(false);
    const [showIntraday, setShowIntraday] = useState(false);
    const [showIntradayAverage, setShowIntradayAverage] = useState(true);
    const [showInterconnection, setShowInterconnection] = useState(false);
    const [showWeather, setShowWeather] = useState(false);
    const [showWeatherActual, setShowWeatherActual] = useState(false);
    const [showWeatherForecast, setShowWeatherForecast] = useState(false);
    const [showOcctoArea, setShowOcctoArea] = useState(false);
    const [showActualPrice, setShowActualPrice] = useState(true);

    // Chart highlight state
    const [highlightedModelId, setHighlightedModelId] = useState<string | null>(null);
    const [focusedDataSource, setFocusedDataSource] = useState<string | null>(null);

    // Auto-save preferences when toggles change
    useEffect(() => {
        if (!prefsLoadedRef.current) return;
        updatePreference('showImbalance', showImbalance);
    }, [showImbalance, updatePreference]);

    useEffect(() => {
        if (!prefsLoadedRef.current) return;
        updatePreference('showIntraday', showIntraday);
    }, [showIntraday, updatePreference]);

    useEffect(() => {
        if (!prefsLoadedRef.current) return;
        updatePreference('showIntradayAverage', showIntradayAverage);
    }, [showIntradayAverage, updatePreference]);

    useEffect(() => {
        if (!prefsLoadedRef.current) return;
        updatePreference('showInterconnection', showInterconnection);
    }, [showInterconnection, updatePreference]);

    useEffect(() => {
        if (!prefsLoadedRef.current) return;
        updatePreference('showOcctoArea', showOcctoArea);
    }, [showOcctoArea, updatePreference]);

    /**
     * Apply loaded preferences to toggle states.
     */
    const applyPreferences = (prefs: Record<string, unknown>) => {
        if (prefs.showImbalance !== undefined) setShowImbalance(prefs.showImbalance as boolean);
        if (prefs.showIntraday !== undefined) setShowIntraday(prefs.showIntraday as boolean);
        if (prefs.showIntradayAverage !== undefined) setShowIntradayAverage(prefs.showIntradayAverage as boolean);
        if (prefs.showInterconnection !== undefined) setShowInterconnection(prefs.showInterconnection as boolean);
        if (prefs.showOcctoArea !== undefined) setShowOcctoArea(prefs.showOcctoArea as boolean);
    };

    /**
     * Mark preferences as loaded, enabling auto-save.
     */
    const markPreferencesLoaded = () => {
        prefsLoadedRef.current = true;
    };

    return {
        showImbalance, setShowImbalance,
        showIntraday, setShowIntraday,
        showIntradayAverage, setShowIntradayAverage,
        showInterconnection, setShowInterconnection,
        showWeather, setShowWeather,
        showWeatherActual, setShowWeatherActual,
        showWeatherForecast, setShowWeatherForecast,
        showOcctoArea, setShowOcctoArea,
        showActualPrice, setShowActualPrice,
        highlightedModelId, setHighlightedModelId,
        focusedDataSource, setFocusedDataSource,
        applyPreferences,
        markPreferencesLoaded,
    };
};
