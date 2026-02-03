import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';
import { ChartDataPoint } from '@/utils/chartUtils';
import { ImbalanceData, IntradayData, InterconnectionFlow, OcctoAreaData } from '@/types';
import { useChartData } from '../hooks/useChartData';

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

interface PriceChartState {
    // Data
    processedChartData: ProcessedDataPoint[];
    priceRange: { min: number; max: number };
    imbalanceRange: { min: number; max: number };
    occtoRange: { min: number; max: number };
    modelColorMap: Record<string, string>;
    modelMAEs: Record<string, number>;

    // Hover state for crosshair and info panel
    hoveredData: ProcessedDataPoint | null;
    setHoveredData: (data: ProcessedDataPoint | null) => void;
    hoveredX: number | null;
    setHoveredX: (x: number | null) => void;

    // Drag-to-pan state for time axis
    xAxisDomain: [number, number] | ['dataMin', 'dataMax'];
    isDragging: boolean;
    setIsDragging: (val: boolean) => void;
    dragStartX: number | null;
    setDragStartX: (val: number | null) => void;
    handleChartPan: (deltaX: number) => void;
    resetZoom: () => void;

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

    // Hover state for crosshair and info panel
    const [hoveredData, setHoveredData] = useState<ProcessedDataPoint | null>(null);
    const [hoveredX, setHoveredX] = useState<number | null>(null);

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

    // Drag-to-pan state for time axis
    const [xAxisDomain, setXAxisDomain] = useState<[number, number] | ['dataMin', 'dataMax']>(['dataMin', 'dataMax']);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartX, setDragStartX] = useState<number | null>(null);

    // Handle chart panning - deltaX is in pixels, convert to time offset
    const handleChartPan = useCallback((deltaX: number) => {
        if (!processedChartData || processedChartData.length < 2) return;

        // Get current time range
        const dataMinTime = processedChartData[0].timestamp;
        const dataMaxTime = processedChartData[processedChartData.length - 1].timestamp;
        const currentRange = dataMaxTime - dataMinTime;

        // Approximate chart width (pixels) - we use a rough estimate
        const chartWidthPixels = 800;

        // Calculate time offset (deltaX positive = drag right = move earlier)
        const timeOffset = (deltaX / chartWidthPixels) * currentRange;

        setXAxisDomain(prevDomain => {
            let minTime: number, maxTime: number;

            if (typeof prevDomain[0] === 'string' || typeof prevDomain[1] === 'string') {
                minTime = dataMinTime;
                maxTime = dataMaxTime;
            } else {
                minTime = prevDomain[0];
                maxTime = prevDomain[1];
            }

            // Apply offset (dragging right moves domain left, so negate)
            const newMin = minTime - timeOffset;
            const newMax = maxTime - timeOffset;

            // Clamp to data bounds
            if (newMin < dataMinTime) {
                return [dataMinTime, dataMinTime + (maxTime - minTime)];
            }
            if (newMax > dataMaxTime) {
                return [dataMaxTime - (maxTime - minTime), dataMaxTime];
            }

            return [newMin, newMax];
        });
    }, [processedChartData]);

    // Reset zoom to show all data
    const resetZoom = useCallback(() => {
        setXAxisDomain(['dataMin', 'dataMax']);
    }, []);

    const value = useMemo(() => ({
        processedChartData,
        priceRange,
        imbalanceRange,
        occtoRange,
        modelColorMap,
        modelMAEs,
        hoveredData, setHoveredData,
        hoveredX, setHoveredX,
        xAxisDomain, isDragging, setIsDragging, dragStartX, setDragStartX, handleChartPan, resetZoom,
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
        hoveredData, hoveredX,
        xAxisDomain, isDragging, dragStartX, handleChartPan, resetZoom,
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
