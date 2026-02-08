'use client';

import { useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Snackbar, Box, Typography, Tooltip } from '@mui/material';
import { prepareChartData, ChartDataPoint } from '@/utils/chartUtils';
import { fetchAreas, fetchAllAreasPrices, fetchHjksOutages, downloadSpotCsv } from '@/services/api';
import { AllAreasPriceChart } from '@/components/features/dashboard/charts/AllAreasPriceChart';
import { AreaCardList } from '@/components/features/dashboard/cards/AreaCardList';
import { DashboardToolbar } from '@/components/features/navigation/DashboardToolbar';
import { QuickAccessCards } from '@/components/features/dashboard/cards/QuickAccessCards';
import { KeyMetricsCards } from '@/components/features/dashboard/cards/KeyMetricsCards';
import { PriceTrendPreview } from '@/components/features/dashboard/charts/PriceTrendPreview';
import { AreaPricePreviewGrid } from '@/components/features/dashboard/cards/AreaPricePreviewGrid';
import { LoginOverlay } from '@/components/features/dashboard/overlay/LoginOverlay';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { useBufferedDateRange } from '@/hooks/useBufferedDateRange';
import type { Area, HjksOutage } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useMarketDataContext } from '@/context/MarketDataContext';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

// Custom Loader - designed spinner + label (no height:100% so wrapper controls centering)
const LoadingSpinner = () => (
  <>
    <Box
      sx={{
        position: 'relative',
        width: 56,
        height: 56,
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '3px solid',
          borderColor: 'var(--card-border)',
          opacity: 0.3,
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '3px solid transparent',
          borderTopColor: 'var(--primary)',
          borderRightColor: 'var(--primary)',
          animation: 'spin 0.8s linear infinite',
        },
        '@keyframes spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      }}
    />
    <Typography sx={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500 }}>
      載入市場資料...
    </Typography>
  </>
);

// Full-viewport centering so spinner is in the middle from first frame (no jump)
const LoadingComponent = () => (
  <Box
    sx={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      zIndex: 10,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
    }}
  >
    <LoadingSpinner />
  </Box>
);

export default function Dashboard() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // 共用日期範圍（與 header 及價格預測頁同步）
  const {
    startDate,
    endDate,
    dateRangePreset,
    handleDateRangePreset,
    setStartDate,
    setEndDate,
  } = useMarketDataContext();

  const [showLoginSuccess, setShowLoginSuccess] = useState(false);
  const [areas, setAreas] = useState<Area[]>([]);
  const [allAreasChartData, setAllAreasChartData] = useState<Record<string, ChartDataPoint[]>>({});
  const [allAreasLoading, setAllAreasLoading] = useState(true);
  const [dataDate, setDataDate] = useState<string | null>(null);
  const [highlightedArea, setHighlightedArea] = useState<string | null>(null);
  const [outages, setOutages] = useState<HjksOutage[]>([]);
  const [outagesLoading, setOutagesLoading] = useState(true);

  const { tempStartDate, tempEndDate, onDateRangeChange, onDateMenuClose } = useBufferedDateRange({
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    clearPreset: () => handleDateRangePreset(null),
  });

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
    if (!startDate || !endDate || areas.length === 0) return;
    const areaName = areas[0].name;
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
  }, [startDate, endDate, areas]);

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
    return <LoadingComponent />;
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
          登入成功
        </Alert>
      </Snackbar>

      {/* Toolbar - same style as forecast page, with nav / date range / refresh / CSV */}
      <Box sx={{ flexShrink: 0, p: 0.5 }}>
        <DashboardToolbar
          startDate={tempStartDate}
          endDate={tempEndDate}
          dateRangePreset={dateRangePreset}
          onDateRangeChange={onDateRangeChange}
          onDateRangePreset={handleDateRangePreset}
          onDateMenuClose={onDateMenuClose}
          onRefresh={handleRefresh}
          onDownloadCsv={handleDownloadCsv}
          currentTab="home"
        />
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        <Suspense fallback={<LoadingComponent />}>
          {allAreasLoading ? (
            <LoadingComponent />
          ) : (
            <>
              {/* Left: Chart */}
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
                  outages={outages}
                />
              </Box>

              {/* Right: Area Cards */}
              <Box
                sx={{
                  width: 260,
                  flexShrink: 0,
                  p: 1.5,
                  pt: 1,
                  borderLeft: '1px solid var(--card-border)',
                  backgroundColor: 'var(--card-bg)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, px: 0.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--foreground)', fontSize: 12 }}>
                    區域一覽
                  </Typography>
                  <Tooltip
                    title="價差 = 當日最高價 - 最低價；變化 = 與昨日價差比較"
                    arrow
                    placement="left"
                  >
                    <InfoOutlinedIcon sx={{ fontSize: 14, color: 'var(--muted)', cursor: 'help' }} />
                  </Tooltip>
                </Box>
                <AreaCardList
                  areas={areas}
                  allAreasChartData={allAreasChartData}
                  loading={allAreasLoading}
                  focusedArea={highlightedArea}
                  onAreaClick={(name) => setHighlightedArea((prev) => (prev === name ? null : name))}
                  dailySpreadStats={dailySpreadStats}
                />
              </Box>
            </>
          )}
        </Suspense>
      </Box>
    </Box>
  );
}
