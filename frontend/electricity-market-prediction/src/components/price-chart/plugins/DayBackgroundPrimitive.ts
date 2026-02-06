/**
 * DayBackgroundPrimitive - Draws alternating background colors for each day
 * 
 * This primitive creates vertical shaded regions that alternate colors
 * to help visually distinguish different days on the chart.
 */

import {
    ISeriesPrimitive,
    SeriesAttachedParameter,
    Time,
    PrimitiveHoveredItem,
} from 'lightweight-charts';

// Custom type definitions for primitive pane views
interface IPrimitivePaneView {
    update(): void;
    renderer(): IPrimitivePaneRenderer | null;
    zOrder?(): 'bottom' | 'normal' | 'top';
}

interface IPrimitivePaneRenderer {
    draw(target: any): void;
}

interface DayZone {
    startTime: number; // Unix timestamp (seconds)
    endTime: number;   // Unix timestamp (seconds)
    color: string;
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
        return 'bottom'; // Render behind everything else
    }
}

class DayBackgroundRenderer implements IPrimitivePaneRenderer {
    private _zones: DayZone[];
    private _source: DayBackgroundPrimitive;

    constructor(zones: DayZone[], source: DayBackgroundPrimitive) {
        this._zones = zones;
        this._source = source;
    }

    draw(target: any): void {
        // For lightweight-charts v5, target has useBitmapCoordinateSpace
        target.useBitmapCoordinateSpace((scope: any) => {
            const ctx = scope.context;
            const timeScale = this._source.chart?.timeScale();
            if (!timeScale || !ctx) return;

            const visibleRange = timeScale.getVisibleLogicalRange();
            if (!visibleRange) return;

            // Get device pixel ratio for proper scaling
            const pixelRatio = scope.horizontalPixelRatio || 1;
            const width = scope.bitmapSize.width;
            const height = scope.bitmapSize.height;

            this._zones.forEach((zone) => {
                const x1 = timeScale.timeToCoordinate(zone.startTime as Time);
                let x2 = timeScale.timeToCoordinate(zone.endTime as Time);
                if (x1 === null) return;
                // When endTime is past visible range, timeToCoordinate returns null; extend zone to right edge so last day still shows
                if (x2 === null) x2 = width / pixelRatio;

                // Convert to bitmap coordinates
                const bitmapX1 = Math.round(x1 * pixelRatio);
                const bitmapX2 = Math.round(x2 * pixelRatio);

                if (bitmapX2 < 0 || bitmapX1 > width) return; // Skip if not visible

                ctx.fillStyle = zone.color;
                ctx.fillRect(
                    Math.max(0, bitmapX1),
                    0,
                    Math.min(width, bitmapX2) - Math.max(0, bitmapX1),
                    height
                );
            });
        });
    }
}

export class DayBackgroundPrimitive implements ISeriesPrimitive<Time> {
    private _paneViews: DayBackgroundPaneView[];
    private _zones: DayZone[] = [];
    private _chart: any = null;
    private _series: any = null;
    private _colors = {
        even: 'rgba(0, 0, 0, 0)',           // Fully transparent (no background)
        odd: 'rgba(60, 70, 90, 0.25)',      // Visible blue-gray tint
    };

    constructor(colors?: { even?: string; odd?: string }) {
        if (colors?.even) this._colors.even = colors.even;
        if (colors?.odd) this._colors.odd = colors.odd;
        this._paneViews = [new DayBackgroundPaneView(this)];
    }

    get chart() {
        return this._chart;
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

    /**
     * Update zones based on data timestamps
     * Call this after setting chart data
     */
    updateZones(timestamps: number[], timezone: string = 'Asia/Tokyo'): void {
        if (timestamps.length === 0) {
            this._zones = [];
            return;
        }

        // 1. Determine fixed offset (seconds)
        let offset = 9 * 3600; // Default Tokyo (UTC+9)
        if (timezone === 'Asia/Taipei') offset = 8 * 3600;
        if (timezone === 'UTC') offset = 0;

        // 2. Identify unique days relative to that offset
        // Formula: dayStart = floor((ts + offset) / 86400) * 86400 - offset
        const uniqueStartTimes = new Set<number>();
        timestamps.forEach(ts => {
            const tsSec = ts > 1e12 ? Math.floor(ts / 1000) : ts;
            const adjusted = tsSec + offset;
            const dayStartAdjusted = Math.floor(adjusted / 86400) * 86400;
            const dayStart = dayStartAdjusted - offset;
            uniqueStartTimes.add(dayStart);
        });

        // Ensure the day *after* the last data point is included (e.g. range 01/31–02/07: 02/07 has no data points but should still show a zone)
        const maxTs = Math.max(...timestamps.map(t => t > 1e12 ? t / 1000 : t));
        const lastAdjusted = maxTs + offset;
        const lastDayStartAdjusted = Math.floor(lastAdjusted / 86400) * 86400;
        const lastDayStart = lastDayStartAdjusted - offset;
        uniqueStartTimes.add(lastDayStart + 86400); // next day boundary so last calendar day gets a zone

        // 3. Create sorted continuous zones in chart time (library uses UTC; we store display time = actual + offset)
        const sortedStarts = Array.from(uniqueStartTimes).sort((a, b) => a - b);

        this._zones = sortedStarts.map((start, index) => ({
            startTime: start + offset,
            endTime: start + offset + 86400,
            color: index % 2 === 0 ? this._colors.even : this._colors.odd,
        }));

        // Update pane views
        this._paneViews.forEach(pv => pv.update());
    }

    zones(): DayZone[] {
        return this._zones;
    }
}
