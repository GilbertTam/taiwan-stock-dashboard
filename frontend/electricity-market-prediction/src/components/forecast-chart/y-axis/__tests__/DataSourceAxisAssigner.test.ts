import { IChartApi, ISeriesApi, SeriesType } from 'lightweight-charts';
import fc from 'fast-check';
import { DataSourceAxisAssigner } from '../DataSourceAxisAssigner';
import { AxisType } from '../types';

describe('DataSourceAxisAssigner', () => {
    const createMockChart = (): IChartApi => {
        return {} as IChartApi;
    };

    const createMockSeries = (): ISeriesApi<SeriesType> => {
        return {
            applyOptions: jest.fn(),
            options: jest.fn().mockReturnValue({ priceScaleId: 'right' }),
        } as unknown as ISeriesApi<SeriesType>;
    };

    describe('Unit Tests', () => {
        it('应该正确分配数据源到主轴', () => {
            const chart = createMockChart();
            const assigner = new DataSourceAxisAssigner(chart);

            assigner.assignToAxis('source1', 'primary');

            expect(assigner.getAxisForDataSource('source1')).toBe('primary');
            expect(assigner.getDataSourcesForAxis('primary')).toContain('source1');
        });

        it('应该正确分配数据源到副轴', () => {
            const chart = createMockChart();
            const assigner = new DataSourceAxisAssigner(chart);

            assigner.assignToAxis('source2', 'secondary');

            expect(assigner.getAxisForDataSource('source2')).toBe('secondary');
            expect(assigner.getDataSourcesForAxis('secondary')).toContain('source2');
        });

        it('未分配的数据源应默认为 primary', () => {
            const chart = createMockChart();
            const assigner = new DataSourceAxisAssigner(chart);

            expect(assigner.getAxisForDataSource('unknown')).toBe('primary');
        });

        it('应该在更改分配时更新系列配置', () => {
            const chart = createMockChart();
            const assigner = new DataSourceAxisAssigner(chart);
            const series = createMockSeries();

            assigner.updateSeriesAxis(series, 'secondary');
            expect(series.applyOptions).toHaveBeenCalledWith({ priceScaleId: 'left' });

            assigner.updateSeriesAxis(series, 'primary');
            expect(series.applyOptions).toHaveBeenCalledWith({ priceScaleId: 'right' });
        });
    });

    describe('Properties', () => {
        // Feature: forecast-y-axis-ux, Property 3: 数据源使用正确的轴刻度
        it('属性3: 任何数据源应该使用其分配轴的刻度并触发系列更新', () => {
            fc.assert(
                fc.property(
                    fc.array(fc.string(), { minLength: 1, maxLength: 10 }),
                    fc.array(fc.constantFrom('primary', 'secondary') as fc.Arbitrary<AxisType>, { minLength: 1 }),
                    (sourceIds, axes) => {
                        const chart = createMockChart();
                        const assigner = new DataSourceAxisAssigner(chart);

                        sourceIds.forEach((id, i) => {
                            const axis = axes[i % axes.length];
                            assigner.assignToAxis(id, axis);
                            expect(assigner.getAxisForDataSource(id)).toBe(axis);

                            // simulate updating the series
                            const series = createMockSeries();
                            assigner.updateSeriesAxis(series, axis);

                            const expectedScaleId = axis === 'primary' ? 'right' : 'left';
                            expect(series.applyOptions).toHaveBeenCalledWith({ priceScaleId: expectedScaleId });
                        });
                    }
                ),
                { numRuns: 100 }
            );
        });

        // Feature: forecast-y-axis-ux, Property 17: 数据源映射持久化
        it('属性17: 数据源映射应该能够保存和恢复', () => {
            fc.assert(
                fc.property(
                    fc.uniqueArray(
                        fc.record({
                            id: fc.string(),
                            axis: fc.constantFrom('primary', 'secondary') as fc.Arbitrary<AxisType>
                        }),
                        { minLength: 1, maxLength: 10, selector: m => m.id }
                    ),
                    (mappings) => {
                        const chart = createMockChart();
                        const assigner = new DataSourceAxisAssigner(chart);

                        // 设置映射
                        mappings.forEach(m => {
                            assigner.assignToAxis(m.id, m.axis);
                        });

                        // 保存
                        const saved = assigner.exportMappings();

                        // 创建新实例并恢复
                        const newAssigner = new DataSourceAxisAssigner(chart);
                        newAssigner.importMappings(saved);

                        // 验证
                        mappings.forEach(m => {
                            expect(newAssigner.getAxisForDataSource(m.id)).toBe(m.axis);
                        });
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
