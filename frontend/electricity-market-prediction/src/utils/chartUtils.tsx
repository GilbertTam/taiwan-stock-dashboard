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
