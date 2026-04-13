'use client';

import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography,
  CircularProgress, Alert
} from '@mui/material';
import { format } from 'date-fns';
import {
  fetchHjksOutages
} from '@/services/api';
import {
  HjksOutage
} from '@/types';
import { useTranslation } from 'react-i18next';
import OutageGanttChart from './OutageGanttChart';
import OutageTable from './OutageTable';

interface OutagesPanelProps {
  startDate: Date | null;
  endDate: Date | null;
  selectedArea: string;
}

export default function OutagesPanel({ startDate, endDate, selectedArea }: OutagesPanelProps) {
  const { t } = useTranslation('generationMix');
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
        {t('outages.selectDateRange')}
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
                {t('outages.panelTitle')} - {selectedArea}
              </Typography>

              {/* Gantt Chart */}
              <Paper variant="outlined" sx={{ p: 2, mb: 3, backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                <OutageGanttChart
                  outages={outagesData}
                  startDate={startDate}
                  endDate={endDate}
                />
              </Paper>

              {/* Outages Table */}
              <Typography variant="h6" sx={{ mt: 4, mb: 2, fontWeight: 'bold' }}>
                {t('outages.detailedInfo')}
              </Typography>

              <OutageTable
                outages={outagesData}
              />
            </>
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              {t('outages.noDataForPeriod')}
            </Alert>
          )}
        </>
      )}
    </Box>
  );
}
