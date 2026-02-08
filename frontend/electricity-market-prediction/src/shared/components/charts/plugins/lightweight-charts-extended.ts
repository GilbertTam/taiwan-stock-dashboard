/**
 * Extended types for Lightweight Charts to avoid using 'any'.
 * Shared by chart primitives (e.g. DayBackgroundPrimitive) across the app.
 */

export interface BitmapCoordinatesRenderingScope {
    context: CanvasRenderingContext2D;
    mediaSize: { height: number; width: number };
    bitmapSize: { height: number; width: number };
    horizontalPixelRatio: number;
    verticalPixelRatio: number;
}

export interface CanvasRenderingTarget2D {
    useBitmapCoordinateSpace(callback: (scope: BitmapCoordinatesRenderingScope) => void): void;
    useMediaCoordinateSpace(callback: (scope: { context: CanvasRenderingContext2D }) => void): void;
}
