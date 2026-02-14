/**
 * @fileoverview Chart Export Utilities
 *
 * Helper functions for exporting chart data and screenshots.
 */

import { format as formatDate } from 'date-fns';
import { ProcessedDataPoint } from '@/utils/lightweightChartsHelpers';

/**
 * Convert hex color to rgba string.
 */
export const hexToRgba = (hex: string, alpha: number): string => {
    const h = hex.replace(/^#/, '');
    if (h.length !== 6) return hex;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
};

/**
 * Legend item render operation for chart export.
 */
export interface LegendRenderOp {
    type: 'item' | 'separator';
    label: string;
    color?: string;
    symbolType?: 'line' | 'dashed' | 'box' | 'circle' | 'candlestick' | 'split-line';
    opacity?: number;
    width?: number;
}

/**
 * Draw a legend symbol on canvas.
 */
export const drawLegendSymbol = (
    ctx: CanvasRenderingContext2D,
    type: LegendRenderOp['symbolType'],
    color: string,
    x: number,
    y: number,
    symbolSize: number = 12
): void => {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    switch (type) {
        case 'line':
            ctx.fillRect(x, y - 1, symbolSize, 2);
            break;
        case 'dashed':
            ctx.setLineDash([4, 2]);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + symbolSize, y);
            ctx.stroke();
            ctx.setLineDash([]);
            break;
        case 'split-line':
            ctx.fillRect(x, y - 1, symbolSize / 2, 2);
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(x + symbolSize / 2, y);
            ctx.lineTo(x + symbolSize, y);
            ctx.stroke();
            ctx.setLineDash([]);
            break;
        case 'box':
            ctx.fillRect(x, y - 5, 10, 10);
            break;
        case 'circle':
            ctx.beginPath();
            ctx.arc(x + 4, y, 4, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'candlestick':
            ctx.beginPath();
            ctx.moveTo(x + 6, y - 6);
            ctx.lineTo(x + 6, y + 6);
            ctx.stroke();
            ctx.fillRect(x + 3, y - 4, 6, 8);
            break;
    }
};

/**
 * Export chart data as CSV file.
 */
export const exportChartDataToCsv = (
    processedChartData: ProcessedDataPoint[],
    filename?: string
): void => {
    if (!processedChartData?.length) return;

    const headers = ['timestamp', 'actualPrice', 'intraday_average', 'imbalance'];
    const rows = processedChartData.map(d => [
        formatDate(new Date(d.timestamp), 'yyyy-MM-dd HH:mm:ss'),
        d.actualPrice ?? '',
        d.intraday_average ?? '',
        d.imbalance ?? ''
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.download = filename || `chart-data-${formatDate(new Date(), 'yyyyMMdd-HHmmss')}.csv`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
};

/**
 * Layout legend items with word-wrapping.
 *
 * @returns Array of legend ops with calculated width
 */
export const layoutLegendItems = (
    ops: LegendRenderOp[],
    font: string,
    maxWidth: number,
    symbolSize: number = 12
): { ops: LegendRenderOp[]; lines: number } => {
    const tempCtx = document.createElement('canvas').getContext('2d');
    if (!tempCtx) return { ops: [], lines: 0 };

    tempCtx.font = font;
    let currentLineW = 0;
    let lines = 1;

    const layoutOps = ops.map(op => {
        let w = 0;
        if (op.type === 'separator') {
            w = 1 + 8 + tempCtx.measureText(op.label).width + 8;
        } else {
            w = symbolSize + 5 + tempCtx.measureText(op.label).width;
        }

        if (currentLineW + w > maxWidth && currentLineW > 0) {
            lines++;
            currentLineW = 0;
        }
        currentLineW += w + 16; // itemGap

        return { ...op, width: w };
    });

    return { ops: layoutOps, lines };
};

/**
 * Generate chart download filename.
 */
export const generateChartFilename = (format: 'csv' | 'jpg' | 'png'): string => {
    const timestamp = formatDate(new Date(), 'yyyyMMdd-HHmmss');
    return format === 'csv'
        ? `chart-data-${timestamp}.csv`
        : `chart-${timestamp}.${format}`;
};
