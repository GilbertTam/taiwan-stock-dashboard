'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { 
  Container, Box, Grid, Paper, Typography, FormControl, 
  InputLabel, Select, MenuItem, Button, Switch, 
  FormControlLabel, SelectChangeEvent, Alert, Divider,
  Tooltip, IconButton, Chip, Checkbox, ListItemText, OutlinedInput
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoIcon from '@mui/icons-material/Info';
import { 
  fetchAreas, 
  fetchPredictionModels, 
  fetchPredictions, 
  fetchActualPrices,
  fetchAvailableCalculatingDates 
} from '@/services/api';
import PriceChart from '@/components/PriceChart';
import { Area, PredictionModel, AreaPrice, PricePrediction, CalculatingDate } from '@/types';
import { prepareChartData, ChartDataPoint } from '@/utils/chartUtils';
import { useTheme } from '@/app/ThemeProvider';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

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
];

export default function ElectricityPriceComparison() {
  const { darkMode, setDarkMode } = useTheme();
  const { logout, user } = useAuth();
  const router = useRouter();
  
  // 狀態管理
  const [areas, setAreas] = useState<Area[]>([]);
  const [models, setModels] = useState<PredictionModel[]>([]);
  const [calculatingDates, setCalculatingDates] = useState<CalculatingDate[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>('');
  
  // 多模型選擇
  const [selectedModels, setSelectedModels] = useState<{
    id: number;
    name: string;
    version: string;
    color: string;
  }[]>([]);
  
  const [selectedCalculatingDate, setSelectedCalculatingDate] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | null>(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [actualPrices, setActualPrices] = useState<AreaPrice[]>([]);
  const [predictionsByModel, setPredictionsByModel] = useState<{ [key: string]: PricePrediction[] }>({});
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
        
        if (modelsData.length > 0) {
          // 默認選擇第一個模型
          const firstModel = modelsData[0];
          setSelectedModels([{
            id: firstModel.id,
            name: firstModel.name,
            version: firstModel.version,
            color: MODEL_COLORS[0]
          }]);
        }
      } catch (err: any) {
        console.error('獲取初始數據失敗', err);
        
        if (err.response && err.response.status === 401) {
          setError('認證已過期，請重新登入');
          setTimeout(() => {
            logout();
          }, 2000);
        } else {
          setError('獲取初始數據失敗');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInitialData();
  }, [logout]);
  
  // 當選擇區域和模型後，獲取可用的計算日期
  useEffect(() => {
    const fetchCalculatingDates = async () => {
      if (!selectedArea || selectedModels.length === 0 || !startDate || !endDate) {
        return;
      }
      
      try {
        const formattedStartDate = format(startDate, 'yyyyMMdd');
        const formattedEndDate = format(endDate, 'yyyyMMdd');
        
        // 使用第一個選擇的模型來獲取計算日期
        const firstModel = selectedModels[0];
        
        const dates = await fetchAvailableCalculatingDates({
          start_date: formattedStartDate,
          end_date: formattedEndDate,
          area_name: selectedArea,
          model_name: firstModel.name,
          model_version: firstModel.version
        });
        
        setCalculatingDates(dates);
        
        if (dates.length > 0) {
          setSelectedCalculatingDate(dates[0].calculating_date);
        } else {
          setSelectedCalculatingDate('');
        }
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
    
    fetchCalculatingDates();
  }, [selectedArea, selectedModels, startDate, endDate, logout]);
  
  // 獲取數據的函數
  const fetchData = async () => {
    if (!selectedArea || selectedModels.length === 0 || !startDate || !endDate) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const formattedStartDate = format(startDate, 'yyyyMMdd');
      const formattedEndDate = format(endDate, 'yyyyMMdd');
      
      // 獲取實際價格
      const actualData = await fetchActualPrices({
        start_date: formattedStartDate,
        end_date: formattedEndDate,
        name: selectedArea
      });
      
      setActualPrices(actualData);
      
      // 為每個選擇的模型獲取預測數據
      const predictionsData: { [key: string]: PricePrediction[] } = {};
      
      // 使用 Promise.all 並行獲取所有模型的預測
      await Promise.all(selectedModels.map(async (model) => {
        const modelPredictions = await fetchPredictions({
          start_date: formattedStartDate,
          end_date: formattedEndDate,
          area_name: selectedArea,
          model_name: model.name,
          model_version: model.version,
          latest_only: true,
          calculating_date: selectedCalculatingDate || undefined
        });
        
        const modelKey = `${model.id}|${model.name}|${model.version}`;
        predictionsData[modelKey] = modelPredictions;
      }));
      
      setPredictionsByModel(predictionsData);
    } catch (err: any) {
      console.error('獲取數據失敗', err);
      
      if (err.response && err.response.status === 401) {
        setError('認證已過期，請重新登入');
        setTimeout(() => {
          logout();
        }, 2000);
      } else {
        setError('獲取數據失敗');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // 當選擇變更時自動獲取數據
  useEffect(() => {
    if (selectedArea && selectedModels.length > 0 && selectedCalculatingDate) {
      fetchData();
    }
  }, [selectedArea, selectedModels, selectedCalculatingDate]);
  
  // 處理日期變更
  const handleDateChange = () => {
    fetchData();
  };
  
  // 處理地區變更
  const handleAreaChange = (event: SelectChangeEvent) => {
    setSelectedArea(event.target.value);
  };
  
  // 處理模型選擇變更
  const handleModelChange = (event: SelectChangeEvent<string[]>) => {
    const selectedModelIds = event.target.value as string[];
    
    // 將選擇的模型 ID 轉換為完整的模型對象
    const newSelectedModels = selectedModelIds.map((modelId, index) => {
      const [id, name, version] = modelId.split('|');
      return {
        id: parseInt(id),
        name,
        version,
        color: MODEL_COLORS[index % MODEL_COLORS.length]
      };
    });
    
    setSelectedModels(newSelectedModels);
  };
  
  // 處理計算日期變更
  const handleCalculatingDateChange = (event: SelectChangeEvent) => {
    setSelectedCalculatingDate(event.target.value);
  };
  
  // 準備模型選擇列表
  const modelOptions = useMemo(() => {
    const options: { id: number; name: string; version: string; value: string; }[] = [];
    
    models.forEach(model => {
      options.push({
        id: model.id,
        name: model.name,
        version: model.version,
        value: `${model.id}|${model.name}|${model.version}`
      });
    });
    
    return options;
  }, [models]);
  
  // 準備圖表數據
  const chartData = useMemo<ChartDataPoint[]>(() => 
    prepareChartData(actualPrices, predictionsByModel),
    [actualPrices, predictionsByModel]
  );
  
  // 獲取區域的中文名稱
  const getAreaChineseName = (name: string): string => {
    const area = areas.find(a => a.name === name);
    return area ? area.name_ch : name;
  };
  
  // 檢查是否有數據
  const hasData = useMemo(() => chartData.length > 0, [chartData]);
  
  // 獲取已選模型的值列表（用於多選框）
  const selectedModelValues = useMemo(() => {
    return selectedModels.map(model => `${model.id}|${model.name}|${model.version}`);
  }, [selectedModels]);
  
  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            電力市場價格預測儀表板
          </Typography>
          
          <Box>
            <Typography variant="subtitle1" component="span" sx={{ mr: 2 }}>
              歡迎, {user}
            </Typography>
            <Button variant="outlined" onClick={logout} size="small">
              登出
            </Button>
          </Box>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Paper sx={{ p: 3, mb: 4, borderRadius: 2, boxShadow: 3 }}>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            數據選擇
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
            
            <Grid item xs={12} md={5}>
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
                        const [_, name, version] = value.split('|');
                        return (
                          <Chip 
                            key={value} 
                            label={`${name} ${version}`} 
                            size="small" 
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
                      <ListItemText primary={`${option.name} ${option.version}`} />
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
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>計算日期</InputLabel>
                <Select
                  value={selectedCalculatingDate}
                  onChange={handleCalculatingDateChange}
                  label="計算日期"
                  disabled={calculatingDates.length === 0}
                >
                  {calculatingDates.map((date) => (
                    <MenuItem key={date.calculating_date} value={date.calculating_date}>
                      {date.calculating_date}
                    </MenuItem>
                  ))}
                </Select>
                {calculatingDates.length === 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    沒有可用的計算日期
                  </Typography>
                )}
              </FormControl>
            </Grid>
            
            {/* 第二行：日期選擇和操作按鈕 */}
            <Grid item xs={12} md={3}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="開始日期"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="結束日期"
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                <Button 
                  variant="contained" 
                  onClick={handleDateChange}
                  disabled={isLoading || !selectedArea || selectedModels.length === 0}
                  startIcon={<RefreshIcon />}
                  sx={{ mr: 2 }}
                >
                  {isLoading ? '載入中...' : '更新數據'}
                </Button>
                
                <FormControlLabel
                  control={
                    <Switch 
                      checked={darkMode} 
                      onChange={(e) => setDarkMode(e.target.checked)} 
                    />
                  }
                  label="深色模式"
                />
                
                <Tooltip title="深色模式提供更好的圖表視覺效果">
                  <IconButton size="small" sx={{ ml: 0.5 }}>
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        </Paper>
        
        <Paper sx={{ p: 2, borderRadius: 2, boxShadow: 3, minHeight: '600px' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" fontWeight="bold">
              {selectedArea ? `${getAreaChineseName(selectedArea)} - 電力價格比較` : '請選擇地區'}
            </Typography>
            
            {selectedCalculatingDate && (
              <Chip 
                label={`計算日期: ${selectedCalculatingDate}`} 
                size="small" 
                color="primary" 
                variant="outlined"
              />
            )}
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
            <Box sx={{ height: 500 }}>
              <PriceChart 
                chartData={chartData} 
                areaName={selectedArea}
                selectedModels={selectedModels}
              />
            </Box>
          )}
        </Paper>
        
        {/* 添加模型比較說明區塊 */}
        {selectedModels.length > 1 && hasData && (
          <Paper sx={{ p: 2, mt: 3, borderRadius: 2, boxShadow: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              模型比較分析
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={2}>
              {selectedModels.map((model) => {
                const modelKey = `${model.id}|${model.name}|${model.version}`;
                const modelMAE = chartData.length > 0 
                  ? calculateModelMAE(chartData, model.id, model.name, model.version)
                  : 0;
                
                return (
                  <Grid item xs={12} sm={6} md={4} key={modelKey}>
                    <Paper sx={{ 
                      p: 2, 
                      border: `1px solid ${model.color}`,
                      backgroundColor: 'rgba(0,0,0,0.1)'
                    }}>
                      <Typography variant="subtitle1" fontWeight="bold" sx={{ color: model.color }}>
                        {model.name} {model.version}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2">
                          MAE: <strong>{modelMAE.toFixed(2)} ¥/KWh</strong>
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
              <Typography variant="body2">
                • 特定時間點的預測差異可通過懸停在圖表上查看詳細比較
              </Typography>
            </Box>
          </Paper>
        )}
      </Box>
    </Container>
  );
}

// 輔助函數：計算模型的 MAE
function calculateModelMAE(chartData: ChartDataPoint[], modelId: number, modelName: string, modelVersion: string): number {
  const pointsWithBothValues = chartData.filter(point => {
    const modelPrediction = point.modelPredictions.find(
      mp => mp.modelId === modelId && mp.modelName === modelName && mp.modelVersion === modelVersion
    );
    return point.actualPrice !== null && modelPrediction?.predictedPrice !== null;
  });
  
  if (pointsWithBothValues.length === 0) return 0;
  
  const totalError = pointsWithBothValues.reduce((sum, point) => {
    const modelPrediction = point.modelPredictions.find(
      mp => mp.modelId === modelId && mp.modelName === modelName && mp.modelVersion === modelVersion
    );
    if (!modelPrediction) return sum;
    return sum + Math.abs((point.actualPrice as number) - (modelPrediction.predictedPrice as number));
  }, 0);
  
  return totalError / pointsWithBothValues.length;
}
