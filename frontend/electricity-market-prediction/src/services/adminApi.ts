/**
 * @fileoverview Admin User Management API
 *
 * Endpoints under `/users/*` — list/patch/approve users and the two
 * runtime registration toggles. All require an active superuser session;
 * non-admins receive 403 from the backend.
 */

import { createAuthenticatedApi } from './apiClient';
import type {
    AdminCreateUserRequest,
    AdminUserPatch,
    AdminUserRow,
    AppSettings,
} from '@/types';

export const listUsers = async (): Promise<AdminUserRow[]> => {
    const api = createAuthenticatedApi();
    const response = await api.get<AdminUserRow[]>('/users');
    return response.data;
};

export const createUser = async (
    payload: AdminCreateUserRequest,
): Promise<AdminUserRow> => {
    const api = createAuthenticatedApi();
    const response = await api.post<AdminUserRow>('/users', payload);
    return response.data;
};

export const patchUser = async (
    userId: number,
    patch: AdminUserPatch,
): Promise<AdminUserRow> => {
    const api = createAuthenticatedApi();
    const response = await api.patch<AdminUserRow>(`/users/${userId}`, patch);
    return response.data;
};

export const deleteUser = async (userId: number): Promise<void> => {
    const api = createAuthenticatedApi();
    await api.delete(`/users/${userId}`);
};

export const resetUserPassword = async (
    userId: number,
    newPassword: string,
): Promise<void> => {
    const api = createAuthenticatedApi();
    await api.post(`/users/${userId}/reset-password`, { new_password: newPassword });
};

export const approveUser = async (userId: number): Promise<AdminUserRow> => {
    const api = createAuthenticatedApi();
    const response = await api.post<AdminUserRow>(`/users/${userId}/approve`);
    return response.data;
};

export const rejectUser = async (userId: number): Promise<void> => {
    const api = createAuthenticatedApi();
    await api.post(`/users/${userId}/reject`);
};

export const getAdminSettings = async (): Promise<AppSettings> => {
    const api = createAuthenticatedApi();
    const response = await api.get<AppSettings>('/users/settings');
    return response.data;
};

export const updateAdminSettings = async (
    payload: AppSettings,
): Promise<AppSettings> => {
    const api = createAuthenticatedApi();
    const response = await api.put<AppSettings>('/users/settings', payload);
    return response.data;
};
