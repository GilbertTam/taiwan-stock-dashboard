import { IChartApi, IPriceScaleApi, ITimeScaleApi } from 'lightweight-charts';
import fc from 'fast-check';
import { YAxisController } from '../YAxisController';
import { YAxisRange } from '../types';

describe('YAxisController', () => {
    // Setup global localStorage mock
    const localStorageMock = (function () {
        let store: Record<string, string> = {};
        return {
            getItem: jest.fn((key: string) => store[key] || null),
            setItem: jest.fn((key: string, value: string) => { store[key] = value.toString(); }),
            clear: jest.fn(() => { store = {}; }),
            removeItem: jest.fn((key: string) => { delete store[key]; })
        };
    })();
    Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });

    // Mock factory for lightweight-charts IChartApi
    const createMockChart = (): IChartApi => {
        const mockPrimaryScale = {
            applyOptions: jest.fn(),
            getVisibleRange: jest.fn().mockReturnValue({ from: 10, to: 100 }),
        } as unknown as IPriceScaleApi;

        const mockSecondaryScale = {
            applyOptions: jest.fn(),
            getVisibleRange: jest.fn().mockReturnValue({ from: 20, to: 200 }),
            setVisibleRange: jest.fn(),
        } as unknown as IPriceScaleApi;

        const mockTimeScale = {
            subscribeVisibleLogicalRangeChange: jest.fn(),
            unsubscribeVisibleLogicalRangeChange: jest.fn(),
        } as unknown as ITimeScaleApi<any>;

        return {
            priceScale: jest.fn((id: string) => {
                if (id === 'right') return mockPrimaryScale;
                if (id === 'left') return mockSecondaryScale;
                return null;
            }),
            timeScale: jest.fn(() => mockTimeScale),
        } as unknown as IChartApi;
    };

    describe('Unit Tests', () => {
        let chart: IChartApi;
        let controller: YAxisController;

        beforeEach(() => {
            localStorage.clear();
            chart = createMockChart();
            controller = new YAxisController(chart);
        });

        it('应该在初始化时可以获取范围', () => {
            expect(controller.getPrimaryRange()).toBeDefined();
            expect(controller.getSecondaryRange()).toBeDefined();

            expect(controller.getPrimaryRange()).toEqual({ min: 10, max: 100 });
            expect(controller.getSecondaryRange()).toEqual({ min: 20, max: 200 });
        });

        it('应该在副轴范围更新时调用正确的API', async () => {
            const secondaryScale = chart.priceScale('left');
            const mockSetVisibleRange = secondaryScale.setVisibleRange as jest.Mock;

            await controller.setSecondaryRange({ min: 0, max: 100 });

            expect(secondaryScale.applyOptions).toHaveBeenCalledWith({ autoScale: false });
            expect(mockSetVisibleRange).toHaveBeenCalledWith({
                from: 0,
                to: 100
            });
        });

        it('应该能重置主轴和副轴到自动缩放', () => {
            const primaryScale = chart.priceScale('right');
            const secondaryScale = chart.priceScale('left');

            controller.resetPrimaryRange();
            expect(primaryScale.applyOptions).toHaveBeenCalledWith({ autoScale: true });

            controller.resetSecondaryRange();
            expect(secondaryScale.applyOptions).toHaveBeenCalledWith({ autoScale: true });
        });

        it('应该在主轴配置不足时从图表获取', () => {
            const primaryScale = chart.priceScale('right');
            (primaryScale.getVisibleRange as jest.Mock).mockReturnValue({ from: 30, to: 300 });

            expect(controller.getPrimaryRange()).toEqual({ min: 30, max: 300 });
        });

        it('如果API调用失败应抛出包含上下文的错误', async () => {
            const secondaryScale = chart.priceScale('left');
            (secondaryScale.setVisibleRange as jest.Mock).mockImplementation(() => {
                throw new Error('API Error');
            });

            await expect(controller.setSecondaryRange({ min: 0, max: 100 }))
                .rejects
                .toThrow('Failed to set secondary axis range: API Error');
        });

        it('图表实例未返回坐标轴时应该抛错', () => {
            (chart.priceScale as jest.Mock).mockReturnValue(null);

            expect(() => controller.getPrimaryRange()).toThrow('Primary price scale (right) not found');
            expect(() => controller.getSecondaryRange()).toThrow('Secondary price scale (left) not found');
            expect(() => controller.resetPrimaryRange()).toThrow('Primary price scale (right) not found');
            expect(() => controller.resetSecondaryRange()).toThrow('Secondary price scale (left) not found');
            expect(controller.setSecondaryRange({ min: 0, max: 1 })).rejects.toThrow('Secondary price scale (left) not found');
        });
    });

    describe('Properties', () => {
        // Feature: forecast-y-axis-ux, Property 2: 有效输入调用副轴API
        it('属性2: 对于任何有效范围，应该调用 setVisibleRange API', () => {
            fc.assert(
                fc.asyncProperty(
                    fc.record({
                        min: fc.double({ min: -1000, max: 1000 }),
                        max: fc.double({ min: -1000, max: 1000 })
                    }).filter(r => r.min < r.max),
                    async (range) => {
                        const chart = createMockChart();
                        const controller = new YAxisController(chart);
                        const secondaryScale = chart.priceScale('left');
                        const mockSetVisibleRange = secondaryScale.setVisibleRange as jest.Mock;

                        await controller.setSecondaryRange(range);

                        expect(mockSetVisibleRange).toHaveBeenCalledWith({
                            from: range.min,
                            to: range.max
                        });
                        // Also checking internal config update
                        expect(controller.getSecondaryRange()).toEqual(range);
                    }
                ),
                { numRuns: 100 }
            );
        });

        // Feature: forecast-y-axis-ux, Property 7: 失败更新保持旧值 (Controller level internal check)
        it('属性7: 失败更新保持旧值 (Controller internal state)', () => {
            fc.assert(
                fc.asyncProperty(
                    fc.record({
                        min: fc.double({ min: -100, max: 100 }),
                        max: fc.double({ min: 101, max: 200 })
                    }),
                    fc.record({
                        min: fc.double({ min: -100, max: 100 }),
                        max: fc.double({ min: 101, max: 200 })
                    }),
                    async (validRange, errorRange) => {
                        const chart = createMockChart();
                        const controller = new YAxisController(chart);

                        // First setting a valid range
                        await controller.setSecondaryRange(validRange);
                        expect(controller.getSecondaryRange()).toEqual(validRange);

                        // Now simulating an API failure
                        const secondaryScale = chart.priceScale('left');
                        (secondaryScale.setVisibleRange as jest.Mock).mockImplementationOnce(() => {
                            throw new Error('Simulated Fail');
                        });

                        try {
                            await controller.setSecondaryRange(errorRange);
                        } catch (e) {
                            // Internal config secondary range shouldn't have been successfully updated 
                            // at the exception point.
                        }
                        // Controller config shouldn't contain the aborted operation
                        expect(controller.getSecondaryRange()).toEqual(validRange);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
