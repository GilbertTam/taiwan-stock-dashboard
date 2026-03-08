'use client';

/**
 * ChartLightweight – shared TradingView Lightweight Charts implementation.
 * Used for both price views (forecast, site-revenue) and weather-only views.
 * Data and options are driven by PriceChartProvider; this component is agnostic
 * to the domain and only renders the chart + info panel + legend.
 */

import React, { useRef, useCallback, useDeferredValue } from 'react';
import { format as formatDate } from 'date-fns';

import { ChartInfoPanel } from './controls/ChartInfoPanel';
import { PriceChartSeriesLegend as ChartLegend } from './PriceChartSeriesLegend';
import { usePriceChart } from './context/PriceChartContext';
import { useMarketDataContext } from '@/context/MarketDataContext';

import { useChartLifecycle } from '@/hooks/useChartLifecycle';
import { useChartDataTransformers } from './hooks/useChartDataTransformers';
import { useChartCrosshair } from './hooks/useChartCrosshair';
import { useChartSeries } from './hooks/useChartSeries';
import { useDualYAxis } from './hooks/useDualYAxis';

import { handleDownloadCsv, generateChartImage } from './utils/export';

export const ChartLightweight: React.FC = () => {
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
        seriesAxisConfig, setSeriesAxisConfig,
        globalPrimaryRange, setGlobalPrimaryRange,
        globalSecondaryRange, setGlobalSecondaryRange,
        hoveredData, setHoveredData, areaName, timezone, setTimezone,
        showRightAxisLabels, setShowRightAxisLabels,
        hideObsAndPriceRow,
        subchartLayout, setSubchartLayout,
    } = usePriceChart();

    const {
        highlightedModelId, startDate, endDate, showActualPrice,
    } = useMarketDataContext();

    const containerRef = useRef<HTMLDivElement>(null);

    const deferredInterconnectionFields = useDeferredValue(selectedInterconnectionFields);
    const deferredBatteryFields = useDeferredValue(selectedBatteryFields);
    const deferredBidPlanFields = useDeferredValue(selectedBidPlanFields);

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

    const chartRef = useChartLifecycle({
        containerRef,
        colors,
        darkMode,
        timezone,
        showRightAxisLabels,
    });

    useDualYAxis(chartRef);

    useChartCrosshair({
        chartRef,
        data: processedChartData,
        setHoveredData,
        timezone,
    });

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
        seriesAxisConfig,
        hideObsAndPriceRow,
        startDate,
        endDate,
        subchartLayout,
    });

    const handleDownload = useCallback((fileFormat: 'csv' | 'jpg' | 'png') => {
        if (fileFormat === 'csv') {
            handleDownloadCsv(processedChartData, startDate, endDate);
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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>
            <ChartInfoPanel
                hoveredData={hoveredData}
                selectedModels={selectedModels}
                hideObsAndPriceRow={hideObsAndPriceRow}
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
                subchartLayout={subchartLayout}
                setSubchartLayout={setSubchartLayout}
                seriesAxisConfig={seriesAxisConfig}
                setSeriesAxisConfig={setSeriesAxisConfig}
                globalPrimaryRange={globalPrimaryRange}
                setGlobalPrimaryRange={setGlobalPrimaryRange}
                globalSecondaryRange={globalSecondaryRange}
                setGlobalSecondaryRange={setGlobalSecondaryRange}
                showActualPrice={showActualPrice}
                showIntradayAverage={showIntradayAverage}
                showImbalanceSurplusRate={showImbalanceSurplusRate}
                showImbalanceDeficitRate={showImbalanceDeficitRate}
            />
            <div
                ref={containerRef}
                className="chart-lightweight-container"
                style={{ position: 'relative', flex: 1, width: '100%', minHeight: 0 }}
            />
            <ChartLegend />
        </div>
    );
};
