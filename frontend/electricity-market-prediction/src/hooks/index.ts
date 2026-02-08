/**
 * @fileoverview Hooks Barrel Export
 *
 * Re-exports all custom hooks for convenient importing.
 */

// Core data hooks
export { useMarketData } from './useMarketData';
export type { UseMarketDataReturn } from './useMarketData';

// Utility hooks
export { useDebounce } from './useDebounce';
export { useBufferedDateRange } from './useBufferedDateRange';
export { useUserPreferences } from './useUserPreferences';

// Extracted modular hooks
export { useDateRange } from './useDateRange';
export type { UseDateRangeReturn, DateRangePreset } from './useDateRange';

export { useDataLayerToggles } from './useDataLayerToggles';
export type { UseDataLayerTogglesReturn } from './useDataLayerToggles';

export { useModelSelection } from './useModelSelection';
export type { UseModelSelectionReturn, SelectedModelConfig } from './useModelSelection';
