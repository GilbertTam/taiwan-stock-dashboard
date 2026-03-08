import fc from 'fast-check';
import { calculateDefaultRange, DataSource } from '../utils';

describe('Default Range Calculation', () => {
    describe('Unit Tests', () => {
        it('应该为空数据返回默认范围', () => {
            const range = calculateDefaultRange([]);
            expect(range).toEqual({ min: 0, max: 100 });
        });

        it('应该为单一值添加边距 (非零)', () => {
            const dataSources: DataSource[] = [{ values: [50, 50, 50] }];
            const range = calculateDefaultRange(dataSources);

            expect(range.min).toBeLessThan(50);
            expect(range.max).toBeGreaterThan(50);
            expect(range.min).toBe(45);
            expect(range.max).toBe(55);
        });

        it('应该为单一值0添加边距', () => {
            const dataSources: DataSource[] = [{ values: [0, 0] }];
            const range = calculateDefaultRange(dataSources);

            expect(range.min).toBe(-1);
            expect(range.max).toBe(1);
        });

        it('应该忽略无效值 (NaN, Infinity)', () => {
            const dataSources: DataSource[] = [
                { values: [NaN, Infinity, -Infinity, 10, 20] }
            ];
            const range = calculateDefaultRange(dataSources);

            // min = 10, max = 20, padding = 1
            expect(range.min).toBe(9);
            expect(range.max).toBe(21);
        });

        it('如果全部都是无效值，应返回默认范围', () => {
            const dataSources: DataSource[] = [
                { values: [NaN, Infinity, -Infinity] }
            ];
            const range = calculateDefaultRange(dataSources);

            expect(range).toEqual({ min: 0, max: 100 });
        });
    });

    describe('Properties', () => {
        // Feature: forecast-y-axis-ux, Property 12: 主轴自动计算默认范围
        // Feature: forecast-y-axis-ux, Property 13: 副轴自动计算默认范围
        it('属性12/13: 对于任何数据源集合，应该计算包含所有数据的范围', () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.record({
                            id: fc.string(),
                            values: fc.array(fc.double({ min: -1000, max: 1000, noNaN: true, noDefaultInfinity: true }), {
                                minLength: 1,
                                maxLength: 100
                            })
                        }),
                        { minLength: 1, maxLength: 5 }
                    ),
                    (dataSources) => {
                        const range = calculateDefaultRange(dataSources);
                        const allValues = dataSources.flatMap(ds => ds.values);
                        const validValues = allValues.filter(v => Number.isFinite(v) && !Number.isNaN(v));

                        if (validValues.length > 0) {
                            const dataMin = Math.min(...validValues);
                            const dataMax = Math.max(...validValues);

                            // 范围应该包含所有数据点
                            expect(range.min).toBeLessThanOrEqual(dataMin);
                            expect(range.max).toBeGreaterThanOrEqual(dataMax);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
