import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { ChartDataPoint } from '@/utils/chartUtils';
import { ImbalanceData, IntradayData, InterconnectionFlow, OcctoAreaData } from '@/types';
import { useChartData } from '../hooks/useChartData';

interface PriceChartState {
    // Data
    processedChartData: any[];
    priceRange: { min: number; max: number };
    imbalanceRange: { min: number; max: number };
    occtoRange: { min: number; max: number };
    modelColorMap: Record<string, string>;
    modelMAEs: Record<string, number>;

    // UI Toggles
    showPredictionRange: boolean;
    setShowPredictionRange: (val: boolean) => void;
    showImbalance: boolean;
    setShowImbalance: (val: boolean) => void;
    showIntraday: boolean;
    setShowIntraday: (val: boolean) => void;
    showInterconnection: boolean;
    setShowInterconnection: (val: boolean) => void;
    showOcctoArea: boolean;
    setShowOcctoArea: (val: boolean) => void;
    showZScore: boolean;
    setShowZScore: (val: boolean) => void;

    // Settings
    chartType: 'line' | 'stepLine';
    setChartType: (val: 'line' | 'stepLine') => void;
    occtoChartType: 'line' | 'stacked';
    setOcctoChartType: (val: 'line' | 'stacked') => void;
    selectedOcctoField: string;
    setSelectedOcctoField: (val: string) => void;
    selectedOcctoFields: Set<string>;
    setSelectedOcctoFields: (val: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
    adjacentPointsCount: number;
    setAdjacentPointsCount: (val: number) => void;
    showSettings: boolean;
    setShowSettings: (val: boolean) => void;

    // Metadata
    hasImbalanceData: boolean;
    hasIntradayData: boolean;
    hasInterconnectionData: boolean;
    hasOcctoAreaData: boolean;
    areaName: string;
    selectedModels: any[];
    colors: any;
    darkMode: boolean;
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
    darkMode,
    colors
}) => {
    // Local State for Toggles
    const [showPredictionRange, setShowPredictionRange] = useState(true);
    const [chartType, setChartType] = useState<'line' | 'stepLine'>('stepLine');
    const [adjacentPointsCount, setAdjacentPointsCount] = useState(1);
    const [showSettings, setShowSettings] = useState(false);
    const [showImbalance, setShowImbalance] = useState(false);
    const [showIntraday, setShowIntraday] = useState(false);
    const [showInterconnection, setShowInterconnection] = useState(false);
    const [showOcctoArea, setShowOcctoArea] = useState(false);
    const [selectedOcctoField, setSelectedOcctoField] = useState<string>('area_demand');
    const [selectedOcctoFields, setSelectedOcctoFields] = useState<Set<string>>(new Set(['area_demand']));
    const [occtoChartType, setOcctoChartType] = useState<'line' | 'stacked'>('line');
    const [showZScore, setShowZScore] = useState(false);

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
        areaName,
        selectedModels,
        topBottomPairs,
        occtoChartType,
        selectedOcctoField,
        selectedOcctoFields
    });

    const value = useMemo(() => ({
        processedChartData,
        priceRange,
        imbalanceRange,
        occtoRange,
        modelColorMap,
        modelMAEs,
        showPredictionRange, setShowPredictionRange,
        showImbalance, setShowImbalance,
        showIntraday, setShowIntraday,
        showInterconnection, setShowInterconnection,
        showOcctoArea, setShowOcctoArea,
        showZScore, setShowZScore,
        chartType, setChartType,
        occtoChartType, setOcctoChartType,
        selectedOcctoField, setSelectedOcctoField,
        selectedOcctoFields, setSelectedOcctoFields,
        adjacentPointsCount, setAdjacentPointsCount,
        showSettings, setShowSettings,
        hasImbalanceData: imbalanceData && imbalanceData.length > 0,
        hasIntradayData: intradayData && intradayData.length > 0,
        hasInterconnectionData: interconnectionData && interconnectionData.length > 0,
        hasOcctoAreaData: occtoAreaData && occtoAreaData.length > 0,
        areaName,
        selectedModels,
        colors,
        darkMode
    }), [
        processedChartData, priceRange, imbalanceRange, occtoRange, modelColorMap, modelMAEs,
        showPredictionRange, showImbalance, showIntraday, showInterconnection, showOcctoArea, showZScore,
        chartType, occtoChartType, selectedOcctoField, selectedOcctoFields, adjacentPointsCount, showSettings,
        imbalanceData, intradayData, interconnectionData, occtoAreaData,
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
