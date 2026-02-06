'use client';

import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography,
  CircularProgress, Alert
} from '@mui/material';
import { useTheme } from '@/app/ThemeProvider';
import { format } from 'date-fns';
import {
  fetchHjksOutages
} from '@/services/api';
import {
  HjksOutage
} from '@/types';
import OutageGanttChart from '../OutageGanttChart';
import OutageTable from '../OutageTable';

interface OutagesPanelProps {
  startDate: Date | null;
  endDate: Date | null;
  selectedArea: string;
}

export default function OutagesPanel({ startDate, endDate, selectedArea }: OutagesPanelProps) {
  const { darkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [outagesData, setOutagesData] = useState<HjksOutage[]>([]);

  // Format dates for API
  const getApiParams = () => {
    if (!startDate || !endDate) return null;
    return {
      start_date: format(startDate, 'yyyyMMdd'),
      end_date: format(endDate, 'yyyyMMdd'),
      area_name: selectedArea
    };
  };

  // Fetch outages data
  useEffect(() => {
    const params = getApiParams();
    if (!params) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const outages = await fetchHjksOutages(params).catch(err => { 
          console.error('Error fetching outages:', err); 
          return []; 
        });
        setOutagesData(outages);
      } catch (err) {
        console.error('Error fetching outages data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, selectedArea]);

  if (!startDate || !endDate) {
    return (
      <Alert severity="info">
        請選擇日期範圍 (Please select a date range)
      </Alert>
    );
  }

  return (
    <Box>
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && (
        <>
          {outagesData.length > 0 ? (
            <>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold" sx={{ mb: 2 }}>
                電廠停機資訊 (Power Plant Outage) - {selectedArea}
              </Typography>

              {/* Gantt Chart */}
              <Paper variant="outlined" sx={{ p: 2, mb: 3, backgroundColor: darkMode ? '#1a1a1a' : '#ffffff' }}>
                <OutageGanttChart
                  outages={outagesData}
                  startDate={startDate}
                  endDate={endDate}
                />
              </Paper>

              {/* Outages Table */}
              <Typography variant="h6" sx={{ mt: 4, mb: 2, fontWeight: 'bold' }}>
                詳細資訊 (Detailed Information)
              </Typography>

              <OutageTable
                outages={outagesData}
              />
            </>
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              電廠停機資料：該時段無資料 (Power Plant Outage: No data available for this period)
            </Alert>
          )}
        </>
      )}
    </Box>
  );
}
