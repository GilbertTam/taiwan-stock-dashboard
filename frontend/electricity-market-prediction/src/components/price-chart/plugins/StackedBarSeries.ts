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
    draw(target: any, priceConverter: any, isHovered: boolean, hitTestData?: unknown): void {
        target.useBitmapCoordinateSpace((scope: any) => {
            const ctx = scope.context as CanvasRenderingContext2D;

            if (!this._data || this._data.bars.length === 0) return;

            const bars = this._data.bars;
            const barSpacing = (this._data as any).barSpacing || 6;
            const barWidth = Math.max(1, Math.floor(barSpacing * this._barWidth));
            const halfWidth = barWidth / 2;

            bars.forEach((bar: any) => {
                const x = bar.x;
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

                    // priceConverter usually has priceToCoordinate method
                    const y1 = priceConverter.priceToCoordinate(fromVal);
                    const y2 = priceConverter.priceToCoordinate(toVal);

                    if (y1 !== null && y2 !== null) {
                        const top = Math.min(y1, y2);
                        const bottom = Math.max(y1, y2);
                        const height = bottom - top;

                        if (height < 1 && height > 0) {
                            // Min height if needed
                        }

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
