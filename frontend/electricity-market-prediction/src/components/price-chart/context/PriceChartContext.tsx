/**
 * 價格圖表狀態管理 Context
 * State management context for the main price chart.
 *
 * 集中管理圖表所需的各項資料（即時價格、預測、氣象、需給等）及 UI 切換狀態。
 * Centralizes chart data (spot prices, predictions, weather, imbalance, etc.) and UI toggle states.
 */
import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect } from 'react';
import { ChartDataPoint } from '@/utils/chartUtils';
import { ImbalanceData, IntradayData, InterconnectionFlow, OcctoAreaData, BatteryData, BidPlanData, TdgcData } from '@/types';
import { useChartData } from '../hooks/useChartData';
import { useMarketDataContext } from '@/context/MarketDataContext';

// Type for processed chart data point
interface ProcessedDataPoint {
    timestamp: number;
    actualPrice: number | null;
    modelPredictions: any[];
    modelDifferences?: Record<string, number | null>;
    actualDelta?: number | null;
    imbalance?: number | null;
    intraday_average?: number | null;
    interconnection_flow_diff?: number | null;
    [key: string]: any;
}
// Data state
interface PriceChartState {
    // Data
    chartData: ChartDataPoint[]; // Added raw data
    processedChartData: ProcessedDataPoint[];
    priceRange: { min: number; max: number };
    imbalanceRange: { min: number; max: number };
    occtoRange: { min: number; max: number };
    modelColorMap: Record<string, string>;
    modelMAEs: Record<string, number>;

    // Hover state for info panel
    hoveredData: ProcessedDataPoint | null;
    setHoveredData: (data: ProcessedDataPoint | null) => void;
    // Removed hoveredX as it was synced with manual drag/hover logic mostly

    // UI Toggles
    showPredictionRange: boolean;
    setShowPredictionRange: (val: boolean) => void;
    showImbalance: boolean;
    setShowImbalance: (val: boolean) => void;
    showImbalanceQuantity: boolean;
    setShowImbalanceQuantity: (val: boolean) => void;
    showImbalanceSurplusRate: boolean;
    setShowImbalanceSurplusRate: (val: boolean) => void;
    showImbalanceDeficitRate: boolean;
    setShowImbalanceDeficitRate: (val: boolean) => void;
    showIntraday: boolean;
    setShowIntraday: (val: boolean) => void;
    showIntradayAverage: boolean;
    setShowIntradayAverage: (val: boolean) => void;
    showInterconnection: boolean;
    setShowInterconnection: (val: boolean) => void;
    showOcctoArea: boolean;
    setShowOcctoArea: (val: boolean) => void;
    showWeather: boolean;
    setShowWeather: (val: boolean) => void;
    showWeatherActual: boolean;
    setShowWeatherActual: (val: boolean) => void;
    showWeatherForecast: boolean;
    setShowWeatherForecast: (val: boolean) => void;
    showZScore: boolean;
    setShowZScore: (val: boolean) => void;

    // Settings
    chartType: 'line' | 'stepLine';
    setChartType: (val: 'line' | 'stepLine') => void;
    occtoChartType: 'stacked' | 'area';
    setOcctoChartType: (val: 'stacked' | 'area') => void;
    selectedOcctoField: string;
    setSelectedOcctoField: (val: string) => void;
    selectedOcctoFields: Set<string>;
    setSelectedOcctoFields: (val: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
    selectedInterconnectionFields: Set<string>;
    setSelectedInterconnectionFields: (val: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
    selectedBatteryFields: Set<string>;
    setSelectedBatteryFields: (val: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
    selectedBidPlanFields: Set<string>;
    setSelectedBidPlanFields: (val: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
    selectedTdgcFields: Set<string>;
    setSelectedTdgcFields: (val: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
    availableTdgcCategories: string[];
    selectedTdgcCategories: Set<string>;
    setSelectedTdgcCategories: (val: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
    selectedTdgcDataTypes: Set<string>;
    setSelectedTdgcDataTypes: (val: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
    availableBidPlanCategories: string[];
    selectedBidPlanCategories: Set<string>;
    setSelectedBidPlanCategories: (val: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
    selectedSiteIds: Set<string>;
    setSelectedSiteIds: (val: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
    availableSiteIds: string[];
    selectedWeatherFields: Set<string>;
    selectedWeatherFieldsActual: Set<string>;
    setSelectedWeatherFieldsActual: (val: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
    selectedWeatherFieldsForecast: Set<string>;
    setSelectedWeatherFieldsForecast: (val: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
    adjacentPointsCount: number;
    setAdjacentPointsCount: (val: number) => void;
    showSettings: boolean;
    setShowSettings: (val: boolean) => void;

    // Metadata
    hasImbalanceData: boolean;
    hasIntradayData: boolean;
    hasInterconnectionData: boolean;
    hasOcctoAreaData: boolean;
    hasBatteryData: boolean;
    hasBidPlansData: boolean;
    hasTdgcData: boolean;
    hasWeatherData: boolean;
    weatherY1Field: string | null;
    setWeatherY1Field: React.Dispatch<React.SetStateAction<string | null>>;
    weatherY2Field: string | null;
    setWeatherY2Field: React.Dispatch<React.SetStateAction<string | null>>;
    weatherAxisAssignment: Record<string, 'Y1' | 'Y2'>;
    setWeatherAxisAssignment: React.Dispatch<React.SetStateAction<Record<string, 'Y1' | 'Y2'>>>;
    weatherAxisScale: Record<string, { min?: number, max?: number }>;
    setWeatherAxisScale: React.Dispatch<React.SetStateAction<Record<string, { min?: number, max?: number }>>>;
    seriesAxisConfig: Record<string, { axis?: 'Y1' | 'Y2', scale?: { min?: number, max?: number } }>;
    setSeriesAxisConfig: React.Dispatch<React.SetStateAction<Record<string, { axis?: 'Y1' | 'Y2', scale?: { min?: number, max?: number } }>>>;
    areaName: string;
    selectedModels: any[];
    colors: any;
    darkMode: boolean;
    timezone: string;
    setTimezone: (val: string) => void;

    // View Options
    showRightAxisLabels: boolean;
    setShowRightAxisLabels: (val: boolean) => void;

    // Global Y-Axis Range Overrides (Dual Y-Axis feature)
    globalPrimaryRange: { min: number; max: number } | null;
    setGlobalPrimaryRange: React.Dispatch<React.SetStateAction<{ min: number; max: number } | null>>;
    globalSecondaryRange: { min: number; max: number } | null;
    setGlobalSecondaryRange: React.Dispatch<React.SetStateAction<{ min: number; max: number } | null>>;

    // Subchart Layout Mode
    subchartLayout: 'split' | 'overlay';
    setSubchartLayout: React.Dispatch<React.SetStateAction<'split' | 'overlay'>>;

    /** When true, info panel hides Obs and price/model row (e.g. weather-only page). */
    hideObsAndPriceRow: boolean;
    startDate?: Date | null;
    endDate?: Date | null;
}

const PriceChartContext = createContext<PriceChartState | undefined>(undefined);

interface PriceChartProviderProps {
    children: ReactNode;
    // Props passed from parent
    chartData: ChartDataPoint[];
    areaName: string;
    selectedModels: {
        id: string | number;
        name: string;
        color: string;
        calculatingDate: string;
    }[];
    topBottomPairs?: number;
    imbalanceData?: ImbalanceData[];
    intradayData?: IntradayData[];
    interconnectionData?: InterconnectionFlow[];
    occtoAreaData?: OcctoAreaData[];
    batteryData?: BatteryData[];
    bidPlansData?: BidPlanData[];
    tdgcData?: TdgcData[];
    weatherActual?: any[];
    weatherForecast?: any[];
    selectedWeatherModelActual?: string | null;
    selectedWeatherModelForecast?: string | null;
    weatherHeightByField?: Record<string, string>;
    showWeatherOverride?: boolean;
    showWeatherActualOverride?: boolean;
    showWeatherForecastOverride?: boolean;
    selectedWeatherFieldsActualOverride?: Set<string>;
    selectedWeatherFieldsForecastOverride?: Set<string>;
    darkMode: boolean;
    colors: any;
    /** When true, info panel does not show Obs / price row (e.g. weather page has no price data). */
    hideObsAndPriceRow?: boolean;
    startDate?: Date | null;
    endDate?: Date | null;
}

const EMPTY_ARRAY: any[] = [];
const EMPTY_OBJ: Record<string, string> = {};

export const PriceChartProvider: React.FC<PriceChartProviderProps> = ({
    children,
    chartData,
    areaName,
    selectedModels,
    topBottomPairs = 4,
    imbalanceData = EMPTY_ARRAY,
    intradayData = EMPTY_ARRAY,
    interconnectionData = EMPTY_ARRAY,
    occtoAreaData = EMPTY_ARRAY,
    batteryData = EMPTY_ARRAY,
    bidPlansData = EMPTY_ARRAY,
    tdgcData = EMPTY_ARRAY,
    weatherActual = EMPTY_ARRAY, // Destructure weatherActual
    weatherForecast = EMPTY_ARRAY, // Destructure weatherForecast
    selectedWeatherModelActual = null,
    selectedWeatherModelForecast = null,
    weatherHeightByField = EMPTY_OBJ,
    showWeatherOverride,
    showWeatherActualOverride,
    showWeatherForecastOverride,
    selectedWeatherFieldsActualOverride,
    selectedWeatherFieldsForecastOverride,
    darkMode,
    colors,
    hideObsAndPriceRow: hideObsAndPriceRowProp = false,
    startDate = null,
    endDate = null
}) => {
    // Get shared data layer toggles from MarketDataContext
    const {
        showImbalance, setShowImbalance,
        showImbalanceQuantity, setShowImbalanceQuantity,
        showImbalanceSurplusRate, setShowImbalanceSurplusRate,
        showImbalanceDeficitRate, setShowImbalanceDeficitRate,
        showIntraday, setShowIntraday,
        showIntradayAverage, setShowIntradayAverage,
        showInterconnection, setShowInterconnection,
        showOcctoArea, setShowOcctoArea,
        showWeather: _showWeather, setShowWeather,
        showWeatherActual: _showWeatherActual, setShowWeatherActual,
        showWeatherForecast: _showWeatherForecast, setShowWeatherForecast,
        // weatherActual, // Removed to use prop instead
    } = useMarketDataContext();

    const showWeather = showWeatherOverride ?? _showWeather;
    const showWeatherActual = showWeatherActualOverride ?? _showWeatherActual;
    const showWeatherForecast = showWeatherForecastOverride ?? _showWeatherForecast;

    // Filter weather data by selected models
    const filteredWeatherActual = useMemo(() => {
        if (!selectedWeatherModelActual) return weatherActual;
        return weatherActual.filter(d => d.model === selectedWeatherModelActual);
    }, [weatherActual, selectedWeatherModelActual]);

    const filteredWeatherForecast = useMemo(() => {
        if (!selectedWeatherModelForecast) return weatherForecast;
        return weatherForecast.filter(d => d.model === selectedWeatherModelForecast);
    }, [weatherForecast, selectedWeatherModelForecast]);

    // Local State for other toggles
    const [showPredictionRange, setShowPredictionRange] = useState(true);
    const [chartType, setChartType] = useState<'line' | 'stepLine'>('stepLine');
    const [adjacentPointsCount, setAdjacentPointsCount] = useState(1);
    const [showSettings, setShowSettings] = useState(false);

    // Timezone - Default to Tokyo (JST)
    const [timezone, setTimezone] = useState('Asia/Tokyo');
    const [selectedOcctoField, setSelectedOcctoField] = useState<string>('area_demand');
    const [selectedOcctoFields, setSelectedOcctoFields] = useState<Set<string>>(new Set(['area_demand']));
    const [selectedInterconnectionFields, setSelectedInterconnectionFields] = useState<Set<string>>(new Set(['flow_diff']));
    const [selectedBatteryFields, setSelectedBatteryFields] = useState<Set<string>>(new Set(['spot_value']));
    const [selectedBidPlanFields, setSelectedBidPlanFields] = useState<Set<string>>(new Set(['buy_price'])); // 存储去掉 'bid_' 前缀的字段名
    const [selectedTdgcFields, setSelectedTdgcFields] = useState<Set<string>>(new Set());
    const [selectedTdgcCategories, setSelectedTdgcCategories] = useState<Set<string>>(new Set(['1000']));
    const [selectedTdgcDataTypes, setSelectedTdgcDataTypes] = useState<Set<string>>(new Set(['prompt']));

    const availableTdgcCategories = useMemo(() => {
        if (!tdgcData || tdgcData.length === 0) return [];
        return Array.from(new Set(tdgcData.map(d => d.commodity_category).filter(Boolean))).sort();
    }, [tdgcData]);
    const [selectedWeatherFieldsActualLocal, setSelectedWeatherFieldsActualLocal] = useState<Set<string>>(new Set(['temperature']));
    const [selectedWeatherFieldsForecastLocal, setSelectedWeatherFieldsForecastLocal] = useState<Set<string>>(new Set(['temperature']));

    const selectedWeatherFieldsActual = selectedWeatherFieldsActualOverride ?? selectedWeatherFieldsActualLocal;
    const selectedWeatherFieldsForecast = selectedWeatherFieldsForecastOverride ?? selectedWeatherFieldsForecastLocal;

    const selectedWeatherFields = useMemo(() => {
        const merged = new Set<string>();
        selectedWeatherFieldsActual.forEach(f => merged.add(f));
        selectedWeatherFieldsForecast.forEach(f => merged.add(f));
        return merged;
    }, [selectedWeatherFieldsActual, selectedWeatherFieldsForecast]);
    const [occtoChartType, setOcctoChartType] = useState<'stacked' | 'area'>('stacked');
    const [showZScore, setShowZScore] = useState(true);
    const [showRightAxisLabels, setShowRightAxisLabels] = useState(true);

    // Y1/Y2 assignments and scales for weather fields
    const [weatherY1Field, setWeatherY1Field] = useState<string | null>(null);
    const [weatherY2Field, setWeatherY2Field] = useState<string | null>(null);
    const [weatherAxisAssignment, setWeatherAxisAssignment] = useState<Record<string, 'Y1' | 'Y2'>>({});
    const [weatherAxisScale, setWeatherAxisScale] = useState<Record<string, { min?: number, max?: number }>>({});
    const [seriesAxisConfig, setSeriesAxisConfig] = useState<Record<string, { axis?: 'Y1' | 'Y2', scale?: { min?: number, max?: number } }>>({});

    // Global Y-Axis Range Overrides
    const [globalPrimaryRange, setGlobalPrimaryRange] = useState<{ min: number; max: number } | null>(null);
    const [globalSecondaryRange, setGlobalSecondaryRange] = useState<{ min: number; max: number } | null>(null);

    const [subchartLayout, setSubchartLayout] = useState<'split' | 'overlay'>('split');

    // Dynamic bid plan category discovery
    const availableBidPlanCategories = useMemo(() => {
        if (!bidPlansData || bidPlansData.length === 0) return [];
        return Array.from(new Set(bidPlansData.map(d => d.commodity_category).filter(Boolean))).sort();
    }, [bidPlansData]);
    // 预设选择现货市场
    const [selectedBidPlanCategories, setSelectedBidPlanCategories] = useState<Set<string>>(new Set(['spot']));

    // Site ID management
    const availableSiteIds = useMemo(() => {
        if (!bidPlansData || bidPlansData.length === 0) return [];
        return Array.from(new Set(bidPlansData.map(d => d.site_id).filter(Boolean))).sort() as string[];
    }, [bidPlansData]);
    const [selectedSiteIds, setSelectedSiteIds] = useState<Set<string>>(new Set());

    // 当有新的 availableSiteIds 时，如果当前没有选中任何 site，自动选中第一个
    useEffect(() => {
        if (availableSiteIds.length > 0 && selectedSiteIds.size === 0) {
            setSelectedSiteIds(new Set([availableSiteIds[0]]));
        }
    }, [availableSiteIds, selectedSiteIds]);

    // 當 TDGC fields 已啟用但 category 為空時，自動選取第一個可用 category
    useEffect(() => {
        if (availableTdgcCategories.length > 0 && selectedTdgcCategories.size === 0 && selectedTdgcFields.size > 0) {
            setSelectedTdgcCategories(new Set([availableTdgcCategories[0]]));
        }
    }, [availableTdgcCategories, selectedTdgcCategories, selectedTdgcFields]);


    // Hover state for info panel
    const [hoveredData, setHoveredData] = useState<ProcessedDataPoint | null>(null);

    // Filter bid plans by selected site IDs
    const filteredBidPlansData = useMemo(() => {
        if (selectedSiteIds.size === 0) return bidPlansData;
        return bidPlansData.filter(item => item.site_id && selectedSiteIds.has(item.site_id));
    }, [bidPlansData, selectedSiteIds]);

    // Use existing hook for now (will refactor later)
    const {
        modelColorMap,
        modelMAEs,
        processedChartData,
        priceRange,
        imbalanceRange,
        occtoRange
    } = useChartData({
        chartData,
        imbalanceData,
        intradayData,
        interconnectionData,
        occtoAreaData,
        batteryData,
        bidPlansData: filteredBidPlansData,
        selectedBidPlanCategories,
        tdgcData,
        selectedTdgcCategories,
        weatherActual: filteredWeatherActual,
        weatherForecast: filteredWeatherForecast,
        areaName,
        selectedModels,
        topBottomPairs,
        occtoChartType,
        selectedOcctoField,
        selectedOcctoFields,
        selectedWeatherFields,
        showWeatherActual,
        showWeatherForecast,
        weatherHeightByField,
    });

    const value: PriceChartState = useMemo(() => ({
        // Data
        chartData, // Expose raw data
        processedChartData,
        priceRange,
        imbalanceRange,
        occtoRange,
        modelColorMap,
        modelMAEs,
        hoveredData, setHoveredData,
        showPredictionRange, setShowPredictionRange,
        showImbalance, setShowImbalance,
        showImbalanceQuantity, setShowImbalanceQuantity,
        showImbalanceSurplusRate, setShowImbalanceSurplusRate,
        showImbalanceDeficitRate, setShowImbalanceDeficitRate,
        showIntraday, setShowIntraday,
        showIntradayAverage, setShowIntradayAverage,
        showInterconnection, setShowInterconnection,
        showOcctoArea, setShowOcctoArea,
        showWeather, setShowWeather,
        showWeatherActual, setShowWeatherActual,
        showWeatherForecast, setShowWeatherForecast,
        showZScore, setShowZScore,
        chartType, setChartType,
        occtoChartType, setOcctoChartType,
        selectedOcctoField, setSelectedOcctoField,
        selectedOcctoFields, setSelectedOcctoFields,
        selectedInterconnectionFields, setSelectedInterconnectionFields,
        selectedBatteryFields, setSelectedBatteryFields,
        selectedBidPlanFields, setSelectedBidPlanFields,
        selectedTdgcFields, setSelectedTdgcFields,
        availableTdgcCategories,
        selectedTdgcCategories, setSelectedTdgcCategories,
        selectedTdgcDataTypes, setSelectedTdgcDataTypes,
        availableBidPlanCategories,
        selectedBidPlanCategories, setSelectedBidPlanCategories,
        selectedSiteIds, setSelectedSiteIds,
        availableSiteIds,
        selectedWeatherFields,
        selectedWeatherFieldsActual,
        setSelectedWeatherFieldsActual: setSelectedWeatherFieldsActualLocal,
        selectedWeatherFieldsForecast,
        setSelectedWeatherFieldsForecast: setSelectedWeatherFieldsForecastLocal,
        adjacentPointsCount, setAdjacentPointsCount,
        showSettings, setShowSettings,
        hasImbalanceData: imbalanceData && imbalanceData.length > 0,
        hasIntradayData: intradayData && intradayData.length > 0,
        hasInterconnectionData: interconnectionData && interconnectionData.length > 0,
        hasOcctoAreaData: occtoAreaData && occtoAreaData.length > 0,
        hasBatteryData: batteryData && batteryData.length > 0,
        hasBidPlansData: bidPlansData && bidPlansData.length > 0,
        hasTdgcData: tdgcData && tdgcData.length > 0,
        hasWeatherData: weatherActual && weatherActual.length > 0,
        weatherY1Field, setWeatherY1Field,
        weatherY2Field, setWeatherY2Field,
        weatherAxisAssignment, setWeatherAxisAssignment,
        weatherAxisScale, setWeatherAxisScale,
        seriesAxisConfig, setSeriesAxisConfig,
        areaName,
        selectedModels,
        colors,
        darkMode,
        timezone,
        setTimezone,
        showRightAxisLabels, setShowRightAxisLabels,
        globalPrimaryRange, setGlobalPrimaryRange,
        globalSecondaryRange, setGlobalSecondaryRange,
        subchartLayout, setSubchartLayout,
        hideObsAndPriceRow: hideObsAndPriceRowProp,
        startDate,
        endDate
    }), [
        processedChartData, priceRange, imbalanceRange, occtoRange, modelColorMap, modelMAEs,
        hoveredData,
        showPredictionRange, showImbalance, showIntraday, showInterconnection, showOcctoArea, showWeather, showWeatherActual, showWeatherForecast, showZScore, showRightAxisLabels,
        chartType, occtoChartType, selectedOcctoField, selectedOcctoFields, selectedInterconnectionFields, selectedBatteryFields, selectedBidPlanFields, availableBidPlanCategories, selectedBidPlanCategories, selectedSiteIds, setSelectedSiteIds, availableSiteIds, selectedWeatherFields, selectedWeatherFieldsActual, selectedWeatherFieldsForecast, adjacentPointsCount, showSettings,
        bidPlansData, tdgcData, selectedTdgcFields, availableTdgcCategories, selectedTdgcCategories, selectedTdgcDataTypes,
        imbalanceData, intradayData, interconnectionData, occtoAreaData, batteryData, filteredBidPlansData, weatherActual,
        weatherY1Field, weatherY2Field, weatherAxisScale, seriesAxisConfig,
        globalPrimaryRange, globalSecondaryRange, subchartLayout,
        areaName, selectedModels, colors, darkMode, hideObsAndPriceRowProp, startDate, endDate
    ]);

    return (
        <PriceChartContext.Provider value={value}>
            {children}
        </PriceChartContext.Provider>
    );
};

export const usePriceChart = () => {
    const context = useContext(PriceChartContext);
    if (context === undefined) {
        throw new Error('usePriceChart must be used within a PriceChartProvider');
    }
    return context;
};
