'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, subDays, subWeeks, subMonths, addMonths, differenceInDays } from 'date-fns';
import {
  Container, Box, Grid, Paper, Typography, FormControl,
  InputLabel, Select, MenuItem, Button, Switch,
  FormControlLabel, SelectChangeEvent, Alert, Divider,
  Tooltip, IconButton, Chip, Checkbox, ListItemText, OutlinedInput,
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  ButtonGroup, ToggleButton, ToggleButtonGroup
} from '@mui/material';

import RefreshIcon from '@mui/icons-material/Refresh';
import InfoIcon from '@mui/icons-material/Info';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css'; // main style file
import 'react-date-range/dist/theme/default.css'; // theme css file
import { zhTW } from 'date-fns/locale'; // 引入繁體中文語系
import { Popover, TextField, InputAdornment } from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

import {
  fetchAreas,
  fetchPredictionModels,
  fetchPredictions,
  fetchActualPrices,
  fetchAvailableCalculatingDates,
  fetchSpecificPredictions,
  fetchWeatherActual,
  fetchWeatherForecast,
  fetchImbalance,
  fetchIntraday,
  fetchInterconnectionFlows,
  fetchOcctoArea
} from '@/services/api';
import PriceChart from '@/components/PriceChart';
import MaeAnalysis from '@/components/MaeAnalysis';
import ProfitAnalysis from '@/components/ProfitAnalysis';
import MarketInfoPanel from '@/components/MarketInfoPanel';
import { Area, PredictionModel, AreaPrice, PricePrediction, CalculatingDate, WeatherData, ImbalanceData, IntradayData, InterconnectionFlow, OcctoAreaData } from '@/types';
import { prepareChartData, ChartDataPoint, hashString, generateColor } from '@/utils/chartUtils';
import { useTheme } from '@/app/ThemeProvider';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

import WeatherChartSection from '@/components/WeatherChartSection';

export default function ElectricityPriceComparison() {
  const { darkMode, setDarkMode } = useTheme();
  const { logout, user } = useAuth();
  const router = useRouter();


  // 新增 Popover 狀態控制
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleDateClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleDateClose = () => {
    setAnchorEl(null);
  };

  const openDateData = Boolean(anchorEl);
  const idDateData = openDateData ? 'date-range-popover' : undefined;

  // 處理 react-date-range 的選擇變更
  const handleRangeSelect = (ranges: any) => {
    const { selection } = ranges;
    setStartDate(selection.startDate);
    setEndDate(selection.endDate);

    // 如果不是手動選擇的範圍（例如只選了一天），先不要清除 preset
    // 但如果是拖曳範圍，通常就清除 preset
    if (selection.startDate !== selection.endDate) {
      setDateRangePreset(null);
    }
  };

  const colors = useMemo(() => ({
    text: darkMode ? '#d9d9d9' : '#000000',
  }), [darkMode]);

  // 狀態管理
  const [areas, setAreas] = useState<Area[]>([]);
  const [models, setModels] = useState<PredictionModel[]>([]);
  const [calculatingDatesByModel, setCalculatingDatesByModel] = useState<{ [key: string]: CalculatingDate[] }>({});
  const [selectedArea, setSelectedArea] = useState<string>('');

  // Analysis Settings
  const [topBottomPairs, setTopBottomPairs] = useState<number>(4);

  // 多模型選擇，並為每個模型添加 calculatingDate 屬性
  const [selectedModels, setSelectedModels] = useState<{
    id: string | number;
    name: string;
    color: string;
    calculatingDate: string; // 'latest' 或特定日期
  }[]>([]);

  const [startDate, setStartDate] = useState<Date | null>(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [dateRangePreset, setDateRangePreset] = useState<string | null>('week');
  const [actualPrices, setActualPrices] = useState<AreaPrice[]>([]);
  const [predictionsByModel, setPredictionsByModel] = useState<{ [key: string]: PricePrediction[] }>({});
  const [weatherActual, setWeatherActual] = useState<WeatherData[]>([]);
  const [weatherForecast, setWeatherForecast] = useState<WeatherData[]>([]);
  const [imbalanceData, setImbalanceData] = useState<ImbalanceData[]>([]);
  const [intradayData, setIntradayData] = useState<IntradayData[]>([]);
  const [interconnectionData, setInterconnectionData] = useState<InterconnectionFlow[]>([]);
  const [occtoAreaData, setOcctoAreaData] = useState<OcctoAreaData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 獲取地區和模型列表
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        const [areasData, modelsData] = await Promise.all([
          fetchAreas(),
          fetchPredictionModels()
        ]);

        setAreas(areasData);
        setModels(modelsData);

        if (areasData.length > 0) {
          setSelectedArea(areasData[0].name);
        }

      } catch (err: any) {
        console.error('獲取初始資料失敗', err);

        if (err.response && err.response.status === 401) {
          setError('認證已過期，請重新登入');
          setTimeout(() => {
            logout();
          }, 2000);
        } else {
          setError('獲取初始資料失敗');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [logout]);

  // 當選擇區域和模型後，獲取每個模型可用的計算日期
  useEffect(() => {
    const fetchAllCalculatingDates = async () => {
      if (!selectedArea || selectedModels.length === 0 || !startDate || !endDate) {
        return;
      }

      try {
        const formattedStartDate = format(startDate, 'yyyyMMdd');
        const formattedEndDate = format(endDate, 'yyyyMMdd');

        // 為每個選擇的模型獲取可用的計算日期
        const datesPromises = selectedModels.map(model =>
          fetchAvailableCalculatingDates({
            start_date: formattedStartDate,
            end_date: formattedEndDate,
            area_name: selectedArea,
            model_name: model.name
          }).then(dates => ({
            modelKey: `${model.id}|${model.name}`,
            dates
          }))
        );

        const results = await Promise.all(datesPromises);

        // 更新每個模型的可用計算日期
        const newCalculatingDatesByModel: { [key: string]: CalculatingDate[] } = {};
        results.forEach(result => {
          newCalculatingDatesByModel[result.modelKey] = result.dates;
        });

        setCalculatingDatesByModel(newCalculatingDatesByModel);

        // 更新每個模型的計算日期，如果之前沒有設置或之前的日期不在新的可用日期中
        setSelectedModels(prev => prev.map(model => {
          const modelKey = `${model.id}|${model.name}`;
          const availableDates = newCalculatingDatesByModel[modelKey] || [];

          // 如果當前選擇的不是 'latest' 且不在可用日期中，則設為 'latest'
          if (model.calculatingDate !== 'latest' &&
            !availableDates.some(d => d.calculating_date === model.calculatingDate)) {
            return { ...model, calculatingDate: 'latest' };
          }

          return model;
        }));

      } catch (err: any) {
        console.error('獲取計算日期失敗', err);

        if (err.response && err.response.status === 401) {
          setError('認證已過期，請重新登入');
          setTimeout(() => {
            logout();
          }, 2000);
        }
      }
    };

    fetchAllCalculatingDates();
  }, [selectedArea, selectedModels.map(m => `${m.id}|${m.name}`).join(','), startDate, endDate, logout]);
  
  // 獲取實際價格和天氣資訊（不需要選模型）
  const fetchActualData = async () => {
    if (!selectedArea || !startDate || !endDate) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formattedStartDate = format(startDate, 'yyyyMMdd');
      const formattedEndDate = format(endDate, 'yyyyMMdd');

      // 並行獲取實際價格、天氣資訊、不平衡量、時間前市場數據和連系線流量
      const [actualData, weatherActualData, weatherForecastData, imbalanceDataResult, intradayDataResult, interconnectionDataResult, occtoAreaDataResult] = await Promise.all([
        fetchActualPrices({
          start_date: formattedStartDate,
          end_date: formattedEndDate,
          name: selectedArea
        }),
        fetchWeatherActual({
          start_date: formattedStartDate,
          end_date: formattedEndDate,
          area_name: selectedArea
        }),
        fetchWeatherForecast({
          start_date: formattedStartDate,
          end_date: formattedEndDate,
          area_name: selectedArea
        }),
        fetchImbalance({
          start_date: formattedStartDate,
          end_date: formattedEndDate,
          area_name: selectedArea
        }).catch((err) => {
          console.error('Error fetching imbalance data:', err);
          return [];
        }),
        fetchIntraday({
          start_date: formattedStartDate,
          end_date: formattedEndDate,
          area_name: selectedArea
        }).then(data => {
          console.log('Fetched intraday data:', data.length, 'items');
          if (data.length > 0) {
            console.log('Sample intraday item:', data[0]);
          }
          return data;
        }).catch((err) => {
          console.error('Error fetching intraday data:', err);
          return [];
        }),
        fetchInterconnectionFlows({
          start_date: formattedStartDate,
          end_date: formattedEndDate
        }).catch((err) => {
          console.error('Error fetching interconnection data:', err);
          return [];
        }),
        fetchOcctoArea({
          start_date: formattedStartDate,
          end_date: formattedEndDate,
          area_name: selectedArea
        }).catch((err) => {
          console.error('Error fetching occto area data:', err);
          return [];
        })
      ]);

      setActualPrices(actualData);
      setWeatherActual(weatherActualData);
      setWeatherForecast(weatherForecastData);
      setImbalanceData(imbalanceDataResult);
      setIntradayData(intradayDataResult);
      setInterconnectionData(interconnectionDataResult);
      setOcctoAreaData(occtoAreaDataResult);
    } catch (err: any) {
      console.error('獲取實際數據失敗', err);

      if (err.response && err.response.status === 401) {
        setError('認證已過期，請重新登入');
        setTimeout(() => {
          logout();
        }, 2000);
      } else {
        setError('獲取實際數據失敗');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 獲取預測數據（需要選模型）
  const fetchPredictionData = async () => {
    if (!selectedArea || selectedModels.length === 0 || !startDate || !endDate) {
      setPredictionsByModel({});
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formattedStartDate = format(startDate, 'yyyyMMdd');
      const formattedEndDate = format(endDate, 'yyyyMMdd');

      // 為每個選擇的模型獲取預測數據
      const predictionsData: { [key: string]: PricePrediction[] } = {};

      // 使用 Promise.all 並行獲取所有模型的預測
      await Promise.all(selectedModels.map(async (model) => {
        const modelKey = `${model.id}|${model.name}`;
        
        let modelPredictions;

        if (model.calculatingDate === 'latest') {
          // 使用 fetchPredictions 獲取最新預測
          modelPredictions = await fetchPredictions({
            start_date: formattedStartDate,
            end_date: formattedEndDate,
            area_name: selectedArea,
            model_name: model.name,
            latest_only: true
          });
        } else {
          // 使用 fetchSpecificPredictions 獲取特定日期的預測
          const formattedCalculatingDate = format(new Date(model.calculatingDate), 'yyyyMMdd');
          modelPredictions = await fetchSpecificPredictions({
            start_date: formattedStartDate,
            end_date: formattedEndDate,
            area_name: selectedArea,
            model_name: model.name,
            calculating_date: formattedCalculatingDate
          });
        }
        predictionsData[modelKey] = modelPredictions;
      }));

      setPredictionsByModel(predictionsData);
    } catch (err: any) {
      console.error('獲取預測數據失敗', err);

      if (err.response && err.response.status === 401) {
        setError('認證已過期，請重新登入');
        setTimeout(() => {
          logout();
        }, 2000);
      } else {
        setError('獲取預測數據失敗');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 當地區或日期變更時自動獲取實際價格和天氣資訊
  useEffect(() => {
    if (selectedArea && startDate && endDate) {
      fetchActualData();
    }
  }, [selectedArea, startDate, endDate]);

  // 當模型選擇變更時獲取預測數據
  useEffect(() => {
    if (selectedArea && selectedModels.length > 0 && startDate && endDate) {
      fetchPredictionData();
    } else {
      setPredictionsByModel({});
    }
  }, [selectedArea, JSON.stringify(selectedModels), startDate, endDate]);

  // 處理日期快捷選擇
  const handleDateRangePreset = (preset: string | null) => {
    if (!preset) {
      setDateRangePreset(null);
      return;
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999); // 設置為當天結束時間
    let start: Date;

    switch (preset) {
      case 'week':
        start = subDays(today, 7);
        break;
      case 'twoWeeks':
        start = subDays(today, 14);
        break;
      case 'month':
        start = subMonths(today, 1);
        break;
      case 'threeMonths':
        start = subMonths(today, 3);
        break;
      default:
        start = subDays(today, 7);
    }

    start.setHours(0, 0, 0, 0); // 設置為當天開始時間
    setStartDate(start);
    setEndDate(today);
    setDateRangePreset(preset);

    // 自動觸發數據更新（通過 useEffect）
  };

  // 處理日期變更
  const handleDateChange = () => {
    fetchActualData();
    if (selectedModels.length > 0) {
      fetchPredictionData();
    }
    // 當手動更改日期時，清除快捷選擇
    setDateRangePreset(null);
  };

  // 向左移動一個月（向後移動）
  const handleMoveMonthBackward = () => {
    if (startDate && endDate) {
      const newStartDate = subMonths(startDate, 1);
      const newEndDate = subMonths(endDate, 1);
      setStartDate(newStartDate);
      setEndDate(newEndDate);
      setDateRangePreset(null);
    }
  };

  // 向右移動一個月（向前移動）
  const handleMoveMonthForward = () => {
    if (startDate && endDate) {
      const newStartDate = addMonths(startDate, 1);
      const newEndDate = addMonths(endDate, 1);
      setStartDate(newStartDate);
      setEndDate(newEndDate);
      setDateRangePreset(null);
    }
  };

  // 處理地區變更
  const handleAreaChange = (event: SelectChangeEvent) => {
    setSelectedArea(event.target.value);
  };

  // 處理模型選擇變更
  const handleModelChange = (event: SelectChangeEvent<string[]>) => {
    // 取得當前選中的所有值（這是一個字串數組）
    const selectedValues = event.target.value as string[];

    // 如果沒有選擇任何模型，清除所有選擇
    if (selectedValues.length === 0) {
      setSelectedModels([]);
      return;
    }

    // 過濾掉重複的值（雖然 Select multiple 不應該產生重複，但安全起見）
    const uniqueSelectedValues = Array.from(new Set(selectedValues));

    // 構建新的 selectedModels 狀態
    const newSelectedModels = uniqueSelectedValues.map((modelValue) => {
      const [idStr, name] = modelValue.split('|');
      const id = isNaN(Number(idStr)) ? idStr : Number(idStr);

      // 檢查這個模型是否已經在之前的選擇中，如果是，保留其屬性（顏色、計算日期）
      const existingModel = selectedModels.find(
        m => m.id === id && m.name === name
      );

      if (existingModel) {
        return existingModel;
      }

      // 如果是新選擇的模型，初始化其屬性
      return {
        id,
        name,
        color: generateColor(hashString(modelValue)),
        calculatingDate: 'latest'
      };
    });

    setSelectedModels(newSelectedModels);
  };

  // 處理模型計算日期變更
  const handleModelCalculatingDateChange = (modelIndex: number, newCalculatingDate: string) => {
    setSelectedModels(prev => {
      const updated = [...prev];
      updated[modelIndex] = { ...updated[modelIndex], calculatingDate: newCalculatingDate };
      return updated;
    });
  };

  // 準備模型選擇列表
  const modelOptions = useMemo(() => {
    const options: { id: string | number; name: string; value: string; }[] = [];
    
    models.forEach(model => {
      options.push({
        id: model.id,
        name: model.name,
        value: `${model.id}|${model.name}`
      });
    });

    return options;
  }, [models]);

  // 準備圖表數據
  const chartData = useMemo<ChartDataPoint[]>(() =>
    prepareChartData(actualPrices, predictionsByModel),
    [actualPrices, predictionsByModel]
  );

  // 準備天氣圖表數據 - 合併 actual 和 forecast 數據
  const weatherChartData = useMemo(() => {
    const dataMap = new Map<string, any>();

    // 輔助函數：標準化時間 Key
    // 這是解決資料不對齊、Tooltip 分開的關鍵！
    // 確保無論 API 回傳格式為何 (例如 '2025-01-01T10:00' vs '2025-01-01 10:00:00')，都視為同一時間
    const getNormalizedKey = (dateStr: string) => {
      if (!dateStr) return '';
      try {
        return new Date(dateStr).toISOString();
      } catch (e) {
        return dateStr;
      }
    };

    // 1. 處理 Actual 數據
    weatherActual.forEach(item => {
      const key = getNormalizedKey(item.weather_datetime); // 使用標準化後的 Key

      if (!dataMap.has(key)) {
        dataMap.set(key, {
          weather_datetime: item.weather_datetime, // 保留原始時間格式用於顯示
          temperature_actual: null,
          rainfall_actual: null,
          wind_speed_actual: null,
          temperature_forecast: null,
          rainfall_forecast: null,
          wind_speed_forecast: null
        });
      }
      const existing = dataMap.get(key);
      existing.temperature_actual = item.temperature;
      existing.rainfall_actual = item.rainfall;
      existing.wind_speed_actual = item.wind_speed;
    });

    // 2. 處理 Forecast 數據
    weatherForecast.forEach(item => {
      const key = getNormalizedKey(item.weather_datetime); // 使用標準化後的 Key

      if (!dataMap.has(key)) {
        dataMap.set(key, {
          weather_datetime: item.weather_datetime,
          temperature_actual: null,
          rainfall_actual: null,
          wind_speed_actual: null,
          temperature_forecast: null,
          rainfall_forecast: null,
          wind_speed_forecast: null
        });
      }
      const existing = dataMap.get(key);
      existing.temperature_forecast = item.temperature;
      existing.rainfall_forecast = item.rainfall;
      existing.wind_speed_forecast = item.wind_speed;
    });

    // 3. 轉換為數組並排序
    return Array.from(dataMap.values()).sort((a, b) =>
      new Date(a.weather_datetime).getTime() - new Date(b.weather_datetime).getTime()
    );
  }, [weatherActual, weatherForecast]);
  // 獲取區域的中文名稱
  const getAreaChineseName = (name: string): string => {
    const area = areas.find(a => a.name === name);
    return area ? area.name_ch : name;
  };

  // 檢查是否有數據
  const hasData = useMemo(() => chartData.length > 0, [chartData]);

  // 獲取已選模型的值列表（用於多選框）
  const selectedModelValues = useMemo(() => {
    return selectedModels.map(model => `${model.id}|${model.name}`);
  }, [selectedModels]);

  // Helper function to format calculating date
  const formatCalcDate = (dateVal: string | number) => {
    if (dateVal === 'latest') return '最新';
    if (!dateVal) return '';

    // Try to parse as timestamp if it looks like a large number
    const numVal = Number(dateVal);
    // If > 20000000 (e.g. 20250101 is 20M, timestamp is 1.7T. 100M is a safe threshold)
    if (!isNaN(numVal) && numVal > 100000000) {
      return format(new Date(numVal), 'yyyy-MM-dd');
    }

    // If it is YYYYMMDD string or number
    const strVal = String(dateVal);
    if (strVal.length === 8 && !isNaN(Number(strVal))) {
      return `${strVal.substring(0, 4)}-${strVal.substring(4, 6)}-${strVal.substring(6, 8)}`;
    }

    // Try parsing as standard date string
    try {
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        return format(d, 'yyyy-MM-dd');
      }
    } catch (e) { }

    return String(dateVal);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Market Insight
          </Typography>

          {/* 右側設置組合 */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 1.5,
              ml: { sm: "auto" },
            }}
          >
            {/* 使用者資訊與登出 */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Typography variant="subtitle1" component="span">
                Welcome, {user}
              </Typography>
              <Button
                variant="outlined"
                onClick={logout}
                size="small"
                sx={{
                  minWidth: 80,
                  fontWeight: 500,
                  boxShadow: "none",
                  borderRadius: "6px",
                  py: 0.5,
                  px: 2,
                }}
              >
                Logout
              </Button>
            </Box>
            {/* 深色模式控制 */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                minWidth: 120,
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={darkMode}
                    onChange={(e) => setDarkMode(e.target.checked)}
                  />
                }
                label="深色模式"
                sx={{ mr: 0 }}
              />
              <Tooltip title="深色模式提供更好的圖表視覺效果" arrow>
                <IconButton size="small" sx={{ color: "text.secondary" }}>
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Paper sx={{ p: 3, mb: 4, borderRadius: 2, boxShadow: 3 }}>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            資料選擇
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            {/* 第一行：區域和模型選擇 */}
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>選擇地區</InputLabel>
                <Select
                  value={selectedArea}
                  onChange={handleAreaChange}
                  label="選擇地區"
                >
                  {areas.map((area) => (
                    <MenuItem key={area.id} value={area.name}>
                      {area.name_ch} ({area.name})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={8}>
              <FormControl fullWidth size="small">
                <InputLabel>選擇模型 (最多5個)</InputLabel>
                <Select
                  multiple
                  value={selectedModelValues}
                  onChange={handleModelChange}
                  input={<OutlinedInput label="選擇模型 (最多5個)" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => {
                        const [_, name] = value.split('|');
                        return (
                          <Chip 
                            key={value} 
                            label={`${name}`} 
                            size="small" 
                            style={{ backgroundColor: selectedModels.find(m => `${m.id}|${m.name}` === value)?.color + '33' }}
                          />
                        );
                      })}
                    </Box>
                  )}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300
                      }
                    }
                  }}
                >
                  {modelOptions.map((option) => (
                    <MenuItem
                      key={option.value}
                      value={option.value}
                      disabled={selectedModelValues.length >= 5 && !selectedModelValues.includes(option.value)}
                    >
                      <Checkbox checked={selectedModelValues.includes(option.value)} />
                      <ListItemText primary={`${option.name}`} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedModels.length >= 5 && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                  最多可選擇5個模型進行比較
                </Typography>
              )}
            </Grid>

            {/* 第二行：日期選擇和操作按鈕 */}
            <Grid item xs={12}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: 'text.secondary' }}>
                  日期範圍選擇
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: { xs: 'stretch', md: 'center' } }}>

                  {/* 1. 偽裝成 Input 的按鈕，點擊跳出日曆 */}
                  <Button
                    aria-describedby={idDateData}
                    onClick={handleDateClick}
                    variant="outlined"
                    startIcon={<CalendarTodayIcon />}
                    endIcon={<Typography variant="caption" sx={{ color: 'text.secondary' }}>▼</Typography>}
                    sx={{
                      justifyContent: 'space-between',
                      borderColor: darkMode ? 'rgba(255,255,255,0.23)' : 'rgba(0,0,0,0.23)',
                      color: colors.text,
                      py: 1,
                      minWidth: '280px',
                      textTransform: 'none',
                      '&:hover': {
                        borderColor: colors.text
                      }
                    }}
                  >
                    <Typography variant="body2" fontWeight="bold">
                      {startDate ? format(startDate, 'yyyy/MM/dd') : '開始日期'}
                      {' - '}
                      {endDate ? format(endDate, 'yyyy/MM/dd') : '結束日期'}
                    </Typography>
                  </Button>

                  {/* 日曆 Popover */}
                  <Popover
                    id={idDateData}
                    open={openDateData}
                    anchorEl={anchorEl}
                    onClose={handleDateClose}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'left',
                    }}
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'left',
                    }}
                    PaperProps={{
                      sx: {
                        mt: 1,
                        p: 0,
                        borderRadius: 2,
                        overflow: 'hidden',
                        // 針對深色模式調整 react-date-range 的樣式
                        ...(darkMode && {
                          bgcolor: '#1a1a1a',
                          '& .rdrCalendarWrapper': { bgcolor: '#1a1a1a', color: '#fff' },
                          '& .rdrDateDisplayWrapper': { bgcolor: '#2a2a2a' },
                          '& .rdrDateDisplayItem': { bgcolor: '#333', boxShadow: 'none', border: '1px solid #444' },
                          '& .rdrDateDisplayItem input': { color: '#fff' },
                          '& .rdrMonthAndYearPickers select': { color: '#fff' },
                          '& .rdrDayNumber span': { color: '#fff' },
                          '& .rdrDayPassive .rdrDayNumber span': { color: '#666' },
                          '& .rdrDayToday .rdrDayNumber span': { color: '#1890ff' }, // 今天
                        })
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      {/* 這裡使用 react-date-range */}
                      <DateRange
                        editableDateInputs={true}
                        onChange={handleRangeSelect}
                        moveRangeOnFirstSelection={false}
                        ranges={[{
                          startDate: startDate || new Date(),
                          endDate: endDate || new Date(),
                          key: 'selection',
                          color: darkMode ? '#1890ff' : '#1976d2' // 主題色
                        }]}
                        months={2} // 一次顯示兩個月份，像訂房網站
                        direction="horizontal"
                        locale={zhTW} // 設定繁體中文
                        rangeColors={[darkMode ? '#1890ff' : '#1976d2']}
                      />
                      <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', borderTop: `1px solid ${darkMode ? '#333' : '#eee'}` }}>
                        <Button onClick={handleDateClose} variant="contained" size="small">
                          確定
                        </Button>
                      </Box>
                    </Box>
                  </Popover>

                  {/* 2. 快捷按鈕群組 (整合在一起更美觀) */}
                  <ButtonGroup variant="outlined" size="small" aria-label="date range presets">
                    <Button
                      onClick={() => handleDateRangePreset('week')}
                      variant={dateRangePreset === 'week' ? 'contained' : 'outlined'}
                    >
                      一週
                    </Button>
                    <Button
                      onClick={() => handleDateRangePreset('twoWeeks')}
                      variant={dateRangePreset === 'twoWeeks' ? 'contained' : 'outlined'}
                    >
                      兩週
                    </Button>
                    <Button
                      onClick={() => handleDateRangePreset('month')}
                      variant={dateRangePreset === 'month' ? 'contained' : 'outlined'}
                    >
                      一月
                    </Button>
                    <Button
                      onClick={() => handleDateRangePreset('threeMonths')}
                      variant={dateRangePreset === 'threeMonths' ? 'contained' : 'outlined'}
                    >
                      三月
                    </Button>
                  </ButtonGroup>

                  {/* 3. 月份切換按鈕 (保留原本功能但優化樣式) */}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="上個月">
                      <IconButton
                        onClick={handleMoveMonthBackward}
                        disabled={!startDate}
                        size="small"
                        sx={{ border: `1px solid ${darkMode ? '#444' : '#e0e0e0'}` }}
                      >
                        <ChevronLeftIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="下個月">
                      <IconButton
                        onClick={handleMoveMonthForward}
                        disabled={!startDate}
                        size="small"
                        sx={{ border: `1px solid ${darkMode ? '#444' : '#e0e0e0'}` }}
                      >
                        <ChevronRightIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {/* 4. 更新數據按鈕 */}
                  <Button
                    variant="contained"
                    onClick={handleDateChange}
                    disabled={isLoading || !selectedArea}
                    startIcon={<RefreshIcon />}
                    size="small"
                    sx={{ ml: 'auto', minWidth: '120px', height: '40px' }}
                  >
                    {isLoading ? '載入中...' : '更新數據'}
                  </Button>

                </Box>
              </Box>
            </Grid>

          </Grid>

          {/* 新增：模型計算日期選擇表格 */}
          {selectedModels.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                模型計算日期設定
              </Typography>
              <TableContainer component={Paper} sx={{ backgroundColor: 'background.paper' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>模型</TableCell>
                      <TableCell>計算日期</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedModels.map((model, index) => {
                      const modelKey = `${model.id}|${model.name}`;
                      const availableDates = calculatingDatesByModel[modelKey] || [];

                      return (
                        <TableRow key={modelKey}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  backgroundColor: model.color,
                                  mr: 1
                                }}
                              />
                              {`${model.name}`}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <FormControl fullWidth size="small">
                              <Select
                                value={model.calculatingDate}
                                onChange={(e) => handleModelCalculatingDateChange(index, e.target.value)}
                                displayEmpty
                                sx={{ minWidth: 150 }}
                              >
                                <MenuItem value="latest">
                                  <em>最新 (Latest)</em>
                                </MenuItem>
                                {availableDates.map((date: CalculatingDate) => (
                                  <MenuItem key={date.calculating_date} value={date.calculating_date}>
                                    {formatCalcDate(date.calculating_date)}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                * 選擇 "最新 (Latest)" 將顯示每個時間點的最新預測結果。選擇特定日期將顯示該日期計算的預測結果。
              </Typography>
            </Box>
          )}
        </Paper>

        <Paper sx={{ p: 2, borderRadius: 2, boxShadow: 3, minHeight: '600px' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" fontWeight="bold">
              {selectedArea ? `${getAreaChineseName(selectedArea)} - 電力價格比較` : '請選擇地區'}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1 }}>
              {selectedModels.map((model) => (
                <Chip 
                  key={`${model.id}-${model.name}`}
                  label={`${model.name}: ${formatCalcDate(model.calculatingDate)}`}
                  size="small"
                  sx={{
                    borderColor: model.color,
                    color: model.color,
                  }}
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>

          {isLoading ? (
            <Box sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '500px',
              flexDirection: 'column'
            }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                載入數據中...
              </Typography>
              <Typography variant="body2" color="text.secondary">
                正在獲取 {selectedArea} 地區的電力價格數據
              </Typography>
            </Box>
          ) : !hasData ? (
            <Box sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '500px',
              flexDirection: 'column'
            }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                沒有可用數據
              </Typography>
              <Typography variant="body2" color="text.secondary">
                請選擇不同的參數或日期範圍
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ minHeight: 500 }}>
                <PriceChart
                  chartData={chartData}
                  areaName={selectedArea}
                  selectedModels={selectedModels}
                  topBottomPairs={topBottomPairs}
                  imbalanceData={imbalanceData}
                  intradayData={intradayData}
                  interconnectionData={interconnectionData}
                  occtoAreaData={occtoAreaData}
                />
              </Box>

              {/* 天氣資訊 */}
              <WeatherChartSection
                weatherActual={weatherActual}
                weatherForecast={weatherForecast}
                weatherChartData={weatherChartData}
              />
            </>
          )}
        </Paper>

        {/* Analysis Sections */}
        {hasData && (
          <Paper sx={{ p: 2, mt: 3, borderRadius: 2, boxShadow: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              模型收益分析 (Profit Analysis)
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {selectedModels.length === 0 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                目前未選擇任何模型，僅顯示實際收益分析 (No models selected. Showing actual profit analysis only)
              </Alert>
            )}

            <ProfitAnalysis
              chartData={chartData}
              selectedModels={selectedModels}
              topBottomPairs={topBottomPairs}
              setTopBottomPairs={setTopBottomPairs}
            />

            <Box sx={{ my: 4 }} /> {/* Spacing */}

            <Typography variant="h6" gutterBottom fontWeight="bold">
              模型比較分析 (MAE)
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {selectedModels.length === 0 ? (
              <Alert severity="info">
                請選擇模型以進行模型比較分析 (Please select models to perform model comparison analysis)
              </Alert>
            ) : (
              <>
                <Grid container spacing={2}>
                  {selectedModels.map((model) => {
                    const modelKey = `${model.id}|${model.name}`;
                    const modelMAE = chartData.length > 0 
                      ? calculateModelMAE(chartData, model.id, model.name)
                      : 0;

                    return (
                      <Grid item xs={12} sm={6} md={4} key={modelKey}>
                        <Paper sx={{
                          p: 2,
                          border: `1px solid ${model.color}`,
                          backgroundColor: 'rgba(0,0,0,0.1)'
                        }}>
                          <Typography variant="subtitle1" fontWeight="bold" sx={{ color: model.color }}>
                            {model.name}
                          </Typography>
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2">
                              MAE: <strong>{modelMAE.toFixed(2)} ¥/KWh</strong>
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              計算日期: <strong>{formatCalcDate(model.calculatingDate)}</strong>
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              模型描述: {models.find(m => m.id === model.id)?.description || '無描述'}
                            </Typography>
                          </Box>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>

                {/* 插入詳細的 MAE 分析圖表 */}
                <MaeAnalysis chartData={chartData} selectedModels={selectedModels} />

                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    比較提示:
                  </Typography>
                  <Typography variant="body2">
                    • 較低的 MAE (Mean Absolute Error) 值通常表示預測更準確
                  </Typography>
                  <Typography variant="body2">
                    • 預測區間 (P5-P95) 寬度反映了模型的不確定性
                  </Typography>
                </Box>
              </>
            )}
          </Paper>
        )}

        {selectedArea && startDate && endDate && (
          <MarketInfoPanel
            startDate={startDate}
            endDate={endDate}
            selectedArea={selectedArea}
          />
        )}

      </Box>
    </Container>
  );
}

// 輔助函數：計算模型的 MAE
function calculateModelMAE(chartData: ChartDataPoint[], modelId: string | number, modelName: string): number {
  const pointsWithBothValues = chartData.filter(point => {
    const modelPrediction = point.modelPredictions.find(
      mp => mp.modelId === modelId && mp.modelName === modelName
    );
    // 確保 actualPrice 和 predictedPrice 都是有效的數值
    return typeof point.actualPrice === 'number' &&
      modelPrediction?.predictedPrice !== null &&
      modelPrediction?.predictedPrice !== undefined;
  });

  if (pointsWithBothValues.length === 0) return 0;

  let validPointsCount = 0;
  const totalError = pointsWithBothValues.reduce((sum, point) => {
    const modelPrediction = point.modelPredictions.find(
      mp => mp.modelId === modelId && mp.modelName === modelName
    );

    if (!modelPrediction || typeof modelPrediction.predictedPrice !== 'number') return sum;

    validPointsCount++;
    return sum + Math.abs(point.actualPrice as number - modelPrediction.predictedPrice);
  }, 0);

  // 使用實際有效點的數量來計算平均值
  return validPointsCount > 0 ? totalError / validPointsCount : 0;
}
