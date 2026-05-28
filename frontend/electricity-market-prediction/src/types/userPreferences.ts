export interface ForecastChartPreferences {
    showTopBottomLabels?: boolean;
    topBottomPairs?: number;
    showRightAxisLabels?: boolean;
    seriesLineTypes?: Record<string, 'line' | 'steps'>;
}
