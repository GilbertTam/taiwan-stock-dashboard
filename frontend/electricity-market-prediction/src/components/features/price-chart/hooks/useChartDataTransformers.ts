import { useMemo } from 'react';
import {
    convertToLineSeriesData,
    convertToCandlestickData,
} from '@/utils/lightweightChartsHelpers';
import { transformOcctoData } from '../utils/transformers';
import { ProcessedDataPoint } from '@/utils/lightweightChartsHelpers';

interface UseChartDataTransformersParams {
    processedChartData: ProcessedDataPoint[];
    timezone: string;
    showIntraday: boolean;
    showIntradayAverage: boolean;
    showImbalance: boolean;
    showInterconnection: boolean;
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
    showInterconnection,
    showOcctoArea,
    selectedOcctoFields,
    showActualPrice,
}: UseChartDataTransformersParams) => {

    const candleData = useMemo(() =>
        showIntraday ? convertToCandlestickData(processedChartData, timezone) : [],
        [processedChartData, showIntraday, timezone]);

    const intradayAvgData = useMemo(() =>
        (showIntraday && showIntradayAverage) ? convertToLineSeriesData(processedChartData, p => p.intraday_average ?? null, timezone) : [],
        [processedChartData, showIntraday, showIntradayAverage, timezone]);

    const actualData = useMemo(() =>
        convertToLineSeriesData(processedChartData, p => p.actualPrice, timezone),
        [processedChartData, timezone]);

    const imbalanceData = useMemo(() =>
        showImbalance ? convertToLineSeriesData(processedChartData, p => p.imbalance ?? null, timezone) : [],
        [processedChartData, showImbalance, timezone]);

    const interconnectionData = useMemo(() =>
        showInterconnection ? convertToLineSeriesData(processedChartData, p => p.interconnection_flow_diff ?? null, timezone) : [],
        [processedChartData, showInterconnection, timezone]);

    const occtoData = useMemo(() =>
        transformOcctoData(processedChartData, showOcctoArea, selectedOcctoFields, timezone),
        [processedChartData, showOcctoArea, selectedOcctoFields, timezone]);

    return {
        candleData,
        intradayAvgData,
        actualData,
        imbalanceData,
        interconnectionData,
        occtoData,
    };
};
