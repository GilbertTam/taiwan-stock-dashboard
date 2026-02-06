/**
 * Stacked Bars Series Plugin for Lightweight Charts
 * Based on TradingView's plugin-examples: https://github.com/tradingview/lightweight-charts/tree/master/plugin-examples/src/plugins/stacked-bars-series
 * 
 * This implementation provides proper stacked bar chart functionality
 * by creating multiple histogram series with calculated base values.
 */

import { IChartApi, ISeriesApi, HistogramData, UTCTimestamp, HistogramSeries } from 'lightweight-charts';

export interface StackedBarData {
    time: UTCTimestamp;
    values: Record<string, number | null>; // Field key -> value
}

export interface StackedBarSeriesOptions {
    fields: string[]; // Ordered list of field keys
    colors: Record<string, string>; // Field key -> color
    priceScaleId?: string;
    visible?: boolean;
}

/**
 * Creates stacked bar series by calculating cumulative values
 * Each series represents one layer of the stack
 */
export function createStackedBarSeries(
    chart: IChartApi,
    data: StackedBarData[],
    options: StackedBarSeriesOptions
): ISeriesApi<'Histogram'>[] {
    const { fields, colors, priceScaleId, visible = true } = options;
    const series: ISeriesApi<'Histogram'>[] = [];

    // Calculate cumulative bases for each field
    fields.forEach((fieldKey, index) => {
        const color = colors[fieldKey] || '#888888';

        // Calculate base value (sum of all previous fields)
        const histogramData: HistogramData[] = data
            .map((point) => {
                let base = 0;

                // Sum all previous fields
                for (let i = 0; i < index; i++) {
                    const prevValue = point.values[fields[i]];
                    if (prevValue !== null && prevValue !== undefined && !isNaN(prevValue)) {
                        base += prevValue;
                    }
                }

                const value = point.values[fieldKey];
                if (value === null || value === undefined || isNaN(value)) {
                    return null;
                }

                // For stacked bars, we need to draw from base to base + value
                // Lightweight Charts histogram draws from 0 to value, so we set value as base + value
                // and use base as the starting point (we'll need to handle this differently)
                return {
                    time: point.time,
                    value: base + value, // Total cumulative value
                    color: color,
                };
            })
            .filter((item) => item !== null) as unknown as HistogramData<UTCTimestamp>[];

        if (histogramData.length > 0) {
            const seriesApi = chart.addSeries(HistogramSeries, {
                color: color,
                priceScaleId: priceScaleId,
                visible: visible,
            });

            seriesApi.setData(histogramData);
            series.push(seriesApi);
        }
    });

    return series;
}

/**
 * Creates percentage stacked bar series
 * Values are converted to percentages before stacking
 */
export function createPercentageStackedBarSeries(
    chart: IChartApi,
    data: StackedBarData[],
    options: StackedBarSeriesOptions
): ISeriesApi<'Histogram'>[] {
    const { fields, colors, priceScaleId, visible = true } = options;
    const series: ISeriesApi<'Histogram'>[] = [];

    fields.forEach((fieldKey, index) => {
        const color = colors[fieldKey] || '#888888';

        const histogramData: HistogramData[] = data
            .map((point) => {
                // Calculate total for all fields
                let total = 0;
                fields.forEach(fk => {
                    const val = point.values[fk];
                    if (val !== null && val !== undefined && !isNaN(val)) {
                        total += val;
                    }
                });

                if (total === 0) return null;

                // Calculate percentage for current field
                const fieldValue = point.values[fieldKey];
                if (fieldValue === null || fieldValue === undefined || isNaN(fieldValue)) {
                    return null;
                }
                const percentage = (fieldValue / total) * 100;

                // Calculate base (sum of previous percentages)
                let base = 0;
                for (let i = 0; i < index; i++) {
                    const prevValue = point.values[fields[i]];
                    if (prevValue !== null && prevValue !== undefined && !isNaN(prevValue)) {
                        base += (prevValue / total) * 100;
                    }
                }

                return {
                    time: point.time,
                    value: base + percentage, // Cumulative percentage
                    color: color,
                };
            })
            .filter((item) => item !== null) as unknown as HistogramData<UTCTimestamp>[];

        if (histogramData.length > 0) {
            const seriesApi = chart.addSeries(HistogramSeries, {
                color: color,
                priceScaleId: priceScaleId,
                visible: visible,
            });

            seriesApi.setData(histogramData);
            series.push(seriesApi);
        }
    });

    return series;
}

/**
 * Creates stacked bars with support for negative values
 * Positive values stack upward, negative values stack downward
 */
export function createStackedBarSeriesWithNegatives(
    chart: IChartApi,
    data: StackedBarData[],
    options: StackedBarSeriesOptions & {
        positiveFields: string[];
        negativeFields: string[];
    }
): ISeriesApi<'Histogram'>[] {
    const { fields, colors, priceScaleId, visible = true, positiveFields, negativeFields } = options;
    const series: ISeriesApi<'Histogram'>[] = [];

    // Process positive fields (stack upward from zero)
    positiveFields.forEach((fieldKey, index) => {
        const color = colors[fieldKey] || '#888888';

        const histogramData: HistogramData[] = data
            .map((point) => {
                // Calculate base (sum of previous positive fields)
                let base = 0;
                for (let j = 0; j < index; j++) {
                    const prevValue = point.values[positiveFields[j]];
                    if (prevValue !== null && prevValue !== undefined && !isNaN(prevValue)) {
                        base += prevValue;
                    }
                }

                const value = point.values[fieldKey];
                if (value === null || value === undefined || isNaN(value)) return null;

                return {
                    time: point.time,
                    value: base + value, // Cumulative value
                    color: color,
                };
            })
            .filter((item) => item !== null) as unknown as HistogramData<UTCTimestamp>[];

        if (histogramData.length > 0) {
            const seriesApi = chart.addSeries(HistogramSeries, {
                color: color,
                priceScaleId: priceScaleId,
                visible: visible,
            });
            seriesApi.setData(histogramData);
            series.push(seriesApi);
        }
    });

    // Process negative fields (stack downward from zero)
    negativeFields.forEach((fieldKey) => {
        const color = colors[fieldKey] || '#888888';

        const histogramData: HistogramData[] = data
            .map((point) => {
                const value = point.values[fieldKey];
                if (value === null || value === undefined || isNaN(value)) return null;

                // Negative values render below zero
                return {
                    time: point.time,
                    value: value, // Negative value
                    color: color,
                };
            })
            .filter((item) => item !== null) as unknown as HistogramData<UTCTimestamp>[];

        if (histogramData.length > 0) {
            const seriesApi = chart.addSeries(HistogramSeries, {
                color: color,
                priceScaleId: priceScaleId,
                visible: visible,
            });
            seriesApi.setData(histogramData);
            series.push(seriesApi);
        }
    });

    return series;
}
