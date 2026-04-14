import { createAuthenticatedApi } from './apiClient';
import type { Preset, PresetListResponse } from '@/types/presets';

export async function fetchPresets<T = Record<string, unknown>>(pageKey: string): Promise<Preset<T>[]> {
    const api = createAuthenticatedApi();
    const res = await api.get<PresetListResponse<T>>('/presets/', { params: { page_key: pageKey } });
    return res.data.presets;
}

export async function createPreset<T = Record<string, unknown>>(payload: {
    page_key: string;
    name: string;
    data: T;
    is_default?: boolean;
}): Promise<Preset<T>> {
    const api = createAuthenticatedApi();
    const res = await api.post<Preset<T>>('/presets/', payload);
    return res.data;
}

export async function updatePreset<T = Record<string, unknown>>(
    id: number,
    payload: { name?: string; data?: T; is_default?: boolean },
): Promise<Preset<T>> {
    const api = createAuthenticatedApi();
    const res = await api.put<Preset<T>>(`/presets/${id}`, payload);
    return res.data;
}

export async function deletePresetApi(id: number): Promise<void> {
    const api = createAuthenticatedApi();
    await api.delete(`/presets/${id}`);
}
