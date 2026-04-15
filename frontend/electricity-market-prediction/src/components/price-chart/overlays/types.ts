/**
 * Overlay Data Source Plugin Interface
 *
 * Defines a common contract for chart overlay data sources (TDGC, interconnection,
 * battery, bid plans, etc.) so that each source can be self-contained in a single
 * file rather than scattered across 9+ files.
 *
 * Architecture follows the two-layer rule from CLAUDE.md:
 * - merge(): runs in useChartData (high cost, unconditional field processing)
 * - transform(): runs in useChartDataTransformers (low cost, respects field selection)
 */

import { UTCTimestamp } from 'lightweight-charts';
import { ProcessedDataPoint } from '@/utils/chart/types';

// ─── Field & Category Metadata ───────────────────────────────────────────────

export interface OverlayField {
    /** Unique key for this field, e.g. 'corrected_unit_price_ave' */
    key: string;
    /** i18n translation key for display label */
    labelKey: string;
    /** Key used on ProcessedDataPoint, e.g. 'tdgc_corrected_price_ave' */
    pointKey: string;
    /** Default color for this field */
    color: string;
    /** Rendering type: 'line' for LineSeries, 'histogram' for HistogramSeries */
    type: 'line' | 'histogram';
    /** If histogram, which subchart priceScaleId to use */
    priceScaleId?: string;
}

export interface OverlayCategory {
    /** i18n translation key for category label */
    labelKey: string;
    /** Color assigned to this category */
    color: string;
}

// ─── Transformed Series (output of transform layer) ──────────────────────────

export interface TransformedSeries {
    /** Composite key for series identification, e.g. '1000_corrected_unit_price_ave' */
    fieldKey: string;
    /** LWC-ready data array */
    data: { time: UTCTimestamp; value: number }[];
    /** Display label (already resolved through i18n in transform) */
    label: string;
    /** Color for this series */
    color: string;
    /** Rendering type */
    seriesType: 'line' | 'histogram';
}

// ─── Merge Layer Helper ──────────────────────────────────────────────────────

/** Function provided by useChartData to get-or-create a data point at a timestamp */
export type EnsurePointFn = (ts: number) => ProcessedDataPoint;

/** Parse a datetime string to a Unix timestamp (ms). Returns null if invalid. */
export type ParseTimestampFn = (datetime: string) => number | null;

// ─── Plugin Interface ────────────────────────────────────────────────────────

export interface OverlayDataSource<TRaw = any> {
    /** Unique identifier, e.g. 'tdgc', 'interconnection', 'battery' */
    id: string;

    /** Static field definitions */
    fields: OverlayField[];

    /** Optional category definitions (e.g., TDGC commodity categories, bid plan markets) */
    categories?: Record<string, OverlayCategory>;

    /** Default field keys to select when the source is first enabled */
    defaultFields: string[];

    /** Default category keys to select (if categories are defined) */
    defaultCategories?: string[];

    /**
     * Merge layer: write ALL fields from raw data onto processedChartData points.
     *
     * CRITICAL: Must process ALL fields unconditionally — never filter by
     * selectedFields here. Field selection happens only in transform().
     * Category filtering IS allowed here to limit the data volume.
     */
    merge(
        raw: TRaw[],
        ensurePoint: EnsurePointFn,
        parseTimestamp: ParseTimestampFn,
        config: { selectedCategories: Set<string> },
    ): void;

    /**
     * Transform layer: extract selected fields from processedChartData into
     * LWC-ready series arrays. This is the cheap layer that runs when field
     * toggles change.
     *
     * @param t - i18n translation function for resolving label keys
     */
    transform(
        data: ProcessedDataPoint[],
        selectedFields: Set<string>,
        selectedCategories: Set<string>,
        timezone: string,
        t: (key: string) => string,
        converters: OverlayConverters,
    ): TransformedSeries[];
}

/** Converter functions injected into transform() so plugins don't import chart helpers directly */
export interface OverlayConverters {
    toLine: (
        data: ProcessedDataPoint[],
        extractor: (p: ProcessedDataPoint) => number | null,
        timezone: string,
    ) => { time: UTCTimestamp; value: number }[];
    toHistogram: (
        data: ProcessedDataPoint[],
        extractor: (p: ProcessedDataPoint) => number | null,
        baseValue: number,
        timezone: string,
    ) => { time: UTCTimestamp; value: number; color?: string }[];
}
