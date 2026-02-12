/**
 * @fileoverview Type Definitions Barrel Export
 *
 * Re-exports all types for convenient importing.
 * Consumers can import from '@/types' directly.
 *
 * Organized by domain:
 * - Core: Area, PredictionModel, API response wrapper
 * - Authentication: Tokens, credentials
 * - Market Data: Prices, predictions, trading
 * - Grid Operations: Imbalance, interconnection, OCCTO
 * - External Data: Weather, earthquakes
 */

// Core types
export type { Area, PredictionModel, ApiResponse } from './core';

// Authentication types
export type { AuthTokens, LoginCredentials } from './auth';

// Market data types
export type { AreaPrice, PricePrediction, CalculatingDate } from './market';
export { TimeSlot, TimeSlotDescription } from './market';

// Grid operations types
export type {
    ImbalanceData,
    HjksOutage,
    InterconnectionFlow,
    IntradayData,
    OcctoAreaData,
    OcctoInterconnection,
    OcctoEvent,
    BatteryData,
    TdgcData,
    BidPlanData,
} from './gridOperations';

// External data types
export type { Earthquake, WeatherData } from './external';
