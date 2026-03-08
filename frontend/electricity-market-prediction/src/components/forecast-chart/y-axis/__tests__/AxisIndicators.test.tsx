import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PrimaryAxisIndicator, SecondaryAxisIndicator, AxisControlIntroTooltip } from '../AxisIndicators';

describe('AxisIndicators', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    describe('PrimaryAxisIndicator', () => {
        it('应该渲染主轴拖拽指示器', () => {
            render(<PrimaryAxisIndicator />);
            expect(screen.getByTestId('primary-indicator')).toBeInTheDocument();
            expect(screen.getByText(/Y1: 可拖拽/i)).toBeInTheDocument();
        });
    });

    describe('SecondaryAxisIndicator', () => {
        it('应该渲染副轴UI控制指示器', () => {
            render(<SecondaryAxisIndicator />);
            expect(screen.getByTestId('secondary-indicator')).toBeInTheDocument();
            expect(screen.getByText(/副轴通过输入框精确控制/i)).toBeInTheDocument();
        });
    });

    describe('AxisControlIntroTooltip', () => {
        it('应该在首次使用时显示工具提示', () => {
            const anchorNode = document.createElement('div');
            document.body.appendChild(anchorNode);

            render(<AxisControlIntroTooltip anchorEl={anchorNode} />);

            // Material-UI Popovers are rendered inside a portal, so they appear in document.body
            expect(screen.getByTestId('intro-tooltip')).toBeInTheDocument();
            expect(screen.getByText(/双Y轴控制说明/i)).toBeInTheDocument();
        });

        it('点击"不再显示"后将不再显示工具提示', async () => {
            const anchorNode = document.createElement('div');
            document.body.appendChild(anchorNode);

            const { rerender } = render(<AxisControlIntroTooltip anchorEl={anchorNode} />);

            const dismissBtn = screen.getByTestId('dismiss-tooltip');
            fireEvent.click(dismissBtn);

            await waitFor(() => {
                expect(screen.queryByTestId('intro-tooltip')).not.toBeInTheDocument();
            });

            // Rerender to simulate a fresh load (but localStorage is already set)
            rerender(<AxisControlIntroTooltip anchorEl={anchorNode} />);
            expect(screen.queryByTestId('intro-tooltip')).not.toBeInTheDocument();
        });

        it('如果已经有配置就不显示', () => {
            localStorage.setItem('forecast-y-axis-tooltip-dismissed', 'true');
            const anchorNode = document.createElement('div');
            document.body.appendChild(anchorNode);

            render(<AxisControlIntroTooltip anchorEl={anchorNode} />);

            expect(screen.queryByTestId('intro-tooltip')).not.toBeInTheDocument();
        });
    });
});
