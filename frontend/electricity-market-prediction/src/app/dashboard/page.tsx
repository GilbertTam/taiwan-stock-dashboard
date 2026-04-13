/**
 * 總覽頁（Dashboard 首頁）| Dashboard home page — overview of all-area prices, area cards, and outages.
 */
'use client';

import { useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Snackbar, Box, Typography, Tooltip } from '@mui/material';
import { prepareChartData, ChartDataPoint } from '@/utils/chartUtils';
import { fetchAreas, fetchAllAreasPrices, fetchHjksOutages, downloadSpotCsv } from '@/services/api';
import { AllAreasPriceChart } from '@/components/dashboard/charts/AllAreasPriceChart';
import { RegionalPriceHeatmap } from '@/components/dashboard/charts/RegionalPriceHeatmap';
import { AreaCardList } from '@/components/cards/AreaCardList';
import { DashboardToolbar } from '@/components/navigation/DashboardToolbar';
import { QuickAccessCards } from '@/components/cards/QuickAccessCards';
import { KeyMetricsCards } from '@/components/cards/KeyMetricsCards';
import { PriceTrendPreview } from '@/components/dashboard/charts/PriceTrendPreview';
import { AreaPricePreviewGrid } from '@/components/cards/AreaPricePreviewGrid';
import { LoginOverlay } from '@/components/overlay/LoginOverlay';
import { LoadingOverlay } from '@/components/overlay/LoadingOverlay';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import type { Area, HjksOutage } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useMarketDataContext } from '@/context/MarketDataContext';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useTranslation } from 'react-i18next';

export default function Dashboard() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { t } = useTranslation('dashboard');

  // 共用日期範圍（與 header 及價格預測頁同步）
  const {
    startDate,
    endDate,
    dateRangePreset,
    handleDateRangePreset,
    commitDateSelection,
  } = useMarketDataContext();

  const [showLoginSuccess, setShowLoginSuccess] = useState(false);
  const [areas, setAreas] = useState<Area[]>([]);
  const [allAreasChartData, setAllAreasChartData] = useState<Record<string, ChartDataPoint[]>>({});
  const [allAreasLoading, setAllAreasLoading] = useState(true);
  const [dataDate, setDataDate] = useState<string | null>(null);
  const [highlightedArea, setHighlightedArea] = useState<string | null>(null);
  const [hoveredTimestamp, setHoveredTimestamp] = useState<number | null>(null);
  const [outages, setOutages] = useState<HjksOutage[]>([]);
  const [outagesLoading, setOutagesLoading] = useState(true);

  const handleRefresh = useCallback(() => {
    if (!startDate || !endDate) return;
    const startDateStr = format(startDate, 'yyyyMMdd');
    const endDateStr = format(endDate, 'yyyyMMdd');
    setAllAreasLoading(true);
    setOutagesLoading(true);
    Promise.all([
      fetchAllAreasPrices({ start_date: startDateStr, end_date: endDateStr }),
      fetchHjksOutages({ start_date: startDateStr, end_date: endDateStr }),
    ]).then(([allPrices, outagesData]) => {
      const pricesByArea: Record<string, typeof allPrices> = {};
      allPrices.forEach((price) => {
        const areaName = price.name;
        if (!pricesByArea[areaName]) pricesByArea[areaName] = [];
        pricesByArea[areaName].push(price);
      });
      const chartData: Record<string, ChartDataPoint[]> = {};
      areas.forEach((area) => {
        const areaData = pricesByArea[area.name] || [];
        chartData[area.name] = prepareChartData(areaData, {});
      });
      setAllAreasChartData(chartData);
      if (allPrices.length > 0) setDataDate(allPrices[0].trade_date);
      setOutages(outagesData);
    }).catch((err) => console.error('Refresh failed:', err))
      .finally(() => { setAllAreasLoading(false); setOutagesLoading(false); });
  }, [areas, startDate, endDate]);

  const handleDownloadCsv = useCallback(async () => {
    const areaName = highlightedArea ?? areas[0]?.name;
    if (!startDate || !endDate || !areaName) return;
    try {
      const blob = await downloadSpotCsv({
        start_date: format(startDate, 'yyyyMMdd'),
        end_date: format(endDate, 'yyyyMMdd'),
        area_name: areaName,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `spot_${areaName}_${format(startDate, 'yyyyMMdd')}_${format(endDate, 'yyyyMMdd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to download CSV', e);
    }
  }, [startDate, endDate, areas, highlightedArea]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Fetch areas
  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    const loadAreas = async () => {
      try {
        const areasData = await fetchAreas();
        if (!cancelled) setAreas(areasData);
      } catch (error) {
        console.error('Failed to fetch areas:', error);
      }
    };

    loadAreas();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  // Fetch ALL areas prices for selected date range
  useEffect(() => {
    if (!isAuthenticated || !areas.length || !startDate || !endDate) return;

    const startDateStr = format(startDate, 'yyyyMMdd');
    const endDateStr = format(endDate, 'yyyyMMdd');

    let cancelled = false;
    setAllAreasLoading(true);

    fetchAllAreasPrices({ start_date: startDateStr, end_date: endDateStr })
      .then((allPrices) => {
        if (cancelled) return;

        const pricesByArea: Record<string, typeof allPrices> = {};
        allPrices.forEach((price) => {
          const areaName = price.name;
          if (!pricesByArea[areaName]) pricesByArea[areaName] = [];
          pricesByArea[areaName].push(price);
        });

        const chartData: Record<string, ChartDataPoint[]> = {};
        areas.forEach((area) => {
          const areaData = pricesByArea[area.name] || [];
          chartData[area.name] = prepareChartData(areaData, {});
        });

        setAllAreasChartData(chartData);
        if (allPrices.length > 0) setDataDate(allPrices[0].trade_date);
      })
      .catch((error) => {
        console.error('Failed to fetch prices:', error);
      })
      .finally(() => { if (!cancelled) setAllAreasLoading(false); });

    return () => { cancelled = true; };
  }, [areas, isAuthenticated, startDate, endDate]);

  // Fetch HJKS outages for selected date range
  useEffect(() => {
    if (!isAuthenticated || !startDate || !endDate) return;

    const startDateStr = format(startDate, 'yyyyMMdd');
    const endDateStr = format(endDate, 'yyyyMMdd');

    let cancelled = false;
    setOutagesLoading(true);

    fetchHjksOutages({ start_date: startDateStr, end_date: endDateStr })
      .then((data) => { if (!cancelled) setOutages(data); })
      .catch((error) => {
        console.error('Failed to fetch outages:', error);
      })
      .finally(() => { if (!cancelled) setOutagesLoading(false); });

    return () => { cancelled = true; };
  }, [isAuthenticated, startDate, endDate]);

  useEffect(() => {
    const isFromLogin = sessionStorage.getItem('fromLogin') === 'true';
    if (isFromLogin) {
      setShowLoginSuccess(true);
      sessionStorage.removeItem('fromLogin');
    }
  }, []);

  // Calculate daily spreads (high - low) for each area and compare with yesterday
  const dailySpreadStats = useMemo(() => {
    const now = new Date();
    const jstNow = toZonedTime(now, 'Asia/Tokyo');
    const todayStr = format(jstNow, 'yyyy-MM-dd');
    const yesterday = new Date(jstNow);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd');

    const result: Record<string, { todaySpread: number | null; yesterdaySpread: number | null; change: number | null }> = {};

    areas.forEach((area) => {
      const data = allAreasChartData[area.name] || [];

      // Group by date
      const todayPrices = data.filter((p) => p.date === todayStr && p.actualPrice != null);
      const yesterdayPrices = data.filter((p) => p.date === yesterdayStr && p.actualPrice != null);

      const todayHigh = todayPrices.length > 0 ? Math.max(...todayPrices.map((p) => p.actualPrice!)) : null;
      const todayLow = todayPrices.length > 0 ? Math.min(...todayPrices.map((p) => p.actualPrice!)) : null;
      const todaySpread = todayHigh !== null && todayLow !== null ? todayHigh - todayLow : null;

      const yesterdayHigh = yesterdayPrices.length > 0 ? Math.max(...yesterdayPrices.map((p) => p.actualPrice!)) : null;
      const yesterdayLow = yesterdayPrices.length > 0 ? Math.min(...yesterdayPrices.map((p) => p.actualPrice!)) : null;
      const yesterdaySpread = yesterdayHigh !== null && yesterdayLow !== null ? yesterdayHigh - yesterdayLow : null;

      const change = todaySpread !== null && yesterdaySpread !== null && yesterdaySpread !== 0
        ? ((todaySpread - yesterdaySpread) / yesterdaySpread) * 100
        : null;

      result[area.name] = { todaySpread, yesterdaySpread, change };
    });

    return result;
  }, [allAreasChartData, areas]);

  // Market average spread
  const marketAvgSpread = useMemo(() => {
    const spreads = Object.values(dailySpreadStats);
    const validTodaySpreads = spreads.filter((s) => s.todaySpread !== null).map((s) => s.todaySpread!);
    const validChanges = spreads.filter((s) => s.change !== null).map((s) => s.change!);

    const avgSpread = validTodaySpreads.length > 0
      ? validTodaySpreads.reduce((a, b) => a + b, 0) / validTodaySpreads.length
      : null;
    const avgChange = validChanges.length > 0
      ? validChanges.reduce((a, b) => a + b, 0) / validChanges.length
      : null;

    return { avgSpread, avgChange };
  }, [dailySpreadStats]);

  // Active outages
  const activeOutages = useMemo(() => {
    const now = new Date();
    return outages.filter((o) => {
      if (!o.end_datetime) return true;
      return new Date(o.end_datetime) > now;
    });
  }, [outages]);

  const totalOutageCapacity = useMemo(() => {
    return activeOutages.reduce((sum, o) => sum + (o.down_capacity || o.max_capacity || 0), 0);
  }, [activeOutages]);

  // Return null while redirecting (avoid flash)
  if (!isAuthenticated) {
    return <LoadingOverlay />;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Snackbar
        open={showLoginSuccess}
        autoHideDuration={3000}
        onClose={() => setShowLoginSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setShowLoginSuccess(false)} severity="success" variant="filled">
          {t('loginSuccess')}
        </Alert>
      </Snackbar>

      {/* Toolbar - same style as forecast page, with nav / date range / refresh / CSV */}
      <Box sx={{ flexShrink: 0, p: 0.5 }}>
        <DashboardToolbar
          startDate={startDate}
          endDate={endDate}
          dateRangePreset={dateRangePreset}
          onDateChange={commitDateSelection}
          onDateRangePreset={handleDateRangePreset}
          onRefresh={handleRefresh}
          downloadActions={[{ label: t('downloadCsv'), onClick: handleDownloadCsv }]}
        />
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        <Suspense fallback={<LoadingOverlay />} >
          {allAreasLoading ? (
            <LoadingOverlay />
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

              {/* ── 主要區域：左右分割 ── */}
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'row', minHeight: 0, overflow: 'hidden' }}>

                {/* 左側：區域卡片清單（垂直，可滾動） */}
                <Box
                  sx={{
                    width: 220,
                    flexShrink: 0,
                    borderRight: '1px solid var(--card-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  {/* 標題列 */}
                  <Box
                    sx={{
                      px: 1.5,
                      py: 1,
                      flexShrink: 0,
                      borderBottom: '1px solid var(--card-border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                    }}
                  >
                    <Typography sx={{ fontWeight: 700, color: 'var(--foreground)', fontSize: 12 }}>
                      {t('areaOverview')}
                    </Typography>
                    <Tooltip
                      title={t('priceSpreadTooltip')}
                      arrow
                      placement="bottom"
                    >
                      <InfoOutlinedIcon sx={{ fontSize: 13, color: 'var(--muted)', cursor: 'help' }} />
                    </Tooltip>
                  </Box>

                  {/* 卡片垂直清單 */}
                  <Box sx={{ flex: 1, overflow: 'hidden', minHeight: 0, p: 1 }}>
                    <AreaCardList
                      areas={areas}
                      allAreasChartData={allAreasChartData}
                      loading={allAreasLoading}
                      focusedArea={highlightedArea}
                      onAreaClick={(name) => setHighlightedArea((prev) => (prev === name ? null : name))}
                      dailySpreadStats={dailySpreadStats}
                      direction="column"
                    />
                  </Box>
                </Box>

                {/* 右側：全區域電價主圖 */}
                <Box
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    p: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <AllAreasPriceChart
                    areas={areas}
                    allAreasChartData={allAreasChartData}
                    loading={allAreasLoading}
                    highlightedArea={highlightedArea}
                    onHoverData={(data) => {
                      if (data && data.length > 0) {
                        setHoveredTimestamp(data[0].timestamp);
                      } else {
                        setHoveredTimestamp(null);
                      }
                    }}
                    outages={outages}
                  />
                </Box>
              </Box>

              {/* ── 底部：區域電價熱圖（全寬） ── */}
              <Box sx={{ flexShrink: 0, p: 1.5, pt: 1, borderTop: '1px solid var(--card-border)' }}>
                <RegionalPriceHeatmap
                  areas={areas}
                  allAreasChartData={allAreasChartData}
                  loading={allAreasLoading}
                  highlightedArea={highlightedArea}
                  hoveredTimestamp={hoveredTimestamp}
                />
              </Box>
            </Box>
          )}
        </Suspense>
      </Box>
    </Box>
  );
}
