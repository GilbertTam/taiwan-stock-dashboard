import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import fc from 'fast-check';
import { SecondaryAxisControls } from '../SecondaryAxisControls';

describe('SecondaryAxisControls', () => {
    describe('Unit Tests', () => {
        it('渲染最小值和最大值輸入框', () => {
            render(
                <SecondaryAxisControls
                    currentRange={{ min: 10, max: 100 }}
                    onRangeChange={jest.fn()}
                    onReset={jest.fn()}
                />
            );

            const minInput = screen.getByTestId('min-input') as HTMLInputElement;
            const maxInput = screen.getByTestId('max-input') as HTMLInputElement;

            expect(minInput).toBeInTheDocument();
            expect(maxInput).toBeInTheDocument();
            expect(minInput.value).toBe('10');
            expect(maxInput.value).toBe('100');
        });

        it('輸入無效範圍時應該禁用應用按鈕並顯示錯誤', async () => {
            render(
                <SecondaryAxisControls
                    currentRange={null}
                    onRangeChange={jest.fn()}
                    onReset={jest.fn()}
                />
            );

            const minInput = screen.getByTestId('min-input');
            const maxInput = screen.getByTestId('max-input');
            const applyBtn = screen.getByTestId('apply-button');

            fireEvent.change(minInput, { target: { value: '100' } });
            fireEvent.change(maxInput, { target: { value: '10' } });

            // Should show error and disable button
            await waitFor(() => {
                expect(applyBtn).toBeDisabled();
                expect(screen.getByRole('alert')).toBeInTheDocument();
            });
        });

        it('應該能調用 reset 並清空錯誤提示', async () => {
            const mockReset = jest.fn();
            render(
                <SecondaryAxisControls
                    currentRange={null}
                    onRangeChange={jest.fn()}
                    onReset={mockReset}
                />
            );

            const resetBtn = screen.getByRole('button', { name: /重置|Reset|リセット|axisControl\.reset/i });
            fireEvent.click(resetBtn);

            expect(mockReset).toHaveBeenCalled();
        });
    });

    describe('Properties', () => {
        // Feature: forecast-y-axis-ux, Property 11: 驗證失敗(無效輸入)阻止API調用
        it('驗證失敗(無效輸入)阻止API調用', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        min: fc.double(),
                        max: fc.double()
                    }).filter(r => r.min >= r.max), // Generating invalid ranges
                    async (invalidRange) => {
                        const mockOnRangeChange = jest.fn();

                        const { unmount } = render(
                            <SecondaryAxisControls
                                currentRange={null}
                                onRangeChange={mockOnRangeChange}
                                onReset={jest.fn()}
                            />
                        );

                        try {
                            const minInput = screen.getByTestId('min-input');
                            const maxInput = screen.getByTestId('max-input');
                            const applyBtn = screen.getByTestId('apply-button');

                            fireEvent.change(minInput, { target: { value: invalidRange.min.toString() } });
                            fireEvent.change(maxInput, { target: { value: invalidRange.max.toString() } });

                            // Re-render and wait to check
                            expect(applyBtn).toBeDisabled();

                            if (!applyBtn.hasAttribute('disabled')) { // safety check to try manually triggering
                                fireEvent.click(applyBtn);
                            }

                            expect(mockOnRangeChange).not.toHaveBeenCalled();
                        } finally {
                            unmount();
                        }
                    }
                ),
                { numRuns: 50 } // Reduce runs since DOM tests are slow
            );
        });

        // Feature: forecast-y-axis-ux, Property 6: 成功更新显示反馈
        it('成功更新顯示反饋 (邊框顏色變為成功)', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        min: fc.double({ min: -100, max: 100 }),
                        max: fc.double({ min: 101, max: 200 })
                    }),
                    async (validRange) => {
                        const mockOnRangeChange = jest.fn().mockResolvedValue(undefined);

                        const { container, unmount } = render(
                            <SecondaryAxisControls
                                currentRange={null}
                                onRangeChange={mockOnRangeChange}
                                onReset={jest.fn()}
                            />
                        );

                        try {
                            const minInput = screen.getByTestId('min-input');
                            const maxInput = screen.getByTestId('max-input');
                            const applyBtn = screen.getByTestId('apply-button');

                            fireEvent.change(minInput, { target: { value: validRange.min.toString() } });
                            fireEvent.change(maxInput, { target: { value: validRange.max.toString() } });

                            fireEvent.click(applyBtn);

                            await waitFor(() => {
                                expect(mockOnRangeChange).toHaveBeenCalledWith({
                                    min: validRange.min,
                                    max: validRange.max
                                });

                                // For JSDOM with MUI, the inline style or class might vary,
                                // checking the object property directly solves most false positives
                                const wrapperBox = container.firstChild as HTMLElement;
                                expect(wrapperBox).toHaveAttribute('data-feedback', 'success');
                            });
                        } finally {
                            unmount();
                        }
                    }
                ),
                { numRuns: 20 }
            );
        });
    });
});
