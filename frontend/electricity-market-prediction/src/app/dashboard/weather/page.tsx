'use client';

import { useState, useMemo, useEffect } from 'react';
import { Box, Paper } from '@mui/material';
import { useMarketDataContext } from '@/context/MarketDataContext';
import { FilterPanel } from '@/components/market-dashboard/FilterPanel';
import WeatherChartSection from '@/components/WeatherChartSection';
import { Breadcrumb } from '@/components/navigation/Breadcrumb';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { RightSidebar } from '@/components/layout/RightSidebar';
import { useBufferedDateRange } from '@/hooks/useBufferedDateRange';

export default function WeatherPage() {
  const {
    areas,
    selectedArea,
    startDate,
    endDate,
    dateRangePreset,
    weatherActual,
    weatherForecast,
    handleAreaChange,
    handleDateRangePreset,
    setStartDate,
    setEndDate,
    handleMoveMonthBackward,
    handleMoveMonthForward
  } = useMarketDataContext();

  // Local state for date selection (buffer before fetch)
  const { tempStartDate, tempEndDate, onDateRangeChange, onDateMenuClose } = useBufferedDateRange({
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    clearPreset: () => handleDateRangePreset(null),
  });

  // Prepare Weather Chart Data
  const weatherChartData = useMemo(() => {
    const dataMap = new Map<string, any>();
    const getNormalizedKey = (dateStr: string) => {
      if (!dateStr) return '';
      try {
        return new Date(dateStr).toISOString();
      } catch (e) {
        return dateStr;
      }
    };

    weatherActual.forEach(item => {
      const key = getNormalizedKey(item.weather_datetime);
      if (!dataMap.has(key)) {
        dataMap.set(key, {
          weather_datetime: item.weather_datetime,
          temperature_actual: null,
          rainfall_actual: null,
          wind_speed_actual: null,
          temperature_forecast: null,
          rainfall_forecast: null,
          wind_speed_forecast: null
        });
      }
      const existing = dataMap.get(key);
      existing.temperature_actual = item.temperature;
      existing.rainfall_actual = item.rainfall;
      existing.wind_speed_actual = item.wind_speed;
    });

    weatherForecast.forEach(item => {
      const key = getNormalizedKey(item.weather_datetime);
      if (!dataMap.has(key)) {
        dataMap.set(key, {
          weather_datetime: item.weather_datetime,
          temperature_actual: null,
          rainfall_actual: null,
          wind_speed_actual: null,
          temperature_forecast: null,
          rainfall_forecast: null,
          wind_speed_forecast: null
        });
      }
      const existing = dataMap.get(key);
      existing.temperature_forecast = item.temperature;
      existing.rainfall_forecast = item.rainfall;
      existing.wind_speed_forecast = item.wind_speed;
    });

    return Array.from(dataMap.values()).sort((a, b) =>
      new Date(a.weather_datetime).getTime() - new Date(b.weather_datetime).getTime()
    );
  }, [weatherActual, weatherForecast]);

  return (
    <>
      <Breadcrumb 
        items={[
          { label: '儀表板', href: '/dashboard' },
          { label: '天氣分析', href: '/dashboard/weather' }
        ]}
      />

      <DashboardShell
        main={
          <>
            <FilterPanel
              areas={areas}
              selectedArea={selectedArea}
              startDate={tempStartDate}
              endDate={tempEndDate}
              dateRangePreset={dateRangePreset}
              onAreaChange={handleAreaChange}
              onDateRangePreset={handleDateRangePreset}
              onDateRangeChange={onDateRangeChange}
              onDateMenuClose={onDateMenuClose}
              onMoveMonthBackward={handleMoveMonthBackward}
              onMoveMonthForward={handleMoveMonthForward}
              onRefresh={() => { }}
              onDownloadCsv={() => { }}
            />

            <Box sx={{ mt: 3 }}>
              <Paper sx={{ p: 3 }}>
                <WeatherChartSection
                  weatherActual={weatherActual}
                  weatherForecast={weatherForecast}
                  weatherChartData={weatherChartData}
                />
              </Paper>
            </Box>
          </>
        }
        sidebar={<RightSidebar />}
      />
    </>
  );
}
