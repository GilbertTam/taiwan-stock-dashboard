/**
 * @fileoverview 圖表功能模組統一匯出 | Chart feature barrel export
 *
 * 匯出圖表核心元件：Context Provider、Lightweight 圖表（價格/天氣共用）、
 * 圖例與資訊面板。
 * Exports core chart components: context provider, lightweight chart (price & weather),
 * legend, and info panel.
 */

// Core Components｜核心元件
export { ChartLightweight } from './ChartLightweight';
/** @deprecated Use ChartLightweight. Kept for backward compatibility. */
export { ChartLightweight as PriceChart } from './ChartLightweight';
export { PriceChartSeriesLegend as ChartLegend } from './PriceChartSeriesLegend';

// Context｜上下文
export { PriceChartProvider, usePriceChart } from './context/PriceChartContext';
