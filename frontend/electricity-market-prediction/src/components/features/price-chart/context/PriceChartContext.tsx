import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect } from 'react';
import { ChartDataPoint } from '@/utils/chartUtils';
import { ImbalanceData, IntradayData, InterconnectionFlow, OcctoAreaData, BatteryData, BidPlanData } from '@/types';
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
    hasWeatherData: boolean;
    areaName: string;
    selectedModels: any[];
    colors: any;
    darkMode: boolean;
    timezone: string;
    setTimezone: (val: string) => void;

    // View Options
    showRightAxisLabels: boolean;
    setShowRightAxisLabels: (val: boolean) => void;
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
    weatherActual?: any[];
    weatherForecast?: any[];
    darkMode: boolean;
    colors: any;
}

export const PriceChartProvider: React.FC<PriceChartProviderProps> = ({
    children,
    chartData,
    areaName,
    selectedModels,
    topBottomPairs = 4,
    imbalanceData = [],
    intradayData = [],
    interconnectionData = [],
    occtoAreaData = [],
    batteryData = [],
    bidPlansData = [],
    weatherActual = [], // Destructure weatherActual
    weatherForecast = [], // Destructure weatherForecast
    darkMode,
    colors
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
        showWeather, setShowWeather,
        showWeatherActual, setShowWeatherActual,
        showWeatherForecast, setShowWeatherForecast,
        // weatherActual, // Removed to use prop instead
    } = useMarketDataContext();

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
    const [selectedWeatherFieldsActual, setSelectedWeatherFieldsActual] = useState<Set<string>>(new Set(['temperature']));
    const [selectedWeatherFieldsForecast, setSelectedWeatherFieldsForecast] = useState<Set<string>>(new Set(['temperature']));
    const selectedWeatherFields = useMemo(() => {
        const merged = new Set<string>();
        selectedWeatherFieldsActual.forEach(f => merged.add(f));
        selectedWeatherFieldsForecast.forEach(f => merged.add(f));
        return merged;
    }, [selectedWeatherFieldsActual, selectedWeatherFieldsForecast]);
    const [occtoChartType, setOcctoChartType] = useState<'stacked' | 'area'>('stacked');
    const [showZScore, setShowZScore] = useState(true);
    const [showRightAxisLabels, setShowRightAxisLabels] = useState(true);

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
        weatherActual,
        weatherForecast,
        areaName,
        selectedModels,
        topBottomPairs,
        occtoChartType,
        selectedOcctoField,
        selectedOcctoFields,
        selectedWeatherFields,
        showWeatherActual,
        showWeatherForecast
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
        availableBidPlanCategories,
        selectedBidPlanCategories, setSelectedBidPlanCategories,
        selectedSiteIds, setSelectedSiteIds,
        availableSiteIds,
        selectedWeatherFields,
        selectedWeatherFieldsActual,
        setSelectedWeatherFieldsActual,
        selectedWeatherFieldsForecast,
        setSelectedWeatherFieldsForecast,
        adjacentPointsCount, setAdjacentPointsCount,
        showSettings, setShowSettings,
        hasImbalanceData: imbalanceData && imbalanceData.length > 0,
        hasIntradayData: intradayData && intradayData.length > 0,
        hasInterconnectionData: interconnectionData && interconnectionData.length > 0,
        hasOcctoAreaData: occtoAreaData && occtoAreaData.length > 0,
        hasBatteryData: batteryData && batteryData.length > 0,
        hasBidPlansData: bidPlansData && bidPlansData.length > 0,
        hasWeatherData: weatherActual && weatherActual.length > 0,
        areaName,
        selectedModels,
        colors,
        darkMode,
        timezone,
        setTimezone,
        showRightAxisLabels, setShowRightAxisLabels
    }), [
        processedChartData, priceRange, imbalanceRange, occtoRange, modelColorMap, modelMAEs,
        hoveredData,
        showPredictionRange, showImbalance, showIntraday, showInterconnection, showOcctoArea, showWeather, showWeatherActual, showWeatherForecast, showZScore, showRightAxisLabels,
        chartType, occtoChartType, selectedOcctoField, selectedOcctoFields, selectedInterconnectionFields, selectedBatteryFields, selectedBidPlanFields, availableBidPlanCategories, selectedBidPlanCategories, selectedSiteIds, setSelectedSiteIds, availableSiteIds, selectedWeatherFields, selectedWeatherFieldsActual, selectedWeatherFieldsForecast, adjacentPointsCount, showSettings,
        bidPlansData, // 添加 bidPlansData 到依赖
        imbalanceData, intradayData, interconnectionData, occtoAreaData, batteryData, filteredBidPlansData, weatherActual,
        areaName, selectedModels, colors, darkMode
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
