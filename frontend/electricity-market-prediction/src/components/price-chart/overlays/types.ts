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
    /** Logical grouping (e.g. 'origin' vs 'tso' for TDGC). Used by group toggles. */
    group?: string;
    /** If this field is part of a min/ave/max band trio, which role it plays. */
    bandRole?: 'min' | 'max' | 'ave';
    /** Stable key shared by the three band members so renderers can pair them. */
    bandKey?: string;
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
    /** Optional line style: 0=Solid (default), 1=Dotted, 2=Dashed, 3=LargeDashed, 4=SparseDotted */
    lineStyle?: number;
    /** Optional opacity override (0–1). Useful for secondary/preliminary data. */
    opacity?: number;
    /** Member of a min/ave/max band trio (set on series whose field has bandRole). */
    bandRole?: 'min' | 'max' | 'ave';
    /** Shared identifier for band members (with dataType+category prefix to keep unique). */
    bandKey?: string;
    /** If set, histogram series should stack with peers sharing the same stackingKey. */
    stackingKey?: string;
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
        config: { selectedCategories: Set<string>; selectedDataTypes?: Set<string>; selectedGroups?: Set<string> },
    ): void;

    /**
     * Transform layer: extract selected fields from processedChartData into
     * LWC-ready series arrays. This is the cheap layer that runs when field
     * toggles change.
     *
     * @param t - i18n translation function for resolving label keys
     * @param selectedDataTypes - optional data type filter (e.g. 'result', 'prompt')
     * @param selectedGroups - optional group filter (e.g. 'origin', 'tso')
     * @param barStacking - if true, histogram series of same metric should stack
     */
    transform(
        data: ProcessedDataPoint[],
        selectedFields: Set<string>,
        selectedCategories: Set<string>,
        timezone: string,
        t: (key: string) => string,
        converters: OverlayConverters,
        selectedDataTypes?: Set<string>,
        selectedGroups?: Set<string>,
        barStacking?: boolean,
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
