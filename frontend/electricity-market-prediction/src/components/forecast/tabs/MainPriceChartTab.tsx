'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Alert,
  IconButton,
  useTheme,
  alpha,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssessmentIcon from '@mui/icons-material/Assessment';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CloudIcon from '@mui/icons-material/Cloud';
import CandlestickChartIcon from '@mui/icons-material/CandlestickChart';
import { PriceChartContainer } from '../charts/PriceChartContainer';
import ProfitAnalysis from '../profit-analysis/ProfitAnalysis';
import MaeAnalysis from '../mae-analysis/MaeAnalysis';
import OutagesPanel from '@/components/market/outages/OutagesPanel';
import InterconnectionPanel from '@/components/market/InterconnectionPanel';
import WeatherChartSection from '@/components/market/weather/WeatherChartSection';
import IntradayPanel from '@/components/market/intraday/IntradayPanel';
import { ResizableLayout } from '@/components/layout/ResizableLayout';
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

type SubTabIndex = 0 | 1 | 2 | 3 | 4 | 5;

const BOTTOM_BAR_HEIGHT = 40;
const STORAGE_KEY = 'main-price-chart-bottom-panel';
/** 收合時下方只留一條 tab 列，比例收到底 */
const COLLAPSED_SIZES = [96, 4] as const;
const COLLAPSED_MIN_SIZES = [92, 4] as const;
const DEFAULT_EXPANDED_SIZES = [72, 28];

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
  const theme = useTheme();
  const [topBottomPairs, setTopBottomPairs] = useState(2);
  const [subTab, setSubTab] = useState<SubTabIndex>(defaultPanelMarketInfo ? 2 : 0); // 2 = 停機資訊
  const [collapsed, setCollapsed] = useState(!defaultPanelMarketInfo);
  const [panelSizes, setPanelSizes] = useState<number[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_EXPANDED_SIZES;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as number[];
        if (Array.isArray(parsed) && parsed.length === 2) return parsed;
      }
    } catch {
      /* ignore */
    }
    return DEFAULT_EXPANDED_SIZES;
  });
  useEffect(() => {
    if (!collapsed && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(panelSizes));
    }
  }, [collapsed, panelSizes]);
  const isDark = theme.palette.mode === 'dark';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const cardBg = isDark ? alpha(theme.palette.background.paper, 0.6) : theme.palette.background.paper;

  const emptyMessage = '請在左側選擇地區與預測模型，即可在此檢視收益分析與 MAE 指標。';
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
      <Typography sx={{ mt: 1.5, fontSize: 13 }}>載入模型效能資料...</Typography>
    </Box>
  );

  const handleTabChange = (_: React.SyntheticEvent, v: SubTabIndex) => {
    if (!collapsed) setSubTab(v);
  };

  const handleTabClick = (index: SubTabIndex) => {
    if (collapsed) {
      setSubTab(index);
      setCollapsed(false);
    } else if (subTab === index) {
      setCollapsed(true);
    }
  };

  const tabBar = (
    <Tabs
      value={subTab}
      onChange={handleTabChange}
      sx={{
        minHeight: BOTTOM_BAR_HEIGHT,
        flex: 1,
        minWidth: 0,
        '& .MuiTab-root': {
          textTransform: 'none',
          fontWeight: 600,
          minHeight: BOTTOM_BAR_HEIGHT,
          py: 0.75,
          ...(collapsed && { color: 'text.secondary', opacity: 0.85 }),
        },
        '& .MuiTab-root.Mui-selected': collapsed ? { color: 'text.secondary', opacity: 0.85 } : {},
        '& .MuiTabs-indicator': {
          height: 2,
          ...(collapsed && { display: 'none' }),
        },
        '& .MuiTabs-flexContainer': { height: BOTTOM_BAR_HEIGHT },
      }}
    >
      <Tab
        icon={<TrendingUpIcon sx={{ fontSize: 18, mr: 0.5 }} />}
        iconPosition="start"
        label="收益分析"
        onClick={() => handleTabClick(0)}
      />
      <Tab
        icon={<AssessmentIcon sx={{ fontSize: 18, mr: 0.5 }} />}
        iconPosition="start"
        label="MAE 分析"
        onClick={() => handleTabClick(1)}
      />
      <Tab
        icon={<WarningAmberIcon sx={{ fontSize: 18, mr: 0.5 }} />}
        iconPosition="start"
        label="停機資訊"
        onClick={() => handleTabClick(2)}
      />
      <Tab
        icon={<AccountTreeIcon sx={{ fontSize: 18, mr: 0.5 }} />}
        iconPosition="start"
        label="互連流量"
        onClick={() => handleTabClick(3)}
      />
      <Tab
        icon={<CloudIcon sx={{ fontSize: 18, mr: 0.5 }} />}
        iconPosition="start"
        label="天氣資料"
        onClick={() => handleTabClick(4)}
      />
      <Tab
        icon={<CandlestickChartIcon sx={{ fontSize: 18, mr: 0.5 }} />}
        iconPosition="start"
        label="日内市場"
        onClick={() => handleTabClick(5)}
      />
    </Tabs>
  );

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
        '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
          borderRadius: 4,
        },
      }}
    >
      {subTab === 0 && (
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
              hideControls={false}
            />
          )}
        </>
      )}
      {subTab === 1 && (
        <>
          {!selectedModels.length ? (
            <Alert severity="info" sx={{ borderRadius: 1.5, py: 0.75 }}>
              請在左側選擇地區與預測模型，即可在此檢視 MAE 指標。
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
              <Typography sx={{ fontSize: 13 }}>載入中...</Typography>
            </Box>
          ) : (
            <MaeAnalysis chartData={chartData} selectedModels={selectedModels} embedded />
          )}
        </>
      )}
      {subTab === 2 && (
        <Box sx={{ py: 0.5 }}>
          <OutagesPanel
            startDate={startDate}
            endDate={endDate}
            selectedArea={areaName}
          />
        </Box>
      )}
      {subTab === 3 && (
        <Box sx={{ py: 0.5 }}>
          <InterconnectionPanel
            startDate={startDate}
            endDate={endDate}
            selectedArea={areaName}
          />
        </Box>
      )}
      {subTab === 4 && (
        <Box sx={{ py: 0.5 }}>
          <WeatherChartSection
            weatherActual={weatherActual}
            weatherForecast={weatherForecast}
            weatherChartData={marketInfoWeatherChartData}
          />
        </Box>
      )}
      {subTab === 5 && (
        <Box sx={{ py: 0.5 }}>
          <IntradayPanel data={intradayData} />
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
        borderTop: `1px solid ${borderColor}`,
        backgroundColor: cardBg,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: `1px solid ${borderColor}`,
          flexShrink: 0,
          height: BOTTOM_BAR_HEIGHT,
          minHeight: BOTTOM_BAR_HEIGHT,
        }}
      >
        {tabBar}
        <IconButton
          size="small"
          onClick={() => {
            if (collapsed) {
              setSubTab(0);
              setCollapsed(false);
            } else {
              setCollapsed(true);
            }
          }}
          sx={{ mr: 0.5, color: 'text.secondary' }}
          title={collapsed ? '展開' : '收合'}
          aria-label={collapsed ? '展開' : '收合'}
        >
          {collapsed ? (
            <UnfoldMoreIcon sx={{ fontSize: 20 }} aria-hidden />
          ) : (
            <UnfoldLessIcon sx={{ fontSize: 20 }} />
          )}
        </IconButton>
      </Box>
      {tabContent}
    </Box>
  );

  const layoutSizes = collapsed ? [...COLLAPSED_SIZES] : panelSizes;

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
        minSizes={collapsed ? [...COLLAPSED_MIN_SIZES] : [35, 8]}
        sizes={layoutSizes}
        onSizesChange={(sizes) => {
          if (!collapsed) setPanelSizes(sizes);
        }}
        animateSizeChanges
      >
        {chartSection}
        {bottomPanelSection}
      </ResizableLayout>
    </Box>
  );
};
