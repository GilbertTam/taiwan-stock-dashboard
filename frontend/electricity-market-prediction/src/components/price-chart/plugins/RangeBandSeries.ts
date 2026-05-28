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

export interface RangeBandData extends CustomData {
    /** Lower bound of the band at this timestamp (e.g. min price). */
    min: number;
    /** Upper bound of the band at this timestamp (e.g. max price). */
    max: number;
    /** Stroke color for top/bottom edges (defaults to category color). */
    lineColor: string;
    /** Fill color for the band polygon (typically lineColor with low alpha). */
    areaColor: string;
}

export interface RangeBandSeriesOptions extends CustomSeriesOptions {
    /** Width of the optional edge strokes (0 disables stroke). */
    lineWidth?: number;
}

class RangeBandSeriesRenderer implements ICustomSeriesPaneRenderer {
    private _data: PaneRendererCustomData<Time, RangeBandData> | null = null;
    private _lineWidth = 1;

    update(data: PaneRendererCustomData<Time, RangeBandData>, options: RangeBandSeriesOptions): void {
        this._data = data;
        this._lineWidth = options.lineWidth ?? 1;
    }

    draw(target: CanvasRenderingTarget2D, priceToCoordinate: (price: number) => number | null): void {
        target.useBitmapCoordinateSpace((scope: any) => {
            const ctx = scope.context as CanvasRenderingContext2D;
            const horizontalPixelRatio = scope.horizontalPixelRatio || 1;
            const verticalPixelRatio = scope.verticalPixelRatio || 1;

            if (!this._data || this._data.bars.length === 0) return;
            const bars = this._data.bars;
            const visibleRange = (this._data as any).visibleRange;
            if (!visibleRange) return;

            const bitmapHeightPx = scope.bitmapSize?.height ?? 0;
            const clampPixY = (pix: number) =>
                (bitmapHeightPx <= 0 ? pix : Math.max(0, Math.min(bitmapHeightPx, pix)));

            interface BandPoint { x: number; yTop: number; yBottom: number; }

            // Group contiguous valid points into segments separated by gaps (when data is missing).
            const segments: { points: BandPoint[]; lineColor: string; areaColor: string }[] = [];
            let current: { points: BandPoint[]; lineColor: string; areaColor: string } | null = null;

            for (let i = visibleRange.from; i < visibleRange.to; i++) {
                const bar = bars[i];
                if (!bar) { current = null; continue; }
                const data = bar.originalData as RangeBandData | undefined;
                if (!data || !Number.isFinite(data.min) || !Number.isFinite(data.max)) {
                    current = null;
                    continue;
                }

                const yMaxRaw = priceToCoordinate(data.max);
                const yMinRaw = priceToCoordinate(data.min);
                if (yMaxRaw == null || yMinRaw == null) { current = null; continue; }

                const x = bar.x * horizontalPixelRatio;
                const yTop = clampPixY(yMaxRaw * verticalPixelRatio);
                const yBottom = clampPixY(yMinRaw * verticalPixelRatio);

                if (!current) {
                    current = { points: [], lineColor: data.lineColor, areaColor: data.areaColor };
                    segments.push(current);
                }
                current.points.push({ x, yTop, yBottom });
            }

            const fillFallback = 'rgba(128,128,128,0.18)';
            const strokeFallback = 'rgba(128,128,128,0.4)';

            for (const seg of segments) {
                const pts = seg.points;
                if (pts.length === 0) continue;

                ctx.beginPath();
                ctx.moveTo(pts[0].x, pts[0].yTop);
                for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].yTop);
                for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].yBottom);
                ctx.closePath();
                ctx.fillStyle = seg.areaColor && seg.areaColor.trim() ? seg.areaColor : fillFallback;
                ctx.fill();

                if (this._lineWidth > 0) {
                    ctx.lineWidth = this._lineWidth * verticalPixelRatio;
                    ctx.strokeStyle = seg.lineColor && seg.lineColor.trim() ? seg.lineColor : strokeFallback;
                    ctx.lineJoin = 'round';

                    ctx.beginPath();
                    ctx.moveTo(pts[0].x, pts[0].yTop);
                    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].yTop);
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.moveTo(pts[0].x, pts[0].yBottom);
                    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].yBottom);
                    ctx.stroke();
                }
            }
        });
    }
}

/**
 * Custom Lightweight Charts series that renders a transparent band between min and max
 * at each timestamp. Used by TDGC price min/max range visualization; the average line
 * is rendered separately as a regular LineSeries layered on top.
 */
export class RangeBandSeries implements ICustomSeriesPaneView<Time, RangeBandData, RangeBandSeriesOptions> {
    _renderer: RangeBandSeriesRenderer;

    constructor() {
        this._renderer = new RangeBandSeriesRenderer();
    }

    priceValueBuilder(plotRow: RangeBandData): number[] {
        return [plotRow.min, plotRow.max];
    }

    isWhitespace(data: RangeBandData | CustomSeriesWhitespaceData<Time>): data is CustomSeriesWhitespaceData<Time> {
        const d = data as Partial<RangeBandData>;
        return d.min === undefined || d.max === undefined;
    }

    renderer(): ICustomSeriesPaneRenderer {
        return this._renderer;
    }

    update(data: PaneRendererCustomData<Time, RangeBandData>, options: RangeBandSeriesOptions): void {
        this._renderer.update(data, options);
    }

    defaultOptions(): RangeBandSeriesOptions {
        return {
            lineWidth: 1,
            color: 'transparent',
        } as RangeBandSeriesOptions;
    }
}
