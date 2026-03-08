import { ValidationResult } from './types';

/**
 * Validation Rule Interface
 * Defines a single validation rule with its error message and severity
 */
export interface ValidationRule {
  validate: (min: number, max: number) => boolean;
  errorMessage: string;
  severity: 'error' | 'warning';
}

/**
 * AxisRangeValidator
 * 
 * Validates Y-axis range input values to ensure they are:
 * - Valid numeric format
 * - Logically consistent (min < max)
 * - Within reasonable size constraints
 * 
 * Validates Requirements: 6.1, 6.2, 6.3, 6.4
 */
export class AxisRangeValidator {
  private rules: ValidationRule[] = [];

  constructor() {
    // Initialize with default validation rules
    this.initializeDefaultRules();
  }

  /**
   * Validate Y-axis range input values
   * 
   * @param min - Minimum value as string (user input)
   * @param max - Maximum value as string (user input)
   * @returns ValidationResult containing validation status, errors, and warnings
   */
  validate(min: string, max: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for empty inputs
    if (min.trim() === '') {
      errors.push('最小值不能为空');
    }
    if (max.trim() === '') {
      errors.push('最大值不能为空');
    }

    // If either is empty, return early
    if (errors.length > 0) {
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    // Validate numeric format
    if (!this.validateNumericFormat(min)) {
      errors.push('最小值必须是有效的数字');
    }
    if (!this.validateNumericFormat(max)) {
      errors.push('最大值必须是有效的数字');
    }

    // If format validation failed, return early
    if (errors.length > 0) {
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    // Parse to numbers for further validation
    const minNum = parseFloat(min);
    const maxNum = parseFloat(max);

    // Check for NaN or Infinity after parsing
    if (!isFinite(minNum)) {
      errors.push('最小值必须是有限的数字');
    }
    if (!isFinite(maxNum)) {
      errors.push('最大值必须是有限的数字');
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    // Apply custom validation rules
    for (const rule of this.rules) {
      const isValid = rule.validate(minNum, maxNum);
      if (!isValid) {
        if (rule.severity === 'error') {
          errors.push(rule.errorMessage);
        } else {
          warnings.push(rule.errorMessage);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Add a custom validation rule
   * 
   * @param rule - Validation rule to add
   */
  addRule(rule: ValidationRule): void {
    this.rules.push(rule);
  }

  /**
   * Initialize default validation rules
   * @private
   */
  private initializeDefaultRules(): void {
    // Rule: min must be less than max
    this.rules.push({
      validate: (min, max) => this.validateMinLessThanMax(min, max),
      errorMessage: '最小值必须小于最大值',
      severity: 'error',
    });

    // Rule: range size should not be too small
    this.rules.push({
      validate: (min, max) => this.validateRangeSize(min, max),
      errorMessage: '范围过小（最大值 - 最小值 < 0.01），可能导致显示问题',
      severity: 'warning',
    });
  }

  /**
   * Validate that input string is a valid numeric format
   * Accepts integers, decimals, negative numbers, and scientific notation
   * 
   * @param value - String value to validate
   * @returns true if valid numeric format, false otherwise
   * @private
   */
  private validateNumericFormat(value: string): boolean {
    // Trim whitespace
    const trimmed = value.trim();
    
    // Empty string is not valid
    if (trimmed === '') {
      return false;
    }

    // Try to parse as number
    const num = parseFloat(trimmed);
    
    // Check if parsing succeeded and result is finite
    if (isNaN(num) || !isFinite(num)) {
      return false;
    }

    // Additional check: ensure the string represents a valid number format
    // This regex accepts: optional sign, digits, optional decimal point and digits, optional scientific notation
    const numericRegex = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
    return numericRegex.test(trimmed);
  }

  /**
   * Validate that minimum value is less than maximum value
   * 
   * @param min - Minimum value
   * @param max - Maximum value
   * @returns true if min < max, false otherwise
   * @private
   */
  private validateMinLessThanMax(min: number, max: number): boolean {
    return min < max;
  }

  /**
   * Validate that range size is not too small
   * Returns false (triggers warning) if range is less than 0.01
   * 
   * @param min - Minimum value
   * @param max - Maximum value
   * @returns true if range >= 0.01, false if range < 0.01
   * @private
   */
  private validateRangeSize(min: number, max: number): boolean {
    const range = max - min;
    return range >= 0.01;
  }
}
