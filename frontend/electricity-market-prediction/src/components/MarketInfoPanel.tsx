'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Typography, FormControlLabel, Switch, 
  CircularProgress, Grid, Divider, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, Chip
} from '@mui/material';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Bar
} from 'recharts';
import { format } from 'date-fns';
import { 
  fetchImbalance, fetchHjksOutages, fetchWeatherActual, fetchInterconnectionFlows,
  fetchIntraday, fetchOcctoArea
} from '@/services/api';
import { 
  ImbalanceData, HjksOutage, WeatherData, InterconnectionFlow, IntradayData, OcctoAreaData 
} from '@/types';

interface MarketInfoPanelProps {
  startDate: Date | null;
  endDate: Date | null;
  selectedArea: string;
}

export default function MarketInfoPanel({ startDate, endDate, selectedArea }: MarketInfoPanelProps) {
  const [loading, setLoading] = useState(false);
  
  // Toggles
  const [showImbalance, setShowImbalance] = useState(false);
  const [showWeather, setShowWeather] = useState(false);
  const [showOutages, setShowOutages] = useState(false);
  const [showInterconnection, setShowInterconnection] = useState(false);
  
  // Data
  const [imbalanceData, setImbalanceData] = useState<ImbalanceData[]>([]);
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
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

  // Fetch Imbalance
  useEffect(() => {
    const params = getApiParams();
    if (showImbalance && params && imbalanceData.length === 0) {
      setLoading(true);
      fetchImbalance(params)
        .then(data => setImbalanceData(data))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [showImbalance, startDate, endDate]);

  // Fetch Weather
  useEffect(() => {
    const params = getApiParams();
    if (showWeather && params && weatherData.length === 0) {
      setLoading(true);
      fetchWeatherActual(params)
        .then(data => setWeatherData(data))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [showWeather, startDate, endDate, selectedArea]);

  // Fetch Outages
  useEffect(() => {
    const params = getApiParams();
    if (showOutages && params && outagesData.length === 0) {
      setLoading(true);
      fetchHjksOutages(params)
        .then(data => setOutagesData(data))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [showOutages, startDate, endDate, selectedArea]);

  // Fetch Interconnection
  useEffect(() => {
    const params = getApiParams();
    if (showInterconnection && params && interconnectionData.length === 0) {
      setLoading(true);
      fetchInterconnectionFlows(params)
        .then(data => setInterconnectionData(data))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [showInterconnection, startDate, endDate]);

  // Reset data when date or area changes
  useEffect(() => {
    setImbalanceData([]);
    setWeatherData([]);
    setOutagesData([]);
    setInterconnectionData([]);
  }, [startDate, endDate, selectedArea]);

  if (!startDate || !endDate) return null;

  return (
    <Paper sx={{ p: 3, mt: 3, borderRadius: 2, boxShadow: 3 }}>
      <Typography variant="h6" gutterBottom fontWeight="bold">
        市場資訊分析 (Market Information Analysis)
      </Typography>
      <Divider sx={{ mb: 2 }} />
      
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <FormControlLabel 
          control={<Switch checked={showImbalance} onChange={e => setShowImbalance(e.target.checked)} />} 
          label="不平衡電價 (Imbalance)" 
        />
        <FormControlLabel 
          control={<Switch checked={showWeather} onChange={e => setShowWeather(e.target.checked)} />} 
          label="天氣資訊 (Weather)" 
        />
        <FormControlLabel 
          control={<Switch checked={showOutages} onChange={e => setShowOutages(e.target.checked)} />} 
          label="發電廠停機 (Outages)" 
        />
        <FormControlLabel 
          control={<Switch checked={showInterconnection} onChange={e => setShowInterconnection(e.target.checked)} />} 
          label="連系線流量 (Interconnection)" 
        />
      </Box>

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress /></Box>}

      {/* Imbalance Chart */}
      {showImbalance && imbalanceData.length > 0 && (
        <Box sx={{ mb: 4, height: 350 }}>
          <Typography variant="subtitle1" gutterBottom fontWeight="bold">不平衡電價 ({selectedArea})</Typography>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={imbalanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="datetime" tickFormatter={(t) => t.split(' ')[0].slice(5) + ' ' + t.split(' ')[1].slice(0,5)} />
              <YAxis />
              <Tooltip />
              <Legend />
              {/* Imbalance has fields like 'tokyo', 'kansai', etc. We should show selected area or all? */}
              {/* Map selectedArea to field name */}
              <Line type="monotone" dataKey={selectedArea.toLowerCase()} stroke="#8884d8" name={`${selectedArea} Imbalance`} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}

      {/* Weather Chart */}
      {showWeather && weatherData.length > 0 && (
        <Box sx={{ mb: 4, height: 350 }}>
          <Typography variant="subtitle1" gutterBottom fontWeight="bold">天氣 ({selectedArea})</Typography>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={weatherData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="weather_datetime" tickFormatter={(t) => t.slice(5, 16).replace('T', ' ')} />
              <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
              <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="temperature" stroke="#8884d8" name="Temperature (°C)" />
              <Bar yAxisId="right" dataKey="rainfall" fill="#82ca9d" name="Rainfall (mm)" />
              <Line yAxisId="right" type="monotone" dataKey="wind_speed" stroke="#ffc658" name="Wind Speed (m/s)" />
            </ComposedChart>
          </ResponsiveContainer>
        </Box>
      )}

      {/* Interconnection Chart */}
      {showInterconnection && interconnectionData.length > 0 && (
        <Box sx={{ mb: 4, height: 350 }}>
           <Typography variant="subtitle1" gutterBottom fontWeight="bold">連系線流量</Typography>
           <ResponsiveContainer width="100%" height="100%">
            <LineChart data={interconnectionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="datetime" tickFormatter={(t) => t.split(' ')[0].slice(5) + ' ' + t.split(' ')[1].slice(0,5)} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="forward_planned_flow" stroke="#8884d8" name="Forward Planned Flow" />
              <Line type="monotone" dataKey="reverse_planned_flow" stroke="#82ca9d" name="Reverse Planned Flow" />
              {/* Note: Interconnection data structure might vary, check fields */}
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}

      {/* Outages Table */}
      {showOutages && outagesData.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom fontWeight="bold">發電廠停機 ({selectedArea})</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Company</TableCell>
                  <TableCell>Plant</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Capacity (kW)</TableCell>
                  <TableCell>Start</TableCell>
                  <TableCell>End</TableCell>
                  <TableCell>Reason</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {outagesData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.company}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.unit_name}</TableCell>
                    <TableCell>{row.stop_type}</TableCell>
                    <TableCell>{row.max_capacity?.toLocaleString()}</TableCell>
                    <TableCell>{row.start_datetime.split(' ')[0]}</TableCell>
                    <TableCell>{row.end_datetime.split(' ')[0]}</TableCell>
                    <TableCell>{row.factor}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Paper>
  );
}
