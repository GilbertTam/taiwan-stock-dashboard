import { IChartApi, ISeriesApi, Time, LogicalRange } from 'lightweight-charts';

/**
 * Creates and configures the canvas overlay element
 */
export const setupCanvasOverlay = (
    container: HTMLDivElement,
    width: number,
    height: number
): HTMLCanvasElement => {
    // Check if canvas already exists
    let canvas = container.querySelector('canvas.chart-overlay') as HTMLCanvasElement;

    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.className = 'chart-overlay';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.zIndex = '2'; // Above chart grid/lines but below tooltips if possible, or adjust pointer-events
        canvas.style.pointerEvents = 'none'; // Allow interactions to pass through to the chart
        container.appendChild(canvas);
    }

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.scale(dpr, dpr);
    }

    return canvas;
};

/**
 * Interface for prediction band data
 */
export interface PredictionBandDataPoint {
    time: number; // Unix timestamp in seconds or milliseconds depending on chart config
    top: number;
    bottom: number;
}

/**
 * Draws a filled prediction band area on the canvas
 */
export const drawPredictionBand = (
    chart: IChartApi,
    canvas: HTMLCanvasElement,
    series: ISeriesApi<'Line'>, // We need a series to map price to coordinate
    data: PredictionBandDataPoint[],
    color: string
) => {
    const ctx = canvas.getContext('2d');
    if (!ctx || !chart || !series || data.length === 0) return;

    const timeScale = chart.timeScale();

    // We can't easily map price without a series. 
    // Usually we attaching the logic to a series or using chart.priceScale() if we know the ID.
    // However, series.priceToCoordinate is the most reliable way if the data belongs to that series' scale.

    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();

    // Move to first point top
    let started = false;

    // Draw top line forward
    for (const point of data) {
        // timeToCoordinate might return null if out of range, but we should handle it
        // Note: lightweight-charts 5.x TimeScale.timeToCoordinate accepts time directly
        const x = timeScale.timeToCoordinate(point.time as Time);
        const yTop = series.priceToCoordinate(point.top);

        if (x !== null && yTop !== null) {
            if (!started) {
                ctx.moveTo(x, yTop);
                started = true;
            } else {
                ctx.lineTo(x, yTop);
            }
        }
    }

    // Draw bottom line backward
    for (let i = data.length - 1; i >= 0; i--) {
        const point = data[i];
        const x = timeScale.timeToCoordinate(point.time as Time);
        const yBottom = series.priceToCoordinate(point.bottom);

        if (x !== null && yBottom !== null) {
            ctx.lineTo(x, yBottom);
        }
    }

    ctx.closePath();
    ctx.fill();
    ctx.restore();
};

/**
 * Interface for mark area range
 */
export interface MarkAreaRange {
    from: number;
    to: number;
    color?: string;
}

/**
 * Draws background highlights (mark areas)
 */
export const drawMarkArea = (
    chart: IChartApi,
    canvas: HTMLCanvasElement,
    ranges: MarkAreaRange[],
    defaultColor: string
) => {
    const ctx = canvas.getContext('2d');
    if (!ctx || !chart || ranges.length === 0) return;

    const timeScale = chart.timeScale();
    const height = canvas.clientHeight; // Logic height (styles)

    ctx.save();
    ctx.fillStyle = defaultColor;

    for (const range of ranges) {
        const x1 = timeScale.timeToCoordinate(range.from as Time);
        const x2 = timeScale.timeToCoordinate(range.to as Time);

        if (x1 !== null && x2 !== null) {
            // Draw full height rectangle
            const width = x2 - x1;
            // Ensure positive width
            if (width !== 0) {
                ctx.fillStyle = range.color || defaultColor;
                ctx.fillRect(x1, 0, width, height);
            }
        }
    }

    ctx.restore();
};
