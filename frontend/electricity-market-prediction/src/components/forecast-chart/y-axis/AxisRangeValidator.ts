import { ValidationResult } from './types';

/**
 * Validation Rule Interface
 * Defines a single validation rule with its message key and severity
 */
export interface ValidationRule {
  validate: (min: number, max: number) => boolean;
  messageKey: string;
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
 * Returns i18n message keys instead of hardcoded strings.
 * The consuming component resolves keys via t() function.
 */
export class AxisRangeValidator {
  private rules: ValidationRule[] = [];

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Validate Y-axis range input values
   *
   * @param min - Minimum value as string (user input)
   * @param max - Maximum value as string (user input)
   * @returns ValidationResult containing validation status, errors (as i18n keys), and warnings (as i18n keys)
   */
  validate(min: string, max: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for empty inputs
    if (min.trim() === '') {
      errors.push('axisValidation.minEmpty');
    }
    if (max.trim() === '') {
      errors.push('axisValidation.maxEmpty');
    }

    if (errors.length > 0) {
      return { isValid: false, errors, warnings };
    }

    // Validate numeric format
    if (!this.validateNumericFormat(min)) {
      errors.push('axisValidation.minInvalidNumber');
    }
    if (!this.validateNumericFormat(max)) {
      errors.push('axisValidation.maxInvalidNumber');
    }

    if (errors.length > 0) {
      return { isValid: false, errors, warnings };
    }

    // Parse to numbers for further validation
    const minNum = parseFloat(min);
    const maxNum = parseFloat(max);

    if (!isFinite(minNum)) {
      errors.push('axisValidation.minNotFinite');
    }
    if (!isFinite(maxNum)) {
      errors.push('axisValidation.maxNotFinite');
    }

    if (errors.length > 0) {
      return { isValid: false, errors, warnings };
    }

    // Apply custom validation rules
    for (const rule of this.rules) {
      const isValid = rule.validate(minNum, maxNum);
      if (!isValid) {
        if (rule.severity === 'error') {
          errors.push(rule.messageKey);
        } else {
          warnings.push(rule.messageKey);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  addRule(rule: ValidationRule): void {
    this.rules.push(rule);
  }

  private initializeDefaultRules(): void {
    this.rules.push({
      validate: (min, max) => min < max,
      messageKey: 'axisValidation.minMustBeLess',
      severity: 'error',
    });

    this.rules.push({
      validate: (min, max) => (max - min) >= 0.01,
      messageKey: 'axisValidation.rangeTooSmall',
      severity: 'warning',
    });
  }

  private validateNumericFormat(value: string): boolean {
    const trimmed = value.trim();
    if (trimmed === '') return false;

    const num = parseFloat(trimmed);
    if (isNaN(num) || !isFinite(num)) return false;

    const numericRegex = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
    return numericRegex.test(trimmed);
  }
}
