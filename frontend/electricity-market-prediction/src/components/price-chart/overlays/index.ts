/**
 * Chart Overlay Data Source Plugin System
 *
 * Each overlay implements OverlayDataSource and is registered here.
 * Future migration: replace scattered merge/transform/render code in
 * useChartData, useChartDataTransformers, and useChartSeries with
 * a generic loop over registered overlays.
 */

export type {
    OverlayDataSource,
    OverlayField,
    OverlayCategory,
    TransformedSeries,
    EnsurePointFn,
    ParseTimestampFn,
    OverlayConverters,
} from './types';

export { tdgcOverlay } from './tdgc';
