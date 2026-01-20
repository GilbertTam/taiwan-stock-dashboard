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
  intraday_opening?: number | null;
  intraday_closing?: number | null;
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
  // Markers
  markerInfo?: {
    actualType?: 'top' | 'bottom';
    models: Record<string, 'top' | 'bottom'>;
  } | null;
  uniqueKey?: string;
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

export const generateColor = (hash: number): string => {
  // Modify to avoid red/pink hues (approx 340-360 and 0-20) which are close to "Actual Price"
  // We'll map the hash to a hue between 30 and 330
  const hue = (hash % 300) + 30; // 30 to 330
  return `hsl(${hue}, 70%, 50%)`;
};

/**
 * Robustly parses a date string into a Unix timestamp.
 * Supports:
 * - ISO string: "2025-04-05T22:30:00"
 * - Space separated: "2025-04-05 22:30"
 * - Compact YYYYMMDD: "20250405" (assumes 00:00)
 * - Compact YYYYMMDDHHmm: "202504052230"
 */
export const parseToTimestamp = (dateStr: string | null | undefined): number | null => {
  if (!dateStr) return null;

  try {
    let isoStr = dateStr;

    // 1. Handle "20231027" or "202310271000" (Compact format)
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
    }
    // 2. Handle "2023-10-27 10:00" (Space separated)
    else if (dateStr.includes(' ')) {
      isoStr = dateStr.replace(' ', 'T');
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