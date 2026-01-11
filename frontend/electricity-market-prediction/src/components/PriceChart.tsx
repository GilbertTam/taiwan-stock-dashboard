'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, ComposedChart, ReferenceArea, ErrorBar, Customized, Cell, Bar,
  ReferenceLine
} from 'recharts';
import { format, parseISO, startOfDay, addHours } from 'date-fns';
import { Box, Typography, Switch, FormControlLabel, Paper, useTheme as useMuiTheme, 
  Select, MenuItem, FormControl, Grid, Chip, Table, TableBody, TableCell, TableRow, TableHead,
  Slider, IconButton, Tooltip as MuiTooltip } from '@mui/material';
import { ModelPrediction, ChartDataPoint, hashString, generateColor } from '@/utils/chartUtils';
import { useTheme } from '@/app/ThemeProvider';
import InfoIcon from '@mui/icons-material/Info';
import SettingsIcon from '@mui/icons-material/Settings';

import { ImbalanceData, IntradayData, InterconnectionFlow } from '@/types';


interface PriceChartProps {
  chartData: ChartDataPoint[];
  areaName: string;
  selectedModels: {
    id: string | number;
    name: string;
    version: string;
    color: string;
    calculatingDate: string;
  }[];
  topBottomPairs?: number; // Added prop
  imbalanceData?: ImbalanceData[]; // Imbalance data
  intradayData?: IntradayData[]; // Intraday data
  interconnectionData?: InterconnectionFlow[]; // Interconnection flow data
}

const PriceChart: React.FC<PriceChartProps> = ({ chartData, areaName, selectedModels, topBottomPairs = 4, imbalanceData = [], intradayData = [], interconnectionData = [] }) => {
  const { darkMode } = useTheme();
  const muiTheme = useMuiTheme();
  const [showPredictionRange, setShowPredictionRange] = useState(true);
  const [chartType, setChartType] = useState<'line' | 'stepLine'>('stepLine');
  const [adjacentPointsCount, setAdjacentPointsCount] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [showImbalance, setShowImbalance] = useState(false);
  const [showIntraday, setShowIntraday] = useState(false);
  const [showInterconnection, setShowInterconnection] = useState(false);
  
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
    imbalance: darkMode ? '#8884d8' : '#8884d8',
    interconnection: darkMode ? '#ff7300' : '#ff7300',
    intraday: darkMode ? '#82ca9d' : '#82ca9d',
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
  
  // 計算每個模型的總體 MAE
  const modelMAEs = useMemo(() => {
    const maes: Record<string, number> = {};
    
    selectedModels.forEach(model => {
      const modelKey = `${model.id}|${model.name}|${model.version}`;
      
      const validPoints = chartData.reduce((acc, point) => {
        // 只有當實際值和預測值都存在且不為null時才計入，否則會有多餘的分母
        const modelPrediction = point.modelPredictions.find(
          (mp: ModelPrediction) => `${mp.modelId}|${mp.modelName}|${mp.modelVersion}` === modelKey
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

  // 預先計算 Top/Bottom 標記
  const pointsWithMarkers = useMemo(() => {
    // 1. Group by date
    const dataByDate: Record<string, ChartDataPoint[]> = {};
    chartData.forEach(point => {
        const date = point.date; // Use the existing 'date' field
        if (!dataByDate[date]) dataByDate[date] = [];
        dataByDate[date].push(point);
    });

    // Markers map: key = uniqueKey (e.g. dateTime-index), value = MarkerInfo
    const markers: Record<string, {
        actualType?: 'top' | 'bottom';
        models: Record<string, 'top' | 'bottom'>;
    }> = {};

    Object.values(dataByDate).forEach(dailyPoints => {
        // Only process if we have a significant number of points (e.g., > 40)
        if (dailyPoints.length < 40) return;

        // Actual Prices
        const actuals = dailyPoints
            .map((p, idx) => ({ 
                price: p.actualPrice, 
                index: idx, 
                id: `${p.dateTime}-${dailyPoints.indexOf(p)}`,
                dateTime: p.dateTime 
            })) 
            .filter(item => item.price !== null && item.price !== undefined);
        
        // Sort Actuals
        const sortedActuals = [...actuals].sort((a, b) => (b.price as number) - (a.price as number));
        const topNActuals = sortedActuals.slice(0, topBottomPairs);
        const bottomNActuals = sortedActuals.slice(-topBottomPairs);

        // Models
        // Iterate over selected models
        selectedModels.forEach(model => {
            const modelKey = `${model.id}|${model.name}|${model.version}`;
            
            const preds = dailyPoints.map(p => {
                const mp = p.modelPredictions.find(m => `${m.modelId}|${m.modelName}|${m.modelVersion}` === modelKey);
                return { 
                    price: mp?.predictedPrice, 
                    dateTime: p.dateTime 
                };
            }).filter(item => item.price !== null && item.price !== undefined);

            const sortedPreds = [...preds].sort((a, b) => (b.price as number) - (a.price as number));
            const topNPreds = sortedPreds.slice(0, topBottomPairs);
            const bottomNPreds = sortedPreds.slice(-topBottomPairs);

            // Store markers
            topNPreds.forEach(item => {
                if (!markers[item.dateTime]) markers[item.dateTime] = { models: {} };
                markers[item.dateTime].models[modelKey] = 'top';
            });
            bottomNPreds.forEach(item => {
                if (!markers[item.dateTime]) markers[item.dateTime] = { models: {} };
                markers[item.dateTime].models[modelKey] = 'bottom';
            });
        });

        // Store Actual markers
        topNActuals.forEach(item => {
            if (!markers[item.dateTime as string]) markers[item.dateTime as string] = { models: {} };
            markers[item.dateTime as string].actualType = 'top';
        });
        bottomNActuals.forEach(item => {
            if (!markers[item.dateTime as string]) markers[item.dateTime as string] = { models: {} };
            markers[item.dateTime as string].actualType = 'bottom';
        });
    });

    return markers;
  }, [chartData, selectedModels, topBottomPairs]);

  // 合併 imbalance 和 intraday 數據到 chartData
  // 合併所有數據（價格、不平衡量、時間前市場、連系線流量）
  const mergedChartData = useMemo(() => {
    console.log('=== mergedChartData useMemo called ===');
    console.log('chartData length:', chartData?.length || 0);
    console.log('intradayData length:', intradayData?.length || 0);
    
    // 創建一個以 dateTime 為 key 的 map
    const dataMap = new Map<string, any>();
    
    // 先添加 chartData（保持原有結構）- 即使 chartData 為空也要處理 intraday 數據
    if (chartData && Array.isArray(chartData) && chartData.length > 0) {
      chartData.forEach(point => {
        if (point && point.dateTime) {
          const key = point.dateTime;
          dataMap.set(key, { ...point });
        }
      });
    }
    
    // 添加 imbalance 數據
    if (imbalanceData && Array.isArray(imbalanceData) && imbalanceData.length > 0) {
      // 地區名稱映射，確保與 ImbalanceData 的字段匹配
      const areaFieldMap: Record<string, keyof ImbalanceData> = {
        'hokkaido': 'hokkaido',
        'tohoku': 'tohoku',
        'tokyo': 'tokyo',
        'chubu': 'chubu',
        'hokuriku': 'hokuriku',
        'kansai': 'kansai',
        'chugoku': 'chugoku',
        'shikoku': 'shikoku',
        'kyushu': 'kyushu'
      };
      
      const areaField = areaFieldMap[areaName?.toLowerCase() || ''];
      
      if (areaField) {
        imbalanceData.forEach((item: ImbalanceData) => {
          // 檢查 item 和 datetime 是否存在且有效
          if (!item || !item.datetime) {
            return;
          }
          
          const datetime = item.datetime;
          // 確保 datetime 是字符串
          if (typeof datetime !== 'string') {
            return;
          }
          
          // 嘗試匹配現有的 dateTime
          const matchingKey = Array.from(dataMap.keys()).find(key => {
            if (!key || typeof key !== 'string') return false;
            // 比較日期和時間部分
            const keyDate = key.split(' ')[0];
            const keyTime = key.split(' ')[1]?.substring(0, 5) || '';
            const itemDate = datetime.split(' ')[0];
            const itemTime = datetime.split(' ')[1]?.substring(0, 5) || '';
            return keyDate === itemDate && keyTime === itemTime;
          });
          
          if (matchingKey) {
            const existing = dataMap.get(matchingKey);
            if (existing) {
              const imbalanceValue = item[areaField];
              existing.imbalance = (typeof imbalanceValue === 'number' && !isNaN(imbalanceValue)) ? imbalanceValue : null;
            }
          }
        });
      }
    }
    
    // 添加 intraday 數據 - 用 datetime 欄位
    if (intradayData && Array.isArray(intradayData) && intradayData.length > 0) {

      let matchedCount = 0;
      let addedCount = 0;
      
      intradayData.forEach((item: IntradayData) => {
        if (!item) return;

        let formattedDateTime: string | null = null;
        let formattedDateTimeWithHyphen: string | null = null;

        // 使用 datetime 欄位 (格式: "2025-04-01 00:00:00")
        if (item.datetime && typeof item.datetime === 'string') {
            try {
                const [datePart, timePart] = item.datetime.split(' ');
                if (datePart && timePart) {
                    const formattedTime = timePart.substring(0, 5); // 取 "00:00"
                    
                    // 格式1: YYYYMMDD HH:mm (無連字符)
                    const formattedDateNoHyphen = datePart.replace(/-/g, '');
                    formattedDateTime = `${formattedDateNoHyphen} ${formattedTime}`;
                    
                    // 格式2: YYYY-MM-DD HH:mm (有連字符) - 標準格式
                    formattedDateTimeWithHyphen = `${datePart} ${formattedTime}`;
                }
            } catch (e) {
                console.warn('Error parsing intraday datetime:', item.datetime);
            }
        }

        if (!formattedDateTimeWithHyphen) return;

        // 1. 嘗試匹配現有資料
        let matchedKey: string | null = null;
        if (dataMap.has(formattedDateTimeWithHyphen)) {
            matchedKey = formattedDateTimeWithHyphen;
        } else if (formattedDateTime && dataMap.has(formattedDateTime)) {
            matchedKey = formattedDateTime;
        }

        if (matchedKey) {
            const existing = dataMap.get(matchedKey);
            if (existing) {
                existing.intraday_average = item.average_price;
                existing.intraday_opening = item.opening_price;
                existing.intraday_closing = item.closing_price;
                existing.intraday_high = item.high_price;
                existing.intraday_low = item.low_price;
                matchedCount++;
            }
        } else {
            // 2. 如果沒有匹配，新增資料點
            // 強制使用帶連字符的格式 (YYYY-MM-DD HH:mm)，確保 new Date() 能解析
            const dateTimeToAdd = formattedDateTimeWithHyphen;
            
            if (dateTimeToAdd && !dataMap.has(dateTimeToAdd)) {
                dataMap.set(dateTimeToAdd, {
                    dateTime: dateTimeToAdd,
                    date: dateTimeToAdd.split(' ')[0],
                    timeStr: dateTimeToAdd.split(' ')[1] || '00:00',
                    actualPrice: null,
                    modelPredictions: [],
                    isPrediction: false,
                    // Intraday values
                    intraday_average: item.average_price,
                    intraday_opening: item.opening_price,
                    intraday_closing: item.closing_price,
                    intraday_high: item.high_price,
                    intraday_low: item.low_price,
                    // Initialize others with null
                    imbalance: null,
                    interconnection_flow_diff: null,
                    interconnection_forward: null,
                    interconnection_reverse: null
                });
                addedCount++;
            }
        }
      });
    }
    
    // 添加連系線流量數據並計算差異（forward_planned_flow - reverse_planned_flow）
    if (interconnectionData && Array.isArray(interconnectionData) && interconnectionData.length > 0) {

      let matchedCount = 0;
      let addedCount = 0;
      
      interconnectionData.forEach((item: InterconnectionFlow) => {
        if (!item || !item.datetime || typeof item.datetime !== 'string') return;
        
        // 原始格式通常為 "2025-03-07 00:00:00"
        let formattedDateTime: string | null = null;
        let formattedDateTimeWithHyphen: string | null = null;
        
        try {
          const [datePart, timePart] = item.datetime.split(' ');
          if (!datePart || !timePart) return;
          
          const formattedTime = timePart.substring(0, 5); // HH:mm
          
          // 格式1: YYYYMMDD HH:mm (無連字符)
          const formattedDateNoHyphen = datePart.replace(/-/g, '');
          formattedDateTime = `${formattedDateNoHyphen} ${formattedTime}`;
          
          // 格式2: YYYY-MM-DD HH:mm (有連字符) - 這是 new Date() 支援的標準格式
          formattedDateTimeWithHyphen = `${datePart} ${formattedTime}`;
        } catch (e) {
          return;
        }
        
        if (!formattedDateTime) return;
        
        // 計算差異
        const forwardFlow = typeof item.forward_planned_flow === 'number' && !isNaN(item.forward_planned_flow) ? item.forward_planned_flow : 0;
        const reverseFlow = typeof item.reverse_planned_flow === 'number' && !isNaN(item.reverse_planned_flow) ? item.reverse_planned_flow : 0;
        const flowDifference = forwardFlow - reverseFlow;
        
        // 1. 嘗試匹配現有資料 (ChartData 可能用任意一種格式)
        let matchedKey: string | null = null;
        
        // 優先嘗試匹配帶連字符的 (較常見)
        if (formattedDateTimeWithHyphen && dataMap.has(formattedDateTimeWithHyphen)) {
           matchedKey = formattedDateTimeWithHyphen;
        } else if (dataMap.has(formattedDateTime)) {
           matchedKey = formattedDateTime;
        }
        
        if (matchedKey) {
          const existing = dataMap.get(matchedKey);
          if (existing) {
            existing.interconnection_flow_diff = flowDifference;
            existing.interconnection_forward = forwardFlow;
            existing.interconnection_reverse = reverseFlow;
            matchedCount++;
          }
        } else {
          // 2. 如果沒有匹配，新增資料點
          // [關鍵修正] 強制使用「帶連字符」的格式作為 Key 和 dateTime
          // 這樣後續 processedChartData 的 new Date() 才能正確解析
          const dateTimeToAdd = formattedDateTimeWithHyphen || formattedDateTime;
          
          if (dateTimeToAdd && !dataMap.has(dateTimeToAdd)) {
            dataMap.set(dateTimeToAdd, {
              dateTime: dateTimeToAdd,
              date: dateTimeToAdd.split(' ')[0], // 確保是 YYYY-MM-DD
              timeStr: dateTimeToAdd.split(' ')[1] || '',
              actualPrice: null,
              modelPredictions: [],
              isPrediction: false,
              interconnection_flow_diff: flowDifference,
              interconnection_forward: forwardFlow,
              interconnection_reverse: reverseFlow,
              // 其他欄位補 null 避免 undefined 錯誤
              imbalance: null,
              intraday_average: null,
              intraday_opening: null,
              intraday_closing: null,
              intraday_high: null,
              intraday_low: null,
            });
            addedCount++;
          }
        }
      });
    }
    
    // 如果沒有 chartData，但仍然有 intraday 或 interconnection 數據，直接返回這些數據點
    if (!chartData || !Array.isArray(chartData) || chartData.length === 0) {
      // 檢查是否有 intraday 或 interconnection 數據被添加
      const marketPoints = Array.from(dataMap.values()).filter(p => 
        (p.intraday_average !== null || 
        p.intraday_opening !== null || 
        p.intraday_closing !== null || 
        p.intraday_high !== null || 
        p.intraday_low !== null) ||
        (p.interconnection_flow_diff !== null && p.interconnection_flow_diff !== undefined)
      );
      
      if (marketPoints.length > 0) {
        console.log('Returning market-only points (intraday/interconnection), count:', marketPoints.length);
        return marketPoints.sort((a, b) => {
          if (a.dateTime && b.dateTime) {
            return a.dateTime.localeCompare(b.dateTime);
          }
          return 0;
        });
      }
      return [];
    }
    
    // 合併 chartData 和 intraday 數據
    // 注意：需要處理日期格式的差異（chartData 可能使用 "2025-12-03 00:00"，而 dataMap 可能使用 "20251203 00:00"）
    const result = chartData.map(point => {
      if (!point || !point.dateTime) {
        return point;
      }
      
      // 嘗試直接匹配
      let merged = dataMap.get(point.dateTime);
      
      // 如果沒有直接匹配，嘗試標準化日期格式後匹配
      if (!merged) {
        // 嘗試兩種格式：帶連字符和不帶連字符
        const [datePart, timePart] = point.dateTime.split(' ');
        if (datePart && timePart) {
          // 標準化日期格式（移除連字符）
          const normalizedDate = datePart.replace(/-/g, '');
          const normalizedDateTime = `${normalizedDate} ${timePart}`;
          
          // 嘗試匹配標準化後的格式
          merged = dataMap.get(normalizedDateTime);
          
          // 如果還是沒有匹配，嘗試反向（添加連字符）
          if (!merged && normalizedDate.length === 8) {
            const formattedDate = `${normalizedDate.substring(0, 4)}-${normalizedDate.substring(4, 6)}-${normalizedDate.substring(6, 8)}`;
            const formattedDateTime = `${formattedDate} ${timePart}`;
            merged = dataMap.get(formattedDateTime);
          }
        }
      }
      
      if (!merged) {
        return {
          ...point,
          imbalance: null,
          intraday_average: null,
          intraday_opening: null,
          intraday_closing: null,
          intraday_high: null,
          intraday_low: null,
          interconnection_flow_diff: null,
          interconnection_forward: null,
          interconnection_reverse: null,
        };
      }
      return {
        ...point,
        imbalance: (typeof merged.imbalance === 'number' && !isNaN(merged.imbalance)) ? merged.imbalance : null,
        intraday_average: (merged.intraday_average !== undefined && merged.intraday_average !== null && typeof merged.intraday_average === 'number' && !isNaN(merged.intraday_average)) ? merged.intraday_average : null,
        intraday_opening: (merged.intraday_opening !== undefined && merged.intraday_opening !== null && typeof merged.intraday_opening === 'number' && !isNaN(merged.intraday_opening)) ? merged.intraday_opening : null,
        intraday_closing: (merged.intraday_closing !== undefined && merged.intraday_closing !== null && typeof merged.intraday_closing === 'number' && !isNaN(merged.intraday_closing)) ? merged.intraday_closing : null,
        intraday_high: (merged.intraday_high !== undefined && merged.intraday_high !== null && typeof merged.intraday_high === 'number' && !isNaN(merged.intraday_high)) ? merged.intraday_high : null,
        intraday_low: (merged.intraday_low !== undefined && merged.intraday_low !== null && typeof merged.intraday_low === 'number' && !isNaN(merged.intraday_low)) ? merged.intraday_low : null,
        interconnection_flow_diff: (typeof merged.interconnection_flow_diff === 'number' && !isNaN(merged.interconnection_flow_diff)) ? merged.interconnection_flow_diff : null,
        interconnection_forward: (typeof merged.interconnection_forward === 'number' && !isNaN(merged.interconnection_forward)) ? merged.interconnection_forward : null,
        interconnection_reverse: (typeof merged.interconnection_reverse === 'number' && !isNaN(merged.interconnection_reverse)) ? merged.interconnection_reverse : null,
      };
    });
    
    // 添加只有 intraday 或 interconnection 數據但沒有 chartData 的點
    const chartDataKeys = new Set(chartData.map(p => p.dateTime).filter(Boolean));
    
    // 標準化 chartData 的 keys（處理日期格式差異）
    const normalizedChartDataKeys = new Set<string>();
    chartData.forEach(p => {
      if (p.dateTime) {
        normalizedChartDataKeys.add(p.dateTime);
        // 也添加標準化後的格式
        const [datePart, timePart] = p.dateTime.split(' ');
        if (datePart && timePart) {
          const normalizedDate = datePart.replace(/-/g, '');
          normalizedChartDataKeys.add(`${normalizedDate} ${timePart}`);
          if (normalizedDate.length === 8) {
            const formattedDate = `${normalizedDate.substring(0, 4)}-${normalizedDate.substring(4, 6)}-${normalizedDate.substring(6, 8)}`;
            normalizedChartDataKeys.add(`${formattedDate} ${timePart}`);
          }
        }
      }
    });
    
    const marketOnlyPoints = Array.from(dataMap.entries())
      .filter(([key, value]) => {
        // 只保留有 intraday 或 interconnection 數據但沒有 chartData 的點
        const hasMarketData = (
          value.intraday_average !== null || 
          value.intraday_opening !== null || 
          value.intraday_closing !== null || 
          value.intraday_high !== null || 
          value.intraday_low !== null ||
          (value.interconnection_flow_diff !== null && value.interconnection_flow_diff !== undefined)
        );
        
        // 檢查是否在 chartData 中（包括標準化格式）
        const inChartData = chartDataKeys.has(key) || normalizedChartDataKeys.has(key);
        
        return !inChartData && hasMarketData;
      })
      .map(([_, value]) => ({
        ...value,
        // 確保這些字段存在（可能已經在 value 中了）
        actualPrice: value.actualPrice !== undefined ? value.actualPrice : null,
        modelPredictions: value.modelPredictions || [],
        isPrediction: value.isPrediction !== undefined ? value.isPrediction : false,
        // 確保 intraday 字段被保留
        intraday_average: value.intraday_average,
        intraday_opening: value.intraday_opening,
        intraday_closing: value.intraday_closing,
        intraday_high: value.intraday_high,
        intraday_low: value.intraday_low,
        // 確保 interconnection 字段被保留
        interconnection_flow_diff: value.interconnection_flow_diff,
        interconnection_forward: value.interconnection_forward,
        interconnection_reverse: value.interconnection_reverse,
      }));
    
    const finalResult = [...result, ...marketOnlyPoints].sort((a, b) => {
      if (a.dateTime && b.dateTime) {
        return a.dateTime.localeCompare(b.dateTime);
      }
      return 0;
    });
    
    // 檢查最終結果中是否有 intraday 數據
    const pointsWithIntraday = finalResult.filter(p => 
      p.intraday_average !== null || 
      p.intraday_opening !== null || 
      p.intraday_closing !== null || 
      p.intraday_high !== null || 
      p.intraday_low !== null
    );
    console.log('Final result points with intraday data:', pointsWithIntraday.length);
    
    // 檢查最終結果中是否有 interconnection 數據
    const pointsWithInterconnection = finalResult.filter(p => 
      p.interconnection_flow_diff !== null && p.interconnection_flow_diff !== undefined
    );
    console.log('Final result points with interconnection data:', pointsWithInterconnection.length);
    
    if (pointsWithIntraday.length > 0) {
      console.log('Sample point with intraday:', {
        dateTime: pointsWithIntraday[0].dateTime,
        intraday_average: pointsWithIntraday[0].intraday_average,
        intraday_opening: pointsWithIntraday[0].intraday_opening,
        intraday_closing: pointsWithIntraday[0].intraday_closing,
        intraday_high: pointsWithIntraday[0].intraday_high,
        intraday_low: pointsWithIntraday[0].intraday_low,
      });
    }
    
    if (pointsWithInterconnection.length > 0) {
      console.log('Sample point with interconnection:', {
        dateTime: pointsWithInterconnection[0].dateTime,
        interconnection_flow_diff: pointsWithInterconnection[0].interconnection_flow_diff,
        interconnection_forward: pointsWithInterconnection[0].interconnection_forward,
        interconnection_reverse: pointsWithInterconnection[0].interconnection_reverse,
      });
    }
    
    return finalResult;
  }, [chartData, imbalanceData, intradayData, interconnectionData, areaName]);

  
  const processedChartData = useMemo(() => {
    if (!mergedChartData || !Array.isArray(mergedChartData) || mergedChartData.length === 0) {
      return [];
    }

    return mergedChartData
      .map((point, index) => {
        if (!point || !point.dateTime) return null;

        // 解析時間字串為數值 (Timestamp)
        let timestamp: number;
        try {
            // 處理 "2025-04-05 22:30" 格式
            // 替換空格為 T 以符合 ISO 標準 (有些瀏覽器相容性需要)
            const isoString = point.dateTime.replace(' ', 'T');
            timestamp = new Date(isoString).getTime();
        } catch (e) {
            console.error("Invalid date format", point.dateTime);
            return null;
        }

        // 確保 timestamp 是有效數值
        if (isNaN(timestamp)) return null;

        // 為每個模型計算差異
        const modelDifferences: Record<string, number | null> = {};
        const modelAreaTops: Record<string, number | null> = {};
        const modelAreaBottoms: Record<string, number | null> = {};
        
        // 處理數據，為 P5-P95 區間添加正確的數據結構
        if (point.modelPredictions && Array.isArray(point.modelPredictions)) {
          point.modelPredictions.forEach((mp: ModelPrediction) => {
            if (!mp) return; // 確保 mp 存在
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
        }
        
        // 計算與上一個時間點實際值的差異（如果有提供）
        const actualDelta = 
          index > 0 && 
          point.actualPrice !== null && 
          mergedChartData[index - 1] &&
          mergedChartData[index - 1].actualPrice !== null
            ? point.actualPrice - (mergedChartData[index - 1].actualPrice as number)
            : null;
        
        // Get marker info
        const markerInfo = pointsWithMarkers[point.dateTime] || { models: {} };


        // 準備蠟燭圖專用的 payload
        let candlestickPayload = null;

        // 1. 強制轉型為 Number，避免字串混入導致 Recharts 畫不出來
        //    即使 API 給的是 null/undefined，Number() 會轉成 0 或 NaN，我們後面再過濾
        const iHigh = Number(point.intraday_high);
        const iLow = Number(point.intraday_low);
        const iOpen = Number(point.intraday_opening);
        const iClose = Number(point.intraday_closing);

        // 2. 檢查是否為有效數字 (排除 NaN 和 原始數據真的是 null 的情況)
        //    注意：這裡我先拿掉了 < 1000 的限制，建議先確保圖能畫出來，再來考慮過濾異常值
        const hasValidIntraday = 
            point.intraday_high != null && !isNaN(iHigh) &&
            point.intraday_low != null && !isNaN(iLow) &&
            point.intraday_opening != null && !isNaN(iOpen) &&
            point.intraday_closing != null && !isNaN(iClose);

        if (hasValidIntraday) {
            candlestickPayload = {
                high: iHigh,
                low: iLow,
                open: iOpen,
                close: iClose
            };
        }
        return {
          ...point,
          timestamp,
          modelDifferences,
          modelAreaTops,
          modelAreaBottoms,
          actualDelta,
          uniqueKey: `${point.dateTime}-${index}`,
          // Attach marker info to the point
          markerInfo,
          // Imbalance data
          imbalance: point.imbalance,
          // Interconnection data
          interconnection_flow_diff: point.interconnection_flow_diff,
          interconnection_forward: point.interconnection_forward,
          interconnection_reverse: point.interconnection_reverse,
          // 蠟燭圖的衍生數據
          candlestickPayload,
          // 這裡使用 High 價格作為觸發值。
          // 萬一 High 是 0 (雖然少見)，Recharts 可能不會畫，
          // 但只要有 candlestickPayload，我們通常希望它嘗試繪製。
          // 如果 High 真的是 0，可以考慮給一個極小值 (如 0.0001) 騙過 Recharts 觸發 shape 渲染
          intraday_bar_trigger: candlestickPayload ? (iHigh === 0 ? 0.0001 : iHigh) : null
        };
      })
      .filter((point): point is NonNullable<typeof point> => point !== null)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [mergedChartData, pointsWithMarkers, chartData]);

  // 計算價格範圍
  const priceRange = useMemo(() => {
    if (chartData.length === 0) return { min: 0, max: 35 };

    const allPrices = chartData.flatMap(item => [
      item.actualPrice,
      ...item.modelPredictions.flatMap((mp: ModelPrediction) => [
        mp.predictedPrice,
        mp.predictedPrice5,
        mp.predictedPrice95
      ])
    ].filter(Boolean) as number[]);


    // 加入 Intraday 相關價格
    // 這裡同樣要做防呆，避免 Volume (成交量) 混入
    if (processedChartData.length > 0) {
        processedChartData.forEach(item => {
            const addIfValid = (val: number | null | undefined) => {
                // 過濾掉 > 1000 的異常值 (Volume)
                if (val !== null && val !== undefined && !isNaN(val) && Math.abs(val) < 1000) {
                    allPrices.push(val);
                }
            };
            addIfValid(item.intraday_high);
            addIfValid(item.intraday_low);
        });
    }


    const min = Math.floor(Math.min(...allPrices) * 0.9);
    const max = Math.ceil(Math.max(...allPrices) * 1.1);

    return { min: Math.max(0, min), max: Math.max(35, max) };
  }, [chartData, processedChartData]);
  
  // 獨立計算 Imbalance 的範圍
  const imbalanceRange = useMemo(() => {
    if (!processedChartData) return { min: 0, max: 35 };
    
    const values = processedChartData
        .map(p => p.imbalance)
        .filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
    
    if (values.length === 0) return { min: 0, max: 35 };

    const min = Math.floor(Math.min(...values));
    const max = Math.ceil(Math.max(...values));
    
    // 給一點 padding 讓線條不要貼底或貼頂
    const padding = Math.abs(max - min) * 0.1;
    
    return { min: Math.floor(min - padding), max: Math.ceil(max + padding) };
  }, [processedChartData]);


  // 獨立的蠟燭圖形狀元件
  const CandlestickShape = (props: any) => {
    const {
      x,
      y,
      width,
      height,
      low,
      high,
      open,
      close,
      yAxis // 關鍵：Recharts 會自動注入這個 prop
    } = props;

    // 防呆：如果沒有數據或 Y 軸 scale 函數，就不畫
    if (!yAxis || !yAxis.scale || [low, high, open, close].some(v => v === null || v === undefined)) {
      return null;
    }

    const yScale = yAxis.scale;

    // 判斷漲跌 (收盤 > 開盤 = 漲)
    // 注意：這裡使用 紅漲綠跌 配色
    const isRising = close >= open;
    const color = isRising ? '#ff4d4f' : '#52c41a'; 

    // 計算座標 (SVG 座標系：Y 值越小越靠上)
    // Bar 已經幫我們算好了 x 和 width
    // 我們只需要算出 High, Low, Open, Close 的 Y 像素位置
    const yHigh = yScale(high);
    const yLow = yScale(low);
    const yOpen = yScale(open);
    const yClose = yScale(close);

    // 實體的高度與起始點
    const bodyTop = Math.min(yOpen, yClose);
    const bodyHeight = Math.max(1, Math.abs(yOpen - yClose)); // 確保至少 1px

    // 調整中心點
    const cx = x + width / 2;

    return (
      <g className="recharts-candlestick">
        {/* 影線 (High - Low) */}
        <line 
          x1={cx} y1={yHigh} 
          x2={cx} y2={yLow} 
          stroke={color} 
          strokeWidth={1} 
        />
        {/* 實體 (Open - Close) */}
        <rect 
          x={x} 
          y={bodyTop} 
          width={width} 
          height={bodyHeight} 
          fill={color} 
          stroke="none" 
        />
      </g>
    );
  };

  const generateXAxisTicks = useCallback(() => {
    if (processedChartData.length === 0) return [];

    // 確保有有效的 timestamp
    const firstPoint = processedChartData[0];
    const lastPoint = processedChartData[processedChartData.length - 1];

    if (!firstPoint || !lastPoint) return [];


    const startTime = processedChartData[0].timestamp;
    const endTime = processedChartData[processedChartData.length - 1].timestamp;
    const duration = endTime - startTime;
    const hoursTotal = duration / (1000 * 60 * 60);

    // 動態決定間隔 (小時)
    let intervalHours = 3;
    if (hoursTotal > 48) intervalHours = 6;
    if (hoursTotal > 96) intervalHours = 12; // 超過4天，每12小時
    if (hoursTotal > 168) intervalHours = 24; // 超過一週，每天

    const ticks: number[] = [];
    let current = startOfDay(new Date(startTime)).getTime();
    
    // 確保第一個刻度在資料範圍附近
    // 使用一個合理的上限避免無限迴圈
    const maxIterations = 10000;
    let iterations = 0;
    while (current < startTime && iterations < maxIterations) {
        current += intervalHours * 60 * 60 * 1000;
        iterations++;
    }

    iterations = 0;
    while (current <= endTime && iterations < maxIterations) {
        ticks.push(current);
        current += intervalHours * 60 * 60 * 1000;
        iterations++;
    }
    
    return ticks;
  }, [processedChartData]);

  // 獨立的蠟燭圖繪製層
  const CandleStickLayer = (props: any) => {
    const { xAxisMap, yAxisMap, data, yAxisId, darkMode } = props;

    // 1. 取得 X 軸
    const xAxis = xAxisMap && (xAxisMap[0] || Object.values(xAxisMap)[0]);
    const xScale = xAxis?.scale;

    // 2. 取得 Y 軸 (根據 ID)
    // 嘗試多種方式獲取 Y 軸，因為 Recharts 內部 ID 有時會變
    let yScale;
    if (yAxisMap) {
        if (yAxisMap[yAxisId]) {
            yScale = yAxisMap[yAxisId].scale;
        } else {
            // 模糊搜尋：找 props.yAxisId 符合的
            const axisObj = Object.values(yAxisMap).find((axis: any) => axis.props.yAxisId === yAxisId);
            if (axisObj) yScale = axisObj.scale;
        }
    }

    if (!xScale || !yScale || !data) return null;

    // 3. 計算寬度：避免重疊
    // 根據 X 軸總寬度和資料點數量動態計算
    const range = xScale.range();
    const chartWidth = Math.abs(range[1] - range[0]);
    const dataLength = data.length;
    // 動態計算：數據越少 bar 越寬，限制在 3px ~ 12px 之間
    const candleWidth = Math.max(3, Math.min(12, (chartWidth / dataLength) * 0.6));

    return (
      <g className="recharts-candlestick-layer">
        {data.map((entry: any, index: number) => {
          // 確保欄位名稱跟 processedChartData 一致
          const open = entry.intraday_opening;
          const close = entry.intraday_closing;
          const high = entry.intraday_high;
          const low = entry.intraday_low;
          const timestamp = entry.timestamp;

          // 檢查數據完整性
          if ([open, close, high, low, timestamp].some(v => v === null || v === undefined)) return null;

          // 座標轉換
          const x = xScale(timestamp);
          const yOpen = yScale(open);
          const yClose = yScale(close);
          const yHigh = yScale(high);
          const yLow = yScale(low);
          
          // 防呆：如果座標計算出來是 NaN (可能因數值超出 domain 或 scale 尚未 ready)
          if (isNaN(x) || isNaN(yOpen) || isNaN(yClose)) return null;

          const isRising = close >= open;
          // 漲(紅) / 跌(綠) 配色
          const color = isRising 
              ? (darkMode ? '#ff4d4f' : '#cf1322') 
              : (darkMode ? '#52c41a' : '#389e0d');

          // 計算實體高度與位置
          const bodyTop = Math.min(yOpen, yClose);
          const bodyHeight = Math.max(1, Math.abs(yOpen - yClose)); // 確保至少 1px 高

          return (
            <g key={`candle-${index}`}>
              {/* 影線：最高價到最低價 */}
              <line 
                  x1={x} x2={x} y1={yHigh} y2={yLow} 
                  stroke={color} 
                  strokeWidth={1.5} 
                  strokeOpacity={0.2}
              />
              {/* 實體：開盤價到收盤價 */}
              <rect 
                  x={x - candleWidth / 2} 
                  y={bodyTop} 
                  width={candleWidth} 
                  height={bodyHeight} 
                  fill={color} 
                  stroke="none"
                  fillOpacity={0.2}
              />
            </g>
          );
        })}
      </g>
    );
  };

  // Custom Dot Component
  const CustomizedDot = (props: any) => {
    // 1. 解構出 key (Recharts 會自動傳入)
    const { cx, cy, stroke, payload, dataKey, key } = props; 
        
    // Check if this point needs a marker
    // 2. 如果不需要畫，回傳 null (不要回傳 <g />)
    if (!payload.markerInfo) return null;

    // Actual Price Line
    if (dataKey === "actualPrice") {
      const type = payload.markerInfo.actualType;
      if (!type) return null; // 2. 這裡也改回傳 null
      
      // 3. 把 key 加到 svg 上
      return (
          <svg key={key} x={cx - 5} y={cy - 5} width={10} height={10} viewBox="0 0 10 10">
              {type === 'top' ? (
                  <path d="M5 0 L10 10 L0 10 Z" fill={stroke} /> 
              ) : (
                  <path d="M0 0 L10 0 L5 10 Z" fill={stroke} /> 
              )}
          </svg>
      );
    } 

    return null; // Fallback 改回傳 null
  };

  // Model Dot (預測模型用的點)
  const getModelDot = (modelKey: string) => (props: any) => {
    // 1. 解構出 key
    const { cx, cy, stroke, payload, key } = props;

    if (!payload.markerInfo) return null; // 2. 改回傳 null
    
    const type = payload.markerInfo.models[modelKey];
    if (!type) return null; // 2. 改回傳 null

    // 3. 把 key 加到 svg 上
    return (
      <svg key={key} x={cx - 4} y={cy - 4} width={8} height={8} viewBox="0 0 10 10">
          {type === 'top' ? (
              <path d="M5 0 L10 5 L5 10 L0 5 Z" fill={stroke} /> 
          ) : (
              <circle cx="5" cy="5" r="4" fill={stroke} />
          )}
      </svg>
    );
  };

  // 自定義 X 軸刻度格式化
  const formatXAxis = useCallback((value: string | number) => {
    // 防呆：如果是 null 或 undefined
    if (value === null || value === undefined) return '';

    let date: Date;

    // 情況 A: 傳入的是 Timestamp (數字) - 這是我們優化後的預期情況
    if (typeof value === 'number') {
      date = new Date(value);
    } 
    // 情況 B: 傳入的是字串 (舊資料或備用情況)
    else if (typeof value === 'string') {
      // 嘗試解析字串，如果失敗則回傳空字串
      try {
        // 處理 "2025-04-05 22:30" 這種中間有空格的格式，轉為 ISO "2025-04-05T22:30"
        const isoString = value.includes('T') ? value : value.replace(' ', 'T');
        date = new Date(isoString);
      } catch (e) {
        return '';
      }
    } else {
      return '';
    }

    // 檢查日期是否有效
    if (isNaN(date.getTime())) return '';

    const hour = date.getHours();
    const minute = date.getMinutes();

    // 00:00 顯示日期 (MM/dd)
    if (hour === 0 && minute === 0) {
      return format(date, 'MM/dd');
    }
    
    // 其他時間只顯示小時 (HH:mm)
    return format(date, 'HH:mm');
  }, []);
  
  // 格式化時間顯示 (Tooltip 表格內使用)
  const formatTimeDisplay = useCallback((value: string | number) => {
    if (value === null || value === undefined) return '';

    try {
      // 情況 A: Timestamp (數字)
      if (typeof value === 'number') {
         return format(new Date(value), 'HH:mm');
      }
  
      // 情況 B: 字串
      if (typeof value === 'string') {
          // 嘗試直接分割 (舊邏輯，保留以相容舊資料)
          const parts = value.split(' ');
          if (parts.length >= 2) {
              const timePart = parts[1];
              // 取前 5 個字元 (HH:mm)
              return timePart.substring(0, 5);
          }
          // 如果 split 失敗，嘗試用 Date 解析
          const date = new Date(value.replace(' ', 'T'));
          if (!isNaN(date.getTime())) {
            return format(date, 'HH:mm');
          }
      }
    } catch (e) {
      console.error('Error formatting time display', e);
    }
    
    return '';
  }, []);
  
  // 自定義工具提示 - 表格式顯示，支援多模型比較
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      // 使用 timestamp 格式化顯示時間
      const formattedDateTime = format(new Date(data.timestamp), 'MM/dd HH:mm');
      
      // 找出當前時間點的索引
      const currentIndex = processedChartData.findIndex(p => p.timestamp === data.timestamp);
      
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

      return (
        <Paper elevation={3} sx={{
          p: 1,
          backgroundColor: colors.tooltipBg,
          color: colors.text,
          border: `1px solid ${colors.tooltipBorder}`,
          maxHeight: '400px', // 限制最大高度
          overflowY: 'auto',  // 超出時顯示垂直捲軸
          pointerEvents: 'auto' // 允許滑鼠與 Tooltip 互動（例如滾動）
          }}>
          
          <Box sx={{ 
            backgroundColor: colors.tooltipHeaderBg, 
            p: 1, 
            borderBottom: `1px solid ${colors.tooltipBorder}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{borderBottom: `1px solid ${colors.tooltipBorder}`, pb: 0.5, mb: 0.5}}>
              {`${areaName} - ${formattedDateTime}`}
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
                        {formatTimeDisplay(point.data.timestamp || point.data.dateTime)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableHead>
              
              <TableBody>
                {/* 為每個模型顯示預測價格行 */}
                {selectedModels.map((model, index) => {
                  const modelKey = `${model.id}|${model.name}|${model.version}`;
                  const modelColor = modelColorMap[modelKey];
                  
                  return (
                    <TableRow key={`model-${modelKey}-${index}`}>
                      <TableCell sx={{ color: modelColor }}>
                        {`${model.name} ${model.version}:`}
                        <Typography variant="caption" display="block" sx={{ color: colors.subText }}>
                          {model.calculatingDate === 'latest' ? '(最新)' : `(${model.calculatingDate})`}
                        </Typography>
                      </TableCell>
                      {actualDisplayPoints.map((point, index) => {
                        const modelPrediction = point.data.modelPredictions.find(
                          (mp: ModelPrediction) => `${mp.modelId}|${mp.modelName}|${mp.modelVersion}` === modelKey
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
                {selectedModels.map((model, index) => {
                  const modelKey = `${model.id}|${model.name}|${model.version}`;
                  
                  return (
                    <TableRow key={`diff-${modelKey}-${index}`}>
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

                {/* 時間前市場平均價行 */}
                {showIntraday && (
                  <TableRow>
                    <TableCell sx={{ color: colors.intraday }}>Intraday Avg:</TableCell>
                    {actualDisplayPoints.map((point, index) => (
                      <TableCell key={`intraday-${index}`} align="center" sx={{ color: colors.intraday, fontWeight: point.isCurrent ? 'bold' : 'normal', backgroundColor: point.isCurrent ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
                        {point.data.intraday_average !== null && point.data.intraday_average !== undefined
                          ? point.data.intraday_average.toFixed(2) 
                          : '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                )}

                {/* 不平衡量行 */}
                {showImbalance && (
                  <TableRow>
                    <TableCell sx={{ color: colors.imbalance }}>Imbalance Quantity:</TableCell>
                    {actualDisplayPoints.map((point, index) => (
                      <TableCell 
                        key={`imbalance-${index}`}
                        align="center" 
                        sx={{ 
                          color: colors.imbalance,
                          fontWeight: point.isCurrent ? 'bold' : 'normal',
                          backgroundColor: point.isCurrent ? 'rgba(255,255,255,0.05)' : 'transparent'
                        }}
                      >
                        {point.data.imbalance !== null && point.data.imbalance !== undefined
                          ? point.data.imbalance.toFixed(2) 
                          : '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                )}

                {/* 連系線流量差異行 */}
                {showInterconnection && (
                  <TableRow>
                    <TableCell sx={{ color: '#ff7300' }}>連系線流量差異 (MW):</TableCell>
                    {actualDisplayPoints.map((point, index) => (
                      <TableCell 
                        key={`interconnection-${index}`}
                        align="center" 
                        sx={{ 
                          color: colors.interconnection,
                          fontWeight: point.isCurrent ? 'bold' : 'normal',
                          backgroundColor: point.isCurrent ? 'rgba(255,255,255,0.05)' : 'transparent'
                        }}
                      >
                        {point.data.interconnection_flow_diff !== null && point.data.interconnection_flow_diff !== undefined
                          ? point.data.interconnection_flow_diff.toFixed(2) 
                          : '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                )}

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
              Price data in ¥/KWh
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
                {selectedModels.map((model, index) => {
                  const modelKey = `${model.id}|${model.name}|${model.version}`;
                  const mae = modelMAEs[modelKey];
                  
                  if (mae === undefined) return null;
                  
                  return (
                    <Chip 
                      key={`mae-${modelKey}-${index}`}
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
              <MuiTooltip 
                title={(!imbalanceData || imbalanceData.length === 0) ? "該時段無資料" : ""}
                arrow
              >
                <span>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={showImbalance} 
                        onChange={(e) => setShowImbalance(e.target.checked)} 
                        disabled={!imbalanceData || imbalanceData.length === 0}
                        color="primary"
                        sx={{ 
                          '& .MuiSwitch-switchBase.Mui-checked': { color: colors.imbalance },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: colors.imbalance }
                        }}
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ color: colors.text }}>
                        不平衡量
                      </Typography>
                    }
                  />
                </span>
              </MuiTooltip>
              <MuiTooltip 
                title={(!intradayData || intradayData.length === 0) ? "該時段無資料" : ""}
                arrow
              >
                <span>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={showIntraday} 
                        onChange={(e) => setShowIntraday(e.target.checked)} 
                        disabled={!intradayData || intradayData.length === 0}
                        color="primary"
                        sx={{ 
                          '& .MuiSwitch-switchBase.Mui-checked': { color: colors.intraday },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: colors.intraday }
                        }}
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ color: colors.text }}>
                        時間前市場
                      </Typography>
                    }
                  />
                </span>
              </MuiTooltip>
              <MuiTooltip 
                title={(!interconnectionData || interconnectionData.length === 0) ? "該時段無資料" : ""}
                arrow
              >
                <span>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={showInterconnection} 
                        onChange={(e) => setShowInterconnection(e.target.checked)} 
                        disabled={!interconnectionData || interconnectionData.length === 0}
                        color="primary"
                        sx={{ 
                          '& .MuiSwitch-switchBase.Mui-checked': { color: colors.interconnection },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: colors.interconnection }
                        }}
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ color: colors.text }}>
                        連系線流量差異
                      </Typography>
                    }
                  />
                </span>
              </MuiTooltip>
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
          {selectedModels.map((model, index) => {
            const modelKey = `${model.id}|${model.name}|${model.version}`;
            const modelColor = modelColorMap[modelKey];
            
            return (
              <Chip 
                key={`legend-${modelKey}-${index}`}
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
            data={processedChartData && processedChartData.length > 0 ? processedChartData : []}
            margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
          >
            {/* Day shading */}
            {processedChartData && processedChartData.length > 0 && processedChartData.map((entry, index) => {
              // Only render shading for every other day
              if (index === 0 || !entry || !entry.dateTime) return null;
              
              const currentDate = entry.dateTime.split(' ')[0];
              const prevEntry = processedChartData[index - 1];
              if (!prevEntry || !prevEntry.dateTime) return null;
              const prevDate = prevEntry.dateTime.split(' ')[0];
              
              // Only start a new block when date changes
              if (currentDate === prevDate) return null;
              
              // We need to find the start and end indices for this day
              // This iteration is not efficient for finding ranges.
              // Better approach: Pre-calculate date ranges in useMemo
              return null;
            })}
            
            {/* Render date ranges as ReferenceAreas */}

            {(() => {
              if (processedChartData.length === 0) return null;
              // 找出每一天的開始與結束 Timestamp
              const areas = [];
              let currentStart = processedChartData[0].timestamp;
              let currentDateStr = format(new Date(currentStart), 'yyyy-MM-dd');
              
              // 簡單邏輯：每隔一天畫一個陰影
              // 這裡可以使用更精確的日期遍歷
              const endTimestamp = processedChartData[processedChartData.length-1].timestamp;
              let iterTime = startOfDay(new Date(currentStart)).getTime();
              
              // 找到第一個偶數日或奇數日作為開始? 
              // 這裡採用簡單策略：每一天畫一個 ReferenceArea
              const dayMillis = 24 * 60 * 60 * 1000;
              
              // 為了效能，我們只畫間隔日
              let dayIndex = 0;
              while(iterTime < endTimestamp) {
                  if (dayIndex % 2 !== 0) { // 畫單數日，或者雙數日
                      areas.push(
                          <ReferenceArea
                              key={iterTime}
                              x1={Math.max(iterTime, currentStart)}
                              x2={Math.min(iterTime + dayMillis, endTimestamp)}
                              yAxisId="price"
                              fill={darkMode ? "#444444" : "#e0e0e0"}
                              fillOpacity={0.4}
                          />
                      );
                  }
                  iterTime += dayMillis;
                  dayIndex++;
              }
              return areas;
            })()}

            <XAxis 
              dataKey="timestamp" // 改用 timestamp
              type="number"       // 設定為數值軸
              scale="time"        // 設定為時間刻度
              domain={['dataMin', 'dataMax']} // 範圍自動貼合數據
              tickFormatter={formatXAxis}
              ticks={generateXAxisTicks()} // 使用生成的數值刻度
              stroke={colors.text}
              tick={{ fill: colors.text, fontSize: 11 }}
              tickLine={{ stroke: colors.text }}
              axisLine={{ stroke: colors.text }}
              height={50}
              allowDuplicatedCategory={false}
            />
            
            <YAxis 
              yAxisId="price"
              domain={[priceRange.min, priceRange.max]} 
              label={{ value: '¥/KWh', angle: -90, position: 'insideLeft', style: { fill: colors.text, fontSize: 12 } }}
              stroke={colors.text}
              tick={{ fill: colors.text, fontSize: 11 }}
            />


            {/* Imbalance Axis: 獨立顯示 */}
            {showImbalance && (
              <YAxis 
                yAxisId="imbalance" 
                orientation="right" 
                domain={[imbalanceRange.min, imbalanceRange.max]} 
                stroke={colors.imbalance}
                tick={{ fill: colors.imbalance, fontSize: 11 }}
                label={{ value: 'Imbalance Quantity', angle: 90, position: 'insideRight', style: { fill: colors.imbalance, fontSize: 12 } }}
                // 如果有多個右軸，需要調整偏移量避免重疊，這裡先設為 0，interconnection 設偏移
              />
            )}

            {showInterconnection && (
              <YAxis
                yAxisId="interconnection"
                orientation="right"
                // 改用 auto 確保所有數據都能顯示，排除計算錯誤的可能性
                domain={['auto', 'auto']} 
                stroke={colors.interconnection}
                tick={{ fill: colors.interconnection, fontSize: 11 }}
                label={{ value: 'MW', angle: 90, position: 'insideRight', style: { fill: colors.interconnection, fontSize: 12 } }}
              />
            )}

            <Tooltip 
              content={<CustomTooltip />} 
              wrapperStyle={{ zIndex: 1000 }} // 確保 Tooltip 在最上層
            />

            {/* Area, Line 等組件保持不變，因為它們會自動對應 X 軸的 timestamp */}
            {showPredictionRange && selectedModels.map((model, index) => {
               const modelKey = `${model.id}|${model.name}|${model.version}`;
               const modelColor = modelColorMap[modelKey];
               const areaColor = modelColor.includes('rgb') ? modelColor.replace(')', ', 0.2)').replace('rgb', 'rgba') : `${modelColor}33`;
               return (
                 <Area
                   key={`area-${modelKey}-${index}`}
                   yAxisId="price"
                   type="step" // 在數值軸上 step 依然有效
                   dataKey={(datum) => {
                     // 邏輯保持不變
                     const prediction = datum.modelPredictions.find((mp: ModelPrediction) => `${mp.modelId}|${mp.modelName}|${mp.modelVersion}` === modelKey);
                     if (!prediction) return null;
                     const bottom = prediction.predictedPrice5 ?? prediction.predictedPrice;
                     const top = prediction.predictedPrice95 ?? prediction.predictedPrice;
                     if (bottom === null || top === null) return null;
                     return [bottom, top];
                   }}
                   stroke="none"
                   fill={areaColor}
                   fillOpacity={0.5}
                   isAnimationActive={false}
                   connectNulls={true}
                 />
               );
            })}

            <Tooltip 
              content={<CustomTooltip />} 
              wrapperStyle={{ zIndex: 1000 }} // 確保 Tooltip 在最上層
            />

            {/* 為每個模型顯示預測區間 (P5-P95) */}
            {showPredictionRange && selectedModels.map((model, index) => {
              const modelKey = `${model.id}|${model.name}|${model.version}`;
              const modelColor = modelColorMap[modelKey];
              
              // 創建一個半透明的顏色
              const areaColor = modelColor.includes('rgb') 
                ? modelColor.replace(')', ', 0.2)').replace('rgb', 'rgba')
                : `${modelColor}33`; // 添加 33 (20% 透明度) 到十六進制顏色
              
              return (
                <Area
                  key={`area-${modelKey}-${index}`}
                  yAxisId="price"
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
            {selectedModels.map((model, index) => {
              const modelKey = `${model.id}|${model.name}|${model.version}`;
              const modelColor = modelColorMap[modelKey];
              
              return (
                <Line 
                  key={`line-${modelKey}-${index}`}
                  yAxisId="price"
                  type={chartType === 'stepLine' ? 'step' : 'monotone'} 
                  dataKey={(datum) => {
                    const prediction = datum.modelPredictions.find(
                      (mp: ModelPrediction) => `${mp.modelId}|${mp.modelName}|${mp.modelVersion}` === modelKey
                    );
                    return prediction?.predictedPrice ?? null;
                  }}
                  stroke={modelColor} 
                  name={`${model.name} ${model.version}`} 
                  // Use dot prop to render custom markers for Top/Bottom N
                  dot={getModelDot(modelKey)}
                  strokeWidth={1.5}
                  connectNulls={true}
                  isAnimationActive={false}
                />
              );
            })}
            

            {/* 不平衡量線 */}
            {showImbalance && (
              <Line 
                yAxisId="imbalance"
                type="monotone" 
                dataKey="imbalance" 
                stroke={colors.imbalance} 
                name="Imbalance Quantity" 
                strokeWidth={1.5}
                strokeDasharray="3 3"
                connectNulls={true}
                isAnimationActive={false}
                dot={false}
              />
            )}

            {/* 實際價格線 */}
            <Line 
              yAxisId="price"
              type={chartType === 'stepLine' ? 'step' : 'monotone'} 
              dataKey="actualPrice" 
              stroke={colors.actual} 
              name="Observation" 
              dot={<CustomizedDot />}
              strokeWidth={1.5}
              connectNulls={true}
              isAnimationActive={false}
            />

            {/* 時間前市場數據 */}
            {showIntraday && (
              <Customized 
                component={CandleStickLayer}
                data={processedChartData} 
                yAxisId="price" 
                darkMode={darkMode}
              />
            )}

            {/* 時間前市場平均價 */}
            {showIntraday && (
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="intraday_average"
                stroke={colors.intraday} // 使用您定義的顏色變數
                name="時間前市場平均價"
                strokeWidth={2}
                dot={false}
                connectNulls={true}
                isAnimationActive={false}
              />
            )}


            {/* 連系線流量差異線 */}
            {showInterconnection && (
               <ReferenceLine y={0} yAxisId="interconnection" stroke={colors.interconnection} strokeOpacity={0.3} strokeDasharray="3 3" />
            )}

            {showInterconnection && (
              <Line
                yAxisId="interconnection"
                type="monotone"
                dataKey="interconnection_flow_diff"
                stroke={colors.interconnection}
                strokeOpacity={1}
                name="連系線流量差異 (MW)"
                strokeWidth={3}
                connectNulls={true} // 確保斷點能連起來
                isAnimationActive={false}
                dot={false}
                activeDot={{ r: 5, fill: colors.interconnection, stroke: colors.interconnection, strokeWidth: 2 }}
              />
            )}

          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default PriceChart;
