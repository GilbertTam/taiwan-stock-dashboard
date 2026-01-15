'use client';

import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography,
  CircularProgress, Divider, Alert
} from '@mui/material';
import { useTheme } from '@/app/ThemeProvider';
import { format, parseISO } from 'date-fns';
import {
  fetchHjksOutages, fetchInterconnectionFlows
} from '@/services/api';
import {
  HjksOutage, InterconnectionFlow
} from '@/types';
import OutageGanttChart from './OutageGanttChart';
import OutageTable from './OutageTable';
import InterconnectionChart from './InterconnectionChart';


interface MarketInfoPanelProps {
  startDate: Date | null;
  endDate: Date | null;
  selectedArea: string;
}

export default function MarketInfoPanel({ startDate, endDate, selectedArea }: MarketInfoPanelProps) {
  const { darkMode } = useTheme();
  const [loading, setLoading] = useState(false);

  // 自定義 Tooltip 組件，與主要圖表保持一致的 style
  const CustomTooltip = ({ active, payload, label }: any) => {
    const colors = {
      background: darkMode ? '#1a1a1a' : '#ffffff',
      text: darkMode ? '#d9d9d9' : '#000000',
      border: darkMode ? '#444' : '#d9d9d9',
      headerBg: darkMode ? '#2a2a2a' : '#f0f0f0',
    };

    if (active && payload && payload.length) {
      const data = payload[0].payload;

      return (
        <div style={{
          backgroundColor: colors.background,
          color: colors.text,
          border: `1px solid ${colors.border}`,
          borderRadius: '4px',
          padding: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          fontSize: '12px'
        }}>
          <div style={{
            backgroundColor: colors.headerBg,
            padding: '4px 8px',
            marginBottom: '4px',
            borderBottom: `1px solid ${colors.border}`,
            fontWeight: 'bold'
          }}>
            {label}
          </div>
          {payload.map((entry: any, index: number) => (
            <div key={index} style={{ marginBottom: '4px' }}>
              <span style={{ color: entry.color }}>●</span>
              {entry.name}: {entry.value}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // 預設開啟所有市場資訊
  const showOutages = true;
  const showInterconnection = true;

  // Data
  const [outagesData, setOutagesData] = useState<HjksOutage[]>([]);
  const [interconnectionData, setInterconnectionData] = useState<InterconnectionFlow[]>([]);

  // Format dates for API
  const getApiParams = () => {
    if (!startDate || !endDate) return null;
    return {
      start_date: format(startDate, 'yyyyMMdd'),
      end_date: format(endDate, 'yyyyMMdd'),
      area_name: selectedArea
    };
  };

  // Fetch all market data on mount and when params change
  useEffect(() => {
    const params = getApiParams();
    if (!params) return;

    const fetchAllData = async () => {
      setLoading(true);
      try {
        const [outages, interconnection] = await Promise.all([
          fetchHjksOutages(params).catch(err => { console.error('Error fetching outages:', err); return []; }),
          fetchInterconnectionFlows(params).catch(err => { console.error('Error fetching interconnection:', err); return []; })
        ]);

        setOutagesData(outages);
        setInterconnectionData(interconnection);
      } catch (err) {
        console.error('Error fetching market data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [startDate, endDate, selectedArea]);

  if (!startDate || !endDate) return null;

  return (
    <Paper sx={{ p: 3, mt: 3, borderRadius: 2, boxShadow: 3 }}>
      <Typography variant="h6" gutterBottom fontWeight="bold">
        市場資訊分析 (Market Information Analysis)
      </Typography>
      <Divider sx={{ mb: 2 }} />

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress /></Box>}

      {!loading && (
        <>
          {/* Check if all data is empty */}
          {interconnectionData.length === 0 && outagesData.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              該時段無資料 (No data available for this period)
            </Alert>
          ) : (
            <>
              {/* Interconnection Chart - Composed Mirror Chart */}
              {showInterconnection && (
                <>
                  {interconnectionData.length > 0 ? (
                    <InterconnectionChart data={interconnectionData} />
                  ) : (
                    <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                      互連流量資料：該時段無資料 (Interconnection Flow: No data available for this period)
                    </Alert>
                  )}
                </>
              )}

              {/* Outages Gantt Chart and Table */}
              {showOutages && startDate && endDate && (
                <Box sx={{ mb: 4 }}>
                  {outagesData.length > 0 ? (
                    <>
                      <Typography variant="subtitle1" gutterBottom fontWeight="bold">Power Plant Outage ({selectedArea})</Typography>

                      {/* Gantt Chart */}
                      <Paper variant="outlined" sx={{ p: 2, mb: 2, backgroundColor: darkMode ? '#1a1a1a' : '#ffffff' }}>
                        <OutageGanttChart
                          outages={outagesData}
                          startDate={startDate}
                          endDate={endDate}
                        />
                      </Paper>

                      {/* Outages Table */}
                      <Typography variant="h5" sx={{ mt: 4, mb: 2, fontWeight: 'bold' }}>
                        Detailed Information
                      </Typography>

                      {/* 2. 放置列表表格 */}
                      <OutageTable
                        outages={outagesData}
                      />
                    </>
                  ) : (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      電廠停機資料：該時段無資料 (Power Plant Outage: No data available for this period)
                    </Alert>
                  )}
                </Box>
              )}
            </>
          )}
        </>
      )}
    </Paper>
  );
}
