import { createAuthenticatedApi } from './apiClient';

interface PreferencesEnvelope {
    data: Record<string, unknown>;
}

export async function fetchUserPreferences(): Promise<Record<string, unknown>> {
    const api = createAuthenticatedApi();
    const res = await api.get<PreferencesEnvelope>('/preferences/');
    return res.data.data ?? {};
}

export async function updateUserPreferences(
    data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
    const api = createAuthenticatedApi();
    const res = await api.put<PreferencesEnvelope>('/preferences/', { data });
    return res.data.data ?? {};
}
