import { AreaPrice, PricePrediction } from '@/types';

export interface ModelPrediction {
  modelId: number;
  modelName: string;
  modelVersion: string;
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
        const [modelId, modelName, modelVersion] = modelKey.split('|');
        
        const prediction = predictions.find(
          p => p.trade_date === date && p.time_code === timeCode
        );
        
        if (prediction) {
          // 確保所有價格值都是有效數字
          const price50 = parseFloat(prediction.price_50?.toString() || '0');
          const price5 = parseFloat(prediction.price_5?.toString() || '0');
          const price95 = parseFloat(prediction.price_95?.toString() || '0');
          
          modelPredictions.push({
            modelId: parseInt(modelId),
            modelName,
            modelVersion,
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

// 生成 RGB 顏色
export const generateColor = (hash: number) => {
  // 預定義對比度較大的基礎顏色組合
  const baseColors = [
    [255, 202, 58],   // 明黃
    [138, 201, 38],   // 鮮綠
    [25, 130, 196],   // 深藍
    [106, 76, 147],   // 深紫
    [255, 121, 0],    // 橙色
    [0, 168, 150],    // 青綠
    [87, 117, 144],   // 灰藍
    [47, 201, 226],   // 天藍
    [147, 90, 183],   // 淺紫
    [0, 150, 136],    // 碧綠
    [33, 150, 243],   // 亮藍
    [121, 85, 72],    // 深棕
    [0, 188, 212],    // 湖藍
    [76, 175, 80],    // 草綠
    [255, 152, 0]     // 琥珀色
  ];
  // 使用雜湊值的不同部分來增加變化
  const primaryIndex = hash % baseColors.length;
  const secondaryIndex = (hash >> 16) % baseColors.length;
  
  // 確保 secondaryIndex 與 primaryIndex 有足夠距離
  let adjustedSecondaryIndex = (primaryIndex + baseColors.length/2) % baseColors.length;
  
  // 選擇兩個基礎顏色
  const color1 = baseColors[primaryIndex];
  const color2 = baseColors[Math.floor(adjustedSecondaryIndex)];
  
  // 根據雜湊值決定混合比例
  const mix = (hash >> 8) % 4; // 0-3 的混合級別
  
  // 混合兩個顏色
  const r = Math.round(color1[0] * (4-mix)/4 + color2[0] * mix/4);
  const g = Math.round(color1[1] * (4-mix)/4 + color2[1] * mix/4);
  const b = Math.round(color1[2] * (4-mix)/4 + color2[2] * mix/4);

  // 確保顏色差異
  const ensureColorDifference = (r: number, g: number, b: number) => {
    const minDifference = 50; // 增加最小差異值
    let result = [r, g, b];
    
    // 如果三個顏色分量太接近，增加其中一個的差異
    if (Math.abs(r - g) < minDifference && 
        Math.abs(g - b) < minDifference && 
        Math.abs(r - b) < minDifference) {
      
      const maxComponent = Math.max(r, g, b);
      if (maxComponent === r) {
        result[0] = Math.min(255, r + minDifference);
      } else if (maxComponent === g) {
        result[1] = Math.min(255, g + minDifference);
      } else {
        result[2] = Math.min(255, b + minDifference);
      }
    }
    
    return result;
  };

  const [finalR, finalG, finalB] = ensureColorDifference(r, g, b);
  
  return `rgb(${finalR}, ${finalG}, ${finalB})`;
};