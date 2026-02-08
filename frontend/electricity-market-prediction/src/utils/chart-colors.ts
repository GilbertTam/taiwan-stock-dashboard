/**
 * Unified Chart Colors System
 * Provides consistent color definitions and color generation utilities for all charts across the application
 */

import { useTheme } from '@/app/ThemeProvider';

// ----------------------------------------------------------------------
// Color Palette & Generation Utils
// ----------------------------------------------------------------------

// Optimized color palette with maximum visual distinction
// Colors are selected to maximize perceptual distance in HSL space
const DISTINCT_COLORS = [
    '#FF6B6B', // Red - 高飽和度紅色
    '#4ECDC4', // Teal - 青綠色
    '#45B7D1', // Sky Blue - 天藍色
    '#FFA07A', // Light Salmon - 淺鮭魚色
    '#98D8C8', // Mint - 薄荷綠
    '#F7DC6F', // Gold - 金色
    '#BB8FCE', // Lavender - 薰衣草紫
    '#52BE80', // Emerald - 翠綠色
    '#EC7063', // Salmon - 鮭魚色
    '#5DADE2', // Light Sky Blue - 淺天藍
    '#F8B739', // Amber - 琥珀色
    '#A569BD', // Medium Purple - 中紫色
    '#85C1E2', // Light Blue - 淺藍色
    '#F1948A', // Light Coral - 淺珊瑚色
    '#82E0AA', // Light Green - 淺綠色
    '#F9E79F', // Light Yellow - 淺黃色
    '#AED6F1', // Light Blue 2 - 淺藍色2
    '#A9DFBF', // Light Mint - 淺薄荷色
    '#F5B7B1', // Light Pink - 淺粉色
    '#D7BDE2', // Light Purple - 淺紫色
    '#E74C3C', // Alizarin Red - 茜紅色
    '#3498DB', // Bright Blue - 亮藍色
    '#2ECC71', // Emerald Green - 翠綠色
    '#F39C12', // Orange - 橙色
    '#9B59B6', // Amethyst - 紫水晶色
    '#1ABC9C', // Turquoise - 青綠色
    '#E67E22', // Carrot - 胡蘿蔔色
    '#34495E', // Dark Blue Gray - 深藍灰色
    '#16A085', // Dark Turquoise - 深青綠色
    '#27AE60', // Nephritis Green - 腎綠色
    '#2980B9', // Belize Hole Blue - 貝里斯洞藍
    '#8E44AD', // Wisteria Purple - 紫藤色
    '#C0392B', // Pomegranate Red - 石榴紅
    '#D35400', // Pumpkin Orange - 南瓜橙
    '#7F8C8D'  // Asbestos Gray - 石棉灰
];

/**
 * 產生隨機顏色 (基於字串雜湊，確保同一字串總是產生相同顏色)
 */
export const hashString = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
};

/**
 * Helper function to calculate color distance in RGB space
 */
export function colorDistance(color1: string, color2: string): number {
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');
    const r1 = parseInt(hex1.substr(0, 2), 16);
    const g1 = parseInt(hex1.substr(2, 2), 16);
    const b1 = parseInt(hex1.substr(4, 2), 16);
    const r2 = parseInt(hex2.substr(0, 2), 16);
    const g2 = parseInt(hex2.substr(2, 2), 16);
    const b2 = parseInt(hex2.substr(4, 2), 16);
    return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

/**
 * Optimized color assignment to maximize distance between selected colors
 */
export const generateColor = (hash: number, usedColors: string[] = []): string => {
    // If no used colors, just pick from palette
    if (usedColors.length === 0) {
        const index = Math.abs(hash) % DISTINCT_COLORS.length;
        return DISTINCT_COLORS[index];
    }

    // Find the color that maximizes minimum distance to all used colors
    let bestColor = DISTINCT_COLORS[0];
    let maxMinDistance = 0;

    for (const candidateColor of DISTINCT_COLORS) {
        if (usedColors.includes(candidateColor)) continue;

        const minDistance = Math.min(
            ...usedColors.map(usedColor => colorDistance(candidateColor, usedColor))
        );

        if (minDistance > maxMinDistance) {
            maxMinDistance = minDistance;
            bestColor = candidateColor;
        }
    }

    return bestColor;
};


// ----------------------------------------------------------------------
// Theme-Based Chart Colors Hook
// ----------------------------------------------------------------------

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
