'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Area, ComposedChart, Bar, Legend, Brush
} from 'recharts';
import { format, parseISO, addDays, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { Box, Typography, Switch, FormControlLabel, Paper, useTheme as useMuiTheme, 
  Select, MenuItem, FormControl, Grid, Chip, Table, TableBody, TableCell, TableRow, TableHead,
  Slider, IconButton, Tooltip as MuiTooltip, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { ModelPrediction, ChartDataPoint, hashString, generateColor } from '@/utils/chartUtils';
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
    calculatingDate: string;
  }[];
}

// 定義時段枚舉
enum TimeSlot {
  ALL = 'all',
  MORNING = '8-10',
  EVENING = '17-19',
  NIGHT = '22-24'
}

enum TimeSlotDescription {
  ALL = '全時段',
  MORNING = '8點至10點',
  EVENING = '17點至19點',
  NIGHT = '22點至24點'
}


const PriceChart: React.FC<PriceChartProps> = ({ chartData, areaName, selectedModels }) => {
  const { darkMode } = useTheme();
  const muiTheme = useMuiTheme();
  const [showPredictionRange, setShowPredictionRange] = useState(true);
  const [chartType, setChartType] = useState<'line' | 'stepLine'>('stepLine');
  const [adjacentPointsCount, setAdjacentPointsCount] = useState(1); // 預設顯示前後1個時間點
  const [showSettings, setShowSettings] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot>(TimeSlot.ALL);
  
  // 顏色設定
  // 根據 dark mode 動態設定顏色
  const colors = useMemo(() => ({
    actual: darkMode ? '#ff4d4f' : '#cf1322',
    grid: darkMode ? '#333' : '#e6e6e6',
    background: darkMode ? '#1a1a1a' : '#ffffff',
    text: darkMode ? '#d9d9d9' : '#000000',
    subText: darkMode ? '#a6a6a6' : '#595959',
    tooltipBg: darkMode ? 'rgba(33, 33, 33, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    tooltipBorder: darkMode ? '#444' : '#d9d9d9',
    tooltipHeaderBg: darkMode ? '#2a2a2a' : '#f0f0f0',
    warning: darkMode ? '#faad14' : '#d48806',
    nowLine: darkMode ? '#1890ff' : '#0050b3',
    predicted: darkMode ? '#36cfc9' : '#13a8a8',
    delta: {
      positive: darkMode ? '#52c41a' : '#389e0d',
      negative: darkMode ? '#f5222d' : '#cf1322',
      neutral: darkMode ? '#a6a6a6' : '#8c8c8c'
    },
    ourModelBar: darkMode ? '#1890ff' : '#0050b3',
    competitorModelBar: darkMode ? '#ff4d4f' : '#cf1322',
  }), [darkMode]);

  
  // 為每個模型分配顏色
  const modelColorMap = useMemo(() => {
    const colorMap: Record<string, string> = {};
    selectedModels.forEach((model, index) => {
      const modelKey = `${model.id}|${model.name}|${model.version}`;
      colorMap[modelKey] = model.color || generateColor(hashString(modelKey));
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
  
  // 判斷數據點是否在指定時段內
  const isInTimeSlot = useCallback((dateTime: string, slot: TimeSlot): boolean => {
    if (slot === TimeSlot.ALL) return true;
    
    const [_, timePart] = dateTime.split(' ');
    const hour = parseInt(timePart.split(':')[0], 10);
    
    switch (slot) {
      case TimeSlot.MORNING:
        return hour >= 8 && hour < 10;
      case TimeSlot.EVENING:
        return hour >= 17 && hour < 19;
      case TimeSlot.NIGHT:
        return hour >= 22 || hour < 24;
      default:
        return true;
    }
  }, []);
  
  // 按日期分組數據
  const dataByDate = useMemo(() => {
    const groupedData: Record<string, ChartDataPoint[]> = {};
    
    chartData.forEach(point => {
      const [datePart] = point.dateTime.split(' ');
      if (!groupedData[datePart]) {
        groupedData[datePart] = [];
      }
      groupedData[datePart].push(point);
    });
    
    return groupedData;
  }, [chartData]);
  
  // 計算每個模型在每個時段的 MAE
  const modelTimeSlotMAEs = useMemo(() => {
    const timeSlotMAEs: Record<string, Record<TimeSlot, number>> = {};
    
    // 初始化每個模型的時段 MAE
    selectedModels.forEach(model => {
      const modelKey = `${model.id}|${model.name}|${model.version}`;
      timeSlotMAEs[modelKey] = {
        [TimeSlot.ALL]: 0,
        [TimeSlot.MORNING]: 0,
        [TimeSlot.EVENING]: 0,
        [TimeSlot.NIGHT]: 0
      };
    });
    
    // 計算每個時段的 MAE
    Object.values(TimeSlot).forEach(slot => {
      selectedModels.forEach(model => {
        const modelKey = `${model.id}|${model.name}|${model.version}`;
        
        const pointsInSlot = chartData.filter(point => 
          isInTimeSlot(point.dateTime, slot) && 
          point.actualPrice !== null &&
          point.modelPredictions.some(mp => 
            `${mp.modelId}|${mp.modelName}|${mp.modelVersion}` === modelKey && 
            mp.predictedPrice !== null
          )
        );
        
        if (pointsInSlot.length === 0) {
          timeSlotMAEs[modelKey][slot] = 0;
          return;
        }
        
        const totalError = pointsInSlot.reduce((sum, point) => {
          const modelPrediction = point.modelPredictions.find(
            mp => `${mp.modelId}|${mp.modelName}|${mp.modelVersion}` === modelKey
          );
          if (!modelPrediction) return sum;
          return sum + Math.abs((point.actualPrice as number) - (modelPrediction.predictedPrice as number));
        }, 0);
        
        timeSlotMAEs[modelKey][slot] = totalError / pointsInSlot.length;
      });
    });
    
    return timeSlotMAEs;
  }, [chartData, selectedModels, isInTimeSlot]);
  
  // 計算每天每個模型的 MAE
  const dailyMAEs = useMemo(() => {
    const result: {
      date: string;
      formattedDate: string;
      [key: string]: any; // 動態添加模型的 MAE
    }[] = [];
    
    Object.entries(dataByDate).forEach(([date, points]) => {
      const dailyResult: any = {
        date,
        formattedDate: format(parseISO(date), 'MM/dd')
      };
      
      selectedModels.forEach(model => {
        const modelKey = `${model.id}|${model.name}|${model.version}`;
        
        const pointsWithBothValues = points.filter(point => {
          const modelPrediction = point.modelPredictions.find(
            mp => `${mp.modelId}|${mp.modelName}|${mp.modelVersion}` === modelKey
          );
          return point.actualPrice !== null && modelPrediction?.predictedPrice !== null;
        });
        
        if (pointsWithBothValues.length === 0) {
          dailyResult[`${modelKey}_mae`] = 0;
          return;
        }
        
        const totalError = pointsWithBothValues.reduce((sum, point) => {
          const modelPrediction = point.modelPredictions.find(
            mp => `${mp.modelId}|${mp.modelName}|${mp.modelVersion}` === modelKey
          );
          if (!modelPrediction) return sum;
          return sum + Math.abs((point.actualPrice as number) - (modelPrediction.predictedPrice as number));
        }, 0);
        
        dailyResult[`${modelKey}_mae`] = totalError / pointsWithBothValues.length;
      });
      
      // 計算每個時段的 MAE
      Object.values(TimeSlot).forEach(slot => {
        if (slot === TimeSlot.ALL) return; // 跳過全部時段
        
        selectedModels.forEach(model => {
          const modelKey = `${model.id}|${model.name}|${model.version}`;
          
          const pointsInSlot = points.filter(point => 
            isInTimeSlot(point.dateTime, slot) && 
            point.actualPrice !== null &&
            point.modelPredictions.some(mp => 
              `${mp.modelId}|${mp.modelName}|${mp.modelVersion}` === modelKey && 
              mp.predictedPrice !== null
            )
          );
          
          if (pointsInSlot.length === 0) {
            dailyResult[`${modelKey}_${slot}_mae`] = 0;
            return;
          }
          
          const totalError = pointsInSlot.reduce((sum, point) => {
            const modelPrediction = point.modelPredictions.find(
              mp => `${mp.modelId}|${mp.modelName}|${mp.modelVersion}` === modelKey
            );
            if (!modelPrediction) return sum;
            return sum + Math.abs((point.actualPrice as number) - (modelPrediction.predictedPrice as number));
          }, 0);
          
          dailyResult[`${modelKey}_${slot}_mae`] = totalError / pointsInSlot.length;
        });
      });
      
      result.push(dailyResult);
    });
    
    return result.sort((a, b) => a.date.localeCompare(b.date));
  }, [dataByDate, selectedModels, isInTimeSlot]);
  
  // 計算每個模型的總體 MAE
  const modelMAEs = useMemo(() => {
    const maes: Record<string, number> = {};
    
    selectedModels.forEach(model => {
      const modelKey = `${model.id}|${model.name}|${model.version}`;
      
      const validPoints = chartData.reduce((acc, point) => {
        // 只有當實際值和預測值都存在且不為null時才計入，否則會有多餘的分母
        const modelPrediction = point.modelPredictions.find(
          mp => `${mp.modelId}|${mp.modelName}|${mp.modelVersion}` === modelKey
        );
        
        if (
          point.actualPrice !== null && 
          point.actualPrice !== undefined && 
          modelPrediction?.predictedPrice !== null && 
          modelPrediction?.predictedPrice !== undefined
        ) {
          acc.push({
            actual: point.actualPrice,
            predicted: modelPrediction.predictedPrice
          });
        }
        return acc;
      }, [] as Array<{actual: number, predicted: number}>);
      
      if (validPoints.length === 0) {
        maes[modelKey] = 0;
        return;
      }
      
      const totalError = validPoints.reduce((sum, point) => {
        return sum + Math.abs(point.actual - point.predicted);
      }, 0);
      
      maes[modelKey] = totalError / validPoints.length;
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
                        <Typography variant="caption" display="block" sx={{ color: colors.subText }}>
                          {model.calculatingDate === 'latest' ? '(最新)' : `(${model.calculatingDate})`}
                        </Typography>
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

  // MAE 圖表的自定義工具提示
  const MAETooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <Paper elevation={3} sx={{ 
          backgroundColor: colors.tooltipBg,
          color: colors.text,
          borderRadius: '4px',
          border: `1px solid ${colors.tooltipBorder}`,
          overflow: 'hidden',
          p: 1,
          maxWidth: '300px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
            {`${data.formattedDate} MAE`}
          </Typography>
          
          <Table size="small" sx={{ 
            '& .MuiTableCell-root': { 
              borderBottom: 'none', 
              py: 0.5,
              px: 1.5
            } 
          }}>
            <TableBody>
              {selectedModels.map((model) => {
                const modelKey = `${model.id}|${model.name}|${model.version}`;
                const modelColor = modelColorMap[modelKey];
                const mae = data[`${modelKey}_mae`];
                
                return (
                  <TableRow key={`mae-${modelKey}`}>
                    <TableCell sx={{ color: modelColor, fontWeight: 'bold' }}>
                      {`${model.name} ${model.version}:`}
                    </TableCell>
                    <TableCell align="right" sx={{ color: colors.text }}>
                      {mae !== undefined ? mae.toFixed(2) : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
              
              {/* 顯示時段 MAE */}
              {selectedTimeSlot !== TimeSlot.ALL && (
                <>
                  <TableRow>
                    <TableCell colSpan={2} sx={{ pt: 1, pb: 0 }}>
                      <Typography variant="caption" sx={{ color: colors.subText, fontWeight: 'bold' }}>
                        {`${selectedTimeSlot} Hour MAE:`}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  
                  {selectedModels.map((model) => {
                    const modelKey = `${model.id}|${model.name}|${model.version}`;
                    const modelColor = modelColorMap[modelKey];
                    const slotMae = data[`${modelKey}_${selectedTimeSlot}_mae`];
                    
                    return (
                      <TableRow key={`slot-mae-${modelKey}`}>
                        <TableCell sx={{ color: modelColor }}>
                          {`${model.name} ${model.version}:`}
                        </TableCell>
                        <TableCell align="right" sx={{ color: colors.text }}>
                          {slotMae !== undefined ? slotMae.toFixed(2) : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </>
              )}
            </TableBody>
          </Table>
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
                        backgroundColor: darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0)',
                        color: modelColorMap[modelKey],
                        fontWeight: 'bold',
                        border: `1px solid ${modelColorMap[modelKey]}`,
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
            
            <Typography variant="subtitle2" sx={{ color: colors.text, mt: 2, mb: 1 }}>
              選擇時段 MAE
            </Typography>
            <ToggleButtonGroup
              value={selectedTimeSlot}
              exclusive
              onChange={(_, newValue) => {
                if (newValue !== null) {
                  setSelectedTimeSlot(newValue);
                }
              }}
              sx={{ 
                '& .MuiToggleButton-root': {
                  color: colors.text,
                  borderColor: '#444',
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(24, 144, 255, 0.2)',
                    color: colors.predicted,
                    fontWeight: 'bold'
                  }
                }
              }}
            >
              <ToggleButton value={TimeSlot.ALL}>
                {TimeSlotDescription.ALL}
              </ToggleButton>
              <ToggleButton value={TimeSlot.MORNING}>
                {TimeSlotDescription.MORNING}
              </ToggleButton>
              <ToggleButton value={TimeSlot.EVENING}>
                {TimeSlotDescription.EVENING}
              </ToggleButton>
              <ToggleButton value={TimeSlot.NIGHT}>
                {TimeSlotDescription.NIGHT}
              </ToggleButton>
            </ToggleButtonGroup>
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
                label={`${model.name} ${model.version} ${model.calculatingDate === 'latest' ? '(最新)' : `(${model.calculatingDate})`}`} 
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

      {/* 添加 MAE 指標圖表 */}
      <Box sx={{ mt: 4, mb: 2 }}>
        <Typography variant="h6" component="h3" sx={{ color: colors.text, fontWeight: 'bold', mb: 2 }}>
          MAE Indicators
        </Typography>
        
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart
            data={dailyMAEs}
            margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={colors.grid} 
              vertical={false}
            />
            <XAxis 
              dataKey="formattedDate" 
              stroke={colors.text}
              tick={{ fill: colors.text, fontSize: 11 }}
              tickLine={{ stroke: colors.text }}
              axisLine={{ stroke: colors.text }}
            />
            <YAxis 
              label={{ 
                value: 'Daily MAE', 
                angle: -90, 
                position: 'insideLeft',
                style: { fill: colors.text, fontSize: 12 }
              }}
              stroke={colors.text}
              tick={{ fill: colors.text, fontSize: 11 }}
              tickLine={{ stroke: colors.text }}
              axisLine={{ stroke: colors.text }}
            />
            <Tooltip content={<MAETooltip />} />
            <Legend />
            
            {/* 為每個模型顯示 MAE 長條圖 */}
            {selectedModels.map((model, index) => {
              const modelKey = `${model.id}|${model.name}|${model.version}`;
              const modelColor = modelColorMap[modelKey];
              
              // 根據時段選擇顯示不同的 MAE
              const dataKey = selectedTimeSlot === TimeSlot.ALL 
                ? `${modelKey}_mae` 
                : `${modelKey}_${selectedTimeSlot}_mae`;
              
              return (
                <Bar
                  key={`mae-bar-${modelKey}`}
                  dataKey={dataKey}
                  name={`${model.name} ${model.version} MAE`}
                  fill={modelColor}
                  barSize={7}
                  // 調整位置，使不同模型的長條圖不重疊
                  stackId={`stack-${index}`}
                />
              );
            })}

          </ComposedChart>
        </ResponsiveContainer>
      </Box>

      {/* 顯示時段 MAE 的摘要表格 */}
      <Box sx={{ mt: 3 }}>
        <Paper sx={{ 
          p: 2, 
          backgroundColor: darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.9)', 
          border: `1px solid ${colors.grid}`
        }}>
          <Typography variant="subtitle1" sx={{ color: colors.text, fontWeight: 'bold', mb: 2 }}>
            MAE Summary by Time Slot
          </Typography>
          
          <Table size="small" sx={{ 
            '& .MuiTableCell-root': { 
              borderBottom: `1px solid ${colors.grid}`, 
              py: 1,
              px: 2
            } 
          }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: colors.text, fontWeight: 'bold' }}>Model</TableCell>
                <TableCell align="center" sx={{ color: colors.text, fontWeight: 'bold' }}>Overall MAE</TableCell>
                <TableCell align="center" sx={{ color: colors.text, fontWeight: 'bold' }}>8-10 Hour MAE</TableCell>
                <TableCell align="center" sx={{ color: colors.text, fontWeight: 'bold' }}>17-19 Hour MAE</TableCell>
                <TableCell align="center" sx={{ color: colors.text, fontWeight: 'bold' }}>22-24 Hour MAE</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(() => {
                // 計算每個時段的最大值和最小值
                const columnMAEs = {
                  all: selectedModels.map(model => ({
                    model: model,
                    mae: modelTimeSlotMAEs[`${model.id}|${model.name}|${model.version}`][TimeSlot.ALL]
                  })),
                  morning: selectedModels.map(model => ({
                    model: model,
                    mae: modelTimeSlotMAEs[`${model.id}|${model.name}|${model.version}`][TimeSlot.MORNING]
                  })),
                  evening: selectedModels.map(model => ({
                    model: model,
                    mae: modelTimeSlotMAEs[`${model.id}|${model.name}|${model.version}`][TimeSlot.EVENING]
                  })),
                  night: selectedModels.map(model => ({
                    model: model,
                    mae: modelTimeSlotMAEs[`${model.id}|${model.name}|${model.version}`][TimeSlot.NIGHT]
                  }))
                };

                // 找出每個時段的最大值和最小值
                const getMinMax = (maes: typeof columnMAEs.all) => ({
                  min: Math.min(...maes.map(m => m.mae)),
                  max: Math.max(...maes.map(m => m.mae))
                });

                const minMaxValues = {
                  all: getMinMax(columnMAEs.all),
                  morning: getMinMax(columnMAEs.morning),
                  evening: getMinMax(columnMAEs.evening),
                  night: getMinMax(columnMAEs.night)
                };

                // 生成單元格樣式
                const getCellStyle = (value: number, columnMinMax: { min: number, max: number }) => ({
                  color: colors.text,
                  backgroundColor: value === columnMinMax.max 
                    ? (darkMode ? 'rgba(255, 77, 79, 0.2)' : 'rgba(255, 77, 79, 0.1)')
                    : value === columnMinMax.min 
                      ? (darkMode ? 'rgba(82, 196, 26, 0.2)' : 'rgba(82, 196, 26, 0.1)')
                      : 'transparent',
                  position: 'relative' as const,
                  '&::after': value === columnMinMax.max || value === columnMinMax.min ? {
                    content: '""',
                    position: 'absolute',
                    top: '50%',
                    right: '8px',
                    transform: 'translateY(-50%)',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: value === columnMinMax.max 
                      ? (darkMode ? '#ff4d4f' : '#cf1322')
                      : (darkMode ? '#52c41a' : '#389e0d')
                  } : {}
                });

                return selectedModels.map((model) => {
                  const modelKey = `${model.id}|${model.name}|${model.version}`;
                  const modelColor = modelColorMap[modelKey];
                  const timeSlotMAE = modelTimeSlotMAEs[modelKey];
                  
                  return (
                    <TableRow key={`summary-${modelKey}`}>
                      <TableCell sx={{ color: modelColor, fontWeight: 'bold' }}>
                        {`${model.name} ${model.version}`}
                      </TableCell>
                      <TableCell 
                        align="center" 
                        sx={getCellStyle(timeSlotMAE[TimeSlot.ALL], minMaxValues.all)}
                      >
                        {timeSlotMAE[TimeSlot.ALL].toFixed(2)}
                      </TableCell>
                      <TableCell 
                        align="center" 
                        sx={getCellStyle(timeSlotMAE[TimeSlot.MORNING], minMaxValues.morning)}
                      >
                        {timeSlotMAE[TimeSlot.MORNING].toFixed(2)}
                      </TableCell>
                      <TableCell 
                        align="center" 
                        sx={getCellStyle(timeSlotMAE[TimeSlot.EVENING], minMaxValues.evening)}
                      >
                        {timeSlotMAE[TimeSlot.EVENING].toFixed(2)}
                      </TableCell>
                      <TableCell 
                        align="center" 
                        sx={getCellStyle(timeSlotMAE[TimeSlot.NIGHT], minMaxValues.night)}
                      >
                        {timeSlotMAE[TimeSlot.NIGHT].toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                });
              })()}
            </TableBody>
          </Table>
          
          {/* 添加圖例 */}
          <Box sx={{ mt: 2, display: 'flex', gap: 3, justifyContent: 'flex-end' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                backgroundColor: darkMode ? '#52c41a' : '#389e0d'
              }} />
              <Typography variant="caption" sx={{ color: colors.subText }}>
                Lowest MAE
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                backgroundColor: darkMode ? '#ff4d4f' : '#cf1322'
              }} />
              <Typography variant="caption" sx={{ color: colors.subText }}>
                Highest MAE
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Paper>
  );
};

export default PriceChart;
