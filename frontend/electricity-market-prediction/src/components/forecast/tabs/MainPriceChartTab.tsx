'use client';

import React, { useState, useEffect } from 'react';
import { Box, Alert, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { PriceChartContainer } from '../charts/PriceChartContainer';
import ProfitAnalysis from '../profit-analysis/ProfitAnalysis';
import MaeAnalysis from '../mae-analysis/MaeAnalysis';
import OutagesPanel from '@/components/market/outages/OutagesPanel';
import InterconnectionPanel from '@/components/market/InterconnectionPanel';
import WeatherChartSection from '@/components/market/weather/WeatherChartSection';
import IntradayPanel from '@/components/market/intraday/IntradayPanel';
import SupplyDemandChart from '@/components/market/supply-demand/SupplyDemandChart';
import TdgcPanel from '@/components/market/tdgc/TdgcPanel';
import { ResizableLayout } from '@/components/layout/ResizableLayout';
import { BottomPanelNav, type TabKey } from './BottomPanelNav';
import type { IntradayData } from '@/types';

interface MainPriceChartTabProps {
  areaName: string;
  chartData: any[];
  selectedModels: any[];
  isLoading: boolean;
  startDate: Date | null;
  endDate: Date | null;
  weatherActual: any[];
  weatherForecast: any[];
  marketInfoWeatherChartData: any[];
  intradayData?: IntradayData[];
  /** 若為 true，下方區塊預設展開並選「停機資訊」 */
  defaultPanelMarketInfo?: boolean;
}

const BOTTOM_BAR_HEIGHT = 40;
const STORAGE_KEY_SIZES = 'main-price-chart-bottom-panel';
const STORAGE_KEY_TAB = 'main-price-chart-active-tab';

/** 收合時下方只留一條 tab 列，比例收到底 */
const COLLAPSED_SIZES = [96, 4] as const;
const COLLAPSED_MIN_SIZES = [92, 4] as const;
const DEFAULT_EXPANDED_SIZES = [72, 28];
const MAXIMIZED_SIZES = [15, 85];
const MAXIMIZED_MIN_SIZES = [10, 60];

function loadStoredTab(): TabKey | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_TAB);
    if (saved) return saved as TabKey;
  } catch { /* ignore */ }
  return null;
}

export const MainPriceChartTab: React.FC<MainPriceChartTabProps> = ({
  areaName,
  chartData,
  selectedModels,
  isLoading,
  startDate,
  endDate,
  weatherActual,
  weatherForecast,
  marketInfoWeatherChartData,
  intradayData = [],
  defaultPanelMarketInfo = false,
}) => {
  const { t } = useTranslation(['forecast', 'common']);
  const [topBottomPairs, setTopBottomPairs] = useState(2);

  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    if (defaultPanelMarketInfo) return 'outage';
    return loadStoredTab() ?? 'profit';
  });

  const [collapsed, setCollapsed] = useState(!defaultPanelMarketInfo);
  const [maximized, setMaximized] = useState(false);

  const [panelSizes, setPanelSizes] = useState<number[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_EXPANDED_SIZES;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SIZES);
      if (saved) {
        const parsed = JSON.parse(saved) as number[];
        if (Array.isArray(parsed) && parsed.length === 2) return parsed;
      }
    } catch { /* ignore */ }
    return DEFAULT_EXPANDED_SIZES;
  });

  // Persist panel sizes
  useEffect(() => {
    if (!collapsed && !maximized && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_SIZES, JSON.stringify(panelSizes));
    }
  }, [collapsed, maximized, panelSizes]);

  // Persist active tab
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_TAB, activeTab);
    }
  }, [activeTab]);

  const isCompact = !maximized;

  const emptyMessage = t('forecast:emptyState.selectAreaAndModel');
  const loadingNode = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 140,
        color: 'text.secondary',
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: 2,
          borderColor: 'divider',
          borderTopColor: 'primary.main',
          animation: 'spin 0.8s linear infinite',
          '@keyframes spin': { to: { transform: 'rotate(360deg)' } },
        }}
      />
      <Typography sx={{ mt: 1.5, fontSize: 13 }}>{t('forecast:emptyState.loadingPerformance')}</Typography>
    </Box>
  );

  const handleTabSelect = (tab: TabKey) => {
    setActiveTab(tab);
  };

  const handleToggleCollapse = () => {
    if (collapsed) {
      setCollapsed(false);
      setMaximized(false);
    } else {
      setCollapsed(true);
      setMaximized(false);
    }
  };

  const handleToggleMaximize = () => {
    setMaximized((prev) => !prev);
  };

  // Tab content
  const tabContent = (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollbarGutter: 'stable',
        px: 1.5,
        py: 1.5,
        '&::-webkit-scrollbar': { width: 8 },
        '&::-webkit-scrollbar-track': { backgroundColor: 'var(--scrollbar-track)' },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'var(--scrollbar-thumb)',
          borderRadius: 4,
        },
      }}
    >
      {activeTab === 'profit' && (
        <>
          {!selectedModels.length ? (
            <Alert severity="info" sx={{ borderRadius: 1.5, py: 0.75 }}>
              {emptyMessage}
            </Alert>
          ) : isLoading ? (
            loadingNode
          ) : (
            <ProfitAnalysis
              chartData={chartData}
              selectedModels={selectedModels}
              topBottomPairs={topBottomPairs}
              setTopBottomPairs={setTopBottomPairs}
              embedded
              hideControls={isCompact}
              compact={isCompact}
            />
          )}
        </>
      )}
      {activeTab === 'mae' && (
        <>
          {!selectedModels.length ? (
            <Alert severity="info" sx={{ borderRadius: 1.5, py: 0.75 }}>
              {t('forecast:emptyState.selectModelForMae')}
            </Alert>
          ) : isLoading ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 100,
                color: 'text.secondary',
              }}
            >
              <Typography sx={{ fontSize: 13 }}>{t('common:loading')}</Typography>
            </Box>
          ) : (
            <MaeAnalysis
              chartData={chartData}
              selectedModels={selectedModels}
              embedded
              compact={isCompact}
            />
          )}
        </>
      )}
      {activeTab === 'outage' && (
        <Box sx={{ py: 0.5 }}>
          <OutagesPanel
            startDate={startDate}
            endDate={endDate}
            selectedArea={areaName}
            compact={isCompact}
          />
        </Box>
      )}
      {activeTab === 'interconnection' && (
        <Box sx={{ py: 0.5 }}>
          <InterconnectionPanel
            startDate={startDate}
            endDate={endDate}
            selectedArea={areaName}
          />
        </Box>
      )}
      {activeTab === 'weather' && (
        <Box sx={{ py: 0.5 }}>
          <WeatherChartSection
            weatherActual={weatherActual}
            weatherForecast={weatherForecast}
            weatherChartData={marketInfoWeatherChartData}
            compact={isCompact}
          />
        </Box>
      )}
      {activeTab === 'intraday' && (
        <Box sx={{ py: 0.5 }}>
          <IntradayPanel data={intradayData} />
        </Box>
      )}
      {activeTab === 'supplyDemand' && (
        <Box sx={{ py: 0.5 }}>
          <SupplyDemandChart startDate={startDate} endDate={endDate} />
        </Box>
      )}
      {activeTab === 'tdgc' && (
        <Box sx={{ py: 0.5 }}>
          <TdgcPanel startDate={startDate} endDate={endDate} areaName={areaName} />
        </Box>
      )}
    </Box>
  );

  const chartSection = (
    <Box
      sx={{
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <PriceChartContainer areaName={areaName} />
    </Box>
  );

  const bottomPanelSection = (
    <Box
      sx={{
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        borderTop: '1px solid var(--card-border)',
        backgroundColor: collapsed ? 'var(--subtle-bg)' : 'var(--card-bg)',
        ...(collapsed && {
          borderTop: '1px solid var(--primary-alpha-12)',
        }),
      }}
    >
      <BottomPanelNav
        activeTab={activeTab}
        collapsed={collapsed}
        maximized={maximized}
        onTabSelect={handleTabSelect}
        onToggleCollapse={handleToggleCollapse}
        onToggleMaximize={handleToggleMaximize}
      />
      {tabContent}
    </Box>
  );

  const layoutSizes = collapsed
    ? [...COLLAPSED_SIZES]
    : maximized
      ? MAXIMIZED_SIZES
      : panelSizes;

  const layoutMinSizes = collapsed
    ? [...COLLAPSED_MIN_SIZES]
    : maximized
      ? MAXIMIZED_MIN_SIZES
      : [35, 8];

  return (
    <Box
      sx={{
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <ResizableLayout
        direction="vertical"
        defaultSizes={DEFAULT_EXPANDED_SIZES}
        minSizes={layoutMinSizes}
        sizes={layoutSizes}
        onSizesChange={(sizes) => {
          if (!collapsed && !maximized) setPanelSizes(sizes);
        }}
        animateSizeChanges
      >
        {chartSection}
        {bottomPanelSection}
      </ResizableLayout>
    </Box>
  );
};
