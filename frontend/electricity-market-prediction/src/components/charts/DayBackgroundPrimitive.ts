/**
 * DayBackgroundPrimitive - Draws alternating background colors for each day.
 *
 * Shared lightweight-charts plugin: attach to any series to show day-aligned
 * alternating bands. Use from price charts, z-score charts, secondary charts, etc.
 */

import {
    ISeriesPrimitive,
    SeriesAttachedParameter,
    Time,
    PrimitiveHoveredItem,
} from 'lightweight-charts';
import { CanvasRenderingTarget2D } from './lightweight-charts-extended';

/** Minimal chart view needed for drawing (time scale only). */
interface ChartTimeScaleView {
    timeScale(): { timeToCoordinate(t: Time): number | null; getVisibleLogicalRange(): unknown };
}

interface IPrimitivePaneView {
    update(): void;
    renderer(): IPrimitivePaneRenderer | null;
    zOrder?(): 'bottom' | 'normal' | 'top';
}

interface IPrimitivePaneRenderer {
    draw(target: CanvasRenderingTarget2D): void;
}

export interface DayZone {
    startTime: number;
    endTime: number;
    color: string;
}

export interface DayBackgroundColors {
    even?: string;
    odd?: string;
}

class DayBackgroundPaneView implements IPrimitivePaneView {
    private _source: DayBackgroundPrimitive;
    private _zones: DayZone[] = [];

    constructor(source: DayBackgroundPrimitive) {
        this._source = source;
    }

    update(): void {
        this._zones = this._source.zones();
    }

    renderer(): IPrimitivePaneRenderer | null {
        return new DayBackgroundRenderer(this._zones, this._source);
    }

    zOrder(): 'bottom' | 'normal' | 'top' {
        return 'bottom';
    }
}

class DayBackgroundRenderer implements IPrimitivePaneRenderer {
    private _zones: DayZone[];
    private _source: DayBackgroundPrimitive;

    constructor(zones: DayZone[], source: DayBackgroundPrimitive) {
        this._zones = zones;
        this._source = source;
    }

    draw(target: CanvasRenderingTarget2D): void {
        try {
            const chart = this._source.chart;
            if (!chart) return;

            target.useBitmapCoordinateSpace((scope: { context: CanvasRenderingContext2D; bitmapSize: { width: number; height: number }; horizontalPixelRatio?: number }) => {
                const ctx = scope.context;
                let timeScale: { timeToCoordinate: (t: Time) => number | null; getVisibleLogicalRange: () => unknown } | null = null;
                try {
                    timeScale = chart.timeScale();
                } catch {
                    return;
                }
                if (!timeScale || !ctx) return;

                let visibleRange: unknown;
                try {
                    visibleRange = timeScale.getVisibleLogicalRange();
                } catch {
                    return;
                }
                if (!visibleRange) return;

                const pixelRatio = scope.horizontalPixelRatio ?? 1;
                const width = scope.bitmapSize.width;
                const height = scope.bitmapSize.height;

                this._zones.forEach((zone) => {
                    try {
                        const x1 = timeScale!.timeToCoordinate(zone.startTime as Time);
                        let x2 = timeScale!.timeToCoordinate(zone.endTime as Time);
                        if (x1 === null) return;
                        if (x2 === null) x2 = width / pixelRatio;

                        const bitmapX1 = Math.round(x1 * pixelRatio);
                        const bitmapX2 = Math.round(x2 * pixelRatio);

                        if (bitmapX2 < 0 || bitmapX1 > width) return;

                        ctx.fillStyle = zone.color;
                        ctx.fillRect(
                            Math.max(0, bitmapX1),
                            0,
                            Math.min(width, bitmapX2) - Math.max(0, bitmapX1),
                            height
                        );
                    } catch {
                        // Chart may be disposed during iteration
                    }
                });
            });
        } catch {
            // Chart may be disposed
        }
    }
}

/**
 * Lightweight-charts primitive that draws alternating day backgrounds.
 * - even/odd day colors (default: transparent / subtle tint)
 * - Timezone-aware day boundaries (Asia/Tokyo, Asia/Taipei, UTC).
 *
 * Usage:
 *   const primitive = new DayBackgroundPrimitive({ even: 'transparent', odd: 'rgba(60,70,90,0.25)' });
 *   primitive.updateZones(timestamps, 'Asia/Tokyo');
 *   series.attachPrimitive(primitive);
 */
export class DayBackgroundPrimitive implements ISeriesPrimitive<Time> {
    private _paneViews: DayBackgroundPaneView[];
    private _zones: DayZone[] = [];
    private _chart: ChartTimeScaleView | null = null;
    private _series: unknown = null;
    private _colors: Required<DayBackgroundColors> = {
        even: 'rgba(0, 0, 0, 0)',
        odd: 'rgba(60, 70, 90, 0.25)',
    };

    constructor(colors?: DayBackgroundColors) {
        if (colors?.even !== undefined) this._colors.even = colors.even;
        if (colors?.odd !== undefined) this._colors.odd = colors.odd;
        this._paneViews = [new DayBackgroundPaneView(this)];
    }

    get chart(): ChartTimeScaleView | null {
        return this._chart;
    }

    attached(param: SeriesAttachedParameter<Time>): void {
        this._chart = param.chart as ChartTimeScaleView;
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

    /**
     * Update zones from data timestamps. Call after setting chart data.
     * @param timestamps - Unix seconds or milliseconds
     * @param timezone - 'Asia/Tokyo' | 'Asia/Taipei' | 'UTC'
     */
    updateZones(timestamps: number[], timezone: string = 'Asia/Tokyo'): void {
        if (timestamps.length === 0) {
            this._zones = [];
            return;
        }

        let offset = 9 * 3600;
        if (timezone === 'Asia/Taipei') offset = 8 * 3600;
        if (timezone === 'UTC') offset = 0;

        const uniqueStartTimes = new Set<number>();
        timestamps.forEach(ts => {
            const tsSec = ts > 1e12 ? Math.floor(ts / 1000) : ts;
            const adjusted = tsSec + offset;
            const dayStartAdjusted = Math.floor(adjusted / 86400) * 86400;
            const dayStart = dayStartAdjusted - offset;
            uniqueStartTimes.add(dayStart);
        });

        const maxTs = Math.max(...timestamps.map(t => (t > 1e12 ? t / 1000 : t)));
        const lastAdjusted = maxTs + offset;
        const lastDayStartAdjusted = Math.floor(lastAdjusted / 86400) * 86400;
        const lastDayStart = lastDayStartAdjusted - offset;
        uniqueStartTimes.add(lastDayStart + 86400);

        const sortedStarts = Array.from(uniqueStartTimes).sort((a, b) => a - b);

        this._zones = sortedStarts.map((start, index) => ({
            startTime: start + offset,
            endTime: start + offset + 86400,
            color: index % 2 === 0 ? this._colors.even : this._colors.odd,
        }));

        this._paneViews.forEach(pv => pv.update());
    }

    zones(): DayZone[] {
        return this._zones;
    }
}
