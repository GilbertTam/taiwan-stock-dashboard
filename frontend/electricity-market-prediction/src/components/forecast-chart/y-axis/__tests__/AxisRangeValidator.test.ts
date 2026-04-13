import { AxisRangeValidator } from '../AxisRangeValidator';
import fc from 'fast-check';

describe('AxisRangeValidator', () => {
  describe('Empty input validation', () => {
    it('should reject empty string min input', () => {
      const validator = new AxisRangeValidator();
      const result = validator.validate('', '100');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('axisValidation.minEmpty');
    });

    it('should reject empty string max input', () => {
      const validator = new AxisRangeValidator();
      const result = validator.validate('0', '');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('axisValidation.maxEmpty');
    });

    it('should reject both empty strings', () => {
      const validator = new AxisRangeValidator();
      const result = validator.validate('', '');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('axisValidation.minEmpty');
      expect(result.errors).toContain('axisValidation.maxEmpty');
    });
  });

  describe('Numeric format validation', () => {
    it('should accept valid integer range', () => {
      const validator = new AxisRangeValidator();
      const result = validator.validate('0', '100');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept valid decimal range', () => {
      const validator = new AxisRangeValidator();
      const result = validator.validate('0.5', '99.9');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept negative range', () => {
      const validator = new AxisRangeValidator();
      const result = validator.validate('-100', '-10');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept scientific notation', () => {
      const validator = new AxisRangeValidator();
      const result = validator.validate('1e-5', '1e5');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject alphabetic input', () => {
      const validator = new AxisRangeValidator();
      const result = validator.validate('abc', '100');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('InvalidNumber'))).toBe(true);
    });

    it('should reject special character input', () => {
      const validator = new AxisRangeValidator();
      const result = validator.validate('10@#', '100');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('InvalidNumber'))).toBe(true);
    });

    it('should reject multiple decimal points', () => {
      const validator = new AxisRangeValidator();
      const result = validator.validate('10.5.5', '100');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('InvalidNumber'))).toBe(true);
    });
  });

  describe('Min less than max validation', () => {
    it('should reject min equal to max', () => {
      const validator = new AxisRangeValidator();
      const result = validator.validate('50', '50');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('axisValidation.minMustBeLess');
    });

    it('should reject min greater than max', () => {
      const validator = new AxisRangeValidator();
      const result = validator.validate('100', '50');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('axisValidation.minMustBeLess');
    });

    it('should accept min less than max', () => {
      const validator = new AxisRangeValidator();
      const result = validator.validate('10', '100');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Range size validation', () => {
    it('should warn when range is too small (< 0.01)', () => {
      const validator = new AxisRangeValidator();
      const result = validator.validate('10', '10.005');

      expect(result.isValid).toBe(true); // Still valid, just a warning
      expect(result.warnings.some(w => w.includes('rangeTooSmall'))).toBe(true);
    });

    it('should not warn when range >= 0.01', () => {
      const validator = new AxisRangeValidator();
      const result = validator.validate('10', '10.02');

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should not warn when range > 0.01', () => {
      const validator = new AxisRangeValidator();
      const result = validator.validate('10', '20');

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('Edge cases and error conditions', () => {
    describe('Whitespace handling', () => {
      it('should handle inputs with leading/trailing spaces', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('  10  ', '  100  ');

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle tab characters', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('\t10\t', '\t100\t');

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject whitespace-only input', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('   ', '100');

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('axisValidation.minEmpty');
      });
    });

    describe('Boundary values', () => {
      it('should handle zero value', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('0', '100');

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle negative to positive range', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('-50', '50');

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle two negative numbers', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('-100', '-10');

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle very large values', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('0', '1e308');

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle very small values', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('-1e308', '0');

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle very small positive numbers', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('1e-100', '1e-50');

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Special numeric formats', () => {
      it('should handle leading decimal point', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('.5', '10.5');

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle positive sign prefix', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('+10', '+100');

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle scientific notation (lowercase e)', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('1e2', '1e5');

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle scientific notation (uppercase E)', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('1E2', '1E5');

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle scientific notation with positive exponent', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('1e+2', '1e+5');

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle scientific notation with negative exponent', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('1e-5', '1e-2');

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle decimal scientific notation', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('1.5e2', '2.5e3');

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Special characters and invalid formats', () => {
      it('should reject comma-separated input', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('1,000', '10,000');

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('InvalidNumber'))).toBe(true);
      });

      it('should reject underscore-separated input', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('1_000', '10_000');

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('InvalidNumber'))).toBe(true);
      });

      it('should reject currency symbol input', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('$100', '$1000');

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('InvalidNumber'))).toBe(true);
      });

      it('should reject percent sign input', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('10%', '100%');

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('InvalidNumber'))).toBe(true);
      });

      it('should reject parenthesized input', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('(10)', '(100)');

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('InvalidNumber'))).toBe(true);
      });

      it('should reject Chinese character input', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('十', '一百');

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('InvalidNumber'))).toBe(true);
      });

      it('should reject mixed alphanumeric input', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('10a', '100b');

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('InvalidNumber'))).toBe(true);
      });
    });

    describe('Infinity and NaN handling', () => {
      it('should reject Infinity string', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('Infinity', '100');

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('InvalidNumber'))).toBe(true);
      });

      it('should reject -Infinity string', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('-Infinity', '100');

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('InvalidNumber'))).toBe(true);
      });

      it('should reject NaN string', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('NaN', '100');

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('InvalidNumber'))).toBe(true);
      });

      it('should reject out-of-range values causing Infinity', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('0', '1e309');

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('Malformed numeric inputs', () => {
      it('should reject multiple decimal points', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('10.5.5', '100');

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('InvalidNumber'))).toBe(true);
      });

      it('should reject multiple negative signs', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('--10', '100');

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('InvalidNumber'))).toBe(true);
      });

      it('should reject negative sign in the middle', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('10-5', '100');

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('InvalidNumber'))).toBe(true);
      });

      it('should reject decimal point only', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('.', '100');

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('InvalidNumber'))).toBe(true);
      });

      it('should reject negative sign only', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('-', '100');

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('InvalidNumber'))).toBe(true);
      });

      it('should reject scientific notation without exponent', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('1e', '100');

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('InvalidNumber'))).toBe(true);
      });
    });

    describe('Range size edge cases', () => {
      it('should not warn when range equals 0.01', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('10', '10.011');

        expect(result.isValid).toBe(true);
        expect(result.warnings).toHaveLength(0);
      });

      it('should warn when range is slightly less than 0.01', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('10', '10.009');

        expect(result.isValid).toBe(true);
        expect(result.warnings.some(w => w.includes('rangeTooSmall'))).toBe(true);
      });

      it('should warn for very small range', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('100', '100.001');

        expect(result.isValid).toBe(true);
        expect(result.warnings.some(w => w.includes('rangeTooSmall'))).toBe(true);
      });

      it('should check range size for negative numbers too', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('-100', '-99.995');

        expect(result.isValid).toBe(true);
        expect(result.warnings.some(w => w.includes('rangeTooSmall'))).toBe(true);
      });
    });

    describe('Min/Max logic edge cases', () => {
      it('should reject min slightly greater than max', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('100.001', '100');

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('axisValidation.minMustBeLess');
      });

      it('should reject equal negative numbers', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('-50', '-50');

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('axisValidation.minMustBeLess');
      });

      it('should reject equal zeros', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('0', '0');

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('axisValidation.minMustBeLess');
      });

      it('should reject equal values in scientific notation', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('1e2', '100');

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('axisValidation.minMustBeLess');
      });
    });

    describe('Combined error conditions', () => {
      it('should report multiple format errors', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('abc', 'xyz');

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(2);
        expect(result.errors.some(e => e.includes('InvalidNumber'))).toBe(true);
      });

      it('should not check logic when min has format error', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('abc', '100');

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('InvalidNumber');
      });

      it('should not check logic when max has format error', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('10', 'xyz');

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('InvalidNumber');
      });
    });
  });

  describe('Custom validation rules', () => {
    it('should support adding custom error rules', () => {
      const validator = new AxisRangeValidator();

      validator.addRule({
        validate: (min, max) => (max - min) >= 10,
        messageKey: 'custom.rangeMustBeAtLeast10',
        severity: 'error',
      });

      const result = validator.validate('0', '5');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('custom.rangeMustBeAtLeast10');
    });

    it('should support adding custom warning rules', () => {
      const validator = new AxisRangeValidator();

      validator.addRule({
        validate: (min, max) => (max - min) <= 1000,
        messageKey: 'custom.rangeTooLarge',
        severity: 'warning',
      });

      const result = validator.validate('0', '2000');

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('custom.rangeTooLarge');
    });
  });

  describe('Multiple validation errors', () => {
    it('should return multiple format errors', () => {
      const validator = new AxisRangeValidator();
      const result = validator.validate('abc', 'xyz');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('should return both errors and warnings', () => {
      const validator = new AxisRangeValidator();
      const result = validator.validate('100', '100');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('axisValidation.minMustBeLess');
      expect(result.warnings.some(w => w.includes('rangeTooSmall'))).toBe(true);
    });
  });

  describe('Property-Based Tests', () => {
    it('Property 8: non-numeric input should return format error', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => {
            if (s.trim() === '') return false;
            const numericRegex = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
            return !numericRegex.test(s.trim());
          }),
          (invalidInput) => {
            const validator = new AxisRangeValidator();

            const resultMin = validator.validate(invalidInput, '100');
            expect(resultMin.isValid).toBe(false);
            expect(resultMin.errors.some(e =>
              e.includes('InvalidNumber') || e.includes('NotFinite')
            )).toBe(true);

            const resultMax = validator.validate('0', invalidInput);
            expect(resultMax.isValid).toBe(false);
            expect(resultMax.errors.some(e =>
              e.includes('InvalidNumber') || e.includes('NotFinite')
            )).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 9: min >= max should return logic error', () => {
      fc.assert(
        fc.property(
          fc.double({ noNaN: true, min: -1e10, max: 1e10 }),
          fc.double({ noNaN: true, min: -1e10, max: 1e10 }),
          (a, b) => {
            const minValue = Math.max(a, b);
            const maxValue = Math.min(a, b);

            const validator = new AxisRangeValidator();
            const result = validator.validate(
              minValue.toString(),
              maxValue.toString()
            );

            expect(result.isValid).toBe(false);
            expect(result.errors.some(e =>
              e.includes('minMustBeLess')
            )).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 10: range < 0.01 should show warning', () => {
      fc.assert(
        fc.property(
          fc.double({ noNaN: true, min: -1e10, max: 1e10 }),
          fc.double({ noNaN: true, min: 0, max: 0.009999 }),
          (base, delta) => {
            const minValue = base;
            const maxValue = base + delta;

            if (maxValue <= minValue || delta < 1e-10) {
              return true;
            }

            const validator = new AxisRangeValidator();
            const result = validator.validate(
              minValue.toString(),
              maxValue.toString()
            );

            expect(result.isValid).toBe(true);
            expect(result.warnings.some(w =>
              w.includes('rangeTooSmall')
            )).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
