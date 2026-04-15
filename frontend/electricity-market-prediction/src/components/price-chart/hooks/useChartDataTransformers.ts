import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { UTCTimestamp } from 'lightweight-charts';
import {
    convertToLineSeriesData,
    convertToCandlestickData,
    convertToHistogramData,
} from '@/utils/lightweightChartsHelpers';
import { transformOcctoData } from '../utils/transformers';
import { ProcessedDataPoint } from '@/utils/lightweightChartsHelpers';
import { INTERCONNECTION_FIELDS, BATTERY_FIELDS, BID_PLAN_SPOT_FIELDS, BID_PLAN_INTRADAY_FIELDS, TDGC_FIELDS, TDGC_CATEGORIES } from '../constants';

export interface InterconnectionSeriesItem {
    fieldKey: string;
    data: { time: UTCTimestamp; value: number }[];
    label: string;
    color: string;
    seriesType?: 'line' | 'histogram';
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
    selectedTdgcFields: Set<string>;
    selectedTdgcCategories: Set<string>;
    selectedBidPlanFields: Set<string>;
    selectedBidPlanCategories: Set<string>;
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
    selectedTdgcFields,
    selectedTdgcCategories,
    selectedBidPlanFields,
    selectedBidPlanCategories,
    showOcctoArea,
    selectedOcctoFields,
    showActualPrice,
}: UseChartDataTransformersParams) => {

    const { t } = useTranslation('forecast');

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
        showImbalanceQuantity ? convertToHistogramData(processedChartData, p => p.imbalance ?? null, 0, timezone) : [],
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
                out.push({ fieldKey: f.key, data, label: t(f.labelKey), color: f.color });
            }
        });
        return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [processedChartData, selectedInterconnectionFields, timezone, t]);

    const batterySeries = useMemo((): InterconnectionSeriesItem[] => {
        const out: InterconnectionSeriesItem[] = [];
        BATTERY_FIELDS.forEach(f => {
            if (!selectedBatteryFields.has(f.key)) return;
            const data = convertToLineSeriesData(processedChartData, p => (p as any)[f.pointKey] ?? null, timezone);
            if (data.length > 0) {
                out.push({ fieldKey: f.key, data, label: t(f.labelKey), color: f.color });
            }
        });
        return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [processedChartData, selectedBatteryFields, timezone, t]);

    const tdgcSeries = useMemo((): InterconnectionSeriesItem[] => {
        const out: InterconnectionSeriesItem[] = [];
        // Iterate selected categories × selected fields (like bid plan pattern)
        selectedTdgcCategories.forEach(category => {
            const catCfg = TDGC_CATEGORIES[category];
            const catLabel = catCfg ? t(catCfg.labelKey) : category;
            const catColor = catCfg?.color ?? '#999';

            TDGC_FIELDS.forEach(f => {
                if (!selectedTdgcFields.has(f.key)) return;
                // pointKey in ProcessedDataPoint: tdgc_{category}_{shortKey}
                const shortKey = f.pointKey.replace('tdgc_', '');
                const dynamicPointKey = `tdgc_${category}_${shortKey}`;
                const isQty = f.type === 'quantity';
                const data = isQty
                    ? convertToHistogramData(processedChartData, p => (p as any)[dynamicPointKey] ?? null, 0, timezone)
                    : convertToLineSeriesData(processedChartData, p => (p as any)[dynamicPointKey] ?? null, timezone);
                if (data.length > 0) {
                    out.push({
                        fieldKey: `${category}_${f.key}`,
                        data,
                        label: `${catLabel} ${t(f.labelKey)}`,
                        color: catColor,
                        seriesType: isQty ? 'histogram' : 'line',
                    });
                }
            });
        });
        return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [processedChartData, selectedTdgcFields, selectedTdgcCategories, timezone, t]);

    const occtoData = useMemo(() =>
        transformOcctoData(processedChartData, showOcctoArea, selectedOcctoFields, timezone),
        [processedChartData, showOcctoArea, selectedOcctoFields, timezone]);

    const bidPlanSeries = useMemo((): InterconnectionSeriesItem[] => {
        const out: InterconnectionSeriesItem[] = [];

        // 根据选中的 category 生成不同的 series
        if (selectedBidPlanCategories.has('spot')) {
            BID_PLAN_SPOT_FIELDS.forEach(f => {
                // f.key 是 'bid_buy_price' 等，需要去掉 'bid_' 前缀来匹配 selectedBidPlanFields
                const fieldKeyWithoutPrefix = f.key.replace('bid_', '');
                if (!selectedBidPlanFields.has(fieldKeyWithoutPrefix)) return;

                const isVolume = f.key.includes('volume');
                const isSell = f.key.includes('sell'); // Works for both sell_volume and sell_price
                const data = isVolume
                    ? convertToHistogramData(processedChartData, p => {
                        const val = (p as any)[f.pointKey];
                        if (val == null) return null;
                        return isSell ? -Math.abs(val) : val;
                    }, 0, timezone)
                    : convertToLineSeriesData(processedChartData, p => {
                        const val = (p as any)[f.pointKey];
                        if (val == null) return null;
                        return isSell ? -Math.abs(val) : val;
                    }, timezone);

                if (data.length > 0) {
                    out.push({ fieldKey: `spot_${fieldKeyWithoutPrefix}`, data, label: t(f.labelPrefix) + t(f.labelKey), color: f.color });
                }
            });
        }

        if (selectedBidPlanCategories.has('intraday')) {
            BID_PLAN_INTRADAY_FIELDS.forEach(f => {
                // f.key 是 'bid_buy_price' 等，需要去掉 'bid_' 前缀来匹配 selectedBidPlanFields
                const fieldKeyWithoutPrefix = f.key.replace('bid_', '');
                if (!selectedBidPlanFields.has(fieldKeyWithoutPrefix)) return;

                const isVolume = f.key.includes('volume');
                const isSell = f.key.includes('sell');
                const data = isVolume
                    ? convertToHistogramData(processedChartData, p => {
                        const val = (p as any)[f.pointKey];
                        if (val == null) return null;
                        return isSell ? -Math.abs(val) : val;
                    }, 0, timezone)
                    : convertToLineSeriesData(processedChartData, p => {
                        const val = (p as any)[f.pointKey];
                        if (val == null) return null;
                        return isSell ? -Math.abs(val) : val;
                    }, timezone);

                if (data.length > 0) {
                    out.push({ fieldKey: `intraday_${fieldKeyWithoutPrefix}`, data, label: t(f.labelPrefix) + t(f.labelKey), color: f.color });
                }
            });
        }

        return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [processedChartData, selectedBidPlanFields, selectedBidPlanCategories, timezone, t]);

    return useMemo(() => ({
        candleData,
        intradayAvgData,
        actualData,
        imbalanceData,
        imbalanceSurplusData,
        imbalanceDeficitData,
        interconnectionSeries,
        batterySeries,
        tdgcSeries,
        bidPlanSeries,
        occtoData,
    }), [
        candleData,
        intradayAvgData,
        actualData,
        imbalanceData,
        imbalanceSurplusData,
        imbalanceDeficitData,
        interconnectionSeries,
        batterySeries,
        tdgcSeries,
        bidPlanSeries,
        occtoData,
    ]);
};
