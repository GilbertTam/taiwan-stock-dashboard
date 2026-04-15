'use client';

import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Chip, Stack,
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
  /** compact 模式：只顯示 Gantt + 摘要，不顯示詳細表格 */
  compact?: boolean;
}

export default function OutagesPanel({ startDate, endDate, selectedArea, compact = false }: OutagesPanelProps) {
  const { t } = useTranslation(['generationMix', 'forecast']);
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
              <Typography variant="subtitle1" gutterBottom fontWeight="bold" sx={{ mb: compact ? 1 : 2 }}>
                {t('generationMix:outages.panelTitle')} - {selectedArea}
              </Typography>

              {/* compact 摘要 Chips */}
              {compact && (
                <Stack direction="row" spacing={0.75} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
                  <Chip
                    size="small"
                    label={t('forecast:compactSummary.outageCount', { count: outagesData.length })}
                    sx={{ fontWeight: 600 }}
                  />
                  <Chip
                    size="small"
                    label={t('forecast:compactSummary.affectedCapacity', {
                      value: outagesData.reduce((sum, o) => sum + (o.max_capacity ?? 0), 0).toLocaleString(),
                    })}
                    sx={{ fontWeight: 600, backgroundColor: 'rgba(255,152,0,0.12)', color: '#ffa726' }}
                  />
                </Stack>
              )}

              {/* Gantt Chart */}
              <Paper variant="outlined" sx={{ p: compact ? 1.5 : 2, mb: compact ? 0 : 3, backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                <OutageGanttChart
                  outages={outagesData}
                  startDate={startDate}
                  endDate={endDate}
                />
              </Paper>

              {/* Outages Table — full 模式才顯示 */}
              {!compact && (
                <>
                  <Typography variant="h6" sx={{ mt: 4, mb: 2, fontWeight: 'bold' }}>
                    {t('generationMix:outages.detailedInfo')}
                  </Typography>

                  <OutageTable
                    outages={outagesData}
                  />
                </>
              )}
            </>
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              {t('generationMix:outages.noDataForPeriod')}
            </Alert>
          )}
        </>
      )}
    </Box>
  );
}
