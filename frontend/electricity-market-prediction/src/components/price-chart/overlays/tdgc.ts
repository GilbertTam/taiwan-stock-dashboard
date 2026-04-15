/**
 * TDGC (調整力市場 — Balancing Market) Overlay Data Source
 *
 * Reference implementation of the OverlayDataSource plugin interface.
 * Self-contained: field metadata, merge logic, and transform logic in one file.
 */

import type { TdgcData } from '@/types';
import type {
    OverlayDataSource,
    OverlayField,
    OverlayCategory,
    TransformedSeries,
    EnsurePointFn,
    ParseTimestampFn,
    OverlayConverters,
} from './types';
import { ProcessedDataPoint } from '@/utils/chart/types';

// ─── Field & Category Definitions ────────────────────────────────────────────

const FIELDS: OverlayField[] = [
    { key: 'corrected_unit_price_ave', labelKey: 'fields.tdgc.correctedPrice', pointKey: 'tdgc_corrected_price_ave', color: '#e91e63', type: 'line' },
    { key: 'tso_price_ave',            labelKey: 'fields.tdgc.tsoPrice',       pointKey: 'tdgc_tso_price_ave',       color: '#9c27b0', type: 'line' },
    { key: 'total_contract_quantity',   labelKey: 'fields.tdgc.contractQty',    pointKey: 'tdgc_contract_qty',        color: '#7e57c2', type: 'histogram', priceScaleId: 'tdgc_qty' },
    { key: 'reserve_requirement',       labelKey: 'fields.tdgc.reserveReq',     pointKey: 'tdgc_reserve_req',         color: '#5c6bc0', type: 'histogram', priceScaleId: 'tdgc_qty' },
];

const CATEGORIES: Record<string, OverlayCategory> = {
    '1000': { labelKey: 'tdgcTab.categories.primary',          color: '#e53935' },
    '1100': { labelKey: 'tdgcTab.categories.secondary1',       color: '#fb8c00' },
    '2100': { labelKey: 'tdgcTab.categories.secondary2',       color: '#fdd835' },
    '2200': { labelKey: 'tdgcTab.categories.tertiary1',        color: '#43a047' },
    '3100': { labelKey: 'tdgcTab.categories.tertiary2',        color: '#1e88e5' },
    '3200': { labelKey: 'tdgcTab.categories.supplyDemandAdj',  color: '#8e24aa' },
    '4000': { labelKey: 'tdgcTab.categories.forward',          color: '#00897b' },
};

/** Internal mapping from raw ES field → short key used in pointKey */
const RAW_FIELD_MAP: { key: string; shortKey: string; isMwh: boolean }[] = [
    { key: 'corrected_unit_price_ave', shortKey: 'corrected_price_ave', isMwh: false },
    { key: 'tso_price_ave',            shortKey: 'tso_price_ave',       isMwh: false },
    { key: 'total_contract_quantity',   shortKey: 'contract_qty',        isMwh: true },
    { key: 'reserve_requirement',       shortKey: 'reserve_req',         isMwh: true },
];

// ─── Plugin Implementation ───────────────────────────────────────────────────

export const tdgcOverlay: OverlayDataSource<TdgcData> = {
    id: 'tdgc',
    fields: FIELDS,
    categories: CATEGORIES,
    defaultFields: [],
    defaultCategories: ['1000'],

    merge(
        raw: TdgcData[],
        ensurePoint: EnsurePointFn,
        parseTimestamp: ParseTimestampFn,
        config: { selectedCategories: Set<string> },
    ): void {
        const filtered = config.selectedCategories.size > 0
            ? raw.filter(item => config.selectedCategories.has(item.commodity_category))
            : raw;

        if (!filtered || filtered.length === 0) return;

        // Group by commodity_category
        const byCategory: Record<string, TdgcData[]> = {};
        filtered.forEach(item => {
            const cat = item.commodity_category;
            if (!byCategory[cat]) byCategory[cat] = [];
            byCategory[cat].push(item);
        });

        // For each category, aggregate by timestamp then write onto data points
        Object.keys(byCategory).forEach(category => {
            const categoryData = byCategory[category];
            const byTs: Record<number, Record<string, number[]>> = {};

            categoryData.forEach(item => {
                const ts = parseTimestamp(item.datetime);
                if (!ts) return;
                if (!byTs[ts]) byTs[ts] = {};
                RAW_FIELD_MAP.forEach(({ key }) => {
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
                RAW_FIELD_MAP.forEach(({ key, shortKey, isMwh }) => {
                    const values = byTs[ts][key];
                    if (values && values.length > 0) {
                        const avg = values.reduce((a, b) => a + b, 0) / values.length;
                        const pointFieldKey = `tdgc_${category}_${shortKey}`;
                        (point as any)[pointFieldKey] = isMwh ? avg / 1000 : avg;
                    }
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
    ): TransformedSeries[] {
        const out: TransformedSeries[] = [];

        selectedCategories.forEach(category => {
            const catCfg = CATEGORIES[category];
            const catLabel = catCfg ? t(catCfg.labelKey) : category;
            const catColor = catCfg?.color ?? '#999';

            FIELDS.forEach(f => {
                if (!selectedFields.has(f.key)) return;
                const shortKey = f.pointKey.replace('tdgc_', '');
                const dynamicPointKey = `tdgc_${category}_${shortKey}`;
                const isQty = f.type === 'histogram';

                const seriesData = isQty
                    ? converters.toHistogram(data, p => (p as any)[dynamicPointKey] ?? null, 0, timezone)
                    : converters.toLine(data, p => (p as any)[dynamicPointKey] ?? null, timezone);

                if (seriesData.length > 0) {
                    out.push({
                        fieldKey: `${category}_${f.key}`,
                        data: seriesData as any,
                        label: `${catLabel} ${t(f.labelKey)}`,
                        color: catColor,
                        seriesType: isQty ? 'histogram' : 'line',
                    });
                }
            });
        });

        return out;
    },
};
