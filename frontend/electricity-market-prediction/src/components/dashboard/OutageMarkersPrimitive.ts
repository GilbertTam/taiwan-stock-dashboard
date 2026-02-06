/**
 * OutageMarkersPrimitive - Draws vertical lines at outage start time
 * and small markers at each area curve's intersection with that line.
 */

import {
    ISeriesPrimitive,
    SeriesAttachedParameter,
    Time,
    PrimitiveHoveredItem,
} from 'lightweight-charts';
import type { HjksOutage } from '@/types';

interface IPrimitivePaneView {
    update(): void;
    renderer(): IPrimitivePaneRenderer | null;
    zOrder?(): 'bottom' | 'normal' | 'top';
}

interface IPrimitivePaneRenderer {
    draw(target: any): void;
}

/** One point per (area, time) - multiple outages at same area+time are merged */
export interface OutagePoint {
    time: number; // UTC seconds
    area: string;
    outages: HjksOutage[];
    prices: Record<string, number>;
}

const VERTICAL_LINE_COLOR = '#dc2626';
const VERTICAL_LINE_WIDTH = 2;
const PIN_TOP_OFFSET = 10;
const PIN_SIZE = 10; // half-width of the triangle
const PIN_FILL = '#dc2626';
const PIN_STROKE = '#ffffff';
const PIN_STROKE_WIDTH = 1.5;

class OutageMarkersPaneView implements IPrimitivePaneView {
    private _source: OutageMarkersPrimitive;
    private _points: OutagePoint[] = [];

    constructor(source: OutageMarkersPrimitive) {
        this._source = source;
    }

    update(): void {
        this._points = this._source.points();
    }

    renderer(): IPrimitivePaneRenderer | null {
        return new OutageMarkersRenderer(this._points, this._source);
    }

    zOrder(): 'bottom' | 'normal' | 'top' {
        return 'top';
    }
}

class OutageMarkersRenderer implements IPrimitivePaneRenderer {
    private _points: OutagePoint[];
    private _source: OutageMarkersPrimitive;

    constructor(points: OutagePoint[], source: OutageMarkersPrimitive) {
        this._points = points;
        this._source = source;
    }

    draw(target: any): void {
        const timeScale = this._source.chart?.timeScale();
        if (!timeScale) return;

        const highlightedArea = this._source.highlightedArea();
        const highlightedAreaNameCh = this._source.highlightedAreaNameCh();

        target.useBitmapCoordinateSpace((scope: any) => {
            const ctx = scope.context;
            const horzRatio = scope.horizontalPixelRatio ?? 1;
            const height = scope.bitmapSize.height;

            const isOutageRelated = (areaValue: string): boolean => {
                if (highlightedArea == null) return true;
                return areaValue === highlightedArea || areaValue === highlightedAreaNameCh;
            };

            this._points.forEach((point) => {
                const related = isOutageRelated(point.area);
                const isDimmed = highlightedArea != null && !related;

                ctx.save();
                if (isDimmed) ctx.globalAlpha = this._source.dimOpacity();

                const x = timeScale.timeToCoordinate(point.time as Time);
                if (x === null) {
                    ctx.restore();
                    return;
                }

                const bitmapX = Math.round(x * horzRatio);
                const lineW = VERTICAL_LINE_WIDTH * horzRatio;
                const pinSize = PIN_SIZE * horzRatio;
                const topY = PIN_TOP_OFFSET * (scope.verticalPixelRatio ?? 1);

                // Vertical line (full height)
                ctx.strokeStyle = VERTICAL_LINE_COLOR;
                ctx.lineWidth = lineW;
                ctx.setLineDash([6 * horzRatio, 4 * horzRatio]);
                ctx.beginPath();
                ctx.moveTo(bitmapX, topY + pinSize * 2);
                ctx.lineTo(bitmapX, height);
                ctx.stroke();
                ctx.setLineDash([]);

                // Single pin marker at top: downward triangle (▼) = "停機 at this time"
                ctx.fillStyle = PIN_FILL;
                ctx.strokeStyle = PIN_STROKE;
                ctx.lineWidth = PIN_STROKE_WIDTH * horzRatio;
                ctx.beginPath();
                ctx.moveTo(bitmapX, topY);
                ctx.lineTo(bitmapX - pinSize, topY + pinSize * 2);
                ctx.lineTo(bitmapX + pinSize, topY + pinSize * 2);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.restore();
            });
        });
    }
}

export class OutageMarkersPrimitive implements ISeriesPrimitive<Time> {
    private _paneViews: OutageMarkersPaneView[];
    private _points: OutagePoint[] = [];
    private _areaOrder: string[] = [];
    private _areaColors: string[] = [];
    private _highlightedArea: string | null = null;
    private _highlightedAreaNameCh: string | null = null;
    private _dimOpacity: number = 1; // 1 = no dim, 0.2 = full dim for non-highlighted
    private _chart: any = null;
    private _series: any = null;

    constructor() {
        this._paneViews = [new OutageMarkersPaneView(this)];
    }

    get chart() {
        return this._chart;
    }

    series() {
        return this._series;
    }

    attached(param: SeriesAttachedParameter<Time>): void {
        this._chart = param.chart;
        this._series = param.series;
    }

    detached(): void {
        this._chart = null;
        this._series = null;
    }

    paneViews(): readonly IPrimitivePaneView[] {
        return this._paneViews;
    }

    hitTest(): PrimitiveHoveredItem | null {
        return null;
    }

    setOutagePoints(points: OutagePoint[], areaOrder: string[], areaColors: string[]): void {
        this._points = points;
        this._areaOrder = areaOrder;
        this._areaColors = areaColors;
        this._paneViews.forEach((pv) => pv.update());
    }

    setHighlightedArea(area: string | null, areaNameCh?: string | null): void {
        if (this._highlightedArea === area && this._highlightedAreaNameCh === (areaNameCh ?? null)) return;
        this._highlightedArea = area;
        this._highlightedAreaNameCh = areaNameCh ?? null;
    }

    setDimOpacity(value: number): void {
        this._dimOpacity = Math.max(0.2, Math.min(1, value));
    }

    dimOpacity(): number {
        return this._dimOpacity;
    }

    highlightedArea(): string | null {
        return this._highlightedArea;
    }

    highlightedAreaNameCh(): string | null {
        return this._highlightedAreaNameCh;
    }

    points(): OutagePoint[] {
        return this._points;
    }

    areaOrder(): string[] {
        return this._areaOrder;
    }

    areaColors(): string[] {
        return this._areaColors;
    }
}
