/**
 * @fileoverview Model Selection Hook
 *
 * Manages prediction model selection state, including color generation,
 * calculating date management, and model configuration.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { format, isValid } from 'date-fns';
import { SelectChangeEvent } from '@mui/material';
import { PredictionModel, CalculatingDate } from '@/types';
import { fetchAvailableCalculatingDates } from '@/services/api';
import { generateColor, hashString } from '@/utils/chartUtils';
import { useUserPreferences } from './useUserPreferences';

/**
 * Selected model configuration with display settings
 */
export interface SelectedModelConfig {
    id: string | number;
    name: string;
    color: string;
    calculatingDate: string;
}

/** Return type for useModelSelection hook */
export interface UseModelSelectionReturn {
    models: PredictionModel[];
    setModels: React.Dispatch<React.SetStateAction<PredictionModel[]>>;
    selectedModels: SelectedModelConfig[];
    setSelectedModels: React.Dispatch<React.SetStateAction<SelectedModelConfig[]>>;
    calculatingDatesByModel: { [key: string]: CalculatingDate[] };
    handleModelChange: (event: SelectChangeEvent<string[]>) => void;
    handleModelCalculatingDateChange: (modelIndex: number, newCalculatingDate: string) => void;
    selectedModelKeysString: string;
    applyModelPreferences: (savedModels: SelectedModelConfig[], availableModels: PredictionModel[]) => void;
}

interface UseModelSelectionOptions {
    selectedArea: string;
    startDate: Date | null;
    endDate: Date | null;
}

/**
 * Custom hook for managing prediction model selection.
 *
 * @param options - Configuration options including area and date range
 * @returns Model selection state and handlers
 */
export const useModelSelection = (options: UseModelSelectionOptions): UseModelSelectionReturn => {
    const { selectedArea, startDate, endDate } = options;
    const { updatePreference } = useUserPreferences();
    const prefsLoadedRef = useRef(false);

    const [models, setModels] = useState<PredictionModel[]>([]);
    const [selectedModels, setSelectedModels] = useState<SelectedModelConfig[]>([]);
    const [calculatingDatesByModel, setCalculatingDatesByModel] = useState<{ [key: string]: CalculatingDate[] }>({});

    // Request ID for race condition handling
    const latestCalcDateRequestId = useRef<number>(0);

    /**
     * Memoized model key string for dependency optimization.
     */
    const selectedModelKeysString = useMemo(
        () => selectedModels.map(m => `${m.id}|${m.name}|${m.calculatingDate}`).join(','),
        [selectedModels]
    );

    // Auto-save selected models preference
    useEffect(() => {
        if (!prefsLoadedRef.current) return;
        updatePreference('selectedModels', selectedModels);
    }, [selectedModels, updatePreference]);

    /**
     * Fetch available calculating dates when dependencies change.
     */
    useEffect(() => {
        const fetchAllCalculatingDates = async () => {
            if (!selectedArea || selectedModels.length === 0 || !startDate || !endDate) return;
            if (!isValid(startDate) || !isValid(endDate)) return;

            const requestId = ++latestCalcDateRequestId.current;

            try {
                const formattedStartDate = format(startDate, 'yyyyMMdd');
                const formattedEndDate = format(endDate, 'yyyyMMdd');

                const datesPromises = selectedModels.map(model =>
                    fetchAvailableCalculatingDates({
                        start_date: formattedStartDate,
                        end_date: formattedEndDate,
                        area_name: selectedArea,
                        model_name: model.name
                    }).then(dates => ({
                        modelKey: `${model.id}|${model.name}`,
                        dates
                    })).catch(err => {
                        console.warn(`Failed to fetch calculating dates for ${model.name}`, err);
                        return { modelKey: `${model.id}|${model.name}`, dates: [] };
                    })
                );

                const results = await Promise.all(datesPromises);

                if (requestId !== latestCalcDateRequestId.current) return;

                const newCalculatingDatesByModel: { [key: string]: CalculatingDate[] } = {};
                results.forEach(result => {
                    newCalculatingDatesByModel[result.modelKey] = result.dates;
                });

                setCalculatingDatesByModel(newCalculatingDatesByModel);

                // Reset calculatingDate to 'latest' if previous date is no longer available
                setSelectedModels(prev => {
                    let hasChanges = false;
                    const updatedModels = prev.map(model => {
                        const modelKey = `${model.id}|${model.name}`;
                        const availableDates = newCalculatingDatesByModel[modelKey] || [];
                        if (model.calculatingDate !== 'latest' &&
                            !availableDates.some(d => d.calculating_date === model.calculatingDate)) {
                            hasChanges = true;
                            return { ...model, calculatingDate: 'latest' };
                        }
                        return model;
                    });
                    return hasChanges ? updatedModels : prev;
                });

            } catch (err: unknown) {
                if (requestId !== latestCalcDateRequestId.current) return;
                console.error('獲取計算日期失敗', err);
            }
        };

        fetchAllCalculatingDates();
    }, [selectedArea, selectedModelKeysString, startDate, endDate]);

    /**
     * Handle model multi-select change.
     */
    const handleModelChange = useCallback((event: SelectChangeEvent<string[]>) => {
        const selectedValues = event.target.value as string[];
        if (selectedValues.length === 0) {
            setSelectedModels([]);
            return;
        }
        const uniqueSelectedValues = Array.from(new Set(selectedValues));
        setSelectedModels(prev => {
            return uniqueSelectedValues.map((modelValue) => {
                const [idStr, name] = modelValue.split('|');
                const id = isNaN(Number(idStr)) ? idStr : Number(idStr);
                const existingModel = prev.find(m => m.id === id && m.name === name);
                if (existingModel) return existingModel;
                return { id, name, color: generateColor(hashString(modelValue)), calculatingDate: 'latest' };
            });
        });
    }, []);

    /**
     * Handle calculating date change for a specific model.
     */
    const handleModelCalculatingDateChange = useCallback((modelIndex: number, newCalculatingDate: string) => {
        setSelectedModels(prev => {
            const updated = [...prev];
            updated[modelIndex] = { ...updated[modelIndex], calculatingDate: newCalculatingDate };
            return updated;
        });
    }, []);

    /**
     * Apply saved model preferences (filter to existing models only).
     */
    const applyModelPreferences = useCallback((savedModels: SelectedModelConfig[], availableModels: PredictionModel[]) => {
        if (savedModels && savedModels.length > 0) {
            const validModels = savedModels.filter(pm =>
                availableModels.some(m => m.id === pm.id && m.name === pm.name)
            );
            if (validModels.length > 0) {
                setSelectedModels(validModels);
            }
        }
        prefsLoadedRef.current = true;
    }, []);

    return {
        models,
        setModels,
        selectedModels,
        setSelectedModels,
        calculatingDatesByModel,
        handleModelChange,
        handleModelCalculatingDateChange,
        selectedModelKeysString,
        applyModelPreferences,
    };
};
