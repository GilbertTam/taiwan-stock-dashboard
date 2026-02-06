'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  CircularProgress, Alert
} from '@mui/material';
import { format } from 'date-fns';
import {
  fetchInterconnectionFlows
} from '@/services/api';
import {
  InterconnectionFlow
} from '@/types';
import InterconnectionChart from '../InterconnectionChart';

interface InterconnectionPanelProps {
  startDate: Date | null;
  endDate: Date | null;
  selectedArea: string;
}

export default function InterconnectionPanel({ startDate, endDate, selectedArea }: InterconnectionPanelProps) {
  const [loading, setLoading] = useState(false);
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

  // Fetch interconnection data
  useEffect(() => {
    const params = getApiParams();
    if (!params) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const interconnection = await fetchInterconnectionFlows(params).catch(err => { 
          console.error('Error fetching interconnection:', err); 
          return []; 
        });
        setInterconnectionData(interconnection);
      } catch (err) {
        console.error('Error fetching interconnection data:', err);
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
          {interconnectionData.length > 0 ? (
            <InterconnectionChart data={interconnectionData} />
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              互連流量資料：該時段無資料 (Interconnection Flow: No data available for this period)
            </Alert>
          )}
        </>
      )}
    </Box>
  );
}
