/**
 * @fileoverview API Service Module (DEPRECATED)
 *
 * This file is kept for backward compatibility.
 * Please import from individual service modules or from '@/services' instead.
 *
 * @deprecated Use specific imports:
 * - import { login } from '@/services/authApi';
 * - import { fetchPredictions } from '@/services/predictionsApi';
 * - import { fetchAreas } from '@/services/marketApi';
 * - import { fetchWeatherActual } from '@/services/weatherApi';
 * - import { fetchImbalance } from '@/services/gridOperationsApi';
 *
 * Or use the barrel export:
 * - import { login, fetchAreas, fetchPredictions } from '@/services';
 */

// Re-export everything from the new modular structure for backward compatibility
export * from './authApi';
export * from './predictionsApi';
export * from './marketApi';
export * from './weatherApi';
export * from './gridOperationsApi';
export { getAccessToken, createApiInstance } from './apiClient';
