'use client';

import React, { useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  SelectChangeEvent,
  useTheme,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Radio,
  Checkbox,
  Menu,
  MenuItem,
  IconButton,
  Collapse,
  alpha, // 新增：用於處理顏色透明度
} from '@mui/material';
import { Area, PredictionModel, CalculatingDate } from '@/types';
import { useMarketDataContext } from '@/context/MarketDataContext';
import { usePriceChart } from '@/components/price-chart/context/PriceChartContext';
import { calculateModelMAE, prepareChartData } from '@/utils/chartUtils';
import { occtoFields, occtoStackedFields, weatherFields } from '@/components/price-chart/constants';
import {
  ExpandMore, ExpandLess,
  Balance, SwapHoriz, Cloud, Map, ShowChart, BarChart, Percent,
  Edit as EditIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

// 1. 定義統一的顏色映射，方便維護並對應圖表顏色
const SOURCE_COLORS = {
  imbalance: '#ff9800',
  intraday: '#9c27b0',
  interconnection: '#00bcd4',
  weather: '#2196f3', // 統一天氣主色
  weatherActual: '#ffc107',
  weatherForecast: '#ff9800',
  occto: '#009688',
  primary: 'var(--primary)',
  text: 'var(--text-primary)',
  textSec: 'var(--text-secondary)',
};

interface PricePredictionSidebarProps {
  // Area selection
  areas: Area[];
  selectedArea: string;
  onAreaChange: (event: SelectChangeEvent) => void;

  // Model selection
  models: PredictionModel[];
  selectedModels: Array<{
    id: string | number;
    name: string;
    color: string;
    calculatingDate: string;
  }>;
  calculatingDatesByModel: { [key: string]: CalculatingDate[] };
  onModelToggle: (modelId: string | number, modelName: string) => void;
  onModelCalculatingDateChange: (modelIndex: number, newDate: string) => void;
}

// Helper: 統一的 Section Header
function SectionHeader({
  children,
  onClick,
  expanded
}: {
  children: React.ReactNode;
  onClick?: () => void;
  expanded?: boolean;
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        px: 1.5,
        py: 1, //稍微增加高度讓點擊更容易
        borderBottom: '1px solid var(--card-border)',
        backgroundColor: expanded ? 'color-mix(in srgb, var(--primary), transparent 95%)' : 'var(--card-bg)', // 使用 color-mix 替代 alpha
        position: 'sticky',
        top: 0,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        '&:hover': onClick ? {
          backgroundColor: 'color-mix(in srgb, var(--primary), transparent 92%)',
        } : {},
        // 移除左側粗邊框，改用背景色區分，視覺較乾淨
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {onClick && (
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            color: expanded ? 'var(--primary)' : 'var(--text-secondary)',
            transition: 'transform 0.2s ease',
            transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)' // 使用旋轉動畫
          }}>
            <ExpandMore sx={{ fontSize: '1.2rem' }} />
          </Box>
        )}
        <Typography
          variant="subtitle2" // 改用 subtitle2 增加層次感
          sx={{
            fontWeight: 700,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: expanded ? 'var(--primary)' : 'var(--text-primary)',
          }}
        >
          {children}
        </Typography>
      </Box>
    </Box>
  );
}

// Helper: SubHeader used in Data Sources
function SubHeader({ label }: { label: string }) {
  return (
    <Box sx={{ px: 2, py: 0.5, mt: 1, bgcolor: 'var(--hover-bg)', borderTop: '1px solid var(--card-border)', borderBottom: '1px solid var(--card-border)' }}>
      <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
        {label}
      </Typography>
    </Box>
  );
}

// Helper: 格式化日期的函數 (保持不變)
const formatCalcDate = (dateVal: string | number) => {
  if (dateVal === 'latest') return '最新';
  if (!dateVal) return '';
  const numVal = Number(dateVal);
  if (!isNaN(numVal) && numVal > 100000000) {
    return format(new Date(numVal), 'yyyy-MM-dd');
  }
  const strVal = String(dateVal);
  if (strVal.length === 8 && !isNaN(Number(strVal))) {
    return `${strVal.substring(0, 4)}-${strVal.substring(4, 6)}-${strVal.substring(6, 8)}`;
  }
  try {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) return format(d, 'yyyy-MM-dd');
  } catch (e) { }
  return String(dateVal);
};

export const PricePredictionSidebar: React.FC<PricePredictionSidebarProps> = ({
  areas,
  selectedArea,
  onAreaChange,
  models,
  selectedModels,
  calculatingDatesByModel,
  onModelToggle,
  onModelCalculatingDateChange,
}) => {
  const theme = useTheme();
  const [dateMenuAnchor, setDateMenuAnchor] = useState<{ el: HTMLElement; modelIndex: number } | null>(null);

  // 為了保持程式碼整潔，將狀態放在一起
  const [expandedDataSources, setExpandedDataSources] = useState<{ [key: string]: boolean }>({
    weather: true, // 整合 weather 開關
    occto: true,
  });

  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    area: false,
    models: false,
    modelDetails: false,
    dataSources: false,
  });

  const {
    actualPrices,
    predictionsByModel,
    highlightedModelId,
    setHighlightedModelId,
    focusedDataSource,
    setFocusedDataSource,
    showImbalance, setShowImbalance,
    showIntraday, setShowIntraday,
    showIntradayAverage, setShowIntradayAverage,
    showInterconnection, setShowInterconnection,
    showWeather, setShowWeather,
    showWeatherActual, setShowWeatherActual,
    showWeatherForecast, setShowWeatherForecast,
    showOcctoArea, setShowOcctoArea,
    imbalanceData,
    intradayData,
    interconnectionData,
    weatherActual,
    weatherForecast,
    occtoAreaData,
  } = useMarketDataContext();

  const { modelColorMap } = usePriceChart();

  // Data availability checks (保持不變)
  const hasImbalanceData = imbalanceData && imbalanceData.length > 0;
  const hasIntradayData = intradayData && intradayData.length > 0;
  const hasInterconnectionData = interconnectionData && interconnectionData.length > 0;
  const hasWeatherActualData = weatherActual && weatherActual.length > 0;
  const hasWeatherForecastData = weatherForecast && weatherForecast.length > 0;
  const hasWeatherData = hasWeatherActualData || hasWeatherForecastData;
  const hasOcctoData = occtoAreaData && occtoAreaData.length > 0;

  const chartData = useMemo(
    () => prepareChartData(actualPrices, predictionsByModel),
    [actualPrices, predictionsByModel]
  );

  const focusedModelKey = highlightedModelId;

  // Context getters with fallbacks (保持不變)
  let selectedOcctoFields: Set<string> = new Set(['area_demand']);
  let setSelectedOcctoFields: (fn: (prev: Set<string>) => Set<string>) => void = () => { };
  let selectedWeatherFields: Set<string> = new Set(['temperature']);
  let selectedWeatherFieldsActual: Set<string> = new Set(['temperature']);
  let setSelectedWeatherFieldsActual: (fn: (prev: Set<string>) => Set<string>) => void = () => { };
  let selectedWeatherFieldsForecast: Set<string> = new Set(['temperature']);
  let setSelectedWeatherFieldsForecast: (fn: (prev: Set<string>) => Set<string>) => void = () => { };
  let occtoChartType: 'line' | 'stacked' | 'percentage' = 'line';
  let setOcctoChartType: (val: 'line' | 'stacked' | 'percentage') => void = () => { };

  try {
    const chartContext = usePriceChart();
    selectedOcctoFields = chartContext.selectedOcctoFields;
    setSelectedOcctoFields = chartContext.setSelectedOcctoFields;
    selectedWeatherFields = (chartContext as any).selectedWeatherFields ?? new Set(['temperature']);
    selectedWeatherFieldsActual = (chartContext as any).selectedWeatherFieldsActual ?? new Set(['temperature']);
    setSelectedWeatherFieldsActual = (chartContext as any).setSelectedWeatherFieldsActual ?? (() => { });
    selectedWeatherFieldsForecast = (chartContext as any).selectedWeatherFieldsForecast ?? new Set(['temperature']);
    setSelectedWeatherFieldsForecast = (chartContext as any).setSelectedWeatherFieldsForecast ?? (() => { });
    occtoChartType = chartContext.occtoChartType;
    setOcctoChartType = chartContext.setOcctoChartType;
  } catch { }

  // Toggle Handlers (保持不變)
  const toggleOcctoField = (field: string) => {
    setSelectedOcctoFields((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(field)) newSet.delete(field);
      else newSet.add(field);
      if (newSet.size === 0) newSet.add('area_demand');
      return newSet;
    });
  };

  const toggleWeatherFieldActual = (field: string) => {
    setSelectedWeatherFieldsActual((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(field)) newSet.delete(field);
      else newSet.add(field);
      if (newSet.size === 0) newSet.add('temperature');
      return newSet;
    });
  };

  const toggleWeatherFieldForecast = (field: string) => {
    setSelectedWeatherFieldsForecast((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(field)) newSet.delete(field);
      else newSet.add(field);
      if (newSet.size === 0) newSet.add('temperature');
      return newSet;
    });
  };

  const handleDateMenuOpen = (event: React.MouseEvent<HTMLElement>, modelIndex: number) => {
    event.stopPropagation();
    setDateMenuAnchor({ el: event.currentTarget, modelIndex });
  };

  const handleDateMenuClose = () => {
    setDateMenuAnchor(null);
  };

  const handleDateSelect = (modelIndex: number, date: string) => {
    onModelCalculatingDateChange(modelIndex, date);
    handleDateMenuClose();
  };

  return (
    <Box sx={{
      height: '100%',
      overflowY: 'auto',
      overflowX: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: 'var(--bg-default)', // 確保背景色
      '&::-webkit-scrollbar': { width: '6px' },
      '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
      '&::-webkit-scrollbar-thumb': {
        backgroundColor: 'var(--card-border)',
        borderRadius: '3px',
      },
    }}>
      {/* --- Section 1: Area Selector --- */}
      <Paper
        elevation={0}
        sx={{
          borderBottom: '1px solid var(--card-border)',
          borderRadius: 0,
          backgroundColor: 'transparent',
          flexShrink: 0,
        }}
      >
        <SectionHeader
          onClick={() => setExpandedSections(prev => ({ ...prev, area: !prev.area }))}
          expanded={expandedSections.area}
        >
          選擇地區
        </SectionHeader>
        <Collapse in={expandedSections.area}>
          <List dense sx={{ p: 1 }}>
            {areas.map((area) => {
              const isSelected = selectedArea === area.name;
              return (
                <ListItem
                  key={area.id}
                  disablePadding
                  onClick={() => {
                    onAreaChange({ target: { value: area.name } } as any);
                    setExpandedSections(prev => ({ ...prev, area: false }));
                  }}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent', // 假設你有 var(--primary-light)，或使用 alpha
                    color: isSelected ? 'var(--primary)' : 'inherit',
                    '&:hover': {
                      backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--hover-bg)',
                    },
                  }}
                >
                  <ListItemButton sx={{ py: 0.5, px: 1, borderRadius: 1 }}>
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <Radio
                        checked={isSelected}
                        size="small"
                        sx={{
                          p: 0.5,
                          color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                          '&.Mui-checked': { color: 'var(--primary)' },
                        }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={area.name_ch}
                      secondary={area.name}
                      primaryTypographyProps={{
                        fontSize: '0.85rem',
                        fontWeight: isSelected ? 600 : 400
                      }}
                      secondaryTypographyProps={{
                        fontSize: '0.7rem',
                        color: isSelected ? 'color-mix(in srgb, var(--primary), transparent 30%)' : 'text.secondary'
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Collapse>
        {/* 收合時顯示當前選擇 */}
        {!expandedSections.area && selectedArea && (
          <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>目前選擇:</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--primary)' }}>
              {areas.find(a => a.name === selectedArea)?.name_ch || selectedArea}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* --- Section 2: Model Selector --- */}
      <Paper
        elevation={0}
        sx={{
          borderBottom: '1px solid var(--card-border)',
          borderRadius: 0,
          backgroundColor: 'transparent',
          flexShrink: 0,
        }}
      >
        <SectionHeader
          onClick={() => {
            const newState = !expandedSections.models;
            setExpandedSections(prev => ({ ...prev, models: newState, modelDetails: newState }));
          }}
          expanded={expandedSections.models}
        >
          預測模型 ({selectedModels.length})
        </SectionHeader>

        <Collapse in={expandedSections.models}>
          <Box sx={{ display: 'flex', borderTop: '1px solid var(--card-border)' }}>
            {/* Left: Checkbox List */}
            <Box sx={{ width: '50%', borderRight: '1px solid var(--card-border)' }}>
              <Box sx={{ p: 1, bgcolor: 'var(--hover-bg)' }}>
                <Typography variant="caption" fontWeight="bold" color="text.secondary">啟用模型</Typography>
              </Box>
              <List dense sx={{ p: 0, maxHeight: 300, overflowY: 'auto' }}>
                {models.map((model) => {
                  const modelKey = `${model.id}|${model.name}`;
                  const isSelected = selectedModels.some(m => `${m.id}|${m.name}` === modelKey);
                  const selectedModel = selectedModels.find(m => `${m.id}|${m.name}` === modelKey);
                  const modelIndex = selectedModel ? selectedModels.indexOf(selectedModel) : -1;
                  const modelColor = modelColorMap[modelKey] || model.color || '#cccccc';

                  // Helper to safe create alpha color (handles CSS vars and hex)
                  const getAlphaColor = (color: string, opacity: number) => {
                    if (color.startsWith('var(')) {
                      return `color-mix(in srgb, ${color}, transparent ${100 - (opacity * 100)}%)`;
                    }
                    try {
                      return alpha(color, opacity);
                    } catch (e) {
                      return color; // Fallback to solid color if alpha fails
                    }
                  };

                  return (
                    <ListItem
                      key={modelKey}
                      disablePadding
                      sx={{
                        borderLeft: `3px solid ${isSelected ? modelColor : 'transparent'}`,
                        bgcolor: isSelected ? getAlphaColor(modelColor, 0.08) : 'transparent',
                        '&:hover': { bgcolor: getAlphaColor(modelColor, 0.12) },
                      }}
                    >
                      <ListItemButton sx={{ py: 0.5, px: 1 }} onClick={() => onModelToggle(model.id, model.name)}>
                        <Checkbox
                          checked={isSelected}
                          size="small"
                          sx={{
                            p: 0.5, mr: 1,
                            color: modelColor,
                            '&.Mui-checked': { color: modelColor }
                          }}
                        />
                        <ListItemText
                          primary={model.name}
                          primaryTypographyProps={{ fontSize: '0.75rem', fontWeight: isSelected ? 600 : 400 }}
                        />
                        {isSelected && (
                          <IconButton size="small" onClick={(e) => handleDateMenuOpen(e, modelIndex)}>
                            <EditIcon sx={{ fontSize: '0.8rem' }} />
                          </IconButton>
                        )}
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            </Box>

            {/* Right: Details List */}
            <Box sx={{ width: '50%' }}>
              <Box sx={{ p: 1, bgcolor: 'var(--hover-bg)' }}>
                <Typography variant="caption" fontWeight="bold" color="text.secondary">詳細資訊</Typography>
              </Box>
              <List dense sx={{ p: 0, maxHeight: 300, overflowY: 'auto' }}>
                {selectedModels.length === 0 ? (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">未選擇模型</Typography>
                  </Box>
                ) : (
                  selectedModels.map((model) => {
                    const modelKey = `${model.id}|${model.name}`;
                    const isFocused = highlightedModelId === modelKey;
                    const mae = calculateModelMAE(chartData, model.id, model.name);
                    const modelColor = modelColorMap[modelKey] || model.color || '#cccccc';

                    // Reuse the helper logic or duplicate for simplicity (since scope is different)
                    const getAlphaColor = (color: string, opacity: number) => {
                      if (color.startsWith('var(')) {
                        return `color-mix(in srgb, ${color}, transparent ${100 - (opacity * 100)}%)`;
                      }
                      try {
                        return alpha(color, opacity);
                      } catch (e) {
                        return color;
                      }
                    };

                    return (
                      <ListItem
                        key={modelKey}
                        disablePadding
                        onClick={() => setHighlightedModelId(isFocused ? null : modelKey)}
                        sx={{
                          cursor: 'pointer',
                          borderLeft: `3px solid ${isFocused ? modelColor : 'transparent'}`,
                          bgcolor: isFocused ? getAlphaColor(modelColor, 0.15) : 'transparent',
                          '&:hover': { bgcolor: getAlphaColor(modelColor, 0.08) },
                        }}
                      >
                        <Box sx={{ width: '100%', p: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" fontWeight="bold">{model.name}</Typography>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: modelColor }} />
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary">MAE</Typography>
                            <Typography variant="caption" fontWeight="bold">
                              {mae && mae > 0 ? mae.toFixed(2) : '—'}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary">日期</Typography>
                            <Typography variant="caption">
                              {model.calculatingDate === 'latest' ? '最新' : formatCalcDate(model.calculatingDate)}
                            </Typography>
                          </Box>
                        </Box>
                      </ListItem>
                    )
                  })
                )}
              </List>
            </Box>
          </Box>
        </Collapse>

        {/* Models Summary when collapsed */}
        {!expandedSections.models && selectedModels.length > 0 && (
          <Box sx={{ px: 2, py: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {selectedModels.map(m => (
              <Box key={m.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: modelColorMap[`${m.id}|${m.name}`] }} />
                <Typography variant="caption">{m.name}</Typography>
              </Box>
            ))}
          </Box>
        )}

        {/* Date Selection Menu (Popup) */}
        <Menu
          anchorEl={dateMenuAnchor?.el}
          open={Boolean(dateMenuAnchor)}
          onClose={handleDateMenuClose}
        >
          <MenuItem onClick={() => dateMenuAnchor && handleDateSelect(dateMenuAnchor.modelIndex, 'latest')}>
            最新預測
          </MenuItem>
          {dateMenuAnchor && calculatingDatesByModel[`${selectedModels[dateMenuAnchor.modelIndex]?.id}|${selectedModels[dateMenuAnchor.modelIndex]?.name}`]?.map((date) => (
            <MenuItem
              key={date.calculating_date}
              onClick={() => handleDateSelect(dateMenuAnchor.modelIndex, date.calculating_date)}
            >
              {formatCalcDate(date.calculating_date)}
            </MenuItem>
          ))}
        </Menu>
      </Paper>

      {/* --- Section 3: Data Sources --- */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 0,
          backgroundColor: 'transparent',
          flexShrink: 0,
        }}
      >
        <SectionHeader
          onClick={() => setExpandedSections(prev => ({ ...prev, dataSources: !prev.dataSources }))}
          expanded={expandedSections.dataSources}
        >
          資料來源層
        </SectionHeader>

        <Collapse in={expandedSections.dataSources}>
          <List dense sx={{ p: 0 }}>



            <SubHeader label="市場價格與平衡" />

            {/* Imbalance (Orange) */}
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => setFocusedDataSource(focusedDataSource === 'imbalance' ? null : 'imbalance')}
                disabled={!hasImbalanceData}
                sx={{
                  borderLeft: focusedDataSource === 'imbalance' ? `4px solid ${SOURCE_COLORS.imbalance}` : '4px solid transparent',
                  backgroundColor: focusedDataSource === 'imbalance' ? alpha(SOURCE_COLORS.imbalance, 0.1) : 'transparent',
                  '&:hover': { backgroundColor: alpha(SOURCE_COLORS.imbalance, 0.15) }
                }}
              >
                <Checkbox
                  checked={showImbalance}
                  disabled={!hasImbalanceData}
                  size="small"
                  sx={{ color: SOURCE_COLORS.imbalance, '&.Mui-checked': { color: SOURCE_COLORS.imbalance } }}
                  onChange={(e) => { e.stopPropagation(); setShowImbalance(e.target.checked); }}
                  onClick={e => e.stopPropagation()}
                />
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Balance sx={{ fontSize: '1.1rem', color: showImbalance ? SOURCE_COLORS.imbalance : 'text.disabled' }} />
                </ListItemIcon>
                <ListItemText primary="Imbalance" primaryTypographyProps={{ fontSize: '0.85rem' }} />
              </ListItemButton>
            </ListItem>

            {/* Intraday (Purple) */}
            <ListItem disablePadding sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <ListItemButton
                onClick={() => setFocusedDataSource(focusedDataSource === 'intraday' ? null : 'intraday')}
                disabled={!hasIntradayData}
                sx={{
                  borderLeft: focusedDataSource === 'intraday' ? `4px solid ${SOURCE_COLORS.intraday}` : '4px solid transparent',
                  backgroundColor: focusedDataSource === 'intraday' ? alpha(SOURCE_COLORS.intraday, 0.1) : 'transparent',
                  '&:hover': { backgroundColor: alpha(SOURCE_COLORS.intraday, 0.15) }
                }}
              >
                <Checkbox
                  checked={showIntraday}
                  disabled={!hasIntradayData}
                  size="small"
                  sx={{ color: SOURCE_COLORS.intraday, '&.Mui-checked': { color: SOURCE_COLORS.intraday } }}
                  onChange={(e) => { e.stopPropagation(); setShowIntraday(e.target.checked); }}
                  onClick={e => e.stopPropagation()}
                />
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <SwapHoriz sx={{ fontSize: '1.1rem', color: showIntraday ? SOURCE_COLORS.intraday : 'text.disabled' }} />
                </ListItemIcon>
                <ListItemText primary="Intraday" primaryTypographyProps={{ fontSize: '0.85rem' }} />
                {hasIntradayData && (focusedDataSource === 'intraday' ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />)}
              </ListItemButton>

              <Collapse in={focusedDataSource === 'intraday'} timeout="auto" unmountOnExit>
                <Box sx={{ pl: 6, py: 0.5, bgcolor: alpha(SOURCE_COLORS.intraday, 0.03) }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Checkbox
                      size="small"
                      checked={showIntradayAverage}
                      onChange={(e) => setShowIntradayAverage(e.target.checked)}
                      sx={{ p: 0.5, mr: 1, color: SOURCE_COLORS.intraday, '&.Mui-checked': { color: SOURCE_COLORS.intraday } }}
                    />
                    <Typography variant="caption">顯示平均價格線</Typography>
                  </Box>
                </Box>
              </Collapse>
            </ListItem>

            {/* Interconnection (Cyan) */}
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => setFocusedDataSource(focusedDataSource === 'interconnection' ? null : 'interconnection')}
                disabled={!hasInterconnectionData}
                sx={{
                  borderLeft: focusedDataSource === 'interconnection' ? `4px solid ${SOURCE_COLORS.interconnection}` : '4px solid transparent',
                  backgroundColor: focusedDataSource === 'interconnection' ? alpha(SOURCE_COLORS.interconnection, 0.1) : 'transparent',
                  '&:hover': { backgroundColor: alpha(SOURCE_COLORS.interconnection, 0.15) }
                }}
              >
                <Checkbox
                  checked={showInterconnection}
                  disabled={!hasInterconnectionData}
                  size="small"
                  sx={{ color: SOURCE_COLORS.interconnection, '&.Mui-checked': { color: SOURCE_COLORS.interconnection } }}
                  onChange={(e) => { e.stopPropagation(); setShowInterconnection(e.target.checked); }}
                  onClick={e => e.stopPropagation()}
                />
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <SwapHoriz sx={{ fontSize: '1.1rem', color: showInterconnection ? SOURCE_COLORS.interconnection : 'text.disabled' }} />
                </ListItemIcon>
                <ListItemText primary="Interconnection" primaryTypographyProps={{ fontSize: '0.85rem' }} />
              </ListItemButton>
            </ListItem>

            <SubHeader label="環境與供需" />

            {/* Weather (Blue/Amber) */}
            <ListItem disablePadding sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <ListItemButton
                onClick={() => {
                  setFocusedDataSource(focusedDataSource === 'weather' ? null : 'weather');
                  setExpandedDataSources(prev => ({ ...prev, weather: !prev.weather }));
                }}
                disabled={!hasWeatherData}
                sx={{
                  borderLeft: focusedDataSource === 'weather' ? `4px solid ${SOURCE_COLORS.weather}` : '4px solid transparent',
                  backgroundColor: focusedDataSource === 'weather' ? alpha(SOURCE_COLORS.weather, 0.1) : 'transparent',
                  '&:hover': { backgroundColor: alpha(SOURCE_COLORS.weather, 0.15) }
                }}
              >
                <ListItemIcon sx={{ minWidth: 32, ml: 1 }}> {/* 調整 icon 位置對齊 checkbox */}
                  <Cloud sx={{ fontSize: '1.1rem', color: showWeather ? SOURCE_COLORS.weather : 'text.disabled' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Weather Data"
                  secondary="含實際值與預測值"
                  primaryTypographyProps={{ fontSize: '0.85rem' }}
                  secondaryTypographyProps={{ fontSize: '0.7rem' }}
                />
                {hasWeatherData && (expandedDataSources.weather ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />)}
              </ListItemButton>

              <Collapse in={expandedDataSources.weather} timeout="auto" unmountOnExit>
                <Box sx={{ pl: 2, pr: 2, pb: 1.5, pt: 0.5, bgcolor: alpha(SOURCE_COLORS.weather, 0.02) }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    {/* Weather Actual Column */}
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, borderBottom: `1px solid ${alpha(SOURCE_COLORS.weatherActual, 0.3)}`, pb: 0.5 }}>
                        <Checkbox
                          checked={showWeatherActual}
                          disabled={!hasWeatherActualData}
                          size="small"
                          sx={{ p: 0.5, color: SOURCE_COLORS.weatherActual, '&.Mui-checked': { color: SOURCE_COLORS.weatherActual } }}
                          onChange={(e) => {
                            setShowWeatherActual(e.target.checked);
                            setShowWeather(e.target.checked || showWeatherForecast);
                          }}
                        />
                        <Typography variant="caption" fontWeight="bold">Actual</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {weatherFields.map((field) => {
                          const isSelected = selectedWeatherFieldsActual.has(field.value);
                          return (
                            <Box
                              key={`actual-${field.value}`}
                              onClick={() => toggleWeatherFieldActual(field.value)}
                              sx={{
                                px: 1, py: 0.5, borderRadius: 10, cursor: 'pointer',
                                fontSize: '0.65rem',
                                bgcolor: isSelected ? alpha(field.color, 0.15) : 'transparent',
                                color: isSelected ? field.color : 'text.secondary',
                                border: `1px solid ${isSelected ? field.color : 'var(--card-border)'}`,
                                '&:hover': { bgcolor: alpha(field.color, 0.25) }
                              }}
                            >
                              {field.label}
                            </Box>
                          )
                        })}
                      </Box>
                    </Box>

                    {/* Weather Forecast Column */}
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, borderBottom: `1px solid ${alpha(SOURCE_COLORS.weatherForecast, 0.3)}`, pb: 0.5 }}>
                        <Checkbox
                          checked={showWeatherForecast}
                          disabled={!hasWeatherForecastData}
                          size="small"
                          sx={{ p: 0.5, color: SOURCE_COLORS.weatherForecast, '&.Mui-checked': { color: SOURCE_COLORS.weatherForecast } }}
                          onChange={(e) => {
                            setShowWeatherForecast(e.target.checked);
                            setShowWeather(e.target.checked || showWeatherActual);
                          }}
                        />
                        <Typography variant="caption" fontWeight="bold">Forecast</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {weatherFields.map((field) => {
                          const isSelected = selectedWeatherFieldsForecast.has(field.value);
                          return (
                            <Box
                              key={`forecast-${field.value}`}
                              onClick={() => toggleWeatherFieldForecast(field.value)}
                              sx={{
                                px: 1, py: 0.5, borderRadius: 10, cursor: 'pointer',
                                fontSize: '0.65rem',
                                bgcolor: isSelected ? alpha(field.color, 0.15) : 'transparent',
                                color: isSelected ? field.color : 'text.secondary',
                                border: `1px solid ${isSelected ? field.color : 'var(--card-border)'}`,
                                borderStyle: 'dashed', // Forecast 用虛線區分
                                '&:hover': { bgcolor: alpha(field.color, 0.25) }
                              }}
                            >
                              {field.label}
                            </Box>
                          )
                        })}
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Collapse>
            </ListItem>

            {/* OCCTO (Teal) */}
            <ListItem disablePadding sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <ListItemButton
                onClick={() => {
                  setFocusedDataSource(focusedDataSource === 'occto' ? null : 'occto');
                  setExpandedDataSources(prev => ({ ...prev, occto: !prev.occto }));
                }}
                disabled={!hasOcctoData}
                sx={{
                  borderLeft: focusedDataSource === 'occto' ? `4px solid ${SOURCE_COLORS.occto}` : '4px solid transparent',
                  backgroundColor: focusedDataSource === 'occto' ? alpha(SOURCE_COLORS.occto, 0.1) : 'transparent',
                  '&:hover': { backgroundColor: alpha(SOURCE_COLORS.occto, 0.15) }
                }}
              >
                <Checkbox
                  checked={showOcctoArea}
                  disabled={!hasOcctoData}
                  size="small"
                  sx={{ color: SOURCE_COLORS.occto, '&.Mui-checked': { color: SOURCE_COLORS.occto } }}
                  onClick={e => e.stopPropagation()} // 避免展開
                  onChange={(e) => { e.stopPropagation(); setShowOcctoArea(e.target.checked); }}
                />
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Map sx={{ fontSize: '1.1rem', color: showOcctoArea ? SOURCE_COLORS.occto : 'text.disabled' }} />
                </ListItemIcon>
                <ListItemText primary="OCCTO Demand" primaryTypographyProps={{ fontSize: '0.85rem' }} />
                {hasOcctoData && (expandedDataSources.occto ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />)}
              </ListItemButton>

              <Collapse in={expandedDataSources.occto} timeout="auto" unmountOnExit>
                <Box sx={{ pl: 6, pr: 2, pb: 2, bgcolor: alpha(SOURCE_COLORS.occto, 0.03) }}>

                  {/* Chart Type Selector - Segmented Control Style */}
                  <Box sx={{
                    display: 'flex',
                    border: '1px solid var(--card-border)',
                    borderRadius: 1,
                    mb: 1.5, mt: 1,
                    overflow: 'hidden',
                    bgcolor: 'var(--card-bg)'
                  }}>
                    {[
                      { id: 'line', icon: <ShowChart sx={{ fontSize: 16 }} />, label: 'Line' },
                      { id: 'stacked', icon: <BarChart sx={{ fontSize: 16 }} />, label: 'Stack' },
                      { id: 'percentage', icon: <Percent sx={{ fontSize: 16 }} />, label: '%' }
                    ].map((type, idx, arr) => {
                      const active = occtoChartType === type.id;
                      return (
                        <Box
                          key={type.id}
                          onClick={() => setOcctoChartType(type.id as any)}
                          sx={{
                            flex: 1, py: 0.5, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5,
                            fontSize: '0.7rem',
                            bgcolor: active ? SOURCE_COLORS.occto : 'transparent',
                            color: active ? '#fff' : 'text.secondary',
                            borderRight: idx !== arr.length - 1 ? '1px solid var(--card-border)' : 'none',
                            '&:hover': { bgcolor: active ? SOURCE_COLORS.occto : 'var(--hover-bg)' }
                          }}
                        >
                          {type.icon} {type.label}
                        </Box>
                      )
                    })}
                  </Box>

                  {/* Fields */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {occtoFields.map((field) => {
                      const isSelected = selectedOcctoFields.has(field.value);
                      const color = occtoStackedFields.find(sf => sf.key === field.value)?.color || SOURCE_COLORS.occto;
                      return (
                        <Box
                          key={field.value}
                          onClick={() => toggleOcctoField(field.value)}
                          sx={{
                            px: 1, py: 0.5, borderRadius: 1, cursor: 'pointer',
                            fontSize: '0.65rem',
                            bgcolor: isSelected ? alpha(color, 0.15) : 'transparent',
                            color: isSelected ? color : 'text.secondary',
                            border: `1px solid ${isSelected ? color : 'var(--card-border)'}`,
                            '&:hover': { bgcolor: alpha(color, 0.2) }
                          }}
                        >
                          {field.label}
                        </Box>
                      )
                    })}
                  </Box>
                </Box>
              </Collapse>
            </ListItem>
          </List>
        </Collapse>

        {/* Bottom Summary (Collapsed View) */}
        {!expandedSections.dataSources && (
          <Box sx={{ p: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {[
              { show: showImbalance, icon: <Balance sx={{ fontSize: 14 }} />, color: SOURCE_COLORS.imbalance, label: 'Imbalance' },
              { show: showIntraday, icon: <SwapHoriz sx={{ fontSize: 14 }} />, color: SOURCE_COLORS.intraday, label: 'Intraday' },
              { show: showInterconnection, icon: <SwapHoriz sx={{ fontSize: 14 }} />, color: SOURCE_COLORS.interconnection, label: 'Interconn' },
              { show: showWeather, icon: <Cloud sx={{ fontSize: 14 }} />, color: SOURCE_COLORS.weather, label: 'Weather' },
              { show: showOcctoArea, icon: <Map sx={{ fontSize: 14 }} />, color: SOURCE_COLORS.occto, label: 'OCCTO' },
            ].filter(x => x.show).map(item => (
              <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: alpha(item.color, 0.1), px: 0.8, py: 0.3, borderRadius: 10 }}>
                <Box sx={{ color: item.color, display: 'flex' }}>{item.icon}</Box>
                <Typography variant="caption" sx={{ color: item.color, fontWeight: 600, fontSize: '0.65rem' }}>{item.label}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
};