/**
 * Y-Axis Range Interface
 * Represents the visible range for a Y-axis
 */
export interface YAxisRange {
  min: number;
  max: number;
}

/**
 * Axis Type
 * Defines which Y-axis is being referenced
 */
export type AxisType = 'primary' | 'secondary';

/**
 * Y-Axis Configuration Interface
 * Complete configuration for both primary and secondary Y-axes
 */
export interface YAxisConfig {
  primary: YAxisRange | null;  // null indicates auto-range
  secondary: YAxisRange | null; // null indicates auto-range
}

/**
 * Validation Result Interface
 * Result of input validation for Y-axis range values
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
