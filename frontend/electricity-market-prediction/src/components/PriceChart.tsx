'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Area, ComposedChart
} from 'recharts';
import { format, parseISO, addDays, subDays } from 'date-fns';
import { Box, Typography, Switch, FormControlLabel, Paper, useTheme as useMuiTheme, 
  Select, MenuItem, FormControl, Grid, Chip, Table, TableBody, TableCell, TableRow,
  Slider, IconButton, Tooltip as MuiTooltip } from '@mui/material';
import { ChartDataPoint } from '@/utils/chartUtils';
import { useTheme } from '@/app/ThemeProvider';
import InfoIcon from '@mui/icons-material/Info';
import SettingsIcon from '@mui/icons-material/Settings';

interface PriceChartProps {
  chartData: ChartDataPoint[];
  areaName: string;
}

const PriceChart: React.FC<PriceChartProps> = ({ chartData, areaName }) => {
  const { darkMode } = useTheme();
  const muiTheme = useMuiTheme();
  const [showPredictionRange, setShowPredictionRange] = useState(true);
  const [chartType, setChartType] = useState<'line' | 'stepLine'>('stepLine');
  const [adjacentPointsCount, setAdjacentPointsCount] = useState(1); // 預設顯示前後1個時間點
  const [showSettings, setShowSettings] = useState(false);
  
  // 顏色設定
  const colors = {
    actual: '#ff4d4f',
    predicted: '#36cfc9',
    p5p95Area: 'rgba(54, 207, 201, 0.2)',
    nowLine: '#52c41a',
    grid: '#333',
    background: '#1a1a1a',
    text: '#d9d9d9',
    subText: '#a6a6a6',
    tooltipBg: 'rgba(33, 33, 33, 0.95)',
    tooltipBorder: '#444',
    tooltipHeaderBg: '#2a2a2a',
    delta: {
      positive: '#52c41a',
      negative: '#f5222d',
      neutral: '#a6a6a6'
    }
  };
  
  // 計算價格範圍
  const priceRange = useMemo(() => {
    if (chartData.length === 0) return { min: 0, max: 35 };
    
    const allPrices = chartData.flatMap(item => [
      item.actualPrice,
      item.predictedPrice,
      item.predictedPrice5,
      item.predictedPrice95
    ].filter(Boolean) as number[]);
    
    const min = Math.floor(Math.min(...allPrices) * 0.9);
    const max = Math.ceil(Math.max(...allPrices) * 1.1);
    
    return { min: Math.max(0, min), max: Math.max(35, max) };
  }, [chartData]);
  
  // 找出實際價格和預測價格的分界點
  const nowReference = useMemo(() => {
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute < 30 ? '00' : '30'}`;
    return `${today} ${currentTimeStr}`;
  }, []);
  
  // 計算 MAE (Mean Absolute Error)
  const mae = useMemo(() => {
    const pointsWithBothValues = chartData.filter(
      point => point.actualPrice !== null && point.predictedPrice !== null
    );
    
    if (pointsWithBothValues.length === 0) return null;
    
    const totalError = pointsWithBothValues.reduce(
      (sum, point) => sum + Math.abs((point.actualPrice as number) - (point.predictedPrice as number)),
      0
    );
    
    return totalError / pointsWithBothValues.length;
  }, [chartData]);
  
  // 處理數據，為 P5-P95 區間添加正確的數據結構
  // 同時添加唯一的 key 以解決重複 key 問題
  const processedChartData = useMemo(() => {
    return chartData.map((point, index) => {
      // 計算預測與實際值的差距（如果兩者都存在）
      const difference = 
        point.actualPrice !== null && point.predictedPrice !== null
          ? point.predictedPrice - point.actualPrice
          : null;
      
      // 計算與上一個時間點實際值的差異（如果有提供）
      const actualDelta = 
        index > 0 && point.actualPrice !== null && chartData[index - 1].actualPrice !== null
          ? point.actualPrice - (chartData[index - 1].actualPrice as number)
          : null;
      
      return {
        ...point,
        // 為了正確顯示 P5-P95 區間
        areaBottom: point.predictedPrice5,
        areaTop: point.predictedPrice95,
        // 添加差距
        difference: difference,
        // 添加與上一個時間點實際值的差異
        actualDelta: actualDelta,
        // 添加唯一 key 解決重複 key 問題
        uniqueKey: `${point.dateTime}-${index}`
      };
    });
  }, [chartData]);
  
  // 計算默認顯示區間 - 顯示最近 3 天的數據
  const defaultDisplayRange = useMemo(() => {
    if (processedChartData.length === 0) return { startIndex: 0, endIndex: 0 };
    
    const now = new Date();
    const threeDaysAgo = subDays(now, 3);
    const threeDaysAgoStr = format(threeDaysAgo, 'yyyy-MM-dd');
    
    // 找到 3 天前的索引
    const startIndex = processedChartData.findIndex(point => 
      point.dateTime.split(' ')[0] >= threeDaysAgoStr
    );
    
    return {
      startIndex: startIndex >= 0 ? startIndex : 0,
      endIndex: processedChartData.length - 1
    };
  }, [processedChartData]);
  
  // 生成 X 軸的刻度位置 - 動態調整以避免重疊
  const generateXAxisTicks = useCallback(() => {
    if (processedChartData.length === 0) return [];
    
    const dataLength = processedChartData.length;
    
    // 根據數據量動態調整刻度數量
    // 當數據量大時，減少刻度數量以避免重疊
    let interval = 1;
    if (dataLength > 48) interval = 6;      // 每6小時一個刻度
    else if (dataLength > 24) interval = 3; // 每3小時一個刻度
    
    const ticks: string[] = [];
    let lastDate = '';
    
    processedChartData.forEach((point, index) => {
      const [datePart, timePart] = point.dateTime.split(' ');
      const hour = parseInt(timePart.split(':')[0], 10);
      const minute = parseInt(timePart.split(':')[1], 10);
      
      // 每天的 00:00 必須顯示
      if (datePart !== lastDate && hour === 0 && minute === 0) {
        lastDate = datePart;
        ticks.push(point.dateTime);
        return;
      }
      
      // 根據間隔添加時間刻度
      if (hour % interval === 0 && minute === 0) {
        ticks.push(point.dateTime);
      }
    });
    
    return ticks;
  }, [processedChartData]);
  
  // 自定義 X 軸刻度格式化 - 優化顯示以避免重疊
  const formatXAxis = useCallback((dateTime: string) => {
    if (!dateTime) return '';
    
    const [datePart, timePart] = dateTime.split(' ');
    if (!datePart || !timePart) return '';
    
    const date = parseISO(datePart);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = parseInt(timePart.split(':')[0], 10);
    
    // 00:00 顯示日期 (改為月/日格式)
    if (hour === 0 && timePart === '00:00') {
      return `${month}/${day}`;
    }
    
    // 其他時間只顯示小時
    return `${hour}:00`;
  }, []);
  
  // 格式化時間顯示，正確處理半小時
  const formatTimeDisplay = useCallback((dateTime: string) => {
    if (!dateTime) return '';
    
    const [datePart, timePart] = dateTime.split(' ');
    if (!datePart || !timePart) return '';
    
    const [hour, minute] = timePart.split(':');
    return `${hour}:${minute}`;
  }, []);
  
  // 自定義工具提示 - 表格式顯示，參考附圖
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const [datePart, timePart] = data.dateTime.split(' ');
      const formattedDate = format(parseISO(datePart), 'MM/dd'); // 改為月/日格式
      const [hour, minute] = timePart.split(':');
      
      // 找出當前時間點的索引
      const currentIndex = processedChartData.findIndex(p => p.dateTime === data.dateTime);
      
      // 計算要顯示的前後時間點的索引範圍
      const startIndex = Math.max(0, currentIndex - adjacentPointsCount);
      const endIndex = Math.min(processedChartData.length - 1, currentIndex + adjacentPointsCount);
      
      // 獲取要顯示的所有時間點數據
      const displayPoints = [];
      for (let i = startIndex; i <= endIndex; i++) {
        displayPoints.push({
          data: processedChartData[i],
          isCurrent: i === currentIndex
        });
      }
      
      // 計算表格寬度，根據顯示的時間點數量動態調整
      const tableWidth = Math.min(1200, Math.max(400, 120 + displayPoints.length * 120));
      
      return (
        <Paper elevation={3} sx={{ 
          backgroundColor: colors.tooltipBg,
          color: colors.text,
          borderRadius: '4px',
          border: `1px solid ${colors.tooltipBorder}`,
          overflow: 'hidden',
          width: `${tableWidth}px`, // 使用更寬的動態寬度
          maxWidth: '98vw', //  98vw 確保在大多數設備上能顯示完整
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}>
          <Box sx={{ 
            backgroundColor: colors.tooltipHeaderBg, 
            p: 1, 
            borderBottom: `1px solid ${colors.tooltipBorder}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Typography variant="subtitle2" fontWeight="bold">
              {`${areaName} - ${formattedDate} ${hour}:${minute}`}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <InfoIcon fontSize="small" sx={{ color: colors.subText }} />
              <Typography variant="caption" sx={{ color: colors.subText }}>
                {`Beginning of period`}
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ overflowX: 'auto', width: '100%' }}>
            <Table size="small" sx={{ 
              minWidth: `${displayPoints.length * 100}px`, // 確保表格足夠寬
              '& .MuiTableCell-root': { 
                borderBottom: 'none', 
                py: 0.5,
                px: 1.5, // 增加水平內邊距
                minWidth: '90px', // 確保每個單元格有足夠寬度
                whiteSpace: 'nowrap' // 防止文字換行
              } 
            }}>
              <TableBody>
                {/* 顯示時間行 */}
                <TableRow>
                  <TableCell sx={{ color: colors.subText, width: '100px', minWidth: '100px' }}>Date/Time:</TableCell>
                  {displayPoints.map((point, index) => {
                    const [_, pointTime] = point.data.dateTime.split(' ');
                    return (
                      <TableCell 
                        key={`time-${index}`}
                        align="center" 
                        sx={{ 
                          color: colors.text,
                          fontWeight: point.isCurrent ? 'bold' : 'normal',
                          backgroundColor: point.isCurrent ? 'rgba(255,255,255,0.05)' : 'transparent',
                          width: '80px',
                          minWidth: '80px'
                        }}
                      >
                        {formatTimeDisplay(point.data.dateTime)}
                      </TableCell>
                    );
                  })}
                </TableRow>
                
                {/* 預測價格行 */}
                <TableRow>
                  <TableCell sx={{ color: colors.predicted }}>Forecasting:</TableCell>
                  {displayPoints.map((point, index) => (
                    <TableCell 
                      key={`forecast-${index}`}
                      align="center" 
                      sx={{ 
                        color: colors.predicted,
                        fontWeight: point.isCurrent ? 'bold' : 'normal',
                        backgroundColor: point.isCurrent ? 'rgba(255,255,255,0.05)' : 'transparent'
                      }}
                    >
                      {point.data.predictedPrice !== null 
                        ? point.data.predictedPrice.toFixed(2) 
                        : '-'}
                    </TableCell>
                  ))}
                </TableRow>
                
                {/* 顯示預測與實際值的差異 */}
                <TableRow>
                  <TableCell sx={{ color: colors.subText }}>Forecast-Actual:</TableCell>
                  {displayPoints.map((point, index) => (
                    <TableCell 
                      key={`diff-${index}`}
                      align="center" 
                      sx={{ 
                        color: point.data.difference > 0 
                          ? colors.delta.positive 
                          : point.data.difference < 0 
                            ? colors.delta.negative 
                            : colors.delta.neutral,
                        fontWeight: point.isCurrent ? 'bold' : 'normal',
                        backgroundColor: point.isCurrent ? 'rgba(255,255,255,0.05)' : 'transparent'
                      }}
                    >
                      {point.data.difference !== null 
                        ? point.data.difference.toFixed(2) 
                        : '-'}
                    </TableCell>
                  ))}
                </TableRow>
                
                {/* 實際價格行 */}
                <TableRow>
                  <TableCell sx={{ color: colors.actual }}>Observation:</TableCell>
                  {displayPoints.map((point, index) => (
                    <TableCell 
                      key={`actual-${index}`}
                      align="center" 
                      sx={{ 
                        color: colors.actual,
                        fontWeight: point.isCurrent ? 'bold' : 'normal',
                        backgroundColor: point.isCurrent ? 'rgba(255,255,255,0.05)' : 'transparent'
                      }}
                    >
                      {point.data.actualPrice !== null 
                        ? point.data.actualPrice.toFixed(2) 
                        : '-'}
                    </TableCell>
                  ))}
                </TableRow>
                
                {/* 顯示與上一個時間點實際值的差異 */}
                <TableRow>
                  <TableCell sx={{ color: colors.subText }}>Actual Delta:</TableCell>
                  {displayPoints.map((point, index) => (
                    <TableCell 
                      key={`actualDelta-${index}`}
                      align="center" 
                      sx={{ 
                        color: point.data.actualDelta > 0 
                          ? colors.delta.positive 
                          : point.data.actualDelta < 0 
                            ? colors.delta.negative 
                            : colors.delta.neutral,
                        fontWeight: point.isCurrent ? 'bold' : 'normal',
                        backgroundColor: point.isCurrent ? 'rgba(255,255,255,0.05)' : 'transparent'
                      }}
                    >
                      {point.data.actualDelta !== null 
                        ? point.data.actualDelta.toFixed(2) 
                        : '-'}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </Box>
          
          <Box sx={{ 
            p: 1, 
            borderTop: `1px solid ${colors.tooltipBorder}`,
            backgroundColor: colors.tooltipHeaderBg,
            display: 'flex',
            justifyContent: 'flex-end'
          }}>
            <Typography variant="caption" sx={{ color: colors.subText, fontStyle: 'italic' }}>
              All data in ¥/KWh
            </Typography>
          </Box>
        </Paper>
      );
    }
    return null;
  };
  
  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 2, 
        borderRadius: 2, 
        backgroundColor: colors.background,
        height: '100%',
        border: '1px solid #333'
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={7}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" component="h2" sx={{ color: colors.text, fontWeight: 'bold' }}>
                {`Price ${areaName} Japan`}
              </Typography>
              
              {/* 顯示 MAE */}
              {mae !== null && (
                <Chip 
                  label={`MAE: ${mae.toFixed(2)} ¥/KWh`} 
                  size="small" 
                  sx={{ 
                    backgroundColor: '#333',
                    color: colors.text,
                    fontWeight: 'bold',
                    ml: 1
                  }} 
                />
              )}
              
              {/* 設定按鈕 */}
              <MuiTooltip title="Chart Settings">
                <IconButton 
                  size="small" 
                  onClick={() => setShowSettings(!showSettings)}
                  sx={{ color: colors.subText }}
                >
                  <SettingsIcon fontSize="small" />
                </IconButton>
              </MuiTooltip>
            </Box>
          </Grid>
          <Grid item xs={12} md={5}>
            <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, gap: 2, flexWrap: 'wrap' }}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={showPredictionRange} 
                    onChange={(e) => setShowPredictionRange(e.target.checked)} 
                    color="primary"
                    sx={{ 
                      '& .MuiSwitch-switchBase.Mui-checked': { color: colors.predicted },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: colors.predicted }
                    }}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ color: colors.text }}>
                    顯示預測區間
                  </Typography>
                }
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value as 'line' | 'stepLine')}
                  displayEmpty
                  sx={{ 
                    height: '36px',
                    color: colors.text,
                    '.MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#555' },
                    '.MuiSvgIcon-root': { color: colors.text }
                  }}
                >
                  <MenuItem value="line">平滑曲線</MenuItem>
                  <MenuItem value="stepLine">階梯曲線</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Grid>
        </Grid>
        
        {/* 顯示設定面板 */}
        {showSettings && (
          <Box sx={{ 
            mt: 2, 
            p: 2, 
            backgroundColor: 'rgba(0,0,0,0.2)', 
            borderRadius: 1,
            border: '1px solid #444'
          }}>
            <Typography variant="subtitle2" sx={{ color: colors.text, mb: 1 }}>
              顯示前後時間點數量
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs>
                <Slider
                  value={adjacentPointsCount}
                  onChange={(_, newValue) => setAdjacentPointsCount(newValue as number)}
                  min={1}
                  max={5}
                  step={1}
                  marks
                  valueLabelDisplay="auto"
                  sx={{
                    color: colors.predicted,
                    '& .MuiSlider-markLabel': { color: colors.text }
                  }}
                />
              </Grid>
              <Grid item>
                <Typography sx={{ color: colors.text }}>
                  {adjacentPointsCount}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        )}
        
        <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip 
            label="Observation" 
            size="small" 
            sx={{ 
              backgroundColor: 'transparent', 
              border: `1px solid ${colors.actual}`,
              color: colors.actual,
              '& .MuiChip-label': { fontWeight: 'bold' }
            }} 
          />
          <Chip 
            label="Forecasting" 
            size="small" 
            sx={{ 
              backgroundColor: 'transparent', 
              border: `1px solid ${colors.predicted}`,
              color: colors.predicted,
              '& .MuiChip-label': { fontWeight: 'bold' }
            }} 
          />
          {showPredictionRange && (
            <Chip 
              label="Forecast range (P5-P95)" 
              size="small" 
              sx={{ 
                backgroundColor: 'transparent', 
                border: `1px solid ${colors.p5p95Area}`,
                color: colors.subText,
              }} 
            />
          )}
          <Box sx={{ ml: 'auto' }}>
            <Typography variant="caption" sx={{ color: colors.subText }}>
              All data in ¥/KWh
            </Typography>
          </Box>
        </Box>
      </Box>
      
      {/* 增加底部邊距，解決 X 軸卡到邊緣問題 */}
      <Box sx={{ pb: 3 }}>
        <ResponsiveContainer width="100%" height={450}>
          <ComposedChart
            data={processedChartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 25 }} // 增加底部邊距
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={colors.grid} 
              vertical={true}
              horizontal={true}
            />
            <XAxis 
              dataKey="dateTime" 
              tickFormatter={formatXAxis}
              stroke={colors.text}
              tick={{ fill: colors.text, fontSize: 11 }}
              ticks={generateXAxisTicks()}
              tickLine={{ stroke: colors.text }}
              axisLine={{ stroke: colors.text }}
              height={50}
              padding={{ left: 10, right: 10 }}
              allowDuplicatedCategory={false}
            />
            <YAxis 
              domain={[priceRange.min, priceRange.max]} 
              label={{ 
                value: '¥/KWh', 
                angle: -90, 
                position: 'insideLeft',
                style: { fill: colors.text, fontSize: 12 }
              }}
              stroke={colors.text}
              tick={{ fill: colors.text, fontSize: 11 }}
              tickLine={{ stroke: colors.text }}
              axisLine={{ stroke: colors.text }}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* 預測區間 (P5-P95) */}
            {showPredictionRange && (
              <Area
                type={chartType === 'stepLine' ? 'step' : 'monotone'}
                dataKey="areaTop"
                strokeOpacity={0}
                stroke={colors.predicted}
                fill={colors.p5p95Area}
                fillOpacity={0.5}
                name="Forecast range (P5-P95)"
                activeDot={false}
                isAnimationActive={false}
              />
            )}
            
            {showPredictionRange && (
              <Area
                type={chartType === 'stepLine' ? 'step' : 'monotone'}
                dataKey="areaBottom"
                stroke={colors.predicted}
                strokeOpacity={0}
                fill={colors.p5p95Area}
                fillOpacity={0.5}
                name="Forecast range (P5-P95)"
                activeDot={false}
                isAnimationActive={false}
                baseValue={priceRange.min}
              />
            )}
            
            {/* 預測價格線 */}
            <Line 
              type={chartType === 'stepLine' ? 'step' : 'monotone'} 
              dataKey="predictedPrice" 
              stroke={colors.predicted} 
              name="Forecasting" 
              dot={false}
              strokeWidth={1.5}
              connectNulls={true}
              isAnimationActive={false}
            />
            
            {/* 實際價格線 */}
            <Line 
              type={chartType === 'stepLine' ? 'step' : 'monotone'} 
              dataKey="actualPrice" 
              stroke={colors.actual} 
              name="Observation" 
              dot={false}
              strokeWidth={1.5}
              connectNulls={true}
              isAnimationActive={false}
            />
            
            {/* 現在時間線 */}
            <ReferenceLine 
              x={nowReference} 
              stroke={colors.nowLine} 
              strokeDasharray="5 5" 
              strokeWidth={2}
              label={{ 
                value: "Now", 
                position: "insideTopRight", 
                fill: colors.nowLine,
                fontSize: 12,
                fontWeight: 'bold'
              }} 
              z={1000}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
      
      {/* 底部日期指示器 - 不可拖曳 */}
      <Box sx={{ 
        mt: 1, 
        display: 'flex', 
        justifyContent: 'space-between', 
        borderTop: `1px solid ${colors.grid}`,
        pt: 1
      }}>
        {processedChartData.length > 0 && (
          <>
            <Typography variant="caption" sx={{ color: colors.subText }}>
              {format(parseISO(processedChartData[0].dateTime.split(' ')[0]), 'MM/dd')}
            </Typography>
            <Typography variant="caption" sx={{ color: colors.subText }}>
              {format(parseISO(processedChartData[processedChartData.length - 1].dateTime.split(' ')[0]), 'MM/dd')}
            </Typography>
          </>
        )}
      </Box>
      
      {/* 添加 Tokyo time 標籤 */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        mt: 1
      }}>
        <Chip 
          label="Tokyo time" 
          size="small" 
          sx={{ 
            backgroundColor: 'rgba(54, 207, 201, 0.2)', 
            color: colors.text,
            '& .MuiChip-label': { fontSize: '0.7rem' }
          }} 
        />
      </Box>
    </Paper>
  );
};

export default PriceChart;
