'use client';

import React, { useMemo, useState, useCallback } from 'react';
import {
  ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Bar, Legend, ReferenceArea
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Alert } from '@mui/material';
import { useTheme } from '@/app/ThemeProvider';
import { ChartDataPoint, hashString, generateColor } from '@/utils/chartUtils';
import { TimeSlot, TimeSlotDescription } from '@/types';

interface MaeAnalysisProps {
  chartData: ChartDataPoint[];
  selectedModels: {
    id: string | number;
    name: string;
    version: string;
    color: string;
    calculatingDate: string;
  }[];
}

const MaeAnalysis: React.FC<MaeAnalysisProps> = ({ chartData, selectedModels }) => {
  const { darkMode } = useTheme();
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot>(TimeSlot.ALL);

  // 顏色設定
  const colors = useMemo(() => ({
    grid: darkMode ? '#333' : '#e6e6e6',
    background: darkMode ? '#1a1a1a' : '#ffffff',
    text: darkMode ? '#d9d9d9' : '#000000',
    subText: darkMode ? '#a6a6a6' : '#595959',
    tooltipBg: darkMode ? 'rgba(33, 33, 33, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    tooltipBorder: darkMode ? '#444' : '#d9d9d9',
  }), [darkMode]);

  // 為每個模型分配顏色
  const modelColorMap = useMemo(() => {
    const colorMap: Record<string, string> = {};
    selectedModels.forEach((model) => {
      const modelKey = `${model.id}|${model.name}|${model.version}`;
      colorMap[modelKey] = model.color || generateColor(hashString(modelKey));
    });
    return colorMap;
  }, [selectedModels]);

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
      [key: string]: any;
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

  // 檢查是否有資料
  const hasData = chartData.length > 0 && dailyMAEs.length > 0;
  const hasModels = selectedModels.length > 0;

  // 如果沒有選擇模型，顯示提示
  if (!hasModels) {
    return (
      <Box sx={{ mt: 3 }}>
        <Alert severity="info">
          請選擇模型以進行MAE分析 (Please select models to perform MAE analysis)
        </Alert>
      </Box>
    );
  }

  // 如果沒有資料，顯示提示
  if (!hasData) {
    return (
      <Box sx={{ mt: 3 }}>
        <Alert severity="info">
          該時段無MAE分析資料 (No MAE analysis data available for this period)
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h3" sx={{ color: colors.text, fontWeight: 'bold' }}>
          MAE Indicators
        </Typography>
        
        <ToggleButtonGroup
          value={selectedTimeSlot}
          exclusive
          onChange={(_, newValue) => {
            if (newValue !== null) {
              setSelectedTimeSlot(newValue);
            }
          }}
          size="small"
          sx={{ 
            '& .MuiToggleButton-root': {
              color: colors.text,
              borderColor: colors.tooltipBorder,
              '&.Mui-selected': {
                backgroundColor: 'rgba(24, 144, 255, 0.2)',
                color: darkMode ? '#36cfc9' : '#13a8a8',
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
      
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart
          data={dailyMAEs}
          margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={colors.grid} 
            vertical={false}
          />
          {/* Day shading */}
          {dailyMAEs.map((entry, index) => {
              if (index % 2 === 0) return null;
              return (
                  <ReferenceArea
                      key={`shade-${entry.formattedDate}`}
                      x1={entry.formattedDate}
                      x2={entry.formattedDate}
                      fill={darkMode ? "#444444" : "#e0e0e0"}
                      fillOpacity={0.4}
                  />
              );
          })}
          <XAxis 
            dataKey="formattedDate" 
            stroke={colors.text}
            tick={{ fill: colors.text, fontSize: 11 }}
            tickLine={{ stroke: colors.text }}
            axisLine={{ stroke: colors.text }}
          />
          <YAxis 
            label={{ 
              value: 'Daily MAE (¥/KWh)', 
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
                name={`${model.name} ${model.version}`}
                fill={modelColor}
                barSize={12}
                // 分組顯示而不是堆疊
                // stackId={`stack-${index}`} 
              />
            );
          })}

        </ComposedChart>
      </ResponsiveContainer>
      
      {/* 顯示時段 MAE 的摘要表格 */}
      <Box sx={{ mt: 3 }}>
        <Paper sx={{ 
          p: 2, 
          backgroundColor: darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.9)', 
          border: `1px solid ${colors.grid}`
        }}>
          <Typography variant="subtitle1" sx={{ color: colors.text, fontWeight: 'bold', mb: 2 }}>
            MAE Summary by Time Slot (Lower is Better)
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
                Lowest MAE (Best)
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
                Highest MAE (Worst)
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default MaeAnalysis;
