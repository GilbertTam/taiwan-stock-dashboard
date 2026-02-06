import {
    ICustomSeriesPaneView,
    ICustomSeriesPaneRenderer,
    PaneRendererCustomData,
    Time,
    CustomData,
    CustomSeriesWhitespaceData,
    CustomSeriesOptions,
} from 'lightweight-charts';

export interface StackedBarItem {
    value: number;
    color: string;
}

export interface StackedBarData extends CustomData {
    items: StackedBarItem[];
}

export interface StackedBarSeriesOptions extends CustomSeriesOptions {
    barWidth?: number; // 0..1
}

class StackedBarSeriesRenderer implements ICustomSeriesPaneRenderer {
    private _data: PaneRendererCustomData<Time, StackedBarData> | null = null;
    private _barWidth: number = 0.8;

    constructor() { }

    update(data: PaneRendererCustomData<Time, StackedBarData>, options: StackedBarSeriesOptions): void {
        this._data = data;
        this._barWidth = options.barWidth || 0.8;
    }

    // target is likely CanvasRenderingContext2D-like but with extra methods in LWC environment.
    // Since types aren't exported, we use any or specific shape.
    // priceConverter is a function (PriceToCoordinateConverter), not an object!
    draw(target: any, priceToCoordinate: (price: number) => number | null, isHovered: boolean, hitTestData?: unknown): void {
        target.useBitmapCoordinateSpace((scope: any) => {
            const ctx = scope.context as CanvasRenderingContext2D;
            const horizontalPixelRatio = scope.horizontalPixelRatio || 1;
            const verticalPixelRatio = scope.verticalPixelRatio || 1;

            if (!this._data || this._data.bars.length === 0) return;

            const bars = this._data.bars;
            const barSpacing = (this._data as any).barSpacing ?? 6;
            // Cap bar width so zooming out never makes bars overlap (width must be < spacing in pixels)
            const maxBarWidthPx = Math.max(1, Math.floor((barSpacing - 0.5) * horizontalPixelRatio));
            const barWidth = Math.min(
                Math.max(1, Math.floor(barSpacing * this._barWidth * horizontalPixelRatio)),
                maxBarWidthPx
            );
            const halfWidth = barWidth / 2;

            bars.forEach((bar: any) => {
                const x = Math.round(bar.x * horizontalPixelRatio);
                const originalData = bar.originalData as StackedBarData;
                if (!originalData || !originalData.items) return;

                let posBase = 0;
                let negBase = 0;

                originalData.items.forEach(item => {
                    const isPositive = item.value >= 0;
                    const fromVal = isPositive ? posBase : negBase;
                    const toVal = fromVal + item.value;

                    if (isPositive) posBase = toVal;
                    else negBase = toVal;

                    // priceToCoordinate is a FUNCTION, call it directly!
                    const y1Media = priceToCoordinate(fromVal);
                    const y2Media = priceToCoordinate(toVal);

                    if (y1Media !== null && y2Media !== null) {
                        const y1 = Math.round(y1Media * verticalPixelRatio);
                        const y2 = Math.round(y2Media * verticalPixelRatio);
                        const top = Math.min(y1, y2);
                        const bottom = Math.max(y1, y2);
                        const height = Math.max(1, bottom - top); // Minimum height of 1px

                        ctx.fillStyle = item.color;
                        ctx.fillRect(x - halfWidth, top, barWidth, height);
                    }
                });
            });
        });
    }
}

export class StackedBarSeries implements ICustomSeriesPaneView<Time, StackedBarData, StackedBarSeriesOptions> {
    _renderer: StackedBarSeriesRenderer;

    constructor() {
        this._renderer = new StackedBarSeriesRenderer();
    }

    priceValueBuilder(plotRow: StackedBarData): number[] {
        // This is used for auto-scaling.
        // We need to return the [min, max] of the stack.
        let posSum = 0;
        let negSum = 0;
        plotRow.items.forEach(item => {
            if (item.value >= 0) posSum += item.value;
            else negSum += item.value;
        });
        return [negSum, posSum]; // [min, max]
    }

    isWhitespace(data: StackedBarData | CustomSeriesWhitespaceData<Time>): data is CustomSeriesWhitespaceData<Time> {
        return (data as Partial<StackedBarData>).items === undefined;
    }

    renderer(): ICustomSeriesPaneRenderer {
        return this._renderer;
    }

    update(data: PaneRendererCustomData<Time, StackedBarData>, options: StackedBarSeriesOptions): void {
        this._renderer.update(data, options);
    }

    defaultOptions(): StackedBarSeriesOptions {
        return {
            barWidth: 0.8,
            color: 'transparent',
        } as StackedBarSeriesOptions;
    }
}
