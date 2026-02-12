import { IChartApi } from 'lightweight-charts';
import { format as formatDate } from 'date-fns';
import { ProcessedDataPoint } from '@/utils/lightweightChartsHelpers';
import { occtoStackedFields, weatherFields, INTERCONNECTION_FIELDS, BATTERY_FIELDS } from '../constants';
import { hexToRgba } from '../utils';

export const handleDownloadCsv = (processedChartData: ProcessedDataPoint[] | null) => {
    if (!processedChartData?.length) return;
    const headers = ['timestamp', 'actualPrice', 'intraday_average', 'imbalance'];
    const rows = processedChartData.map(dataPoint => [
        formatDate(new Date(dataPoint.timestamp), 'yyyy-MM-dd HH:mm:ss'),
        dataPoint.actualPrice ?? '', dataPoint.intraday_average ?? '', dataPoint.imbalance ?? ''
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.download = `chart-data-${formatDate(new Date(), 'yyyyMMdd-HHmmss')}.csv`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
};

interface GenerateChartImageParams {
    chart: IChartApi;
    processedChartData: ProcessedDataPoint[];
    colors: any;
    darkMode: boolean;
    selectedModels: any[];
    modelColorMap: Record<string, string>;
    showActualPrice: boolean;
    showIntraday: boolean;
    showIntradayAverage: boolean;
    showImbalance: boolean;
    selectedInterconnectionFields: Set<string>;
    selectedBatteryFields: Set<string>;
    selectedBidPlanFields: Set<string>;
    showOcctoArea: boolean;
    selectedOcctoFields: Set<string>;
    showWeather: boolean;
    showWeatherActual: boolean;
    showWeatherForecast: boolean;
    selectedWeatherFieldsActual: Set<string>;
    selectedWeatherFieldsForecast: Set<string>;
    actualData: any[];
}

export const generateChartImage = ({
    chart,
    colors,
    darkMode,
    selectedModels,
    modelColorMap,
    showActualPrice,
    showIntraday,
    showIntradayAverage,
    showImbalance,
    selectedInterconnectionFields,
    selectedBatteryFields,
    showOcctoArea,
    selectedOcctoFields,
    showWeather,
    showWeatherActual,
    showWeatherForecast,
    selectedWeatherFieldsActual,
    selectedWeatherFieldsForecast,
    actualData,
}: GenerateChartImageParams) => {
    const chartCanvas = chart.takeScreenshot();
    const fontSize = 11;
    const font = `${fontSize}px sans-serif`;
    const padding = 20;
    const itemGap = 16;
    const rowGap = 8;
    const symbolSize = 12;

    // 1. Prepare Render Ops (Flatten the structure)
    type RenderOp = {
        type: 'item' | 'separator';
        label: string;
        color?: string;
        symbolType?: 'line' | 'dashed' | 'box' | 'circle' | 'candlestick';
        opacity?: number;
    };
    const ops: RenderOp[] = [];

    // Price Section
    if (showActualPrice && actualData.length > 0) {
        ops.push({ type: 'item', label: '現貨實際價格', color: colors.actual, symbolType: 'line' });
    }
    selectedModels.forEach(model => {
        const modelKey = `${model.id}|${model.name}`;
        ops.push({ type: 'item', label: model.name, color: modelColorMap[modelKey] || model.color, symbolType: 'line' });
    });

    // Market Section
    if (showIntraday || showIntradayAverage || showImbalance || selectedInterconnectionFields.size > 0 || selectedBatteryFields.size > 0) {
        if (ops.length > 0) ops.push({ type: 'separator', label: '市場' });
        if (showIntraday) ops.push({ type: 'item', label: '即時', color: colors.intraday, symbolType: 'candlestick' });
        if (showIntradayAverage) ops.push({ type: 'item', label: '即時(平均)', color: '#ffa726', symbolType: 'dashed' });
        if (showImbalance) ops.push({ type: 'item', label: '不平衡值', color: colors.imbalance, symbolType: 'line' });
        INTERCONNECTION_FIELDS.filter(f => selectedInterconnectionFields.has(f.key)).forEach(f => {
            ops.push({ type: 'item', label: f.label, color: f.color, symbolType: 'line' });
        });
        BATTERY_FIELDS.filter(f => selectedBatteryFields.has(f.key)).forEach(f => {
            ops.push({ type: 'item', label: f.label, color: f.color, symbolType: 'line' });
        });
    }

    // OCCTO Section
    if (showOcctoArea && selectedOcctoFields.size > 0) {
        ops.push({ type: 'separator', label: 'OCCTO' });
        occtoStackedFields.filter(f => selectedOcctoFields.has(f.key)).forEach(f => {
            ops.push({ type: 'item', label: f.label, color: f.color, symbolType: 'box' });
        });
    }

    // Weather Section
    if (showWeather || showWeatherActual || showWeatherForecast) {
        const weatherOps: RenderOp[] = [];
        weatherFields.forEach(f => {
            const hasActual = showWeatherActual && selectedWeatherFieldsActual.has(f.value);
            const hasForecast = showWeatherForecast && selectedWeatherFieldsForecast.has(f.value);
            if (hasActual) weatherOps.push({ type: 'item', label: f.label, color: f.color, symbolType: 'line' });
            if (hasForecast) weatherOps.push({ type: 'item', label: `${f.label} (預)`, color: f.color, symbolType: 'dashed', opacity: 0.7 });
        });

        if (weatherOps.length > 0) {
            ops.push({ type: 'separator', label: '天氣' });
            ops.push(...weatherOps);
        }
    }

    // 2. Measure & Layout
    const tempCtx = document.createElement('canvas').getContext('2d');
    if (!tempCtx) return;
    tempCtx.font = font;

    let currentLineW = 0;
    let lines = 1;
    const maxW = chartCanvas.width - (padding * 2);

    const layoutOps = ops.map(op => {
        let w = 0;
        if (op.type === 'separator') {
            // 1px line + 8px gap + text + 8px gap
            w = 1 + 8 + tempCtx.measureText(op.label).width + 8;
        } else {
            // symbol + 5px gap + text
            w = symbolSize + 5 + tempCtx.measureText(op.label).width;
        }

        // Wrap logic
        if (currentLineW + w > maxW && currentLineW > 0) {
            lines++;
            currentLineW = 0;
        }

        const posX = padding + currentLineW;
        currentLineW += w + itemGap;

        return { ...op, width: w, newLine: currentLineW === w + itemGap }; // newLine if it was reset
    });

    // 3. Draw
    const legendHeight = (lines * (fontSize + rowGap + 10)) + padding; // Extra vertical padding
    const combinedCanvas = document.createElement('canvas');
    combinedCanvas.width = chartCanvas.width;
    combinedCanvas.height = chartCanvas.height + legendHeight;
    const ctx = combinedCanvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = darkMode ? '#1e293b' : '#ffffff';
    ctx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);
    ctx.drawImage(chartCanvas, 0, 0);

    // Legend Draw Loop
    ctx.font = font;
    ctx.textBaseline = 'middle';

    let drawX = padding;
    let drawY = chartCanvas.height + padding + (fontSize / 2);

    const drawSymbol = (type: 'line' | 'dashed' | 'box' | 'circle' | 'candlestick' | 'split-line', color: string, x: number, y: number) => {
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        if (type === 'line') {
            ctx.fillRect(x, y - 1, symbolSize, 2);
        } else if (type === 'dashed') {
            ctx.setLineDash([4, 2]);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + symbolSize, y);
            ctx.stroke();
            ctx.setLineDash([]);
        } else if (type === 'split-line') {
            // Left half solid
            ctx.fillRect(x, y - 1, symbolSize / 2, 2);
            // Right half dashed
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(x + (symbolSize / 2), y);
            ctx.lineTo(x + symbolSize, y);
            ctx.stroke();
            ctx.setLineDash([]);
        } else if (type === 'box') {
            ctx.fillRect(x, y - 5, 10, 10);
        } else if (type === 'circle') {
            ctx.beginPath();
            ctx.arc(x + 4, y, 4, 0, Math.PI * 2);
            ctx.fill();
        } else if (type === 'candlestick') {
            // wick
            ctx.beginPath();
            ctx.moveTo(x + 6, y - 6);
            ctx.lineTo(x + 6, y + 6);
            ctx.stroke();
            // body
            ctx.fillRect(x + 3, y - 4, 6, 8);
        }
    };

    layoutOps.forEach((op, i) => {
        const isSeparator = op.type === 'separator';
        const w = op.width;

        if (drawX + w > maxW) {
            drawX = padding;
            drawY += (fontSize + rowGap + 10);
        }

        if (isSeparator) {
            ctx.fillStyle = darkMode ? '#334155' : '#e2e8f0';
            ctx.fillRect(drawX, drawY - 6, 1, 12); // Vertical divider

            ctx.fillStyle = darkMode ? '#94a3b8' : '#64748b';
            ctx.font = `10px sans-serif`; // Smaller font for separator
            ctx.fillText(op.label, drawX + 9, drawY); // 1 + 8 offset
            ctx.font = font; // Restore
        } else {
            const color = op.color || '#000';
            const opacity = op.opacity ?? 1;
            ctx.globalAlpha = opacity;

            // Draw Symbol
            const sx = drawX;
            const sy = drawY;

            drawSymbol(op.symbolType || 'line', color, sx, sy); // Default to 'line' if not specified

            ctx.globalAlpha = 1.0;
            ctx.fillStyle = darkMode ? '#e2e8f0' : '#0f172a';
            ctx.fillText(op.label, sx + symbolSize + 5, sy);
        }

        drawX += w + itemGap;
    });

    return combinedCanvas.toDataURL('image/png');
};
