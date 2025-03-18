import { AreaPrice, PricePrediction } from '@/types';

export interface ChartDataPoint {
  dateTime: string;
  date: string;
  time: number;
  timeStr: string;
  actualPrice: number | null;
  predictedPrice: number | null;
  predictedPrice5: number | null;
  predictedPrice95: number | null;
  isPrediction: boolean;
}

export const prepareChartData = (
  actualPrices: AreaPrice[], 
  predictions: PricePrediction[]
): ChartDataPoint[] => {
  const chartData: ChartDataPoint[] = [];
  const allDates = new Set<string>();
  
  // 收集所有日期
  actualPrices.forEach(price => {
    allDates.add(price.trade_date);
  });
  
  predictions.forEach(pred => {
    allDates.add(pred.trade_date);
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
      
      // 查找預測價格
      const prediction = predictions.find(
        p => p.trade_date === date && p.time_code === timeCode
      );
      
      chartData.push({
        dateTime,
        date,
        time: timeCode,
        timeStr,
        actualPrice: actualPrice ? parseFloat(actualPrice.price.toString()) : null,
        predictedPrice: prediction ? parseFloat(prediction.price_50.toString()) : null,
        predictedPrice5: prediction ? parseFloat(prediction.price_5.toString()) : null,
        predictedPrice95: prediction ? parseFloat(prediction.price_95.toString()) : null,
        isPrediction: !actualPrice && prediction !== undefined
      });
    }
  });
  
  return chartData.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time - b.time;
  });
};
