import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { UTCTimestamp } from 'lightweight-charts';
import {
    convertToLineSeriesData,
    convertToCandlestickData,
    convertToHistogramData,
    toChartTime,
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
    lineStyle?: number;
    opacity?: number;
    /** TDGC band trio role: 'min'/'max' feed the band plugin; 'ave' is the overlaid line. */
    bandRole?: 'min' | 'max' | 'ave';
    /** Shared key for band members within the same (dataType, category, metric). */
    bandKey?: string;
    /** If set, histogram series sharing this key should stack together. */
    stackingKey?: string;
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
    selectedTdgcDataTypes: Set<string>;
    selectedTdgcGroups: Set<string>;
    tdgcBarStacking: boolean;
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
    selectedTdgcDataTypes,
    selectedTdgcGroups,
    tdgcBarStacking,
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

    // Battery flow (volumes from spot/intraday/primary) — one row per timestamp,
    // each carrying the selected market items for BatteryStackedFlowSeries to render.
    const batteryFlowData = useMemo(() => {
        const volumeFields = BATTERY_FIELDS.filter(f => f.isVolume && selectedBatteryFields.has(f.key));
        if (volumeFields.length === 0) return [] as { time: UTCTimestamp; items: { value: number; color: string; marketKey: string }[] }[];
        const out: { time: UTCTimestamp; items: { value: number; color: string; marketKey: string }[] }[] = [];
        processedChartData.forEach(p => {
            const items: { value: number; color: string; marketKey: string }[] = [];
            volumeFields.forEach(f => {
                const v = (p as any)[f.pointKey];
                if (v != null && v !== 0) items.push({ value: v, color: f.color, marketKey: f.key });
            });
            if (items.length > 0) {
                out.push({ time: toChartTime(p.timestamp, timezone) as UTCTimestamp, items });
            }
        });
        return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [processedChartData, selectedBatteryFields, timezone]);

    // Battery SoC lines — kept separately so they get their own priceScaleId.
    const batterySocSeries = useMemo((): { fieldKey: string; data: any[]; color: string; label: string }[] => {
        const out: { fieldKey: string; data: any[]; color: string; label: string }[] = [];
        BATTERY_FIELDS.filter(f => !f.isVolume).forEach(f => {
            if (!selectedBatteryFields.has(f.key)) return;
            const data = convertToLineSeriesData(processedChartData, p => (p as any)[f.pointKey] ?? null, timezone);
            if (data.length > 0) out.push({ fieldKey: f.key, data, color: f.color, label: t(f.labelKey) });
        });
        return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [processedChartData, selectedBatteryFields, timezone, t]);

    const tdgcSeries = useMemo((): InterconnectionSeriesItem[] => {
        const out: InterconnectionSeriesItem[] = [];
        const dataTypes = selectedTdgcDataTypes.size > 0 ? selectedTdgcDataTypes : new Set(['prompt']);
        const groups = selectedTdgcGroups.size > 0 ? selectedTdgcGroups : new Set(['origin']);
        const showDtLabel = dataTypes.size > 1;

        const DATA_TYPE_STYLES: Record<string, { labelKey: string; lineStyle: number; opacity: number }> = {
            'result': { labelKey: 'controlBar.result', lineStyle: 0, opacity: 1 },
            'prompt': { labelKey: 'controlBar.prompt', lineStyle: 2, opacity: 0.6 },
        };

        // Iterate data types × categories × fields, filtering by group + selectedFields.
        // Bar stacking key is per-metric to prevent unrelated metrics from stacking together.
        dataTypes.forEach(dataType => {
            const dtCfg = DATA_TYPE_STYLES[dataType];
            const dtLabel = dtCfg ? t(dtCfg.labelKey) : dataType;

            selectedTdgcCategories.forEach(category => {
                const catCfg = TDGC_CATEGORIES[category];
                const catLabel = catCfg ? t(catCfg.labelKey) : category;
                const catColor = catCfg?.color ?? '#999';

                TDGC_FIELDS.forEach(f => {
                    if (!selectedTdgcFields.has(f.key)) return;
                    if (!groups.has(f.group)) return;

                    // pointKey already includes group token: tdgc_origin_price_ave → shortKey 'origin_price_ave'
                    const shortKey = f.pointKey.replace(/^tdgc_/, '');
                    const dynamicPointKey = `tdgc_${dataType}_${category}_${shortKey}`;
                    const isQty = f.type === 'quantity';
                    const data = isQty
                        ? convertToHistogramData(processedChartData, p => (p as any)[dynamicPointKey] ?? null, 0, timezone)
                        : convertToLineSeriesData(processedChartData, p => (p as any)[dynamicPointKey] ?? null, timezone);
                    if (data.length > 0) {
                        const label = showDtLabel
                            ? `${catLabel} ${t(f.labelKey)} (${dtLabel})`
                            : `${catLabel} ${t(f.labelKey)}`;
                        out.push({
                            fieldKey: `${dataType}_${category}_${f.key}`,
                            data,
                            label,
                            color: catColor,
                            seriesType: isQty ? 'histogram' : 'line',
                            lineStyle: dtCfg?.lineStyle,
                            opacity: dtCfg?.opacity,
                            bandRole: f.bandRole,
                            bandKey: f.bandKey ? `${dataType}_${category}_${f.bandKey}` : undefined,
                            stackingKey: isQty && tdgcBarStacking ? `tdgc_${dataType}_${f.key}` : undefined,
                        });
                    }
                });
            });
        });
        return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [processedChartData, selectedTdgcFields, selectedTdgcCategories, selectedTdgcDataTypes, selectedTdgcGroups, tdgcBarStacking, timezone, t]);

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
        batteryFlowData,
        batterySocSeries,
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
        batteryFlowData,
        batterySocSeries,
        tdgcSeries,
        bidPlanSeries,
        occtoData,
    ]);
};
