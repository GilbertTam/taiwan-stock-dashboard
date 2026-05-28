import {
    ICustomSeriesPaneView,
    ICustomSeriesPaneRenderer,
    PaneRendererCustomData,
    Time,
    CustomData,
    CustomSeriesWhitespaceData,
    CustomSeriesOptions,
} from 'lightweight-charts';
import { CanvasRenderingTarget2D } from '@/components/charts/lightweight-charts-extended';

export interface BatteryFlowItem {
    /** kWh; negative = charge, positive = discharge. */
    value: number;
    color: string;
    /** 'spot' | 'intraday' | 'primary' — reserved for future hit-test. */
    marketKey?: string;
}

export interface BatteryFlowData extends CustomData {
    items: BatteryFlowItem[];
}

export interface BatteryStackedFlowSeriesOptions extends CustomSeriesOptions {
    barWidth?: number;
    cornerRadius?: number;
    segmentGap?: number;
    baselineColor?: string;
    baselineWidth?: number;
}

class BatteryStackedFlowRenderer implements ICustomSeriesPaneRenderer {
    private _data: PaneRendererCustomData<Time, BatteryFlowData> | null = null;
    private _opts: Required<Omit<BatteryStackedFlowSeriesOptions, keyof CustomSeriesOptions>> = {
        barWidth: 0.8,
        cornerRadius: 2,
        segmentGap: 0.5,
        baselineColor: 'rgba(255,255,255,0.4)',
        baselineWidth: 1,
    };

    update(data: PaneRendererCustomData<Time, BatteryFlowData>, options: BatteryStackedFlowSeriesOptions): void {
        this._data = data;
        if (options.barWidth != null) this._opts.barWidth = options.barWidth;
        if (options.cornerRadius != null) this._opts.cornerRadius = options.cornerRadius;
        if (options.segmentGap != null) this._opts.segmentGap = options.segmentGap;
        if (options.baselineColor != null) this._opts.baselineColor = options.baselineColor;
        if (options.baselineWidth != null) this._opts.baselineWidth = options.baselineWidth;
    }

    draw(target: CanvasRenderingTarget2D, priceToCoordinate: (price: number) => number | null): void {
        target.useBitmapCoordinateSpace((scope: any) => {
            const ctx = scope.context as CanvasRenderingContext2D;
            const hRatio = scope.horizontalPixelRatio || 1;
            const vRatio = scope.verticalPixelRatio || 1;

            if (!this._data || this._data.bars.length === 0) return;

            const bars = this._data.bars;
            const barSpacing = (this._data as any).barSpacing ?? 6;
            const maxBarWidthPx = Math.max(1, Math.floor((barSpacing - 0.5) * hRatio));
            const barWidth = Math.min(
                Math.max(1, Math.floor(barSpacing * this._opts.barWidth * hRatio)),
                maxBarWidthPx,
            );
            const halfWidth = barWidth / 2;
            const segGap = Math.max(0, this._opts.segmentGap * vRatio);
            const cornerR = Math.min(this._opts.cornerRadius * vRatio, halfWidth - 1);

            // 1. Zero baseline (drawn under bars so bars sit on it).
            const yZeroMedia = priceToCoordinate(0);
            if (yZeroMedia !== null) {
                const yZero = Math.round(yZeroMedia * vRatio);
                ctx.fillStyle = this._opts.baselineColor;
                ctx.fillRect(0, yZero, scope.bitmapSize.width, Math.max(1, this._opts.baselineWidth * vRatio));
            }

            // 2. Stacked bars (positive items stack up, negative items stack down from 0).
            bars.forEach((bar: any) => {
                const x = Math.round(bar.x * hRatio);
                const originalData = bar.originalData as BatteryFlowData | undefined;
                if (!originalData?.items?.length) return;

                const positives = originalData.items.filter(i => i.value > 0);
                const negatives = originalData.items.filter(i => i.value < 0);

                let posBase = 0;
                positives.forEach((item, idx) => {
                    const isOutermost = idx === positives.length - 1;
                    drawSegment(ctx, priceToCoordinate, item, posBase, posBase + item.value, x - halfWidth, barWidth, vRatio, segGap, cornerR, isOutermost, 'up');
                    posBase += item.value;
                });

                let negBase = 0;
                negatives.forEach((item, idx) => {
                    const isOutermost = idx === negatives.length - 1;
                    drawSegment(ctx, priceToCoordinate, item, negBase, negBase + item.value, x - halfWidth, barWidth, vRatio, segGap, cornerR, isOutermost, 'down');
                    negBase += item.value;
                });
            });
        });
    }
}

function drawSegment(
    ctx: CanvasRenderingContext2D,
    priceToCoordinate: (price: number) => number | null,
    item: BatteryFlowItem,
    fromVal: number,
    toVal: number,
    xLeft: number,
    width: number,
    vRatio: number,
    segGap: number,
    cornerR: number,
    isOutermost: boolean,
    direction: 'up' | 'down',
): void {
    const y1Media = priceToCoordinate(fromVal);
    const y2Media = priceToCoordinate(toVal);
    if (y1Media === null || y2Media === null) return;

    const y1 = Math.round(y1Media * vRatio);
    const y2 = Math.round(y2Media * vRatio);

    // For an upward stack: fromVal (closer to 0) is below toVal (farther from 0).
    // For a downward stack: fromVal is above toVal in pixel space.
    const top = Math.min(y1, y2);
    const bottom = Math.max(y1, y2);
    const innerTop = direction === 'up' ? top : top + segGap;
    const innerBottom = direction === 'up' ? bottom - segGap : bottom;
    const height = Math.max(1, innerBottom - innerTop);

    ctx.fillStyle = item.color;

    if (isOutermost && cornerR > 0 && height > cornerR * 2) {
        // Outermost segment: round the corners on the side AWAY from zero.
        const roundTopLeft = direction === 'up' ? cornerR : 0;
        const roundTopRight = direction === 'up' ? cornerR : 0;
        const roundBottomLeft = direction === 'up' ? 0 : cornerR;
        const roundBottomRight = direction === 'up' ? 0 : cornerR;
        roundedRect(ctx, xLeft, innerTop, width, height, [roundTopLeft, roundTopRight, roundBottomRight, roundBottomLeft]);
        ctx.fill();
    } else {
        ctx.fillRect(xLeft, innerTop, width, height);
    }
}

function roundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    /** [topLeft, topRight, bottomRight, bottomLeft] */
    radii: [number, number, number, number],
): void {
    const [tl, tr, br, bl] = radii;
    ctx.beginPath();
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
    ctx.lineTo(x + w, y + h - br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    ctx.lineTo(x + bl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
    ctx.lineTo(x, y + tl);
    ctx.quadraticCurveTo(x, y, x + tl, y);
    ctx.closePath();
}

export class BatteryStackedFlowSeries implements ICustomSeriesPaneView<Time, BatteryFlowData, BatteryStackedFlowSeriesOptions> {
    _renderer: BatteryStackedFlowRenderer;

    constructor() {
        this._renderer = new BatteryStackedFlowRenderer();
    }

    priceValueBuilder(plotRow: BatteryFlowData): number[] {
        let posSum = 0;
        let negSum = 0;
        plotRow.items.forEach(item => {
            if (item.value > 0) posSum += item.value;
            else if (item.value < 0) negSum += item.value;
        });
        return [negSum, posSum];
    }

    isWhitespace(data: BatteryFlowData | CustomSeriesWhitespaceData<Time>): data is CustomSeriesWhitespaceData<Time> {
        const items = (data as Partial<BatteryFlowData>).items;
        return !items || items.length === 0 || items.every(i => i.value === 0);
    }

    renderer(): ICustomSeriesPaneRenderer {
        return this._renderer;
    }

    update(data: PaneRendererCustomData<Time, BatteryFlowData>, options: BatteryStackedFlowSeriesOptions): void {
        this._renderer.update(data, options);
    }

    defaultOptions(): BatteryStackedFlowSeriesOptions {
        return {
            barWidth: 0.8,
            cornerRadius: 2,
            segmentGap: 0.5,
            baselineColor: 'rgba(255,255,255,0.4)',
            baselineWidth: 1,
            color: 'transparent',
        } as BatteryStackedFlowSeriesOptions;
    }
}
