'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { 
  Container, Box, Grid, Paper, Typography, FormControl, 
  InputLabel, Select, MenuItem, Button, Switch, 
  FormControlLabel, SelectChangeEvent, Alert, Divider,
  Tooltip, IconButton, Chip
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

export default function ElectricityPriceComparison() {
  const { darkMode, setDarkMode } = useTheme();
  const { logout, user } = useAuth();
  const router = useRouter();
  
  // 狀態管理
  const [areas, setAreas] = useState<Area[]>([]);
  const [models, setModels] = useState<PredictionModel[]>([]);
  const [calculatingDates, setCalculatingDates] = useState<CalculatingDate[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [selectedCalculatingDate, setSelectedCalculatingDate] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | null>(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [actualPrices, setActualPrices] = useState<AreaPrice[]>([]);
  const [predictions, setPredictions] = useState<PricePrediction[]>([]);
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
          setSelectedModel(modelsData[0].name);
          setSelectedVersion(modelsData[0].version);
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
      if (!selectedArea || !selectedModel || !selectedVersion || !startDate || !endDate) {
        return;
      }
      
      try {
        const formattedStartDate = format(startDate, 'yyyyMMdd');
        const formattedEndDate = format(endDate, 'yyyyMMdd');
        
        const dates = await fetchAvailableCalculatingDates({
          start_date: formattedStartDate,
          end_date: formattedEndDate,
          area_name: selectedArea,
          model_name: selectedModel,
          model_version: selectedVersion
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
  }, [selectedArea, selectedModel, selectedVersion, startDate, endDate, logout]);
  
  // 獲取數據的函數
  const fetchData = async () => {
    if (!selectedArea || !selectedModel || !selectedVersion || !startDate || !endDate) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const formattedStartDate = format(startDate, 'yyyyMMdd');
      const formattedEndDate = format(endDate, 'yyyyMMdd');
      
      const [actualData, predictionsData] = await Promise.all([
        fetchActualPrices({
          start_date: formattedStartDate,
          end_date: formattedEndDate,
          name: selectedArea
        }),
        fetchPredictions({
          start_date: formattedStartDate,
          end_date: formattedEndDate,
          area_name: selectedArea,
          model_name: selectedModel,
          model_version: selectedVersion,
          latest_only: true,
          calculating_date: selectedCalculatingDate || undefined
        })
      ]);
      
      setActualPrices(actualData);
      setPredictions(predictionsData);
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
    if (selectedArea && selectedModel && selectedVersion && selectedCalculatingDate) {
      fetchData();
    }
  }, [selectedArea, selectedModel, selectedVersion, selectedCalculatingDate]);
  
  // 處理日期變更
  const handleDateChange = () => {
    fetchData();
  };
  
  // 處理地區變更
  const handleAreaChange = (event: SelectChangeEvent) => {
    setSelectedArea(event.target.value);
  };
  
  // 處理模型變更
  const handleModelChange = (event: SelectChangeEvent) => {
    const newModel = event.target.value;
    setSelectedModel(newModel);
    
    // 重設版本為該模型的第一個版本
    const versions = models.filter(model => model.name === newModel);
    if (versions.length > 0) {
      setSelectedVersion(versions[0].version);
    }
  };
  
  // 處理版本變更
  const handleVersionChange = (event: SelectChangeEvent) => {
    setSelectedVersion(event.target.value);
  };
  
  // 處理計算日期變更
  const handleCalculatingDateChange = (event: SelectChangeEvent) => {
    setSelectedCalculatingDate(event.target.value);
  };
  
  // 準備圖表數據
  const chartData = useMemo<ChartDataPoint[]>(() => 
    prepareChartData(actualPrices, predictions),
    [actualPrices, predictions]
  );
  
  // 獲取區域的中文名稱
  const getAreaChineseName = (name: string): string => {
    const area = areas.find(a => a.name === name);
    return area ? area.name_ch : name;
  };
  
  // 檢查是否有數據
  const hasData = useMemo(() => chartData.length > 0, [chartData]);
  
  // 獲取可用版本列表
  const availableVersions = useMemo(() => {
    return models
      .filter(model => model.name === selectedModel)
      .map(model => model.version);
  }, [models, selectedModel]);
  
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
            <Grid item xs={12} md={3}>
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
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>選擇模型</InputLabel>
                <Select
                  value={selectedModel}
                  onChange={handleModelChange}
                  label="選擇模型"
                >
                  {Array.from(new Set(models.map(model => model.name))).map((name) => (
                    <MenuItem key={name} value={name}>
                      {name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>選擇版本</InputLabel>
                <Select
                  value={selectedVersion}
                  onChange={handleVersionChange}
                  label="選擇版本"
                  disabled={availableVersions.length === 0}
                >
                  {availableVersions.map((version) => (
                    <MenuItem key={version} value={version}>
                      {version}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
                  disabled={isLoading || !selectedArea || !selectedModel || !selectedVersion}
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
              {selectedArea ? `${getAreaChineseName(selectedArea)} - 電力價格` : '請選擇地區'}
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
              />
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
}
