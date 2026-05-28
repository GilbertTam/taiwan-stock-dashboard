/**
 * TDGC (調整力市場 — Balancing Market) Overlay Data Source
 *
 * Reference implementation of the OverlayDataSource plugin interface.
 * Self-contained: field metadata, merge logic, and transform logic in one file.
 *
 * Supports two data types:
 * - result (確報): confirmed/final values — rendered as solid lines
 * - prompt (速報): preliminary values — rendered as dashed lines with reduced opacity
 *
 * Supports two groups (EPRX terminology):
 * - origin (電源属地別): unit prices/quantities classified by power source location
 * - tso    (TSO別):       unit prices/quantities classified by transmission system operator
 *
 * Price max/min/ave triplets are emitted with bandRole/bandKey so the renderer can
 * pair them and draw a transparent min↔max band with the avg line on top.
 */

import type { TdgcData } from '@/types';
import type {
    OverlayDataSource,
    OverlayCategory,
    TransformedSeries,
    EnsurePointFn,
    ParseTimestampFn,
    OverlayConverters,
} from './types';
import { ProcessedDataPoint } from '@/utils/chart/types';
import { TDGC_FIELDS, TDGC_DEFAULT_FIELDS } from '../constants';

const CATEGORIES: Record<string, OverlayCategory> = {
    '1000': { labelKey: 'tdgcTab.categories.primary',          color: '#e53935' },
    '1100': { labelKey: 'tdgcTab.categories.secondary1',       color: '#fb8c00' },
    '2100': { labelKey: 'tdgcTab.categories.secondary2',       color: '#fdd835' },
    '2200': { labelKey: 'tdgcTab.categories.tertiary1',        color: '#43a047' },
    '3100': { labelKey: 'tdgcTab.categories.tertiary2',        color: '#1e88e5' },
    '3200': { labelKey: 'tdgcTab.categories.supplyDemandAdj',  color: '#8e24aa' },
    '4000': { labelKey: 'tdgcTab.categories.forward',          color: '#00897b' },
};

const DATA_TYPES: Record<string, { labelKey: string; lineStyle: number; opacity: number }> = {
    'result': { labelKey: 'controlBar.result', lineStyle: 0, opacity: 1 },
    'prompt': { labelKey: 'controlBar.prompt', lineStyle: 2, opacity: 0.6 },
};

/** Short key extracted from pointKey by stripping the 'tdgc_' prefix. */
const shortOf = (pointKey: string) => pointKey.replace(/^tdgc_/, '');

export const tdgcOverlay: OverlayDataSource<TdgcData> = {
    id: 'tdgc',
    // OverlayField requires `type: 'line' | 'histogram'`; map TDGC's 'price' → 'line', 'quantity' → 'histogram'.
    fields: TDGC_FIELDS.map(f => ({
        key: f.key,
        labelKey: f.labelKey,
        pointKey: f.pointKey,
        color: f.color,
        type: f.type === 'price' ? 'line' as const : 'histogram' as const,
        priceScaleId: f.type === 'quantity' ? 'tdgc_qty' : undefined,
        group: f.group,
        bandRole: f.bandRole,
        bandKey: f.bandKey,
    })),
    categories: CATEGORIES,
    defaultFields: [...TDGC_DEFAULT_FIELDS],
    defaultCategories: ['1000'],

    merge(
        raw: TdgcData[],
        ensurePoint: EnsurePointFn,
        parseTimestamp: ParseTimestampFn,
        config: { selectedCategories: Set<string>; selectedDataTypes?: Set<string>; selectedGroups?: Set<string> },
    ): void {
        // CRITICAL per CLAUDE.md: merge processes ALL fields unconditionally.
        // Category filter is acceptable here to limit data volume; group/field filtering is downstream.
        const filtered = config.selectedCategories.size > 0
            ? raw.filter(item => config.selectedCategories.has(item.commodity_category))
            : raw;
        if (!filtered || filtered.length === 0) return;

        const byTypeAndCategory: Record<string, Record<string, TdgcData[]>> = {};
        filtered.forEach(item => {
            const dt = item.data_type || 'result';
            const cat = item.commodity_category;
            if (!byTypeAndCategory[dt]) byTypeAndCategory[dt] = {};
            if (!byTypeAndCategory[dt][cat]) byTypeAndCategory[dt][cat] = [];
            byTypeAndCategory[dt][cat].push(item);
        });

        Object.keys(byTypeAndCategory).forEach(dataType => {
            const byCategory = byTypeAndCategory[dataType];
            Object.keys(byCategory).forEach(category => {
                const categoryData = byCategory[category];
                const byTs: Record<number, Record<string, number[]>> = {};

                categoryData.forEach(item => {
                    const ts = parseTimestamp(item.datetime);
                    if (!ts) return;
                    if (!byTs[ts]) byTs[ts] = {};
                    TDGC_FIELDS.forEach(({ key }) => {
                        const value = (item as any)[key];
                        if (typeof value === 'number' && !isNaN(value)) {
                            if (!byTs[ts][key]) byTs[ts][key] = [];
                            byTs[ts][key].push(value);
                        }
                    });
                });

                Object.keys(byTs).forEach(tsStr => {
                    const ts = Number(tsStr);
                    const point = ensurePoint(ts);
                    TDGC_FIELDS.forEach(({ key, pointKey, isMwh }) => {
                        const values = byTs[ts][key];
                        if (values && values.length > 0) {
                            const avg = values.reduce((a, b) => a + b, 0) / values.length;
                            // Point key format: tdgc_{dataType}_{category}_{shortKey}, where shortKey
                            // already contains the group token (e.g. 'origin_price_ave').
                            const pointFieldKey = `tdgc_${dataType}_${category}_${shortOf(pointKey)}`;
                            (point as any)[pointFieldKey] = isMwh ? avg / 1000 : avg;
                        }
                    });
                });
            });
        });
    },

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
    ): TransformedSeries[] {
        const out: TransformedSeries[] = [];
        const dataTypes = selectedDataTypes && selectedDataTypes.size > 0
            ? selectedDataTypes
            : new Set(['prompt']);
        const groups = selectedGroups && selectedGroups.size > 0
            ? selectedGroups
            : new Set(['origin']);

        dataTypes.forEach(dataType => {
            const dtCfg = DATA_TYPES[dataType];
            const dtLabel = dtCfg ? t(dtCfg.labelKey) : dataType;
            const showDtLabel = dataTypes.size > 1;

            selectedCategories.forEach(category => {
                const catCfg = CATEGORIES[category];
                const catLabel = catCfg ? t(catCfg.labelKey) : category;
                const catColor = catCfg?.color ?? '#999';

                TDGC_FIELDS.forEach(f => {
                    if (!selectedFields.has(f.key)) return;
                    if (!groups.has(f.group)) return;

                    const pointFieldKey = `tdgc_${dataType}_${category}_${shortOf(f.pointKey)}`;
                    const isQty = f.type === 'quantity';

                    const seriesData = isQty
                        ? converters.toHistogram(data, p => (p as any)[pointFieldKey] ?? null, 0, timezone)
                        : converters.toLine(data, p => (p as any)[pointFieldKey] ?? null, timezone);

                    if (seriesData.length > 0) {
                        const label = showDtLabel
                            ? `${catLabel} ${t(f.labelKey)} (${dtLabel})`
                            : `${catLabel} ${t(f.labelKey)}`;
                        out.push({
                            fieldKey: `${dataType}_${category}_${f.key}`,
                            data: seriesData as any,
                            label,
                            color: catColor,
                            seriesType: isQty ? 'histogram' : 'line',
                            lineStyle: dtCfg?.lineStyle,
                            opacity: dtCfg?.opacity,
                            bandRole: f.bandRole,
                            bandKey: f.bandKey ? `${dataType}_${category}_${f.bandKey}` : undefined,
                            stackingKey: isQty && barStacking ? `tdgc_${dataType}_${f.key}` : undefined,
                        });
                    }
                });
            });
        });

        return out;
    },
};
