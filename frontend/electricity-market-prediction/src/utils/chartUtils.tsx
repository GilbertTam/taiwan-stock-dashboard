import { AreaPrice, PricePrediction } from '@/types';
import { startOfDay, parseISO, format, isValid } from 'date-fns';

export interface ChartDataPoint {
  dateTime: string;       // YYYY-MM-DD HH:mm
  timestamp: number;      // Unix timestamp (ms)
  actualPrice: number | null;
  modelPredictions: {
    modelId: string | number;
    modelName: string;
    predictedPrice: number;
    predictedPrice5?: number; // P5
    predictedPrice95?: number; // P95
  }[];
  isPrediction?: boolean;
  actualDelta?: number | null;
  modelDifferences?: { [key: string]: number | null };
  modelAreaTops?: { [key: string]: number | null };
  modelAreaBottoms?: { [key: string]: number | null };
  // Intraday
  intraday_average?: number | null;
  intraday_open?: number | null;
  intraday_close?: number | null;
  intraday_high?: number | null;
  intraday_low?: number | null;
  intraday_bar_trigger?: number | null;
  candlestickPayload?: {
    high: number;
    low: number;
    open: number;
    close: number;
  } | null;
  // Imbalance
  imbalance?: number | null;
  // Interconnection
  interconnection_flow_diff?: number | null;
  interconnection_forward?: number | null;
  interconnection_reverse?: number | null;
  // Occto
  occto_data?: any | null;
  occto_value?: number | null;
  occto_values?: Record<string, number | null>;
  // Z-Score
  zScore?: number | null;
  // Model Z-Scores
  modelZScores?: Record<string, number | null>;
  // Markers
  markerInfo?: {
    actualType?: 'top' | 'bottom';
    models: Record<string, 'top' | 'bottom'>;
  } | null;
  uniqueKey?: string;
  // Weather data
  weather_data?: {
    temperature?: number | null;
    rainfall?: number | null;
    snowfall?: number | null;
    wind_speed?: number | null;
    relative_humidity?: number | null;
    clouds_all?: number | null;
  };
  weather_data_actual?: {
    temperature?: number | null;
    rainfall?: number | null;
    snowfall?: number | null;
    wind_speed?: number | null;
    relative_humidity?: number | null;
    clouds_all?: number | null;
  };
  weather_data_forecast?: {
    temperature?: number | null;
    rainfall?: number | null;
    snowfall?: number | null;
    wind_speed?: number | null;
    relative_humidity?: number | null;
    clouds_all?: number | null;
  };
  // Legacy fields (optional but kept for compatibility during refactor)
  date?: string;
  time?: string;
}

export interface ModelPrediction {
  modelId: string | number;
  modelName: string;
  predictedPrice: number;
  predictedPrice5?: number;
  predictedPrice95?: number;
}

// 產生隨機顏色 (基於字串雜湊，確保同一字串總是產生相同顏色)
export const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
};

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

// Helper function to calculate color distance in RGB space
function colorDistance(color1: string, color2: string): number {
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

// Optimized color assignment to maximize distance between selected colors
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

/**
 * Robustly parses a date string into a Unix timestamp.
 * Supports:
 * - ISO string: "2025-04-05T22:30:00" or with offset "2025-04-05T22:30:00+09:00"
 * - Space separated: "2025-04-05 22:30" (interpreted as JST for Japanese market data)
 * - Compact YYYYMMDD: "20250405" (assumes 00:00 JST)
 * - Compact YYYYMMDDHHmm: "202504052230" (JST)
 * When the string has no timezone (no Z, +, -), it is treated as JST (Asia/Tokyo) so chart data matches API.
 */
export const parseToTimestamp = (dateStr: string | null | undefined): number | null => {
  if (!dateStr) return null;

  try {
    let isoStr = dateStr;
    let needsJst = false;

    // 1. Handle "20231027" or "202310271000" (Compact format) — JST
    if (/^\d{8,}$/.test(dateStr)) {
      const y = dateStr.substring(0, 4);
      const m = dateStr.substring(4, 6);
      const d = dateStr.substring(6, 8);
      let rest = dateStr.substring(8);

      let H = '00';
      let M = '00';

      if (rest.length >= 4) { // HHmm
        H = rest.substring(0, 2);
        M = rest.substring(2, 4);
      } else if (rest.length >= 2) { // HH
        H = rest.substring(0, 2);
      }

      isoStr = `${y}-${m}-${d}T${H}:${M}:00`;
      needsJst = true;
    }
    // 2. Handle "2023-10-27 10:00" (Space separated) — JST
    else if (dateStr.includes(' ')) {
      isoStr = dateStr.replace(' ', 'T');
      needsJst = true;
    }
    // 3. ISO without timezone (e.g. "2025-04-05T22:30:00") — treat as JST for consistency
    else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dateStr) && !/[Z+-]\d{2}:?\d{2}$/.test(dateStr)) {
      needsJst = true;
    }

    if (needsJst && !isoStr.endsWith('Z') && !/[-+]\d{2}:?\d{2}$/.test(isoStr)) {
      if (!/\d{2}:\d{2}:\d{2}/.test(isoStr)) isoStr = isoStr.replace(/(:\d{2})$/, '$1:00');
      isoStr = `${isoStr}+09:00`;
    }

    const date = new Date(isoStr);
    const time = date.getTime();
    return isNaN(time) ? null : time;
  } catch (e) {
    console.warn('[parseToTimestamp] Failed to parse:', dateStr);
    return null;
  }
};

/**
 * Formats a timestamp back to "YYYY-MM-DD HH:mm" for display/key usage
 */
export const formatTimestamp = (timestamp: number): string => {
  return format(new Date(timestamp), 'yyyy-MM-dd HH:mm');
};


export const prepareChartData = (
  actualPrices: AreaPrice[],
  predictionsByModel: { [key: string]: PricePrediction[] }
): ChartDataPoint[] => {
  console.log('[prepareChartData] Starting data preparation...');

  const dataMap = new Map<number, ChartDataPoint>();

  // 1. 處理實際價格
  actualPrices.forEach((price) => {
    const datePart = price.trade_date;
    const timeCode = price.time_code;
    const hour = Math.floor((timeCode - 1) / 2);
    const minute = (timeCode - 1) % 2 === 0 ? '00' : '30';
    const timePart = `${String(hour).padStart(2, '0')}:${minute}`;

    // Helper to ensure date is YYYY-MM-DD
    const normalizeDate = (d: string) => {
      if (/^\d{8}$/.test(d)) {
        return `${d.substring(0, 4)}-${d.substring(4, 6)}-${d.substring(6, 8)}`;
      }
      return d;
    };
    const sDatePart = normalizeDate(datePart);
    const dateTime = `${sDatePart} ${timePart}`;
    const timestamp = parseToTimestamp(dateTime);

    if (timestamp) {
      dataMap.set(timestamp, {
        dateTime: dateTime,
        timestamp: timestamp,
        date: sDatePart,
        time: timePart,
        actualPrice: price.price,
        modelPredictions: [],
        isPrediction: false
      });
    }
  });

  // 2. 處理預測價格
  Object.entries(predictionsByModel).forEach(([modelKey, predictions]) => {
    const [modelIdStr, modelName] = modelKey.split('|');
    const modelId = Number(modelIdStr) || modelIdStr;

    predictions.forEach((prediction) => {
      const datePart = prediction.trade_date;
      const timeCode = prediction.time_code;
      const hour = Math.floor((timeCode - 1) / 2);
      const minute = (timeCode - 1) % 2 === 0 ? '00' : '30';
      const timePart = `${String(hour).padStart(2, '0')}:${minute}`;

      const normalizeDate = (d: string) => {
        if (/^\d{8}$/.test(d)) {
          return `${d.substring(0, 4)}-${d.substring(4, 6)}-${d.substring(6, 8)}`;
        }
        return d;
      };

      const sDatePart = normalizeDate(datePart);
      const dateTime = `${sDatePart} ${timePart}`;
      const timestamp = parseToTimestamp(dateTime);

      if (timestamp) {
        if (!dataMap.has(timestamp)) {
          dataMap.set(timestamp, {
            dateTime: dateTime,
            timestamp: timestamp,
            date: sDatePart,
            time: timePart,
            actualPrice: null,
            modelPredictions: [],
            isPrediction: true
          });
        }

        const point = dataMap.get(timestamp)!;
        point.modelPredictions.push({
          modelId,
          modelName,
          predictedPrice: prediction.price_50,
          predictedPrice5: prediction.price_5,
          predictedPrice95: prediction.price_95
        });
      }
    });
  });

  // 3. 轉換 Map 為 Array 並排序
  const result = Array.from(dataMap.values()).sort((a, b) => a.timestamp - b.timestamp);

  return result;
};

export function calculateModelMAE(chartData: ChartDataPoint[], modelId: string | number, modelName: string): number {
  const pointsWithBothValues = chartData.filter(point => {
    const modelPrediction = point.modelPredictions.find(
      mp => mp.modelId === modelId && mp.modelName === modelName
    );
    // 確保 actualPrice 和 predictedPrice 都是有效的數值
    return typeof point.actualPrice === 'number' &&
      modelPrediction?.predictedPrice !== null &&
      modelPrediction?.predictedPrice !== undefined;
  });

  if (pointsWithBothValues.length === 0) return 0;

  let validPointsCount = 0;
  const totalError = pointsWithBothValues.reduce((sum, point) => {
    const modelPrediction = point.modelPredictions.find(
      mp => mp.modelId === modelId && mp.modelName === modelName
    );

    if (!modelPrediction || typeof modelPrediction.predictedPrice !== 'number') return sum;

    validPointsCount++;
    return sum + Math.abs(point.actualPrice as number - modelPrediction.predictedPrice);
  }, 0);

  return validPointsCount > 0 ? totalError / validPointsCount : 0;
}

// Helper to safely format time in target timezone (Standard Intl API)
export const formatInTimezone = (timestamp: number, timezone: string, options?: Intl.DateTimeFormatOptions) => {
  const date = new Date(timestamp > 1e12 ? timestamp : timestamp * 1000);
  // Ensure valid timezone or fallback to Tokyo
  let effectiveTz = timezone;
  if (!effectiveTz || effectiveTz === 'undefined') effectiveTz = 'Asia/Tokyo';

  // Default options for charts
  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  };

  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: effectiveTz,
      ...(options || defaultOptions)
    }).format(date);
  } catch (e) {
    console.warn(`Timezone '${effectiveTz}' invalid. Fallback to Tokyo.`);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Tokyo',
      ...(options || defaultOptions)
    }).format(date);
  }
};