'use client';

import { useEffect, useCallback, useRef } from 'react';

interface UserPreferences {
    selectedArea: string | null;
    selectedModels: Array<{
        id: string | number;
        name: string;
        color: string;
        calculatingDate: string;
    }>;
    showImbalance: boolean;
    showImbalanceQuantity: boolean;
    showImbalanceSurplusRate: boolean;
    showImbalanceDeficitRate: boolean;
    showIntraday: boolean;
    showIntradayAverage: boolean;
    showInterconnection: boolean;
    showOcctoArea: boolean;
    dateRangePreset: string | null;
}

const PREFERENCES_KEY = 'hdjp-dashboard-preferences';
const PREFERENCES_VERSION = 1;

interface StoredPreferences {
    version: number;
    data: Partial<UserPreferences>;
    timestamp: number;
}

/**
 * Hook to save and load user preferences from localStorage
 */
export function useUserPreferences() {
    const isInitialized = useRef(false);

    // Load preferences from localStorage
    const loadPreferences = useCallback((): Partial<UserPreferences> => {
        if (typeof window === 'undefined') return {};

        try {
            const stored = localStorage.getItem(PREFERENCES_KEY);
            if (!stored) return {};

            const parsed: StoredPreferences = JSON.parse(stored);

            // Version check - if version mismatch, return empty
            if (parsed.version !== PREFERENCES_VERSION) {
                console.log('[UserPreferences] Version mismatch, resetting preferences');
                localStorage.removeItem(PREFERENCES_KEY);
                return {};
            }

            console.log('[UserPreferences] Loaded preferences:', parsed.data);
            return parsed.data;
        } catch (error) {
            console.error('[UserPreferences] Failed to load preferences:', error);
            return {};
        }
    }, []);

    // Save preferences to localStorage
    const savePreferences = useCallback((prefs: Partial<UserPreferences>) => {
        if (typeof window === 'undefined') return;

        try {
            const stored: StoredPreferences = {
                version: PREFERENCES_VERSION,
                data: prefs,
                timestamp: Date.now()
            };
            localStorage.setItem(PREFERENCES_KEY, JSON.stringify(stored));
            console.log('[UserPreferences] Saved preferences:', prefs);
        } catch (error) {
            console.error('[UserPreferences] Failed to save preferences:', error);
        }
    }, []);

    // Update a single preference
    const updatePreference = useCallback(<K extends keyof UserPreferences>(
        key: K,
        value: UserPreferences[K]
    ) => {
        const current = loadPreferences();
        savePreferences({ ...current, [key]: value });
    }, [loadPreferences, savePreferences]);

    // Clear all preferences
    const clearPreferences = useCallback(() => {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(PREFERENCES_KEY);
        console.log('[UserPreferences] Cleared all preferences');
    }, []);

    return {
        loadPreferences,
        savePreferences,
        updatePreference,
        clearPreferences,
        isInitialized
    };
}

/**
 * Hook to apply preferences to market data context
 * Should be used in the main dashboard context provider
 */
export function useApplyPreferences({
    onAreaChange,
    onModelChange,
    setShowImbalance,
    setShowIntraday,
    setShowIntradayAverage,
    setShowInterconnection,
    setShowOcctoArea,
}: {
    onAreaChange: (area: string) => void;
    onModelChange: (modelId: string | number, modelName: string, isSelected: boolean) => void;
    setShowImbalance: (val: boolean) => void;
    setShowIntraday: (val: boolean) => void;
    setShowIntradayAverage: (val: boolean) => void;
    setShowInterconnection: (val: boolean) => void;
    setShowOcctoArea: (val: boolean) => void;
}) {
    const { loadPreferences, isInitialized } = useUserPreferences();

    useEffect(() => {
        if (isInitialized.current) return;
        isInitialized.current = true;

        const prefs = loadPreferences();

        // Apply area preference
        if (prefs.selectedArea) {
            onAreaChange(prefs.selectedArea);
        }

        // Apply data layer preferences
        if (prefs.showImbalance !== undefined) {
            setShowImbalance(prefs.showImbalance);
        }
        if (prefs.showIntraday !== undefined) {
            setShowIntraday(prefs.showIntraday);
        }
        if (prefs.showIntradayAverage !== undefined) {
            setShowIntradayAverage(prefs.showIntradayAverage);
        }
        if (prefs.showInterconnection !== undefined) {
            setShowInterconnection(prefs.showInterconnection);
        }
        if (prefs.showOcctoArea !== undefined) {
            setShowOcctoArea(prefs.showOcctoArea);
        }

        // Note: Model preferences are applied after models are loaded
        // This is handled in the MarketDataContext
    }, [loadPreferences, onAreaChange, setShowImbalance, setShowIntraday, setShowIntradayAverage, setShowInterconnection, setShowOcctoArea, isInitialized]);
}
