/**
 * Top-K / Bottom-K 價格數值標籤 marker 產生器
 * Builds Lightweight Charts series markers for the per-day highest/lowest price
 * points already computed in useChartData.ts (`markerInfo`).
 *
 * 時間轉換必須與 convertToLineSeriesData (converters.ts) 完全一致，
 * 否則 marker 會浮在資料點之間。
 */

import { SeriesMarker, Time } from 'lightweight-charts';
import { toChartTime, toUTCTimestamp } from './dates';
import { ProcessedDataPoint } from './types';

/** Format a price value for the on-chart label (compact, 1 decimal). */
const formatPrice = (value: number): string =>
    Number.isInteger(value) ? String(value) : value.toFixed(1);

export function buildTopBottomMarkers(
    data: ProcessedDataPoint[],
    valueExtractor: (p: ProcessedDataPoint) => number | null,
    typeExtractor: (p: ProcessedDataPoint) => 'top' | 'bottom' | undefined,
    color: string,
    timezone?: string,
): SeriesMarker<Time>[] {
    const timeFn = timezone ? (ts: number) => toChartTime(ts, timezone) : toUTCTimestamp;

    const markers: SeriesMarker<Time>[] = [];

    for (const point of data) {
        const type = typeExtractor(point);
        if (type !== 'top' && type !== 'bottom') continue;

        const value = valueExtractor(point);
        if (value === null || value === undefined) continue;
        const num = Number(value);
        if (isNaN(num)) continue;

        markers.push({
            time: timeFn(point.timestamp),
            position: type === 'top' ? 'aboveBar' : 'belowBar',
            shape: 'circle',
            size: 0,
            color,
            text: formatPrice(num),
        });
    }

    // LWC requires markers in strictly ascending time order; per-day grouping
    // in pointsWithMarkers does not guarantee a globally sorted output.
    markers.sort((a, b) => (a.time as number) - (b.time as number));

    return markers;
}
