import React, { useMemo } from 'react';
import { Box, Paper, Typography, Divider, Grid } from '@mui/material';
import { useTheme } from '@/app/ThemeProvider';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceArea,
  ReferenceLine,
  Label
} from 'recharts';
import { format, parseISO } from 'date-fns';

// 1. 修改 Tooltip 元件：增加 type 參數來過濾顯示內容
const WeatherTooltip = ({ active, payload, label, allData, darkMode, type }) => {
  if (!active || !allData) return null;

  // 獲取當前時間點
  const currentLabel = payload?.[0]?.payload?.weather_datetime || label;
  if (!currentLabel) return null;

  // 查表獲取完整數據
  const currentData = allData.find(d => d.weather_datetime === currentLabel);
  if (!currentData) return null;

  // 定義所有可能的欄位
  const allItems = {
    temp: [
        { label: '實際溫度(', value: currentData.temperature_actual, unit: '°C', color: '#ff4d4f' },
        { label: '預報溫度', value: currentData.temperature_forecast, unit: '°C', color: '#ff7875' },
        { label: '實際降雨', value: currentData.rainfall_actual, unit: 'mm', color: '#82ca9d' },
        { label: '預報降雨', value: currentData.rainfall_forecast, unit: 'mm', color: '#b7eb8f' },
    ],
    wind: [
        { label: '實際風速', value: currentData.wind_speed_actual, unit: 'm/s', color: '#d46b08' },
        { label: '預報風速', value: currentData.wind_speed_forecast, unit: 'm/s', color: '#faad14' },
    ]
  };

  // 根據 type 決定要顯示哪些欄位
  const items = type === 'wind' ? allItems.wind : allItems.temp;

  // 過濾掉無效值
  const validItems = items.filter(item => item.value !== null && item.value !== undefined);

  if (validItems.length === 0) return null;

  return (
    <Paper sx={{ 
      p: 1.5, 
      border: '1px solid rgba(255, 255, 255, 0.2)', 
      backgroundColor: darkMode ? 'rgba(20, 20, 20, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      color: darkMode ? '#fff' : '#000',
      boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
      minWidth: '160px',
      maxWidth: '220px',
      zIndex: 1000, 
      pointerEvents: 'none'
    }}>
      <Typography variant="body2" fontWeight="bold" sx={{ mb: 1, borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`, pb: 0.5 }}>
        {format(parseISO(currentLabel), 'MM/dd HH:mm')}
      </Typography>
      {validItems.map((entry, index) => (
        <Box key={index} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: entry.color }} />
              <Typography variant="caption" sx={{ color: darkMode ? '#ccc' : '#666' }}>
              {entry.label}:
              </Typography>
          </Box>
          <Typography variant="caption" fontWeight="bold" sx={{ color: darkMode ? '#fff' : '#000' }}>
            {entry.value} {entry.unit}
          </Typography>
        </Box>
      ))}
    </Paper>
  );
};

const WeatherChartSection = ({ weatherActual, weatherForecast, weatherChartData }) => {
  const { darkMode } = useTheme();

  const chartColors = {
    grid: darkMode ? '#333' : '#eee',
    text: darkMode ? '#aaa' : '#666',
    tempActual: '#ff4d4f',
    tempForecast: '#ff7875',
    rainActual: '#82ca9d',
    rainForecast: '#b7eb8f',
    windActual: '#d46b08',
    windForecast: '#faad14',
    dividerLine: darkMode ? '#ffffff' : '#555555',
  };

  const sortedData = useMemo(() => {
    if (!weatherChartData) return [];
    return [...weatherChartData].sort((a, b) => 
      new Date(a.weather_datetime).getTime() - new Date(b.weather_datetime).getTime()
    );
  }, [weatherChartData]);

  const predictionStartDate = useMemo(() => {
    if (!sortedData || sortedData.length === 0) return null;

    let lastActualIndex = -1;
    for (let i = sortedData.length - 1; i >= 0; i--) {
      const val = sortedData[i].temperature_actual;
      if (val !== null && val !== undefined) {
        lastActualIndex = i;
        break;
      }
    }

    if (lastActualIndex === -1) return sortedData.length > 0 ? sortedData[0].weather_datetime : null;
    if (lastActualIndex === sortedData.length - 1) return null;

    return sortedData[lastActualIndex].weather_datetime;
  }, [sortedData]);

  const Y_AXIS_LEFT_WIDTH = 40;
  const Y_AXIS_RIGHT_WIDTH = 40;

  if (!weatherActual.length && !weatherForecast.length) return null;

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        天氣資訊 (Weather Information)
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Paper elevation={0} variant="outlined" sx={{ 
        p: 3, 
        borderRadius: 2, 
        bgcolor: darkMode ? '#141414' : '#fff',
        borderColor: darkMode ? '#333' : '#e0e0e0'
      }}>
        <Grid container spacing={4}>
          
          {/* === 上半部：氣溫與降雨 === */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ color: chartColors.tempActual }}>
                氣溫與降雨趨勢 (Temperature and Rainfall Trend)
              </Typography>
            </Box>
            
            <Box sx={{ height: 300, width: '100%' }}>
              <ResponsiveContainer>
                <ComposedChart
                  data={sortedData}
                  syncId="weatherId"
                  margin={{ top: 10, right: 0, left: 0, bottom: 0 }} 
                >
                  <defs>
                    <pattern id="forecastPattern" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
                      <line x1="0" y1="0" x2="0" y2="10" stroke={darkMode ? "#ffffff" : "#000000"} strokeWidth="1" opacity="0.1" />
                    </pattern>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                  
                  {predictionStartDate && (
                    <ReferenceArea
                      x1={predictionStartDate}
                      yAxisId="left"
                      fill="url(#forecastPattern)"
                      fillOpacity={1}
                    >
                        <Label 
                            value="預測區間" 
                            position="insideTopRight" 
                            fill={chartColors.text} 
                            fontSize={12}
                            offset={10}
                            style={{ fontWeight: 'bold', textShadow: '0 0 5px rgba(0,0,0,0.5)' }}
                        />
                    </ReferenceArea>
                  )}

                  {predictionStartDate && (
                    <ReferenceLine 
                        x={predictionStartDate} 
                        stroke={chartColors.dividerLine} 
                        strokeDasharray="3 3" 
                        strokeWidth={2}
                        yAxisId="left"
                        isFront={true}
                    />
                  )}
                  
                  <XAxis 
                    dataKey="weather_datetime" 
                    tickFormatter={(str) => str ? format(parseISO(str), 'MM/dd HH:mm') : ''}
                    tick={{ fontSize: 11, fill: chartColors.text }}
                    minTickGap={50}
                    axisLine={{ stroke: chartColors.grid }}
                    tickLine={false}
                  />
                  
                  <YAxis yAxisId="left" width={Y_AXIS_LEFT_WIDTH} tick={{ fontSize: 11, fill: chartColors.text }} axisLine={false} tickLine={false} unit="°C" domain={['auto', 'auto']} />
                  <YAxis yAxisId="right" orientation="right" width={Y_AXIS_RIGHT_WIDTH} tick={{ fontSize: 11, fill: chartColors.text }} axisLine={false} tickLine={false} unit="mm" />
                  
                  {/* === 上方圖表 Tooltip：指定 type="temp" === */}
                  <Tooltip 
                    content={<WeatherTooltip allData={sortedData} darkMode={darkMode} type="temp" />}
                    wrapperStyle={{ zIndex: 1000 }}
                  />
                  
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ paddingTop: '10px' }}/>

                  <Bar yAxisId="right" dataKey="rainfall_forecast" name="預報降雨" fill={chartColors.rainForecast} barSize={20} unit="mm" fillOpacity={0.3} />
                  <Bar yAxisId="right" dataKey="rainfall_actual" name="實際降雨" fill={chartColors.rainActual} barSize={20} unit="mm" />
                  <Line yAxisId="left" type="monotone" dataKey="temperature_forecast" name="預報溫度" stroke={chartColors.tempForecast} strokeDasharray="5 5" dot={false} activeDot={{ r: 6 }} strokeWidth={2} unit="°C" />
                  <Line yAxisId="left" type="monotone" dataKey="temperature_actual" name="實際溫度" stroke={chartColors.tempActual} dot={false} activeDot={{ r: 6 }} strokeWidth={2} unit="°C" />
                </ComposedChart>
              </ResponsiveContainer>
            </Box>
          </Grid>

          {/* === 下半部：風速 === */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ color: chartColors.windActual }}>
              風速變化 (Wind Speed Trend)
            </Typography>
            
            <Box sx={{ height: 160, width: '100%' }}>
              <ResponsiveContainer>
                <AreaChart
                  data={sortedData}
                  syncId="weatherId"
                  margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorWind" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.windActual} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={chartColors.windActual} stopOpacity={0.1}/>
                    </linearGradient>
                    <pattern id="forecastPatternWind" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
                        <line x1="0" y1="0" x2="0" y2="10" stroke={darkMode ? "#ffffff" : "#000000"} strokeWidth="1" opacity="0.1" />
                    </pattern>
                  </defs>

                   {predictionStartDate && (
                    <ReferenceArea x1={predictionStartDate} fill="url(#forecastPatternWind)" fillOpacity={1} />
                  )}
                   {predictionStartDate && (
                    <ReferenceLine x={predictionStartDate} stroke={chartColors.dividerLine} strokeDasharray="3 3" strokeWidth={2} isFront={true} />
                  )}

                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                  <XAxis 
                    dataKey="weather_datetime" 
                    tickFormatter={(str) => str ? format(parseISO(str), 'MM/dd HH:mm') : ''}
                    tick={{ fontSize: 11, fill: chartColors.text }}
                    minTickGap={50}
                    axisLine={{ stroke: chartColors.grid }}
                    tickLine={false}
                  />
                  
                  <YAxis width={Y_AXIS_LEFT_WIDTH} tick={{ fontSize: 11, fill: chartColors.text }} axisLine={false} tickLine={false} unit="m/s" />
                  <YAxis yAxisId="dummy-right" orientation="right" width={Y_AXIS_RIGHT_WIDTH} tick={false} axisLine={false} />

                  {/* === 下方圖表 Tooltip：指定 type="wind" === */}
                  <Tooltip 
                    content={<WeatherTooltip allData={sortedData} darkMode={darkMode} type="wind" />}
                    cursor={{ stroke: chartColors.text, strokeWidth: 1, strokeDasharray: '3 3' }}
                    wrapperStyle={{ zIndex: 1000 }}
                  />
                  
                  <Area type="monotone" dataKey="wind_speed_forecast" name="預報風速" stroke={chartColors.windForecast} fill="url(#colorWind)" fillOpacity={0.3} strokeDasharray="5 5" unit="m/s" />
                  <Area type="monotone" dataKey="wind_speed_actual" name="實際風速" stroke={chartColors.windActual} fill="url(#colorWind)" strokeWidth={2} unit="m/s" />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default WeatherChartSection;