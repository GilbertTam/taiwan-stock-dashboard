'use client';

import React, { useMemo } from 'react';
import {
  ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Bar,   Line, Legend, ReferenceArea
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, Slider, Grid, Alert } from '@mui/material';
import { useTheme } from '@/app/ThemeProvider';
import { ChartDataPoint, hashString, generateColor } from '@/utils/chartUtils';

interface ProfitAnalysisProps {
  chartData: ChartDataPoint[];
  selectedModels: {
    id: string | number;
    name: string;
    version: string;
    color: string;
    calculatingDate: string;
  }[];
  topBottomPairs: number;
  setTopBottomPairs: (value: number) => void;
}

const ProfitAnalysis: React.FC<ProfitAnalysisProps> = ({ 
  chartData, 
  selectedModels,
  topBottomPairs,
  setTopBottomPairs
}) => {
  const { darkMode } = useTheme();

  // 顏色設定
  const colors = useMemo(() => ({
    grid: darkMode ? '#333' : '#e6e6e6',
    background: darkMode ? '#1a1a1a' : '#ffffff',
    text: darkMode ? '#d9d9d9' : '#000000',
    subText: darkMode ? '#a6a6a6' : '#595959',
    tooltipBg: darkMode ? 'rgba(33, 33, 33, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    tooltipBorder: darkMode ? '#444' : '#d9d9d9',
    actual: darkMode ? '#ff4d4f' : '#cf1322',
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

  // 按日期分組數據
  const dataByDate = useMemo(() => {
    const groupedData: Record<string, ChartDataPoint[]> = {};
    
    chartData.forEach((point: ChartDataPoint) => {
      const [datePart] = point.dateTime.split(' ');
      if (!groupedData[datePart]) {
        groupedData[datePart] = [];
      }
      groupedData[datePart].push(point);
    });
    
    return groupedData;
  }, [chartData]);

  // 計算每日收益
  const dailyProfits = useMemo(() => {
    const result: {
      date: string;
      formattedDate: string;
      actualProfit: number | null;
      [key: string]: any;
    }[] = [];

    Object.entries(dataByDate).forEach(([date, points]) => {
      // 確保有 48 個點，否則可能數據不全
      if (points.length < 48) return; 

      // 1. 計算實際收益
      // 找出實際價格
      const actualPrices = points.map((p: ChartDataPoint) => ({
        price: p.actualPrice,
        time: p.time,
        dateTime: p.dateTime
      })).filter(p => p.price !== null) as { price: number, time: number, dateTime: string }[];

      let actualProfit: number | null = null;

      if (actualPrices.length === 48) { // 只有當所有實際價格都存在時才計算（或者根據需求放寬）
        // 排序實際價格
        const sortedActual = [...actualPrices].sort((a, b) => b.price - a.price);
        
        // 取前 N 個最高價和後 N 個最低價
        const topN = sortedActual.slice(0, topBottomPairs);
        const bottomN = sortedActual.slice(-topBottomPairs); // 負數索引取最後 N 個

        const sumTop = topN.reduce((sum, p) => sum + p.price, 0);
        const sumBottom = bottomN.reduce((sum, p) => sum + p.price, 0);
        
        actualProfit = sumTop - sumBottom;
      }

      const dailyResult: any = {
        date,
        formattedDate: format(parseISO(date), 'MM/dd'),
        actualProfit
      };

      // 2. 計算各模型的收益
      selectedModels.forEach(model => {
        const modelKey = `${model.id}|${model.name}|${model.version}`;
        
        // 找出該模型的預測
        const predictions = points.map((p: ChartDataPoint) => {
          const pred = p.modelPredictions.find(
            mp => `${mp.modelId}|${mp.modelName}|${mp.modelVersion}` === modelKey
          );
          return {
            predictedPrice: pred?.predictedPrice ?? null,
            actualPrice: p.actualPrice, // 我們需要對應時間點的實際價格來計算收益
            time: p.time
          };
        }).filter(p => p.predictedPrice !== null); // 只考慮有預測值的點

        if (predictions.length < 48) { // 假設需要完整的預測
             dailyResult[`${modelKey}_profit`] = null;
             return;
        }

        // 根據預測價格排序找出最高和最低的時段
        const sortedPredictions = [...predictions].sort((a, b) => (b.predictedPrice as number) - (a.predictedPrice as number));
        
        const modelTopN = sortedPredictions.slice(0, topBottomPairs);
        const modelBottomN = sortedPredictions.slice(-topBottomPairs);

        // 使用這些時段的 *實際價格* 來計算收益
        // 如果實際價格缺失，則無法計算（或視為0，這裡假設無法計算）
        let valid = true;
        let sumTopActual = 0;
        let sumBottomActual = 0;

        for (const p of modelTopN) {
            if (p.actualPrice === null) { valid = false; break; }
            sumTopActual += (p.actualPrice as number);
        }
        for (const p of modelBottomN) {
            if (p.actualPrice === null) { valid = false; break; }
            sumBottomActual += (p.actualPrice as number);
        }

        if (valid) {
            dailyResult[`${modelKey}_profit`] = sumTopActual - sumBottomActual;
        } else {
            dailyResult[`${modelKey}_profit`] = null;
        }
      });

      result.push(dailyResult);
    });

    return result.sort((a, b) => a.date.localeCompare(b.date));
  }, [dataByDate, selectedModels, topBottomPairs]);

  // 計算累計收益，同時合併每日數據
  const combinedData = useMemo(() => {
    const result: any[] = [];
    let cumulativeActual = 0;
    const cumulativeModel: Record<string, number> = {};
    
    selectedModels.forEach(model => {
        cumulativeModel[`${model.id}|${model.name}|${model.version}`] = 0;
    });

    dailyProfits.forEach((day: any) => {
        const item: any = { ...day }; // 複製每日數據 (date, formattedDate, actualProfit, [model]_profit)
        
        // 累計 Actual
        if (day.actualProfit !== null) {
            cumulativeActual += day.actualProfit;
        }
        item.cumulativeActual = cumulativeActual;

        // 累計 Model
        selectedModels.forEach(model => {
            const modelKey = `${model.id}|${model.name}|${model.version}`;
            const profit = day[`${modelKey}_profit`];
            if (profit !== null && profit !== undefined) {
                cumulativeModel[modelKey] += profit;
            }
            item[`${modelKey}_cumulative`] = cumulativeModel[modelKey];
        });

        result.push(item);
    });

    return result;
  }, [dailyProfits, selectedModels]);

  // 總收益摘要
  const totalProfits = useMemo(() => {
      if (combinedData.length === 0) return {};
      const lastDay = combinedData[combinedData.length - 1];
      return lastDay;
  }, [combinedData]);

  // 檢查是否有資料（支援沒有選擇模型時也能顯示 actualProfit）
  const hasData = chartData.length > 0 && dailyProfits.length > 0;
  const hasModels = selectedModels.length > 0;

  // Combined Tooltip
  const CombinedTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
          const data = payload[0].payload;
          return (
              <Paper elevation={3} sx={{ 
                  backgroundColor: colors.tooltipBg,
                  color: colors.text,
                  p: 1, border: `1px solid ${colors.tooltipBorder}`,
                  maxWidth: 400
              }}>
                  <Typography variant="subtitle2" fontWeight="bold">{data.formattedDate} Profit Analysis</Typography>
                  <Table size="small">
                      <TableHead>
                        <TableRow>
                            <TableCell sx={{ color: colors.subText, py: 0.5 }}>Type</TableCell>
                            <TableCell align="right" sx={{ color: colors.subText, py: 0.5 }}>Daily</TableCell>
                            <TableCell align="right" sx={{ color: colors.subText, py: 0.5 }}>Cumulative</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                            <TableCell sx={{ color: colors.actual, fontWeight: 'bold', py: 0.5 }}>Optimal</TableCell>
                            <TableCell align="right" sx={{ color: colors.text, py: 0.5 }}>{data.actualProfit?.toFixed(0)}</TableCell>
                            <TableCell align="right" sx={{ color: colors.text, py: 0.5 }}>{data.cumulativeActual?.toFixed(0)}</TableCell>
                        </TableRow>
                        {selectedModels.map(model => {
                            const modelKey = `${model.id}|${model.name}|${model.version}`;
                            const daily = data[`${modelKey}_profit`];
                            const cumulative = data[`${modelKey}_cumulative`];
                            return (
                                <TableRow key={modelKey}>
                                    <TableCell sx={{ color: modelColorMap[modelKey], py: 0.5 }}>{model.name}</TableCell>
                                    <TableCell align="right" sx={{ color: colors.text, py: 0.5 }}>{daily?.toFixed(0) ?? '-'}</TableCell>
                                    <TableCell align="right" sx={{ color: colors.text, py: 0.5 }}>{cumulative?.toFixed(0) ?? '-'}</TableCell>
                                </TableRow>
                            );
                        })}
                      </TableBody>
                  </Table>
              </Paper>
          );
      }
      return null;
  };

  // 如果沒有資料，顯示提示
  if (!hasData) {
    return (
      <Box sx={{ mt: 3 }}>
        <Alert severity="info">
          該時段無收益分析資料 (No profit analysis data available for this period)
        </Alert>
      </Box>
    );
  }

  // 如果沒有選擇模型，但仍然有資料（actualProfit），顯示提示但繼續顯示圖表
  if (!hasModels && hasData) {
    return (
      <Box sx={{ mt: 3 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          請選擇模型以進行模型收益比較分析 (Please select models to compare profit analysis)
        </Alert>
        <Box sx={{ mb: 3, p: 2, border: `1px solid ${colors.grid}`, borderRadius: 2 }}>
          <Typography gutterBottom>
            Top & Bottom Pairs (N): {topBottomPairs}
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs>
              <Slider
                value={topBottomPairs}
                onChange={(_, val) => setTopBottomPairs(val as number)}
                min={1}
                max={12}
                step={1}
                marks
                valueLabelDisplay="auto"
              />
            </Grid>
            <Grid item>
              <Typography>{topBottomPairs} Pairs ({topBottomPairs * 0.5} Hours)</Typography>
            </Grid>
          </Grid>
          <Typography variant="caption" color="text.secondary">
            Calculate profit by buying at the lowest {topBottomPairs} slots and selling at the highest {topBottomPairs} slots each day.
          </Typography>
        </Box>

        <Grid container spacing={4}>
          <Grid item xs={12}>
            <Typography variant="h6" component="h3" sx={{ color: colors.text, fontWeight: 'bold', mb: 2 }}>
              Profit Analysis (Daily & Cumulative) - Optimal Only
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={combinedData}>
                {combinedData.map((entry: any, index: number) => {
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
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                <XAxis dataKey="formattedDate" stroke={colors.text} tick={{fill: colors.text}} />
                <YAxis 
                  yAxisId="left"
                  orientation="left"
                  stroke={colors.text} 
                  tick={{fill: colors.text}} 
                  label={{ value: 'Daily Profit (¥)', angle: -90, position: 'insideLeft', style: { fill: colors.text } }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke={colors.text} 
                  tick={{fill: colors.text}} 
                  label={{ value: 'Cumulative Profit (¥)', angle: 90, position: 'insideRight', style: { fill: colors.text } }}
                />
                <Tooltip content={<CombinedTooltip />} />
                <Legend />
                <Bar yAxisId="left" dataKey="actualProfit" name="Optimal (Daily)" fill={colors.actual} fillOpacity={0.3} barSize={20} />
                <Line yAxisId="right" type="monotone" dataKey="cumulativeActual" name="Optimal (Cumulative)" stroke={colors.actual} dot={false} strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 2, backgroundColor: darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.9)', border: `1px solid ${colors.grid}` }}>
              <Typography variant="subtitle1" fontWeight="bold" mb={2}>Total Profit Summary</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Total Profit</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ color: colors.actual, fontWeight: 'bold' }}>Optimal (Actual)</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>{totalProfits.cumulativeActual?.toFixed(0)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
        <Box sx={{ mb: 3, p: 2, border: `1px solid ${colors.grid}`, borderRadius: 2 }}>
            <Typography gutterBottom>
                Top & Bottom Pairs (N): {topBottomPairs}
            </Typography>
            <Grid container spacing={2} alignItems="center">
                <Grid item xs>
                    <Slider
                        value={topBottomPairs}
                        onChange={(_, val) => setTopBottomPairs(val as number)}
                        min={1}
                        max={12} // Up to 12 hours (24 slots) or logical max
                        step={1}
                        marks
                        valueLabelDisplay="auto"
                    />
                </Grid>
                <Grid item>
                    <Typography>{topBottomPairs} Pairs ({topBottomPairs * 0.5} Hours)</Typography>
                </Grid>
            </Grid>
            <Typography variant="caption" color="text.secondary">
                Calculate profit by buying at the lowest {topBottomPairs} slots and selling at the highest {topBottomPairs} slots each day.
            </Typography>
        </Box>

        <Grid container spacing={4}>
            {/* Combined Profit Chart */}
            <Grid item xs={12}>
                <Typography variant="h6" component="h3" sx={{ color: colors.text, fontWeight: 'bold', mb: 2 }}>
                    Profit Analysis (Daily & Cumulative)
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={combinedData}>
                        {/* Day shading */}
                        {combinedData.map((entry: any, index: number) => {
                            if (index === 0) return null;
                            const currentDate = entry.formattedDate;
                            const prevDate = combinedData[index - 1].formattedDate;
                            if (currentDate === prevDate) return null;
                            return null;
                        })}
                        {(() => {
                            // Calculate date ranges for shading based on unique formattedDate
                            const ranges: { start: string, end: string }[] = [];
                            // combinedData is daily, so each point is a day.
                            // We want to shade every other day.
                            
                            // Since combinedData is per-day, we can just map and shade odd indices.
                            // But ReferenceArea needs start/end labels.
                            // For categorical axis, start and end can be the category value itself.
                            // However, we want the area to span the full width of the category band.
                            // Recharts ReferenceArea on categorical axis centers on the tick.
                            // To fill the gap, we might need a numeric axis or just accept centered shading.
                            // Alternatively, if XAxis is categorical, ReferenceArea takes the category value.
                            
                            return combinedData.map((entry: any, index: number) => {
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
                            });
                        })()}

                        <XAxis dataKey="formattedDate" stroke={colors.text} tick={{fill: colors.text}} />
                        
                        {/* Left Axis: Daily Profit */}
                        <YAxis 
                            yAxisId="left"
                            orientation="left"
                            stroke={colors.text} 
                            tick={{fill: colors.text}} 
                            label={{ value: 'Daily Profit (¥)', angle: -90, position: 'insideLeft', style: { fill: colors.text } }}
                        />
                        
                        {/* Right Axis: Cumulative Profit */}
                        <YAxis 
                            yAxisId="right"
                            orientation="right"
                            stroke={colors.text} 
                            tick={{fill: colors.text}} 
                            label={{ value: 'Cumulative Profit (¥)', angle: 90, position: 'insideRight', style: { fill: colors.text } }}
                        />
                        
                        <Tooltip content={<CombinedTooltip />} />
                        <Legend />
                        
                        {/* Actual Data */}
                        {/* Adjust bar chart alignment using xAxisId if needed, but ComposedChart usually aligns them. */}
                        {/* If bars are shifted, it might be due to barSize or gap. */}
                        <Bar yAxisId="left" dataKey="actualProfit" name="Optimal (Daily)" fill={colors.actual} fillOpacity={0.3} barSize={20} />
                        <Line yAxisId="right" type="monotone" dataKey="cumulativeActual" name="Optimal (Cumulative)" stroke={colors.actual} dot={false} strokeWidth={2} />
                        
                        {/* Models Data */}
                        {/* Render Bars first */}
                        {selectedModels.map(model => {
                            const modelKey = `${model.id}|${model.name}|${model.version}`;
                            return (
                                <Bar 
                                    key={`bar-${modelKey}`}
                                    yAxisId="left"
                                    dataKey={`${modelKey}_profit`} 
                                    name={`${model.name} (Daily)`} 
                                    fill={modelColorMap[modelKey]} 
                                    fillOpacity={0.3}
                                    barSize={20} 
                                />
                            );
                        })}
                        {/* Render Lines second */}
                        {selectedModels.map(model => {
                            const modelKey = `${model.id}|${model.name}|${model.version}`;
                            return (
                                <Line 
                                    key={`line-${modelKey}`}
                                    yAxisId="right"
                                    type="monotone" 
                                    dataKey={`${modelKey}_cumulative`} 
                                    name={`${model.name} (Cumulative)`} 
                                    stroke={modelColorMap[modelKey]} 
                                    dot={false}
                                    strokeWidth={2}
                                />
                            );
                        })}
                    </ComposedChart>
                </ResponsiveContainer>
            </Grid>

             {/* Summary Table */}
             <Grid item xs={12}>
                <Paper sx={{ p: 2, backgroundColor: darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.9)', border: `1px solid ${colors.grid}` }}>
                    <Typography variant="subtitle1" fontWeight="bold" mb={2}>Total Profit Summary</Typography>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Model</TableCell>
                                <TableCell align="right">Total Profit</TableCell>
                                <TableCell align="right">% of Optimal</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <TableRow>
                                <TableCell sx={{ color: colors.actual, fontWeight: 'bold' }}>Optimal (Actual)</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>{totalProfits.cumulativeActual?.toFixed(0)}</TableCell>
                                <TableCell align="right">100%</TableCell>
                            </TableRow>
                            {selectedModels.map(model => {
                                const modelKey = `${model.id}|${model.name}|${model.version}`;
                                const profit = totalProfits[`${modelKey}_cumulative`];
                                const actual = totalProfits.cumulativeActual;
                                const percent = actual ? (profit / actual * 100).toFixed(1) : '-';
                                return (
                                    <TableRow key={modelKey}>
                                        <TableCell sx={{ color: modelColorMap[modelKey] }}>{model.name} {model.version}</TableCell>
                                        <TableCell align="right">{profit?.toFixed(0) ?? '-'}</TableCell>
                                        <TableCell align="right">{percent}%</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Paper>
             </Grid>
        </Grid>
    </Box>
  );
};

export default ProfitAnalysis;
