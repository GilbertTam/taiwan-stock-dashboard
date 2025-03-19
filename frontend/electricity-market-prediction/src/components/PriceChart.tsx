'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Area, ComposedChart
} from 'recharts';
import { format, parseISO, addDays, subDays } from 'date-fns';
import { Box, Typography, Switch, FormControlLabel, Paper, useTheme as useMuiTheme, 
  Select, MenuItem, FormControl, Grid, Chip, Table, TableBody, TableCell, TableRow, TableHead,
  Slider, IconButton, Tooltip as MuiTooltip } from '@mui/material';
import { ChartDataPoint, ModelPrediction } from '@/utils/chartUtils';
import { useTheme } from '@/app/ThemeProvider';
import InfoIcon from '@mui/icons-material/Info';
import SettingsIcon from '@mui/icons-material/Settings';

interface PriceChartProps {
  chartData: ChartDataPoint[];
  areaName: string;
  selectedModels: {
    id: number;
    name: string;
    version: string;
    color: string;
  }[];
}

// 生成不同的顏色給不同模型
const MODEL_COLORS = [
  '#36cfc9', // 青色
  '#597ef7', // 藍色
  '#f759ab', // 粉紅色
  '#9254de', // 紫色
  '#73d13d', // 綠色
  '#ffa940', // 橙色
  '#ff7a45', // 橘紅色
  '#40a9ff', // 天藍色
  '#ffec3d', // 黃色
  '#ff4d4f'  // 紅色 (最後一個，因為已經用於實際價格)
];

const PriceChart: React.FC<PriceChartProps> = ({ chartData, areaName, selectedModels }) => {
  const { darkMode } = useTheme();
  const muiTheme = useMuiTheme();
  const [showPredictionRange, setShowPredictionRange] = useState(true);
  const [chartType, setChartType] = useState<'line' | 'stepLine'>('stepLine');
  const [adjacentPointsCount, setAdjacentPointsCount] = useState(1); // 預設顯示前後1個時間點
  const [showSettings, setShowSettings] = useState(false);
  
  // 顏色設定
  const colors = {
    actual: '#ff4d4f',
    grid: '#333',
    background: '#1a1a1a',
    text: '#d9d9d9',
    subText: '#a6a6a6',
    tooltipBg: 'rgba(33, 33, 33, 0.95)',
    tooltipBorder: '#444',
    tooltipHeaderBg: '#2a2a2a',
    warning: '#faad14',
    nowLine: '#1890ff', // 當前時間線顏色
    predicted: '#36cfc9', // 預測顏色 (用於開關和滑塊)
    delta: {
      positive: '#52c41a',
      negative: '#f5222d',
      neutral: '#a6a6a6'
    }
  };

  
  // 為每個模型分配顏色
  const modelColorMap = useMemo(() => {
    const colorMap: Record<string, string> = {};
    selectedModels.forEach((model, index) => {
      const modelKey = `${model.id}|${model.name}|${model.version}`;
      colorMap[modelKey] = model.color || MODEL_COLORS[index % MODEL_COLORS.length];
    });
    return colorMap;
  }, [selectedModels]);
  
  // 計算價格範圍
  const priceRange = useMemo(() => {
    if (chartData.length === 0) return { min: 0, max: 35 };
    
    const allPrices = chartData.flatMap(item => [
      item.actualPrice,
      ...item.modelPredictions.flatMap(mp => [
        mp.predictedPrice,
        mp.predictedPrice5,
        mp.predictedPrice95
      ])
    ].filter(Boolean) as number[]);
    
    const min = Math.floor(Math.min(...allPrices) * 0.9);
    const max = Math.ceil(Math.max(...allPrices) * 1.1);
    
    return { min: Math.max(0, min), max: Math.max(35, max) };
  }, [chartData]);
  
  // 計算每個模型的 MAE (Mean Absolute Error)
  const modelMAEs = useMemo(() => {
    const maes: Record<string, number> = {};
    
    selectedModels.forEach(model => {
      const modelKey = `${model.id}|${model.name}|${model.version}`;
      
      const pointsWithBothValues = chartData.filter(point => {
        const modelPrediction = point.modelPredictions.find(
          mp => `${mp.modelId}|${mp.modelName}|${mp.modelVersion}` === modelKey
        );
        return point.actualPrice !== null && modelPrediction?.predictedPrice !== null;
      });
      
      if (pointsWithBothValues.length === 0) {
        maes[modelKey] = 0;
        return;
      }
      
      const totalError = pointsWithBothValues.reduce((sum, point) => {
        const modelPrediction = point.modelPredictions.find(
          mp => `${mp.modelId}|${mp.modelName}|${mp.modelVersion}` === modelKey
        );
        if (!modelPrediction) return sum;
        return sum + Math.abs((point.actualPrice as number) - (modelPrediction.predictedPrice as number));
      }, 0);
      
      maes[modelKey] = totalError / pointsWithBothValues.length;
    });
    
    return maes;
  }, [chartData, selectedModels]);

  // 處理數據，為 P5-P95 區間添加正確的數據結構
  // 同時添加唯一的 key 以解決重複 key 問題
  const processedChartData = useMemo(() => {
    return chartData.map((point, index) => {
      // 為每個模型計算差異
      const modelDifferences: Record<string, number | null> = {};
      const modelAreaTops: Record<string, number | null> = {};
      const modelAreaBottoms: Record<string, number | null> = {};
      
      point.modelPredictions.forEach(mp => {
        const modelKey = `${mp.modelId}|${mp.modelName}|${mp.modelVersion}`;
        
        // 計算預測與實際值的差距（如果兩者都存在）
        modelDifferences[modelKey] = 
          point.actualPrice !== null && mp.predictedPrice !== null
            ? mp.predictedPrice - point.actualPrice
            : null;
            
        // 為區間圖準備數據 - 確保有值
        // 使用預測值作為備用值
        modelAreaTops[modelKey] = mp.predictedPrice95 !== null ? mp.predictedPrice95 : mp.predictedPrice;
        modelAreaBottoms[modelKey] = mp.predictedPrice5 !== null ? mp.predictedPrice5 : mp.predictedPrice;
      });
      
      // 計算與上一個時間點實際值的差異（如果有提供）
      const actualDelta = 
        index > 0 && point.actualPrice !== null && chartData[index - 1].actualPrice !== null
          ? point.actualPrice - (chartData[index - 1].actualPrice as number)
          : null;
      
      return {
        ...point,
        modelDifferences,
        modelAreaTops,
        modelAreaBottoms,
        actualDelta,
        uniqueKey: `${point.dateTime}-${index}`
      };
    });
  }, [chartData]);

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
  
  // 自定義工具提示 - 表格式顯示，支援多模型比較
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
      
      // 計算每個時間點需要的寬度（單位：像素）
      const pointWidth = 110; // 每個時間點需要的寬度
      const baseWidth = 120;  // 基礎寬度（左側標籤等）
      
      // 計算可用的螢幕寬度（考慮邊距）
      const availableWidth = Math.min(window.innerWidth * 0.95 - 40, 1200);
      
      // 計算最多可以顯示的時間點數量
      const maxPoints = Math.floor((availableWidth - baseWidth) / pointWidth);
      // 確保至少顯示 3 個時間點
      const maxDisplayPoints = Math.max(3, maxPoints);
      
      // 根據當前顯示的時間點數量和最大可顯示數量決定實際顯示的時間點
      const actualDisplayPoints = displayPoints.length > maxDisplayPoints 
        ? displayPoints.slice(0, maxDisplayPoints) 
        : displayPoints;
      
      // 動態計算表格寬度
      const tableWidth = baseWidth + actualDisplayPoints.length * pointWidth;
      
      return (
        <Paper elevation={3} sx={{ 
          backgroundColor: colors.tooltipBg,
          color: colors.text,
          borderRadius: '4px',
          border: `1px solid ${colors.tooltipBorder}`,
          overflow: 'hidden',
          width: `${tableWidth}px`,
          maxWidth: '95vw',
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
          
          {/* 如果有被截斷的數據，顯示提示信息 */}
          {displayPoints.length > maxDisplayPoints && (
            <Typography variant="caption" sx={{ px: 2, py: 0.5, color: colors.warning, display: 'block' }}>
              顯示 {actualDisplayPoints.length}/{displayPoints.length} 個時間點。滑動圖表查看更多。
            </Typography>
          )}
          
          <Box sx={{ overflowX: 'auto', width: '100%' }}>
            <Table size="small" sx={{ 
              minWidth: `${actualDisplayPoints.length * 100}px`,
              '& .MuiTableCell-root': { 
                borderBottom: 'none', 
                py: 0.5,
                px: 1.5,
                minWidth: '90px',
                whiteSpace: 'nowrap'
              } 
            }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: colors.subText, width: '100px', minWidth: '100px' }}>Date/Time:</TableCell>
                  {actualDisplayPoints.map((point, index) => {
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
              </TableHead>
              
              <TableBody>
                {/* 為每個模型顯示預測價格行 */}
                {selectedModels.map((model) => {
                  const modelKey = `${model.id}|${model.name}|${model.version}`;
                  const modelColor = modelColorMap[modelKey];
                  
                  return (
                    <TableRow key={`model-${modelKey}`}>
                      <TableCell sx={{ color: modelColor }}>
                        {`${model.name} ${model.version}:`}
                      </TableCell>
                      {actualDisplayPoints.map((point, index) => {
                        const modelPrediction = point.data.modelPredictions.find(
                          mp => `${mp.modelId}|${mp.modelName}|${mp.modelVersion}` === modelKey
                        );
                        
                        return (
                          <TableCell 
                            key={`forecast-${modelKey}-${index}`}
                            align="center" 
                            sx={{ 
                              color: modelColor,
                              fontWeight: point.isCurrent ? 'bold' : 'normal',
                              backgroundColor: point.isCurrent ? 'rgba(255,255,255,0.05)' : 'transparent'
                            }}
                          >
                            {modelPrediction?.predictedPrice !== null && modelPrediction?.predictedPrice !== undefined
                              ? modelPrediction.predictedPrice.toFixed(2) 
                              : '-'}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}

                {/* 為每個模型顯示預測與實際值的差異 */}
                {selectedModels.map((model) => {
                  const modelKey = `${model.id}|${model.name}|${model.version}`;
                  
                  return (
                    <TableRow key={`diff-${modelKey}`}>
                      <TableCell sx={{
                        color: model.color || colors.subText // 如果模型有定義顏色就使用模型顏色，否則使用預設的 subText 顏色
                      }}>
                        {`${model.name} Δ:`}
                      </TableCell>
                      {actualDisplayPoints.map((point, index) => {
                        const difference = point.data.modelDifferences?.[modelKey];
                        
                        return (
                          <TableCell 
                            key={`diff-${modelKey}-${index}`}
                            align="center" 
                            sx={{ 
                              color: (difference ?? 0) > 0 
                                ? colors.delta.positive 
                                : (difference ?? 0) < 0 
                                  ? colors.delta.negative 
                                  : colors.delta.neutral,
                              fontWeight: point.isCurrent ? 'bold' : 'normal',
                              backgroundColor: point.isCurrent ? 'rgba(255,255,255,0.05)' : 'transparent'
                            }}
                          >
                            {difference !== null && difference !== undefined
                              ? difference.toFixed(2) 
                              : '-'}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
                
                {/* 實際價格行 */}
                <TableRow>
                  <TableCell sx={{ color: colors.actual }}>Observation:</TableCell>
                  {actualDisplayPoints.map((point, index) => (
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
                  {actualDisplayPoints.map((point, index) => (
                    <TableCell 
                      key={`actualDelta-${index}`}
                      align="center" 
                      sx={{ 
                        color: (point.data.actualDelta ?? 0) > 0 
                          ? colors.delta.positive 
                          : (point.data.actualDelta ?? 0) < 0 
                            ? colors.delta.negative 
                            : colors.delta.neutral,
                        fontWeight: point.isCurrent ? 'bold' : 'normal',
                        backgroundColor: point.isCurrent ? 'rgba(255,255,255,0.05)' : 'transparent'
                      }}
                    >
                      {point.data.actualDelta !== null && point.data.actualDelta !== undefined
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
              
              {/* 顯示每個模型的 MAE */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {selectedModels.map((model) => {
                  const modelKey = `${model.id}|${model.name}|${model.version}`;
                  const mae = modelMAEs[modelKey];
                  
                  if (mae === undefined) return null;
                  
                  return (
                    <Chip 
                      key={`mae-${modelKey}`}
                      label={`${model.name} MAE: ${mae.toFixed(2)}`} 
                      size="small" 
                      sx={{ 
                        backgroundColor: '#333',
                        color: modelColorMap[modelKey],
                        fontWeight: 'bold',
                      }} 
                    />
                  );
                })}
              </Box>
              
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
          
          {/* 為每個模型顯示圖例 */}
          {selectedModels.map((model) => {
            const modelKey = `${model.id}|${model.name}|${model.version}`;
            const modelColor = modelColorMap[modelKey];
            
            return (
              <Chip 
                key={`legend-${modelKey}`}
                label={`${model.name} ${model.version}`} 
                size="small" 
                sx={{ 
                  backgroundColor: 'transparent', 
                  border: `1px solid ${modelColor}`,
                  color: modelColor,
                  '& .MuiChip-label': { fontWeight: 'bold' }
                }} 
              />
            );
          })}
          
          {showPredictionRange && (
            <Chip 
              label="Forecast range (P5-P95)" 
              size="small" 
              sx={{ 
                backgroundColor: 'transparent', 
                border: `1px solid rgba(255,255,255,0.2)`,
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
            margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
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
            
            {/* 為每個模型顯示預測區間 (P5-P95) */}
            {showPredictionRange && selectedModels.map((model) => {
              const modelKey = `${model.id}|${model.name}|${model.version}`;
              const modelColor = modelColorMap[modelKey];
              
              // 創建一個半透明的顏色
              const areaColor = modelColor.includes('rgb') 
                ? modelColor.replace(')', ', 0.2)').replace('rgb', 'rgba')
                : `${modelColor}33`; // 添加 33 (20% 透明度) 到十六進制顏色
              
              return (
                <Area
                  key={`area-${modelKey}`}
                  type={chartType === 'stepLine' ? 'step' : 'monotone'}
                  dataKey={(datum) => {
                    const prediction = datum.modelPredictions.find(
                      (mp: ModelPrediction) => `${mp.modelId}|${mp.modelName}|${mp.modelVersion}` === modelKey
                    );
                    
                    if (!prediction) return null;
                    
                    const p5 = prediction.predictedPrice5;
                    const p95 = prediction.predictedPrice95;

                    // 如果 p5 或 p95 不存在，則使用 predictedPrice
                    const bottom = p5 !== null ? p5 : prediction.predictedPrice;
                    const top = p95 !== null ? p95 : prediction.predictedPrice;
                    
                    if (bottom === null || top === null) return null;
                    
                    return [bottom, top];
                  }}
                  stroke="none"
                  fill={areaColor}
                  fillOpacity={0.5}
                  name={`${model.name} ${model.version} (P5-P95)`}
                  activeDot={false}
                  isAnimationActive={false}
                  connectNulls={true}
                />
              );
            })}

            {/* 為每個模型顯示預測價格線 */}
            {selectedModels.map((model) => {
              const modelKey = `${model.id}|${model.name}|${model.version}`;
              const modelColor = modelColorMap[modelKey];
              
              return (
                <Line 
                  key={`line-${modelKey}`}
                  type={chartType === 'stepLine' ? 'step' : 'monotone'} 
                  dataKey={(datum) => {
                    const prediction = datum.modelPredictions.find(
                      (mp: ModelPrediction) => `${mp.modelId}|${mp.modelName}|${mp.modelVersion}` === modelKey
                    );
                    return prediction?.predictedPrice ?? null;
                  }}
                  stroke={modelColor} 
                  name={`${model.name} ${model.version}`} 
                  dot={false}
                  strokeWidth={1.5}
                  connectNulls={true}
                  isAnimationActive={false}
                />
              );
            })}
            
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

          </ComposedChart>
        </ResponsiveContainer>
      </Box>

    </Paper>
  );
};

export default PriceChart;
