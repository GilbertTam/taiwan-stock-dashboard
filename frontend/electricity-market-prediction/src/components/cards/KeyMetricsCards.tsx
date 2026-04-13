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
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('dashboard');

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
      label: t('metrics.vsPrevDay')
    };
  }, [currentPrice, previousPrice, t]);

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
    if (!startDate || !endDate) return t('metrics.noDateSelected');
    return `${format(startDate, 'yyyy/MM/dd')} - ${format(endDate, 'yyyy/MM/dd')}`;
  }, [startDate, endDate, t]);

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
        title={t('metrics.currentPrice')}
        value={currentPrice !== null ? `¥${currentPrice.toFixed(2)}` : t('metrics.noData')}
        subtitle={selectedArea ? t('metrics.area', { area: selectedArea }) : undefined}
        trend={priceTrend}
        icon={<AttachMoney />}
        color="primary"
      />

      {/* Model Accuracy Card */}
      <MetricCard
        title={t('metrics.modelAccuracy')}
        value={bestModelMAE ? `MAE: ${bestModelMAE.mae.toFixed(2)}` : t('metrics.noModelSelected')}
        subtitle={bestModelMAE ? t('metrics.bestModel', { name: bestModelMAE.model.name }) : t('metrics.modelsSelected', { count: selectedModels.length })}
        icon={<Assessment />}
        color="success"
      />

      {/* Market Status Card */}
      <MetricCard
        title={t('metrics.marketStatus')}
        value={outageCount > 0 ? t('metrics.outageEvents', { count: outageCount }) : t('metrics.normal')}
        subtitle={interconnectionData.length > 0 ? t('metrics.interconnectionOk') : t('metrics.noInterconnectionData')}
        icon={<Warning />}
        color={outageCount > 0 ? 'warning' : 'success'}
      />

      {/* Data Range Card */}
      <MetricCard
        title={t('metrics.dataRange')}
        value={dateRangeText}
        subtitle={t('metrics.dataPoints', { count: dataPointCount })}
        icon={<CalendarToday />}
        color="info"
      />

      {/* Model Count Card */}
      <MetricCard
        title={t('metrics.selectedModels')}
        value={selectedModels.length}
        subtitle={selectedModels.length > 0 ? selectedModels.map(m => m.name).join(', ') : t('metrics.noModelsSelected')}
        icon={<DataUsage />}
        color="secondary"
      />

      {/* Profit Summary Card (if models selected) */}
      {selectedModels.length > 0 && (
        <MetricCard
          title={t('metrics.revenueAnalysis')}
          value={t('metrics.viewDetails')}
          subtitle={t('metrics.clickForRevenue')}
          icon={<TrendingUp />}
          color="success"
        />
      )}
    </div>
  );
};
