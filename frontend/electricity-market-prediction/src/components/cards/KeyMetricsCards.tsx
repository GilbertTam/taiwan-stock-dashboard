'use client';

import React, { useMemo } from 'react';
import { CircularProgress, Alert } from '@mui/material';
import {
  AttachMoney,
  Assessment,
  Warning,
  TrendingUp,
  CalendarToday,
  DataUsage
} from '@mui/icons-material';
import { MetricCard } from './MetricCard';
import { ChartDataPoint } from '@/utils/chartUtils';
import { format } from 'date-fns';
import { calculateModelMAE } from '@/utils/chartUtils';
import { AreaPrice, ImbalanceData, InterconnectionFlow } from '@/types';

interface KeyMetricsCardsProps {
  chartData: ChartDataPoint[];
  selectedModels: Array<{
    id: string | number;
    name: string;
    color: string;
    calculatingDate: string;
  }>;
  startDate: Date | null;
  endDate: Date | null;
  selectedArea: string;
  actualPrices: AreaPrice[];
  imbalanceData?: ImbalanceData[];
  interconnectionData?: InterconnectionFlow[];
  isLoading?: boolean;
}

export const KeyMetricsCards: React.FC<KeyMetricsCardsProps> = ({
  chartData,
  selectedModels,
  startDate,
  endDate,
  selectedArea,
  actualPrices,
  imbalanceData = [],
  interconnectionData = [],
  isLoading = false
}) => {

  // Calculate current price (latest actual price)
  const currentPrice = useMemo(() => {
    if (actualPrices.length === 0) return null;
    const sorted = [...actualPrices].sort((a, b) => {
      const dateA = `${a.trade_date}_${a.time_code}`;
      const dateB = `${b.trade_date}_${b.time_code}`;
      return dateB.localeCompare(dateA);
    });
    return sorted[0]?.price || null;
  }, [actualPrices]);

  // Calculate previous price for comparison (24 hours ago or previous day)
  const previousPrice = useMemo(() => {
    if (actualPrices.length === 0 || !currentPrice) return null;
    const sorted = [...actualPrices].sort((a, b) => {
      const dateA = `${a.trade_date}_${a.time_code}`;
      const dateB = `${b.trade_date}_${b.time_code}`;
      return dateB.localeCompare(dateA);
    });
    // Get price from 24 time slots ago (approximately 24 hours)
    return sorted[24]?.price || sorted[sorted.length - 1]?.price || null;
  }, [actualPrices, currentPrice]);

  // Calculate price trend
  const priceTrend = useMemo(() => {
    if (!currentPrice || !previousPrice) return undefined;
    const change = ((currentPrice - previousPrice) / previousPrice) * 100;
    return {
      value: change,
      label: 'vs 前一日'
    };
  }, [currentPrice, previousPrice]);

  // Calculate best model MAE
  const bestModelMAE = useMemo(() => {
    if (selectedModels.length === 0 || chartData.length === 0) return null;

    const maeResults = selectedModels.map(model => {
      const mae = calculateModelMAE(chartData, model.id, model.name);
      return { model, mae };
    }).filter(result => result.mae > 0);

    if (maeResults.length === 0) return null;

    const best = maeResults.reduce((prev, current) =>
      (prev.mae < current.mae) ? prev : current
    );

    return best;
  }, [selectedModels, chartData]);

  // Count outages (we'll need to fetch this separately or pass as prop)
  const outageCount = 0; // Placeholder - will be calculated from market info

  // Count data points
  const dataPointCount = useMemo(() => {
    return chartData.length;
  }, [chartData]);

  // Format date range
  const dateRangeText = useMemo(() => {
    if (!startDate || !endDate) return '未選擇';
    return `${format(startDate, 'yyyy/MM/dd')} - ${format(endDate, 'yyyy/MM/dd')}`;
  }, [startDate, endDate]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Current Price Card */}
      <MetricCard
        title="當前電價"
        value={currentPrice !== null ? `¥${currentPrice.toFixed(2)}` : '無資料'}
        subtitle={selectedArea ? `區域: ${selectedArea}` : undefined}
        trend={priceTrend}
        icon={<AttachMoney />}
        color="primary"
      />

      {/* Model Accuracy Card */}
      <MetricCard
        title="模型預測準確度"
        value={bestModelMAE ? `MAE: ${bestModelMAE.mae.toFixed(2)}` : '未選擇模型'}
        subtitle={bestModelMAE ? `最佳模型: ${bestModelMAE.model.name}` : `${selectedModels.length} 個模型已選擇`}
        icon={<Assessment />}
        color="success"
      />

      {/* Market Status Card */}
      <MetricCard
        title="市場狀態"
        value={outageCount > 0 ? `${outageCount} 個停機事件` : '正常'}
        subtitle={interconnectionData.length > 0 ? '互連線正常' : '無互連資料'}
        icon={<Warning />}
        color={outageCount > 0 ? 'warning' : 'success'}
      />

      {/* Data Range Card */}
      <MetricCard
        title="資料範圍"
        value={dateRangeText}
        subtitle={`${dataPointCount} 個資料點`}
        icon={<CalendarToday />}
        color="info"
      />

      {/* Model Count Card */}
      <MetricCard
        title="已選擇模型"
        value={selectedModels.length}
        subtitle={selectedModels.length > 0 ? selectedModels.map(m => m.name).join(', ') : '未選擇任何模型'}
        icon={<DataUsage />}
        color="secondary"
      />

      {/* Profit Summary Card (if models selected) */}
      {selectedModels.length > 0 && (
        <MetricCard
          title="收益分析"
          value="查看詳細"
          subtitle="點擊查看完整收益分析"
          icon={<TrendingUp />}
          color="success"
        />
      )}
    </div>
  );
};
