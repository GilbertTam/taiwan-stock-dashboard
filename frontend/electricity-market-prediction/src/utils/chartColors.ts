/**
 * Unified Chart Colors System
 * Provides consistent color definitions for all charts across the application
 */

import { useTheme } from '@/app/ThemeProvider';

export interface ChartColors {
  actual: string;
  grid: string;
  background: string;
  text: string;
  subText: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipHeaderBg: string;
  warning: string;
  nowLine: string;
  predicted: string;
  delta: {
    positive: string;
    negative: string;
    neutral: string;
  };
  imbalance: string;
  interconnection: string;
  intraday: string;
  occtoArea: string;
  // Weather chart colors
  tempActual: string;
  tempForecast: string;
  rainActual: string;
  rainForecast: string;
  windActual: string;
  windForecast: string;
  dividerLine: string;
}

/**
 * Hook to get chart colors based on current theme
 */
export const useChartColors = (): ChartColors => {
  const { darkMode } = useTheme();

  return {
    actual: darkMode ? '#ff4d4f' : '#cf1322',
    grid: darkMode ? '#333' : '#e6e6e6',
    background: darkMode ? '#1a1a1a' : '#ffffff',
    text: darkMode ? '#d9d9d9' : '#000000',
    subText: darkMode ? '#a6a6a6' : '#595959',
    tooltipBg: darkMode ? 'rgba(33, 33, 33, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    tooltipBorder: darkMode ? '#444' : '#d9d9d9',
    tooltipHeaderBg: darkMode ? '#2a2a2a' : '#f0f0f0',
    warning: darkMode ? '#faad14' : '#d48806',
    nowLine: darkMode ? '#1890ff' : '#0050b3',
    predicted: darkMode ? '#36cfc9' : '#13a8a8',
    delta: {
      positive: darkMode ? '#52c41a' : '#389e0d',
      negative: darkMode ? '#f5222d' : '#cf1322',
      neutral: darkMode ? '#a6a6a6' : '#8c8c8c',
    },
    imbalance: darkMode ? '#8884d8' : '#8884d8',
    interconnection: darkMode ? '#ff7300' : '#ff7300',
    intraday: darkMode ? '#82ca9d' : '#82ca9d',
    occtoArea: darkMode ? '#ffc658' : '#ffc658',
    // Weather chart colors
    tempActual: '#ff4d4f',
    tempForecast: '#ff7875',
    rainActual: '#82ca9d',
    rainForecast: '#b7eb8f',
    windActual: '#d46b08',
    windForecast: '#faad14',
    dividerLine: darkMode ? '#ffffff' : '#555555',
  };
};
