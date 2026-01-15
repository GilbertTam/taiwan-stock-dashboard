import { AreaPrice, PricePrediction } from '@/types';

export interface ModelPrediction {
  modelId: string | number;
  modelName: string;
  predictedPrice: number | null;
  predictedPrice5: number | null;
  predictedPrice95: number | null;
}

export interface ChartDataPoint {
  dateTime: string;
  date: string;
  time: number;
  timeStr: string;
  actualPrice: number | null;
  modelPredictions: ModelPrediction[];
  isPrediction: boolean;
}


export const prepareChartData = (
  actualPrices: AreaPrice[],
  predictionsByModel: { [key: string]: PricePrediction[] }
): ChartDataPoint[] => {
  const chartData: ChartDataPoint[] = [];
  const allDates = new Set<string>();

  // 收集所有日期
  actualPrices.forEach(price => {
    allDates.add(price.trade_date);
  });

  Object.values(predictionsByModel).forEach(predictions => {
    predictions.forEach(pred => {
      allDates.add(pred.trade_date);
    });
  });

  // 為每個日期和時段創建數據點
  const sortedDates = Array.from(allDates).sort();

  sortedDates.forEach(date => {
    for (let timeCode = 1; timeCode <= 48; timeCode++) {
      const hour = Math.floor((timeCode - 1) / 2);
      const minute = (timeCode - 1) % 2 === 0 ? '00' : '30';
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute}`;
      const dateTime = `${date} ${timeStr}`;

      // 查找實際價格
      const actualPrice = actualPrices.find(
        p => p.trade_date === date && p.time_code === timeCode
      );

      // 收集所有模型的預測
      const modelPredictions: ModelPrediction[] = [];

      Object.entries(predictionsByModel).forEach(([modelKey, predictions]) => {
        const [modelId, modelName] = modelKey.split('|');

        const prediction = predictions.find(
          p => p.trade_date === date && p.time_code === timeCode
        );

        if (prediction) {
          // 確保所有價格值都是有效數字
          const price50 = parseFloat(prediction.price_50?.toString() || '0');
          const price5 = parseFloat(prediction.price_5?.toString() || '0');
          const price95 = parseFloat(prediction.price_95?.toString() || '0');

          modelPredictions.push({
            modelId: isNaN(Number(modelId)) ? modelId : parseInt(modelId),
            modelName,
            predictedPrice: isNaN(price50) ? null : price50,
            predictedPrice5: isNaN(price5) ? null : price5,
            predictedPrice95: isNaN(price95) ? null : price95
          });

        }
      });

      chartData.push({
        dateTime,
        date,
        time: timeCode,
        timeStr,
        actualPrice: actualPrice ? parseFloat(actualPrice.price.toString()) : null,
        modelPredictions,
        isPrediction: !actualPrice && modelPredictions.length > 0
      });
    }
  });

  return chartData.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time - b.time;
  });
};


// 改進的雜湊函數
export const hashString = (str: string) => {
  // 使用 FNV-1a 雜湊算法
  let hash = 2166136261; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash);
};

// 生成 HSL 顏色轉 RGB
export const generateColor = (hash: number) => {
  // 使用 Golden Angle (約 137.5 度) 來最大化顏色差異
  // 我們利用 hash 作為種子，但為了讓相似的字串產生差異較大的顏色，我們先對 hash 做一些擾動
  const hue = (hash * 137.508) % 360;

  // 飽和度在 65-90% 之間變化，保持鮮豔
  const saturation = 65 + (hash % 25);

  // 亮度在 45-65% 之間變化，避免過暗或過亮 (確保在深/淺色模式都能看清)
  const lightness = 45 + ((hash >> 8) % 20);

  // HSL to RGB conversion
  const h = hue / 360;
  const s = saturation / 100;
  const l = lightness / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const to255 = (min: number) => Math.round(min * 255);

  return `rgb(${to255(r)}, ${to255(g)}, ${to255(b)})`;
};