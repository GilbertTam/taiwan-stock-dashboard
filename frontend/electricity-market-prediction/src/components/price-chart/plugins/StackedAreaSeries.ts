import {
    ICustomSeriesPaneView,
    ICustomSeriesPaneRenderer,
    PaneRendererCustomData,
    Time,
    CustomData,
    CustomSeriesWhitespaceData,
    CustomSeriesOptions,
} from 'lightweight-charts';
import { CanvasRenderingTarget2D } from '../types/lightweight-charts-extended';

export interface StackedAreaItem {
    value: number;
    lineColor: string;
    areaColor: string;
}

export interface StackedAreaData extends CustomData {
    items: StackedAreaItem[];
}

export interface StackedAreaSeriesOptions extends CustomSeriesOptions {
    lineWidth?: number;
}

interface AreaPoint {
    x: number;
    yTop: number;
    yBottom: number;
}

class StackedAreaSeriesRenderer implements ICustomSeriesPaneRenderer {
    private _data: PaneRendererCustomData<Time, StackedAreaData> | null = null;
    private _lineWidth: number = 2;

    constructor() { }

    update(data: PaneRendererCustomData<Time, StackedAreaData>, options: StackedAreaSeriesOptions): void {
        this._data = data;
        this._lineWidth = options.lineWidth || 2;
    }

    draw(target: CanvasRenderingTarget2D, priceToCoordinate: (price: number) => number | null, isHovered: boolean, hitTestData?: unknown): void {
        target.useBitmapCoordinateSpace((scope: any) => {
            const ctx = scope.context as CanvasRenderingContext2D;
            const horizontalPixelRatio = scope.horizontalPixelRatio || 1;
            const verticalPixelRatio = scope.verticalPixelRatio || 1;

            if (!this._data || this._data.bars.length === 0) return;

            const bars = this._data.bars;
            const visibleRange = (this._data as any).visibleRange;
            if (!visibleRange) return;

            const zeroY = priceToCoordinate(0) ?? 0;
            const bitmapHeightPx = scope.bitmapSize?.height ?? 0;
            const clampPixY = (pix: number) => (bitmapHeightPx <= 0 ? pix : Math.max(0, Math.min(bitmapHeightPx, pix)));

            // Build points for each stack layer
            // layerPoints[i] contains the points defining the band for layer i
            const layerPoints: AreaPoint[][] = [];
            let maxStackDepth = 0;

            // First pass - find max stack depth
            for (let i = visibleRange.from; i < visibleRange.to; i++) {
                const bar = bars[i];
                if (!bar) continue;
                const data = bar.originalData as StackedAreaData;
                if (data?.items) {
                    maxStackDepth = Math.max(maxStackDepth, data.items.length);
                }
            }

            // Initialize point arrays and colors
            for (let layer = 0; layer < maxStackDepth; layer++) {
                layerPoints[layer] = [];
            }
            const defaultColor = 'rgba(128,128,128,0.2)';
            const layerColors: { line: string; area: string }[] = Array.from({ length: maxStackDepth }, () => ({ line: defaultColor, area: defaultColor }));

            // Second pass - build dual keys (positive and negative stacks)
            for (let i = visibleRange.from; i < visibleRange.to; i++) {
                const bar = bars[i];
                if (!bar) continue;
                const data = bar.originalData as StackedAreaData;
                if (!data?.items) continue;

                const x = bar.x * horizontalPixelRatio;

                let currentPosBase = 0;
                let currentNegBase = 0;

                data.items.forEach((item, layerIndex) => {
                    let baseValue = 0;
                    let headValue = 0;

                    // Split stack logic:
                    // Positive values stack upwards from 0
                    // Negative values stack downwards from 0
                    if (item.value >= 0) {
                        baseValue = currentPosBase;
                        headValue = currentPosBase + item.value;
                        currentPosBase += item.value;
                    } else {
                        // For negative values, "Base" is closer to 0 (numerically higher), 
                        // "Head" is further from 0 (more negative).
                        // Visual stack grows "down".
                        // Use consistent naming: Bottom=Base, Top=Head? 
                        // No, let's use explicit coordinates.
                        // We stack "from 0 downwards". So "Base" is the previous negative sum.
                        // "Head" is new negative sum.
                        baseValue = currentNegBase;
                        headValue = currentNegBase + item.value;
                        currentNegBase += item.value;
                    }

                    // Convert to screen coordinates (scale includes 0 so baseline is valid; clamp to avoid closure glitches)
                    const yBaseRaw = (priceToCoordinate(baseValue) ?? zeroY) * verticalPixelRatio;
                    const yHeadRaw = (priceToCoordinate(headValue) ?? zeroY) * verticalPixelRatio;
                    const yBase = clampPixY(typeof yBaseRaw === 'number' && !Number.isNaN(yBaseRaw) ? yBaseRaw : 0);
                    const yHead = clampPixY(typeof yHeadRaw === 'number' && !Number.isNaN(yHeadRaw) ? yHeadRaw : 0);

                    // Store points
                    // Note: In pixel coordinates, usually Y increases downwards.
                    // If Price 10 -> Y=100. Price 20 -> Y=50.
                    // If Price -10 -> Y=200.
                    // For (+) item: Base=0(Y=150), Head=10(Y=100). yBase > yHead.
                    // For (-) item: Base=0(Y=150), Head=-10(Y=200). yBase < yHead.

                    if (layerPoints[layerIndex]) {
                        layerPoints[layerIndex].push({
                            x,
                            yTop: yHead,
                            yBottom: yBase
                        });
                        const lineColor = (item.lineColor && item.lineColor.trim()) ? item.lineColor : defaultColor;
                        const areaColor = (item.areaColor && item.areaColor.trim()) ? item.areaColor : defaultColor;
                        layerColors[layerIndex] = { line: lineColor, area: areaColor };
                    }
                });
            }

            // Draw areas
            for (let layer = 0; layer < maxStackDepth; layer++) {
                const points = layerPoints[layer];
                if (points.length === 0) continue;

                ctx.beginPath();

                // 1. Trace Top Edge (Head) - Left to Right
                ctx.moveTo(points[0].x, points[0].yTop);
                for (let i = 1; i < points.length; i++) {
                    ctx.lineTo(points[i].x, points[i].yTop);
                }

                // 2. Vertical drop to Bottom Edge at last point
                ctx.lineTo(points[points.length - 1].x, points[points.length - 1].yBottom);

                // 3. Trace Bottom Edge (Base) - Right to Left
                for (let i = points.length - 1; i >= 0; i--) {
                    ctx.lineTo(points[i].x, points[i].yBottom);
                }

                ctx.closePath();
                const fillColor = layerColors[layer].area || defaultColor;
                ctx.fillStyle = fillColor;
                ctx.fill();

                // Draw Top Line (Head)
                ctx.beginPath();
                ctx.lineWidth = this._lineWidth * verticalPixelRatio;
                ctx.lineJoin = 'round';
                ctx.strokeStyle = layerColors[layer].line || defaultColor;
                ctx.moveTo(points[0].x, points[0].yTop);
                for (let i = 1; i < points.length; i++) {
                    ctx.lineTo(points[i].x, points[i].yTop);
                }
                ctx.stroke();
            }
        });
    }
}

/**
 * Represents a custom stacked area series for Lightweight Charts.
 * This series allows displaying multiple data items stacked on top of each other,
 * with support for both positive and negative value stacking.
 */
export class StackedAreaSeries implements ICustomSeriesPaneView<Time, StackedAreaData, StackedAreaSeriesOptions> {
    _renderer: StackedAreaSeriesRenderer;

    /**
     * Creates an instance of StackedAreaSeries.
     */
    constructor() {
        this._renderer = new StackedAreaSeriesRenderer();
    }

    /**
     * Builds the price value range for a given data point.
     * This is used by Lightweight Charts to determine the visible price range.
     * It includes 0 to ensure the baseline is always on-scale, which helps with
     * area closure issues, especially with mixed-sign data.
     * @param plotRow - The data point for which to calculate the price range.
     * @returns An array containing the minimum and maximum price values [min, max].
     */
    priceValueBuilder(plotRow: StackedAreaData): number[] {
        // [min, max] of the stack; always include 0 so baseline is on-scale (avoids area closure issues with mixed-sign data e.g. battery)
        let posSum = 0;
        let negSum = 0;
        plotRow.items.forEach(item => {
            if (item.value >= 0) posSum += item.value;
            else negSum += item.value;
        });
        return [Math.min(0, negSum), Math.max(0, posSum)];
    }

    isWhitespace(data: StackedAreaData | CustomSeriesWhitespaceData<Time>): data is CustomSeriesWhitespaceData<Time> {
        return (data as Partial<StackedAreaData>).items === undefined;
    }

    renderer(): ICustomSeriesPaneRenderer {
        return this._renderer;
    }

    update(data: PaneRendererCustomData<Time, StackedAreaData>, options: StackedAreaSeriesOptions): void {
        this._renderer.update(data, options);
    }

    defaultOptions(): StackedAreaSeriesOptions {
        return {
            lineWidth: 2,
            color: 'transparent',
        } as StackedAreaSeriesOptions;
    }
}
