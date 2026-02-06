import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { ChartDataPoint } from '@/utils/chartUtils';
import { ImbalanceData, IntradayData, InterconnectionFlow, OcctoAreaData } from '@/types';
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
    showIntraday: boolean;
    setShowIntraday: (val: boolean) => void;
    showIntradayAverage?: boolean;
    setShowIntradayAverage?: (val: boolean) => void;
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
    hasWeatherData: boolean;
    areaName: string;
    selectedModels: any[];
    colors: any;
    darkMode: boolean;
    timezone: string;
    setTimezone: (val: string) => void;
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
    weatherActual = [], // Destructure weatherActual
    weatherForecast = [], // Destructure weatherForecast
    darkMode,
    colors
}) => {
    // Get shared data layer toggles from MarketDataContext
    const {
        showImbalance, setShowImbalance,
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


    // Hover state for info panel
    const [hoveredData, setHoveredData] = useState<ProcessedDataPoint | null>(null);

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
        hasWeatherData: weatherActual && weatherActual.length > 0,
        areaName,
        selectedModels,
        colors,
        darkMode,
        timezone,
        setTimezone
    }), [
        processedChartData, priceRange, imbalanceRange, occtoRange, modelColorMap, modelMAEs,
        hoveredData,
        showPredictionRange, showImbalance, showIntraday, showInterconnection, showOcctoArea, showWeather, showWeatherActual, showWeatherForecast, showZScore,
        chartType, occtoChartType, selectedOcctoField, selectedOcctoFields, selectedWeatherFields, selectedWeatherFieldsActual, selectedWeatherFieldsForecast, adjacentPointsCount, showSettings,
        imbalanceData, intradayData, interconnectionData, occtoAreaData, weatherActual,
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
