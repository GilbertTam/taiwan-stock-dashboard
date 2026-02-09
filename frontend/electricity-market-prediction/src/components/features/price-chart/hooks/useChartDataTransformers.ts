import { useMemo } from 'react';
import { UTCTimestamp } from 'lightweight-charts';
import {
    convertToLineSeriesData,
    convertToCandlestickData,
} from '@/utils/lightweightChartsHelpers';
import { transformOcctoData } from '../utils/transformers';
import { ProcessedDataPoint } from '@/utils/lightweightChartsHelpers';
import { INTERCONNECTION_FIELDS, BATTERY_FIELDS } from '../constants';

export interface InterconnectionSeriesItem {
    fieldKey: string;
    data: { time: UTCTimestamp; value: number }[];
    label: string;
    color: string;
}

interface UseChartDataTransformersParams {
    processedChartData: ProcessedDataPoint[];
    timezone: string;
    showIntraday: boolean;
    showIntradayAverage: boolean;
    showImbalance: boolean;
    showImbalanceQuantity: boolean;
    showImbalanceSurplusRate: boolean;
    showImbalanceDeficitRate: boolean;
    selectedInterconnectionFields: Set<string>;
    selectedBatteryFields: Set<string>;
    showOcctoArea: boolean;
    selectedOcctoFields: Set<string>;
    showActualPrice: boolean;
}

export const useChartDataTransformers = ({
    processedChartData,
    timezone,
    showIntraday,
    showIntradayAverage,
    showImbalance,
    showImbalanceQuantity,
    showImbalanceSurplusRate,
    showImbalanceDeficitRate,
    selectedInterconnectionFields,
    selectedBatteryFields,
    showOcctoArea,
    selectedOcctoFields,
    showActualPrice,
}: UseChartDataTransformersParams) => {

    const candleData = useMemo(() =>
        showIntraday ? convertToCandlestickData(processedChartData, timezone) : [],
        [processedChartData, showIntraday, timezone]);

    const intradayAvgData = useMemo(() =>
        showIntradayAverage ? convertToLineSeriesData(processedChartData, p => p.intraday_average ?? null, timezone) : [],
        [processedChartData, showIntradayAverage, timezone]);

    const actualData = useMemo(() =>
        convertToLineSeriesData(processedChartData, p => p.actualPrice, timezone),
        [processedChartData, timezone]);

    const imbalanceData = useMemo(() =>
        showImbalanceQuantity ? convertToLineSeriesData(processedChartData, p => p.imbalance ?? null, timezone) : [],
        [processedChartData, showImbalanceQuantity, timezone]);

    const imbalanceSurplusData = useMemo(() =>
        showImbalanceSurplusRate ? convertToLineSeriesData(processedChartData, p => p.imbalance_surplus_rate ?? null, timezone) : [],
        [processedChartData, showImbalanceSurplusRate, timezone]);

    const imbalanceDeficitData = useMemo(() =>
        showImbalanceDeficitRate ? convertToLineSeriesData(processedChartData, p => p.imbalance_deficit_rate ?? null, timezone) : [],
        [processedChartData, showImbalanceDeficitRate, timezone]);

    const interconnectionSeries = useMemo((): InterconnectionSeriesItem[] => {
        const out: InterconnectionSeriesItem[] = [];
        INTERCONNECTION_FIELDS.forEach(f => {
            if (!selectedInterconnectionFields.has(f.key)) return;
            const data = convertToLineSeriesData(processedChartData, p => (p as any)[f.pointKey] ?? null, timezone);
            if (data.length > 0) {
                out.push({ fieldKey: f.key, data, label: f.label, color: f.color });
            }
        });
        return out;
    }, [processedChartData, selectedInterconnectionFields, timezone]);

    const batterySeries = useMemo((): InterconnectionSeriesItem[] => {
        const out: InterconnectionSeriesItem[] = [];
        BATTERY_FIELDS.forEach(f => {
            if (!selectedBatteryFields.has(f.key)) return;
            const data = convertToLineSeriesData(processedChartData, p => (p as any)[f.pointKey] ?? null, timezone);
            if (data.length > 0) {
                out.push({ fieldKey: f.key, data, label: f.label, color: f.color });
            }
        });
        return out;
    }, [processedChartData, selectedBatteryFields, timezone]);

    const occtoData = useMemo(() =>
        transformOcctoData(processedChartData, showOcctoArea, selectedOcctoFields, timezone),
        [processedChartData, showOcctoArea, selectedOcctoFields, timezone]);

    return {
        candleData,
        intradayAvgData,
        actualData,
        imbalanceData,
        imbalanceSurplusData,
        imbalanceDeficitData,
        interconnectionSeries,
        batterySeries,
        occtoData,
    };
};
