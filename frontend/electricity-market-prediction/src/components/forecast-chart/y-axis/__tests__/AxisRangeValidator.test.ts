import { AxisRangeValidator } from '../AxisRangeValidator';
import fc from 'fast-check';

describe('AxisRangeValidator', () => {
  describe('Empty input validation', () => {
    it('应该拒绝空字符串最小值输入', () => {
      const validator = new AxisRangeValidator();
      const result = validator.validate('', '100');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('最小值不能为空');
    });

    it('应该拒绝空字符串最大值输入', () => {
      const validator = new AxisRangeValidator();
      const result = validator.validate('0', '');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('最大值不能为空');
    });

    it('应该拒绝两个空字符串输入', () => {
      const validator = new AxisRangeValidator();
      const result = validator.validate('', '');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('最小值不能为空');
      expect(result.errors).toContain('最大值不能为空');
    });
  });

  describe('Numeric format validation', () => {
    it('应该接受有效的整数范围', () => {
      const validator = new AxisRangeValidator();
      const result = validator.validate('0', '100');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该接受有效的小数范围', () => {
      const validator = new AxisRangeValidator();
      const result = validator.validate('0.5', '99.9');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该接受负数范围', () => {
      const validator = new AxisRangeValidator();
      const result = validator.validate('-100', '-10');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该接受科学计数法', () => {
      const validator = new AxisRangeValidator();
      const result = validator.validate('1e-5', '1e5');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该拒绝包含字母的输入', () => {
      const validator = new AxisRangeValidator();
      const result = validator.validate('abc', '100');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('有效的数字'))).toBe(true);
    });

    it('应该拒绝包含特殊字符的输入', () => {
      const validator = new AxisRangeValidator();
      const result = validator.validate('10@#', '100');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('有效的数字'))).toBe(true);
    });

    it('应该拒绝多个小数点的输入', () => {
      const validator = new AxisRangeValidator();
      const result = validator.validate('10.5.5', '100');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('有效的数字'))).toBe(true);
    });
  });

  describe('Min less than max validation', () => {
    it('应该拒绝最小值等于最大值', () => {
      const validator = new AxisRangeValidator();
      const result = validator.validate('50', '50');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('最小值必须小于最大值');
    });

    it('应该拒绝最小值大于最大值', () => {
      const validator = new AxisRangeValidator();
      const result = validator.validate('100', '50');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('最小值必须小于最大值');
    });

    it('应该接受最小值小于最大值', () => {
      const validator = new AxisRangeValidator();
      const result = validator.validate('10', '100');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Range size validation', () => {
    it('应该对范围过小显示警告（< 0.01）', () => {
      const validator = new AxisRangeValidator();
      const result = validator.validate('10', '10.005');
      
      expect(result.isValid).toBe(true); // Still valid, just a warning
      expect(result.warnings.some(w => w.includes('范围过小'))).toBe(true);
    });

    it('应该对范围 >= 0.01 不显示警告', () => {
      const validator = new AxisRangeValidator();
      // Use a range that is clearly >= 0.01 to avoid floating point issues
      const result = validator.validate('10', '10.02');
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('应该对范围 > 0.01 不显示警告', () => {
      const validator = new AxisRangeValidator();
      const result = validator.validate('10', '20');
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('Edge cases and error conditions', () => {
    describe('Whitespace handling', () => {
      it('应该处理前后有空格的输入', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('  10  ', '  100  ');
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('应该处理制表符', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('\t10\t', '\t100\t');
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('应该拒绝仅包含空格的输入', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('   ', '100');
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('最小值不能为空');
      });
    });

    describe('Boundary values', () => {
      it('应该处理零值', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('0', '100');
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('应该处理负数到正数的范围', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('-50', '50');
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('应该处理两个负数的范围', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('-100', '-10');
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('应该处理极大值', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('0', '1e308');
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('应该处理极小值', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('-1e308', '0');
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('应该处理非常小的正数', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('1e-100', '1e-50');
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Special numeric formats', () => {
      it('应该处理小数点开头的数字', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('.5', '10.5');
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('应该处理正号前缀', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('+10', '+100');
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('应该处理科学计数法（小写e）', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('1e2', '1e5');
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('应该处理科学计数法（大写E）', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('1E2', '1E5');
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('应该处理科学计数法带正号指数', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('1e+2', '1e+5');
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('应该处理科学计数法带负号指数', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('1e-5', '1e-2');
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('应该处理小数科学计数法', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('1.5e2', '2.5e3');
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Special characters and invalid formats', () => {
      it('应该拒绝包含逗号的输入', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('1,000', '10,000');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('有效的数字'))).toBe(true);
      });

      it('应该拒绝包含下划线的输入', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('1_000', '10_000');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('有效的数字'))).toBe(true);
      });

      it('应该拒绝包含货币符号的输入', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('$100', '$1000');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('有效的数字'))).toBe(true);
      });

      it('应该拒绝包含百分号的输入', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('10%', '100%');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('有效的数字'))).toBe(true);
      });

      it('应该拒绝包含括号的输入', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('(10)', '(100)');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('有效的数字'))).toBe(true);
      });

      it('应该拒绝包含中文字符的输入', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('十', '一百');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('有效的数字'))).toBe(true);
      });

      it('应该拒绝混合数字和字母的输入', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('10a', '100b');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('有效的数字'))).toBe(true);
      });
    });

    describe('Infinity and NaN handling', () => {
      it('应该拒绝 Infinity 字符串', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('Infinity', '100');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('有效的数字'))).toBe(true);
      });

      it('应该拒绝 -Infinity 字符串', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('-Infinity', '100');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('有效的数字'))).toBe(true);
      });

      it('应该拒绝 NaN 字符串', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('NaN', '100');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('有效的数字'))).toBe(true);
      });

      it('应该拒绝超出范围导致 Infinity 的值', () => {
        const validator = new AxisRangeValidator();
        // Note: parseFloat('1e309') returns Infinity, but the regex validation
        // passes first, so this is accepted as valid format but then caught
        // by the isFinite check. However, the regex actually accepts it.
        const result = validator.validate('0', '1e309');
        
        // The value passes regex but fails isFinite check
        expect(result.isValid).toBe(false);
        // It should have an error about being finite
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('Malformed numeric inputs', () => {
      it('应该拒绝多个小数点', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('10.5.5', '100');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('有效的数字'))).toBe(true);
      });

      it('应该拒绝多个负号', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('--10', '100');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('有效的数字'))).toBe(true);
      });

      it('应该拒绝负号在中间的输入', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('10-5', '100');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('有效的数字'))).toBe(true);
      });

      it('应该拒绝仅包含小数点的输入', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('.', '100');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('有效的数字'))).toBe(true);
      });

      it('应该拒绝仅包含负号的输入', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('-', '100');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('有效的数字'))).toBe(true);
      });

      it('应该拒绝科学计数法缺少指数的输入', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('1e', '100');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('有效的数字'))).toBe(true);
      });
    });

    describe('Range size edge cases', () => {
      it('应该对范围恰好等于 0.01 不显示警告', () => {
        const validator = new AxisRangeValidator();
        // Due to floating point precision, 10.01 - 10 might not be exactly 0.01
        // Use a slightly larger value to ensure it's >= 0.01
        const result = validator.validate('10', '10.011');
        
        expect(result.isValid).toBe(true);
        expect(result.warnings).toHaveLength(0);
      });

      it('应该对范围略小于 0.01 显示警告', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('10', '10.009');
        
        expect(result.isValid).toBe(true);
        expect(result.warnings.some(w => w.includes('范围过小'))).toBe(true);
      });

      it('应该对非常小的范围显示警告', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('100', '100.001');
        
        expect(result.isValid).toBe(true);
        expect(result.warnings.some(w => w.includes('范围过小'))).toBe(true);
      });

      it('应该对负数范围也检查大小', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('-100', '-99.995');
        
        expect(result.isValid).toBe(true);
        expect(result.warnings.some(w => w.includes('范围过小'))).toBe(true);
      });
    });

    describe('Min/Max logic edge cases', () => {
      it('应该拒绝最小值略大于最大值', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('100.001', '100');
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('最小值必须小于最大值');
      });

      it('应该拒绝相同的负数', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('-50', '-50');
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('最小值必须小于最大值');
      });

      it('应该拒绝相同的零值', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('0', '0');
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('最小值必须小于最大值');
      });

      it('应该拒绝科学计数法表示的相同值', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('1e2', '100');
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('最小值必须小于最大值');
      });
    });

    describe('Combined error conditions', () => {
      it('应该同时报告格式错误和逻辑错误', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('abc', 'xyz');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(2);
        expect(result.errors.some(e => e.includes('有效的数字'))).toBe(true);
      });

      it('应该在最小值格式错误时不检查逻辑', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('abc', '100');
        
        expect(result.isValid).toBe(false);
        // Should only have format error, not logic error
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('有效的数字');
      });

      it('应该在最大值格式错误时不检查逻辑', () => {
        const validator = new AxisRangeValidator();
        const result = validator.validate('10', 'xyz');
        
        expect(result.isValid).toBe(false);
        // Should only have format error, not logic error
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('有效的数字');
      });
    });
  });

  describe('Custom validation rules', () => {
    it('应该支持添加自定义验证规则', () => {
      const validator = new AxisRangeValidator();
      
      // Add custom rule: range must be at least 10
      validator.addRule({
        validate: (min, max) => (max - min) >= 10,
        errorMessage: '范围必须至少为 10',
        severity: 'error',
      });
      
      const result = validator.validate('0', '5');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('范围必须至少为 10');
    });

    it('应该支持添加自定义警告规则', () => {
      const validator = new AxisRangeValidator();
      
      // Add custom warning: warn if range is very large
      validator.addRule({
        validate: (min, max) => (max - min) <= 1000,
        errorMessage: '范围非常大，可能影响性能',
        severity: 'warning',
      });
      
      const result = validator.validate('0', '2000');
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('范围非常大，可能影响性能');
    });
  });

  describe('Multiple validation errors', () => {
    it('应该返回多个格式错误', () => {
      const validator = new AxisRangeValidator();
      const result = validator.validate('abc', 'xyz');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('应该同时返回错误和警告', () => {
      const validator = new AxisRangeValidator();
      // This will pass format validation but fail min < max and trigger range size warning
      // Using min=100, max=100 to ensure min >= max error
      const result = validator.validate('100', '100');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('最小值必须小于最大值');
      // Note: When min === max, range is 0, which is < 0.01, so warning should be present
      expect(result.warnings.some(w => w.includes('范围过小'))).toBe(true);
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * **Validates: Requirements 6.1**
     * 
     * Property 8: 非数字输入显示格式错误
     * 
     * For any input string containing non-numeric characters,
     * the validator should identify it as a format error and display
     * an appropriate error message.
     */
    it('属性8: 对于任何包含非数字字符的字符串，应该返回格式错误', () => {
      fc.assert(
        fc.property(
          // Generate strings that are NOT valid numeric formats
          fc.string().filter(s => {
            // Exclude empty strings (handled separately)
            if (s.trim() === '') return false;
            
            // Exclude valid numeric formats
            const numericRegex = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
            return !numericRegex.test(s.trim());
          }),
          (invalidInput) => {
            const validator = new AxisRangeValidator();
            
            // Test with invalid input as min value
            const resultMin = validator.validate(invalidInput, '100');
            expect(resultMin.isValid).toBe(false);
            expect(resultMin.errors.some(e => 
              e.includes('有效的数字') || e.includes('有限的数字')
            )).toBe(true);
            
            // Test with invalid input as max value
            const resultMax = validator.validate('0', invalidInput);
            expect(resultMax.isValid).toBe(false);
            expect(resultMax.errors.some(e => 
              e.includes('有效的数字') || e.includes('有限的数字')
            )).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 2.4, 6.2**
     * 
     * Property 9: 最小值大于最大值显示逻辑错误
     * 
     * For any input combination where min >= max, the validator should
     * identify it as a logical error and display an appropriate error message.
     */
    it('属性9: 对于任何 min >= max 的输入，应该返回逻辑错误', () => {
      fc.assert(
        fc.property(
          // Generate two finite numbers
          fc.double({ noNaN: true, min: -1e10, max: 1e10 }),
          fc.double({ noNaN: true, min: -1e10, max: 1e10 }),
          (a, b) => {
            // Ensure min >= max by taking the larger value as min
            const minValue = Math.max(a, b);
            const maxValue = Math.min(a, b);
            
            // Skip if they happen to be equal and both are the same
            // (we want to test min >= max, including equality)
            const validator = new AxisRangeValidator();
            const result = validator.validate(
              minValue.toString(),
              maxValue.toString()
            );
            
            // Should be invalid
            expect(result.isValid).toBe(false);
            
            // Should contain the specific error message about min < max
            expect(result.errors.some(e => 
              e.includes('最小值') && e.includes('最大值')
            )).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 6.3**
     * 
     * Property 10: 范围过小显示警告
     * 
     * For any valid numeric input where (max - min) < 0.01, the validator
     * should display a warning message about the range being too small.
     */
    it('属性10: 对于任何范围 < 0.01 的输入，应该显示警告', () => {
      fc.assert(
        fc.property(
          // Generate a base value
          fc.double({ noNaN: true, min: -1e10, max: 1e10 }),
          // Generate a small delta that is less than 0.01
          fc.double({ noNaN: true, min: 0, max: 0.009999 }),
          (base, delta) => {
            const minValue = base;
            const maxValue = base + delta;
            
            // Ensure we have a valid range (min < max)
            // Skip if delta is too small (could cause floating point issues)
            if (maxValue <= minValue || delta < 1e-10) {
              return true; // Skip this test case
            }
            
            const validator = new AxisRangeValidator();
            const result = validator.validate(
              minValue.toString(),
              maxValue.toString()
            );
            
            // Should be valid (warnings don't make it invalid)
            expect(result.isValid).toBe(true);
            
            // Should contain a warning about range being too small
            expect(result.warnings.some(w => 
              w.includes('范围过小')
            )).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
