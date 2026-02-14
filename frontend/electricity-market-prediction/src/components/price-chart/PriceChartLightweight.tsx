import React, { useRef, useCallback, useDeferredValue } from 'react';
import { format as formatDate } from 'date-fns';

import { ChartInfoPanel } from './controls/ChartInfoPanel';
import { PriceChartSeriesLegend as ChartLegend } from './PriceChartSeriesLegend';
import { usePriceChart } from './context/PriceChartContext';
import { useMarketDataContext } from '@/context/MarketDataContext';

// Hooks
import { useChartLifecycle } from '@/hooks/useChartLifecycle';
import { useChartDataTransformers } from './hooks/useChartDataTransformers';
import { useChartCrosshair } from './hooks/useChartCrosshair';
import { useChartSeries } from './hooks/useChartSeries';

// Utils
import { handleDownloadCsv, generateChartImage } from './utils/export';

export const PriceChartLightweight: React.FC = () => {
    // 1. Context
    const {
        processedChartData, colors, darkMode, selectedModels, modelColorMap,
        showImbalance, showImbalanceQuantity, showImbalanceSurplusRate, showImbalanceDeficitRate,
        showIntraday, showIntradayAverage,
        showOcctoArea, occtoChartType, selectedOcctoFields,
        selectedInterconnectionFields,
        selectedBatteryFields,
        selectedBidPlanFields,
        selectedBidPlanCategories,
        showWeather, showWeatherActual, showWeatherForecast,
        selectedWeatherFieldsActual, selectedWeatherFieldsForecast,
        hoveredData, setHoveredData, areaName, timezone, setTimezone,
        showRightAxisLabels, setShowRightAxisLabels,
    } = usePriceChart();

    const {
        highlightedModelId, startDate, endDate, showActualPrice,
    } = useMarketDataContext();

    const containerRef = useRef<HTMLDivElement>(null);

    // Defer chart updates for interconnection/battery selection so checkbox stays responsive
    const deferredInterconnectionFields = useDeferredValue(selectedInterconnectionFields);
    const deferredBatteryFields = useDeferredValue(selectedBatteryFields);
    const deferredBidPlanFields = useDeferredValue(selectedBidPlanFields);

    // 2. Data Transformation
    const transformedData = useChartDataTransformers({
        processedChartData,
        timezone,
        showIntraday,
        showIntradayAverage,
        showImbalance,
        showImbalanceQuantity,
        showImbalanceSurplusRate,
        showImbalanceDeficitRate,
        selectedInterconnectionFields: deferredInterconnectionFields,
        selectedBatteryFields: deferredBatteryFields,
        selectedBidPlanFields: deferredBidPlanFields,
        selectedBidPlanCategories,
        showOcctoArea,
        selectedOcctoFields,
        showActualPrice: !!showActualPrice,
    });

    // 3. Lifecycle (Create Chart & Resize)
    const chartRef = useChartLifecycle({
        containerRef,
        colors,
        darkMode,
        timezone,
        showRightAxisLabels,
    });

    // 4. Crosshair Handler
    useChartCrosshair({
        chartRef,
        data: processedChartData,
        setHoveredData,
        timezone,
    });

    // 5. Series Management
    useChartSeries({
        chartRef,
        processedChartData,
        transformedData,
        colors,
        darkMode,
        timezone,
        selectedModels,
        highlightedModelId,
        modelColorMap,
        showImbalance,
        showIntraday,
        showIntradayAverage,
        showOcctoArea,
        occtoChartType,
        showWeather,
        showWeatherActual,
        showWeatherForecast,
        selectedWeatherFieldsActual,
        selectedWeatherFieldsForecast,
        showActualPrice: !!showActualPrice,
        showRightAxisLabels,
        startDate,
        endDate,
    });

    // 6. Handlers
    const handleDownload = useCallback((fileFormat: 'csv' | 'jpg' | 'png') => {
        if (fileFormat === 'csv') {
            handleDownloadCsv(processedChartData);
        } else {
            if (!chartRef.current) return;
            const dataUrl = generateChartImage({
                chart: chartRef.current,
                processedChartData,
                colors,
                darkMode,
                selectedModels,
                modelColorMap,
                showActualPrice: !!showActualPrice,
                showIntraday,
                showIntradayAverage,
                showImbalance,
                selectedInterconnectionFields,
                selectedBatteryFields,
                selectedBidPlanFields,
                showOcctoArea,
                selectedOcctoFields,
                showWeather,
                showWeatherActual,
                showWeatherForecast,
                selectedWeatherFieldsActual,
                selectedWeatherFieldsForecast,
                actualData: transformedData.actualData
            });

            if (dataUrl) {
                const link = document.createElement('a');
                link.download = `chart-${formatDate(new Date(), 'yyyyMMdd-HHmmss')}.${fileFormat}`;
                link.href = dataUrl;
                link.click();
            }
        }
    }, [
        processedChartData, colors, darkMode, selectedModels, modelColorMap,
        showActualPrice, showIntraday, showIntradayAverage, showImbalance,
        showOcctoArea, selectedOcctoFields, selectedInterconnectionFields, selectedBatteryFields, selectedBidPlanFields,
        showWeather, showWeatherActual, showWeatherForecast,
        selectedWeatherFieldsActual, selectedWeatherFieldsForecast, transformedData.actualData
    ]);

    const handleFullscreen = useCallback(() => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) containerRef.current.requestFullscreen().catch(console.error);
        else document.exitFullscreen();
    }, []);

    // 7. Render
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>
            <ChartInfoPanel
                hoveredData={hoveredData}
                selectedModels={selectedModels}
                modelColorMap={modelColorMap}
                colors={colors}
                areaName={areaName}
                showImbalance={showImbalance}
                showIntraday={showIntraday}
                selectedInterconnectionFields={selectedInterconnectionFields}
                selectedBatteryFields={selectedBatteryFields}
                selectedBidPlanFields={selectedBidPlanFields}
                selectedBidPlanCategories={selectedBidPlanCategories}
                showOcctoArea={showOcctoArea}
                showWeather={showWeather}
                showWeatherActual={showWeatherActual}
                showWeatherForecast={showWeatherForecast}
                selectedOcctoFields={selectedOcctoFields}
                selectedWeatherFieldsActual={selectedWeatherFieldsActual}
                selectedWeatherFieldsForecast={selectedWeatherFieldsForecast}
                onDownload={handleDownload}
                onFullscreen={handleFullscreen}
                timezone={timezone}
                setTimezone={setTimezone}
                showRightAxisLabels={showRightAxisLabels}
                onToggleRightAxisLabels={() => setShowRightAxisLabels(!showRightAxisLabels)}
            />
            <div
                ref={containerRef}
                className="price-chart-container"
                style={{ position: 'relative', flex: 1, width: '100%', minHeight: 0 }}
            />
            <ChartLegend />
        </div>
    );
};