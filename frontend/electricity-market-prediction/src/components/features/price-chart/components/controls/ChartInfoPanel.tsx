'use client';

import React, { useState, useMemo } from 'react';
import { Box, Typography, IconButton, Menu, MenuItem, Tooltip, Paper, ListItemIcon, ListItemText } from '@mui/material';
import { formatInTimezone } from '@/utils/chartUtils'; // 假設您有這個工具

// --- Icons ---
import DownloadIcon from '@mui/icons-material/Download';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
// Data Icons
import ThermostatIcon from '@mui/icons-material/Thermostat';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import AirIcon from '@mui/icons-material/Air';
import CloudIcon from '@mui/icons-material/Cloud';
import OpacityIcon from '@mui/icons-material/Opacity';
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt';
import FactoryIcon from '@mui/icons-material/Factory';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import WbSunnyIcon from '@mui/icons-material/WbSunny'; // Solar
import ModeFanOffIcon from '@mui/icons-material/ModeFanOff'; // Wind
import BoltIcon from '@mui/icons-material/Bolt'; // Thermal/Nuclear

// --- Constants ---
const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
};

// 為了讓這段程式碼獨立運作，我在此定義了 OCCTO 顏色映射。
// 實務上您應該從 constants 引入 occtoStackedFields
const OCCTO_COLOR_MAP: Record<string, string> = {
    area_demand: '#14b8a6',       // Teal
    nuclear_power: '#f59e0b',     // Amber
    thermal: '#ef4444',           // Red
    hydropower: '#3b82f6',        // Blue
    geothermal_power: '#8b5cf6',  // Purple
    biomass: '#10b981',           // Emerald
    solar_power_generation_actual: '#fbbf24', // Yellow
    wind_power_generation_actual: '#06b6d4',  // Cyan
    pumped_storage: '#6366f1',    // Indigo
    battery_storage: '#ec4899',   // Pink
    interconnection_line: '#14b8a6',
    others: '#6b7280'             // Gray
};

// --- Helper Components ---

// 1. 極簡數據膠囊 (Compact Data Chip)
const DataChip = ({ icon: Icon, label, value, unit = '', color, isForecast = false }: any) => {
    if (value == null) return null;
    return (
        <Tooltip title={`${label} ${isForecast ? '(Forecast)' : ''}`}>
            <Box sx={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: 0.5, 
                bgcolor: `${color}10`, // 10% opacity background
                px: 0.75, 
                py: 0, 
                height: 20, // 固定高度
                borderRadius: 1,
                border: `1px solid ${color}40`,
                flexShrink: 0,
                mr: 1 // Right margin for spacing
            }}>
                <Icon sx={{ fontSize: 13, color: color }} />
                <Typography variant="caption" sx={{ 
                    color: 'text.primary', 
                    fontWeight: 600, 
                    fontSize: '0.65rem', 
                    lineHeight: 1,
                    whiteSpace: 'nowrap'
                }}>
                    <span style={{ opacity: 0.6, marginRight: 3, fontWeight: 400 }}>{label}:</span>
                    {typeof value === 'number' ? value.toFixed(0) : value}{unit}
                    {isForecast && <span style={{ opacity: 0.5, marginLeft: 1 }}>(F)</span>}
                </Typography>
            </Box>
        </Tooltip>
    );
};

// 2. 價格變動 (Compact)
const DeltaBadge = ({ value, colors }: { value: number | null | undefined, colors: any }) => {
    if (value == null) return null;
    const isPos = value > 0;
    const color = isPos ? colors.delta.positive : value < 0 ? colors.delta.negative : colors.delta.neutral;
    return (
        <Typography component="span" sx={{ 
            color, 
            fontSize: '0.65rem', 
            fontWeight: 'bold',
            ml: 0.5 
        }}>
            {isPos ? '+' : ''}{value.toFixed(2)}
        </Typography>
    );
};

// 3. 操作按鈕 (Compact)
const ActionButtons = ({ onDownload, onFullscreen }: any) => {
    const [downloadAnchor, setDownloadAnchor] = useState<null | HTMLElement>(null);
    return (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title="Export">
                <IconButton size="small" onClick={(e) => setDownloadAnchor(e.currentTarget)} sx={{ p: 0.5 }}>
                    <DownloadIcon sx={{ fontSize: '1.1rem' }} />
                </IconButton>
            </Tooltip>
            <Menu
                anchorEl={downloadAnchor}
                open={Boolean(downloadAnchor)}
                onClose={() => setDownloadAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <MenuItem onClick={() => { onDownload?.('csv'); setDownloadAnchor(null); }}>
                    <ListItemIcon><DescriptionOutlinedIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary="CSV" primaryTypographyProps={{ variant: 'caption' }} />
                </MenuItem>
                <MenuItem onClick={() => { onDownload?.('png'); setDownloadAnchor(null); }}>
                    <ListItemIcon><ImageOutlinedIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary="PNG" primaryTypographyProps={{ variant: 'caption' }} />
                </MenuItem>
            </Menu>
            <Tooltip title="Fullscreen">
                <IconButton size="small" onClick={onFullscreen} sx={{ p: 0.5 }}>
                    <FullscreenIcon sx={{ fontSize: '1.2rem' }} />
                </IconButton>
            </Tooltip>
        </Box>
    );
};

// --- Main Component ---
export const ChartInfoPanel: React.FC<any> = ({
    hoveredData, selectedModels, colors, areaName,
    showImbalance, showIntraday, showInterconnection, showOcctoArea,
    showWeather, showWeatherActual, showWeatherForecast,
    selectedOcctoFields = new Set(), selectedWeatherFieldsActual = new Set(), selectedWeatherFieldsForecast = new Set(),
    onDownload, onFullscreen, timezone
}) => {

    const PANEL_HEIGHT = 100;

    // 天氣欄位設定
    const getWeatherConfig = (field: string) => {
        const config: Record<string, any> = {
            temperature: { icon: ThermostatIcon, unit: '°C', color: '#ff7043', label: 'T' },
            rainfall: { icon: WaterDropIcon, unit: 'mm', color: '#42a5f5', label: 'Rain' },
            snowfall: { icon: AcUnitIcon, unit: 'mm', color: '#90caf9', label: 'Snow' },
            wind_speed: { icon: AirIcon, unit: 'm/s', color: '#66bb6a', label: 'Wind' },
            relative_humidity: { icon: OpacityIcon, unit: '%', color: '#ab47bc', label: 'RH' },
            clouds_all: { icon: CloudIcon, unit: '%', color: '#78909c', label: 'Cloud' },
        };
        return config[field];
    };

    // OCCTO 欄位設定 (包含圖示與顏色查找)
    const getOcctoConfig = (field: string) => {
        const color = OCCTO_COLOR_MAP[field] || '#26a69a'; // Fallback teal
        let icon = FactoryIcon;
        let label = field;

        // 簡單的圖示/標籤映射優化
        if (field.includes('solar')) { icon = WbSunnyIcon; label = 'Solar'; }
        else if (field.includes('wind')) { icon = ModeFanOffIcon; label = 'Wind'; }
        else if (field.includes('nuclear') || field.includes('thermal')) { icon = BoltIcon; label = field.includes('nuclear') ? 'Nucl' : 'Therm'; }
        else if (field === 'area_demand') { label = 'Demand'; }
        else if (field === 'interconnection_line') { label = 'Line'; }

        return { icon, label, color, unit: 'MW' };
    };

    // 時間格式化 (YYYY/MM/DD HH:mm:ss)
    const formattedTime = useMemo(() => {
        if (!hoveredData) return '';
        // formatInTimezone 回傳類似 "02/07/2026, 15:30:00" 或依據 locale
        // 為了確保 YYYY/MM/DD 格式，我們可以做字串處理
        const timeStr = formatInTimezone(hoveredData.timestamp, timezone || 'Asia/Tokyo', DATE_FORMAT_OPTIONS);
        return timeStr.replace(/\-/g, '/'); // 確保分隔符統一
    }, [hoveredData, timezone]);

    return (
        <Paper 
            elevation={0}
            sx={{
                width: '100%',
                height: PANEL_HEIGHT,
                minHeight: PANEL_HEIGHT,
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'var(--card-bg)', 
                borderBottom: `1px solid ${colors.tooltipBorder}`,
                boxSizing: 'border-box',
                overflow: 'hidden',
                px: 1.5,
                py: 1
            }}
        >
            {!hoveredData ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column' }}>
                    <Typography variant="caption" sx={{ color: colors.subText, opacity: 0.7, letterSpacing: 1 }}>
                        HOVER CHART FOR DETAILS
                    </Typography>
                    <Box sx={{ position: 'absolute', top: 8, right: 8, opacity: 0.5 }}>
                        <ActionButtons onDownload={onDownload} onFullscreen={onFullscreen} />
                    </Box>
                </Box>
            ) : (
                <>
                    {/* --- Row 1: Header --- */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5, height: 20 }}>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                            <Typography variant="caption" sx={{ color: colors.subText, fontWeight: 700, fontSize: '0.7rem' }}>
                                {areaName}
                            </Typography>
                            <Typography variant="body2" sx={{ color: colors.text, fontWeight: 700, fontFamily: 'Monospace', fontSize: '0.85rem' }}>
                                {formattedTime}
                            </Typography>
                        </Box>
                        <ActionButtons onDownload={onDownload} onFullscreen={onFullscreen} />
                    </Box>

                    {/* --- Row 2: Prices --- */}
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        height: 28,
                        mb: 0.5,
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        maskImage: 'linear-gradient(to right, black 90%, transparent 100%)',
                    }}>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', mr: 2, pr: 2, borderRight: `1px dashed ${colors.tooltipBorder}` }}>
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: colors.actual, mr: 0.5 }} />
                            <Typography variant="caption" sx={{ color: colors.subText, mr: 0.5 }}>Obs:</Typography>
                            <Typography variant="body2" sx={{ color: colors.actual, fontWeight: 800, fontSize: '0.9rem' }}>
                                {hoveredData.actualPrice != null ? `¥${hoveredData.actualPrice.toFixed(2)}` : '-'}
                            </Typography>
                            <DeltaBadge value={hoveredData.actualDelta} colors={colors} />
                        </Box>

                        {selectedModels.map((model: any) => {
                            const modelKey = `${model.id}|${model.name}`;
                            const pred = hoveredData.modelPredictions?.find((p: any) => `${p.modelId}|${p.modelName}` === modelKey);
                            const diff = hoveredData.modelDifferences?.[modelKey];
                            return (
                                <Box key={modelKey} sx={{ display: 'inline-flex', alignItems: 'center', mr: 2 }}>
                                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: model.color, mr: 0.5 }} />
                                    <Typography variant="caption" sx={{ color: colors.text, fontWeight: 600, fontSize: '0.75rem' }}>
                                        {model.name}:
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: colors.text, ml: 0.5 }}>
                                        {pred?.predictedPrice != null ? `¥${pred.predictedPrice.toFixed(2)}` : '-'}
                                    </Typography>
                                    <DeltaBadge value={diff} colors={colors} />
                                </Box>
                            );
                        })}
                    </Box>

                    {/* --- Row 3: Secondary Metrics (OCCTO Colors Applied Here) --- */}
                    <Box sx={{ 
                        display: 'block',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        height: 24,
                        maskImage: 'linear-gradient(to right, black 90%, transparent 100%)',
                    }}>
                        {/* 1. Market Data */}
                        {showIntraday && hoveredData.intraday_average != null && (
                            <DataChip icon={TrendingUpIcon} label="Intra" value={hoveredData.intraday_average} unit="¥" color="#ffa726" />
                        )}
                        {showImbalance && hoveredData.imbalance != null && (
                            <DataChip icon={ElectricBoltIcon} label="Imb" value={hoveredData.imbalance} unit="" color="#ef5350" />
                        )}
                        {showInterconnection && hoveredData.interconnection_flow_diff != null && (
                            <DataChip icon={CompareArrowsIcon} label="Inter" value={hoveredData.interconnection_flow_diff} unit="MW" color="#ff7043" />
                        )}
                        
                        {/* 2. OCCTO (Fixed: Using specific colors) */}
                        {showOcctoArea && hoveredData.occto_values && Array.from(selectedOcctoFields).map((field: any) => {
                            const config = getOcctoConfig(field);
                            return (
                                <DataChip 
                                    key={field} 
                                    icon={config.icon} 
                                    label={config.label} 
                                    value={hoveredData.occto_values[field]} 
                                    unit={config.unit} 
                                    color={config.color} // Using mapped color
                                />
                            );
                        })}

                        {/* 3. Weather */}
                        {showWeather && (
                            <>
                                {showWeatherActual && Array.from(selectedWeatherFieldsActual).map((field: any) => {
                                    const cfg = getWeatherConfig(field);
                                    if(!cfg) return null;
                                    return <DataChip key={`act-${field}`} {...cfg} value={hoveredData.weather_data_actual?.[field]} />;
                                })}
                                {showWeatherForecast && Array.from(selectedWeatherFieldsForecast).map((field: any) => {
                                    const cfg = getWeatherConfig(field);
                                    if(!cfg) return null;
                                    return <DataChip key={`fcst-${field}`} {...cfg} value={hoveredData.weather_data_forecast?.[field]} isForecast />;
                                })}
                            </>
                        )}
                    </Box>
                </>
            )}
        </Paper>
    );
};