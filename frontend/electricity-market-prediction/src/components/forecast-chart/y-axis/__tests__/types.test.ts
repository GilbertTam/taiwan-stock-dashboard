/**
 * Type Tests for Y-Axis Module
 * 
 * This file verifies the TypeScript interfaces and types are correctly defined
 * and validates basic type constraints using fast-check property-based testing.
 */

import fc from 'fast-check';
import type {
  YAxisRange,
  YAxisConfig,
  AxisType,
  ValidationResult,
} from '../types';

describe('Y-Axis Types', () => {
  describe('YAxisRange', () => {
    it('should accept valid range objects', () => {
      const validRange: YAxisRange = { min: 0, max: 100 };
      expect(validRange.min).toBe(0);
      expect(validRange.max).toBe(100);
    });

    it('should have min and max as numbers', () => {
      fc.assert(
        fc.property(
          fc.double(),
          fc.double(),
          (min, max) => {
            const range: YAxisRange = { min, max };
            expect(typeof range.min).toBe('number');
            expect(typeof range.max).toBe('number');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('AxisType', () => {
    it('should only accept "primary" or "secondary"', () => {
      const primary: AxisType = 'primary';
      const secondary: AxisType = 'secondary';
      
      expect(primary).toBe('primary');
      expect(secondary).toBe('secondary');
    });
  });

  describe('YAxisConfig', () => {
    it('should accept null for auto-range', () => {
      const config: YAxisConfig = {
        primary: null,
        secondary: null,
      };
      
      expect(config.primary).toBeNull();
      expect(config.secondary).toBeNull();
    });

    it('should accept valid range objects', () => {
      const config: YAxisConfig = {
        primary: { min: 0, max: 100 },
        secondary: { min: -50, max: 50 },
      };
      
      expect(config.primary).toEqual({ min: 0, max: 100 });
      expect(config.secondary).toEqual({ min: -50, max: 50 });
    });

    it('should accept mixed null and range values', () => {
      fc.assert(
        fc.property(
          fc.option(fc.record({ min: fc.double(), max: fc.double() }), { nil: null }),
          fc.option(fc.record({ min: fc.double(), max: fc.double() }), { nil: null }),
          (primary, secondary) => {
            const config: YAxisConfig = { primary, secondary };
            expect(config).toBeDefined();
            expect(config.primary === null || typeof config.primary === 'object').toBe(true);
            expect(config.secondary === null || typeof config.secondary === 'object').toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('ValidationResult', () => {
    it('should have required fields', () => {
      const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
      };
      
      expect(result.isValid).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should accept error and warning messages', () => {
      const result: ValidationResult = {
        isValid: false,
        errors: ['Invalid range'],
        warnings: ['Range too small'],
      };
      
      expect(result.errors).toContain('Invalid range');
      expect(result.warnings).toContain('Range too small');
    });

    it('should handle multiple errors and warnings', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.array(fc.string()),
          fc.array(fc.string()),
          (isValid, errors, warnings) => {
            const result: ValidationResult = { isValid, errors, warnings };
            expect(typeof result.isValid).toBe('boolean');
            expect(Array.isArray(result.errors)).toBe(true);
            expect(Array.isArray(result.warnings)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
