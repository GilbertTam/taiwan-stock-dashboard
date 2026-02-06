'use client';

import { useState, useEffect, Suspense } from 'react';
import { Alert, Snackbar } from '@mui/material';
import { useMarketDataContext } from '@/context/MarketDataContext';
import { prepareChartData } from '@/utils/chartUtils';
import { FilterPanel } from '@/components/market-dashboard/FilterPanel';
import { KeyMetricsCards } from '@/components/dashboard/KeyMetricsCards';
import { QuickAccessCards } from '@/components/dashboard/QuickAccessCards';
import { PriceTrendPreview } from '@/components/dashboard/PriceTrendPreview';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { RightSidebar } from '@/components/layout/RightSidebar';
import { format } from 'date-fns';
import { useBufferedDateRange } from '@/hooks/useBufferedDateRange';

// Custom Loader with new styling
const LoadingComponent = () => (
  <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-[var(--card-border)] border-t-[var(--primary)] rounded-full animate-spin"></div>
    </div>
    <p className="text-[var(--foreground)] opacity-70 animate-pulse">
      Loading Market Data...
    </p>
  </div>
);

export default function Dashboard() {
  const [showLoginSuccess, setShowLoginSuccess] = useState(false);

  // Use market data hook
  const {
    areas,
    models,
    calculatingDatesByModel,
    selectedArea,
    startDate,
    endDate,
    dateRangePreset,
    selectedModels,
    actualPrices,
    predictionsByModel,
    imbalanceData,
    interconnectionData,
    isLoading,
    handleAreaChange,
    handleModelChange,
    handleModelCalculatingDateChange,
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

  // Prepare chart data for metrics
  const chartData = prepareChartData(actualPrices, predictionsByModel);

  useEffect(() => {
    // Check if redirected from login
    const isFromLogin = sessionStorage.getItem('fromLogin') === 'true';
    if (isFromLogin) {
      setShowLoginSuccess(true);
      sessionStorage.removeItem('fromLogin');
    }
  }, []);

  return (
    <div className="space-y-6">
      <Snackbar
        open={showLoginSuccess}
        autoHideDuration={3000}
        onClose={() => setShowLoginSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setShowLoginSuccess(false)}
          severity="success"
          sx={{
            bgcolor: 'var(--card-bg)',
            color: 'var(--success)',
            border: '1px solid var(--success)',
            backdropFilter: 'blur(10px)'
          }}
        >
          Login successful!
        </Alert>
      </Snackbar>

      {/* Filter Panel */}
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

            <Suspense fallback={<LoadingComponent />}>
              <div className="mt-6 space-y-8">
                {/* Key Metrics Section */}
                <section>
                  <h2 className="text-xl font-bold mb-4 text-[var(--foreground)]">
                    關鍵指標
                  </h2>
                  <KeyMetricsCards
                    chartData={chartData}
                    selectedModels={selectedModels}
                    startDate={startDate}
                    endDate={endDate}
                    selectedArea={selectedArea}
                    actualPrices={actualPrices}
                    imbalanceData={imbalanceData}
                    interconnectionData={interconnectionData}
                    isLoading={isLoading}
                  />
                </section>

                <hr className="border-[var(--card-border)]" />

                {/* Quick Access Section */}
                <section>
                  <h2 className="text-xl font-bold mb-4 text-[var(--foreground)]">
                    快速入口
                  </h2>
                  <QuickAccessCards />
                </section>

                <hr className="border-[var(--card-border)]" />

                {/* Price Trend Preview */}
                <section>
                  <PriceTrendPreview chartData={chartData} selectedArea={selectedArea} />
                </section>
              </div>
            </Suspense>
          </>
        }
        sidebar={<RightSidebar />}
      />
    </div>
  );
}
