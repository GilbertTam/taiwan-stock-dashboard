'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchPresets, createPreset, updatePreset, deletePresetApi } from '@/services/presetsApi';
import type { Preset } from '@/types/presets';

export function useDataPresets<T = Record<string, unknown>>(pageKey: string) {
    const [presets, setPresets] = useState<Preset<T>[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchPresets<T>(pageKey);
            setPresets(data);
        } catch (err) {
            console.error('[useDataPresets] Failed to fetch presets:', err);
            setError('Failed to load presets');
        } finally {
            setIsLoading(false);
        }
    }, [pageKey]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const defaultPreset = useMemo(
        () => presets.find(p => p.is_default) ?? null,
        [presets],
    );

    const savePreset = useCallback(async (name: string, data: T, isDefault = false) => {
        const result = await createPreset<T>({
            page_key: pageKey,
            name,
            data,
            is_default: isDefault,
        });
        await refresh();
        return result;
    }, [pageKey, refresh]);

    const updatePresetData = useCallback(async (id: number, data: T) => {
        await updatePreset<T>(id, { data });
        await refresh();
    }, [refresh]);

    const renamePreset = useCallback(async (id: number, name: string) => {
        await updatePreset<T>(id, { name });
        await refresh();
    }, [refresh]);

    const deletePresetItem = useCallback(async (id: number) => {
        await deletePresetApi(id);
        await refresh();
    }, [refresh]);

    const setAsDefault = useCallback(async (id: number | null) => {
        if (id === null) {
            // Clear current default
            const current = presets.find(p => p.is_default);
            if (current) {
                await updatePreset<T>(current.id, { is_default: false });
                await refresh();
            }
        } else {
            await updatePreset<T>(id, { is_default: true });
            await refresh();
        }
    }, [presets, refresh]);

    return {
        presets,
        isLoading,
        error,
        defaultPreset,
        refresh,
        savePreset,
        updatePresetData,
        renamePreset,
        deletePreset: deletePresetItem,
        setAsDefault,
    };
}
