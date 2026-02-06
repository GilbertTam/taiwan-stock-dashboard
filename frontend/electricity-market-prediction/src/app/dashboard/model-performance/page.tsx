'use client';

import { useState, useMemo, useEffect } from 'react';
import { Box, Alert, Paper, Tabs, Tab } from '@mui/material';
import { useMarketDataContext } from '@/context/MarketDataContext';
import { prepareChartData } from '@/utils/chartUtils';
import { FilterPanel } from '@/components/market-dashboard/FilterPanel';
import ProfitAnalysis from '@/components/ProfitAnalysis/ProfitAnalysis';
import MaeAnalysis from '@/components/MaeAnalysis/MaeAnalysis';
import { Breadcrumb } from '@/components/navigation/Breadcrumb';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { RightSidebar } from '@/components/layout/RightSidebar';
import { useBufferedDateRange } from '@/hooks/useBufferedDateRange';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`model-performance-tabpanel-${index}`}
      aria-labelledby={`model-performance-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function ModelPerformancePage() {
  const {
    areas,
    selectedArea,
    startDate,
    endDate,
    dateRangePreset,
    selectedModels,
    actualPrices,
    predictionsByModel,
    isLoading,
    handleAreaChange,
    handleDateRangePreset,
    setStartDate,
    setEndDate,
    handleMoveMonthBackward,
    handleMoveMonthForward
  } = useMarketDataContext();

  const [topBottomPairs, setTopBottomPairs] = useState<number>(4);
  const [tabValue, setTabValue] = useState(0);

  // Local state for date selection (buffer before fetch)
  const { tempStartDate, tempEndDate, onDateRangeChange, onDateMenuClose } = useBufferedDateRange({
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    clearPreset: () => handleDateRangePreset(null),
  });

  // Prepare Chart Data
  const chartData = useMemo(() => {
    const result = prepareChartData(actualPrices, predictionsByModel);
    return result;
  }, [actualPrices, predictionsByModel]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <>
      <Breadcrumb 
        items={[
          { label: '儀表板', href: '/dashboard' },
          { label: '模型效能分析', href: '/dashboard/model-performance' }
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

            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 10 }}>
                Loading...
              </Box>
            ) : (
              <Box sx={{ mt: 3 }}>
                <Paper sx={{ mb: 3 }}>
                  <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    sx={{
                      borderBottom: 1,
                      borderColor: 'divider',
                      '& .MuiTab-root': {
                        textTransform: 'none',
                        fontWeight: 600,
                      },
                    }}
                  >
                    <Tab label="收益分析" />
                    <Tab label="MAE 分析" />
                  </Tabs>

                  <TabPanel value={tabValue} index={0}>
                    <Box sx={{ p: 3 }}>
                      <ProfitAnalysis
                        chartData={chartData}
                        selectedModels={selectedModels}
                        topBottomPairs={topBottomPairs}
                        setTopBottomPairs={setTopBottomPairs}
                      />
                    </Box>
                  </TabPanel>

                  <TabPanel value={tabValue} index={1}>
                    <Box sx={{ p: 3 }}>
                      <MaeAnalysis chartData={chartData} selectedModels={selectedModels} />
                    </Box>
                  </TabPanel>
                </Paper>
              </Box>
            )}
          </>
        }
        sidebar={<RightSidebar />}
      />
    </>
  );
}
