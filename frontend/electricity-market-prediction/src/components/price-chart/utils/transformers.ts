import { ProcessedDataPoint, toChartTime } from '@/utils/lightweightChartsHelpers';
import { hexToRgba } from '../utils';
import { occtoStackedFields } from '../constants';

export interface OcctoItem {
    value: number;
    color: string;
}

export interface OcctoSeriesData {
    time: string | number; // Time type from lightweight-charts
    items: OcctoItem[];
}

/**
 * Transforms processed chart data into OCCTO stacked series data.
 */
export const transformOcctoData = (
    data: ProcessedDataPoint[],
    showOcctoArea: boolean,
    selectedOcctoFields: Set<string>,
    timezone: string
): OcctoSeriesData[] => {
    if (!showOcctoArea) return [];

    const occtoFieldColors: Record<string, string> = {};
    occtoStackedFields.forEach(f => { occtoFieldColors[f.key] = f.color; });

    // Pre-sort fields to ensure consistent stacking order
    const sortedFields = Array.from(selectedOcctoFields).sort((a, b) => {
        const idxA = occtoStackedFields.findIndex(f => f.key === a);
        const idxB = occtoStackedFields.findIndex(f => f.key === b);
        return idxA - idxB;
    });

    return data
        .filter(d => d.occto_values)
        .map(d => {
            const items: OcctoItem[] = [];
            sortedFields.forEach(field => {
                const val = d.occto_values?.[field];
                if (typeof val === 'number' && Math.abs(val) > 1e-6) {
                    const base = occtoFieldColors[field] || '#6b7280';
                    items.push({ value: val, color: hexToRgba(base, 0.75) });
                }
            });
            return { time: toChartTime(d.timestamp, timezone), items };
        })
        .filter(d => d.items.length > 0);
};
