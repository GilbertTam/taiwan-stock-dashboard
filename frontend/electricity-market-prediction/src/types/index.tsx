/**
 * @fileoverview Type Definitions (DEPRECATED - use index.ts)
 *
 * This file is kept for backward compatibility.
 * Please import from '@/types' instead, which now uses index.ts.
 *
 * @deprecated Import from '@/types' or specific type modules:
 * - import { Area, PredictionModel } from '@/types/core';
 * - import { AuthTokens } from '@/types/auth';
 * - import { AreaPrice, PricePrediction } from '@/types/market';
 * - import { ImbalanceData, HjksOutage } from '@/types/gridOperations';
 * - import { WeatherData, Earthquake } from '@/types/external';
 */

// Re-export everything from the new modular structure for backward compatibility
export * from './core';
export * from './auth';
export * from './market';
export * from './gridOperations';
export * from './external';
