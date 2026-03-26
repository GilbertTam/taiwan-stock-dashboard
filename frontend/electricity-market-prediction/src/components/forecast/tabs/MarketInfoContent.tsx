'use client';

import React, { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import OutagesPanel from '@/components/market/outages/OutagesPanel';
import InterconnectionPanel from '@/components/market/InterconnectionPanel';
import WeatherChartSection from '@/components/market/weather/WeatherChartSection';
import OcctoEventsPanel from '@/components/market/occto-events/OcctoEventsPanel';

export interface MarketInfoContentProps {
  startDate: Date | null;
  endDate: Date | null;
  selectedArea: string;
  weatherActual: any[];
  weatherForecast: any[];
  marketInfoWeatherChartData: any[];
  /** 內嵌時縮減 padding */
  embedded?: boolean;
}

export const MarketInfoContent: React.FC<MarketInfoContentProps> = ({
  startDate,
  endDate,
  selectedArea,
  weatherActual,
  weatherForecast,
  marketInfoWeatherChartData,
  embedded = false,
}) => {
  const [marketInfoSubTab, setMarketInfoSubTab] = useState(0);
  const padding = embedded ? 2 : 3;

  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Tabs
        value={marketInfoSubTab}
        onChange={(_, v) => setMarketInfoSubTab(v)}
        sx={{
          flexShrink: 0,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
        }}
      >
        <Tab label="停機資訊" />
        <Tab label="互連流量" />
        <Tab label="天氣資料" />
        <Tab label="系統イベント" />
      </Tabs>
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', p: padding }}>
        {marketInfoSubTab === 0 && (
          <OutagesPanel
            startDate={startDate}
            endDate={endDate}
            selectedArea={selectedArea}
          />
        )}
        {marketInfoSubTab === 1 && (
          <InterconnectionPanel
            startDate={startDate}
            endDate={endDate}
            selectedArea={selectedArea}
          />
        )}
        {marketInfoSubTab === 2 && (
          <WeatherChartSection
            weatherActual={weatherActual}
            weatherForecast={weatherForecast}
            weatherChartData={marketInfoWeatherChartData}
          />
        )}
        {marketInfoSubTab === 3 && (
          <OcctoEventsPanel
            startDate={startDate}
            endDate={endDate}
          />
        )}
      </Box>
    </Box>
  );
};
