/**
 * Forecast Chart Y-Axis Module
 * 
 * This module provides dual Y-axis independent control for the forecast chart.
 * It addresses the limitation of lightweight-charts library (which only supports
 * native drag/zoom for one axis) by combining native chart interactions with
 * sidebar UI controls.
 */

export type {
  YAxisRange,
  YAxisConfig,
  AxisType,
  ValidationResult,
} from './types';

export { AxisRangeValidator } from './AxisRangeValidator';
export type { ValidationRule } from './AxisRangeValidator';
