'use client';

import React, { useState, useMemo } from 'react';
import { Box, Typography, IconButton, Menu, MenuItem, Tooltip, Paper, ListItemIcon, ListItemText, ToggleButton, ToggleButtonGroup, TextField, alpha } from '@mui/material';
import { formatInTimezone } from '@/utils/chartUtils';
import { WEATHER_FIELD_DISPLAY, DAILY_CATEGORIES } from '@/constants/weatherCategories';

// --- Icons ---
import DownloadIcon from '@mui/icons-material/Download';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import LabelOffOutlinedIcon from '@mui/icons-material/LabelOffOutlined';

import TuneIcon from '@mui/icons-material/Tune';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CompressIcon from '@mui/icons-material/Compress';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import StairsIcon from '@mui/icons-material/Stairs';

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
import RestartAltIcon from '@mui/icons-material/RestartAlt';

// --- Constants ---
import { INTERCONNECTION_FIELDS, BATTERY_FIELDS, BID_PLAN_SPOT_FIELDS, BID_PLAN_INTRADAY_FIELDS, TDGC_FIELDS, TDGC_CATEGORIES, weatherFields } from '../constants';
import { useTranslation } from 'react-i18next';

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
const DataChip = ({ icon: Icon, label, value, unit = '', color, isForecast = false, decimals = 0 }: any) => {
    const { t: tChip } = useTranslation('forecast');
    if (value == null) return null;
    return (
        <Tooltip title={`${label} ${isForecast ? tChip('chartPanel.forecastSuffix') : ''}`}>
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
                    {typeof value === 'number' ? value.toFixed(decimals) : value}{unit}
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
const ActionButtons = ({ onDownload, onFullscreen, showRightAxisLabels, onToggleRightAxisLabels }: any) => {
    const { t: tBtn } = useTranslation('forecast');
    const [downloadAnchor, setDownloadAnchor] = useState<null | HTMLElement>(null);
    return (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title={showRightAxisLabels ? tBtn('chartPanel.hideRightAxis') : tBtn('chartPanel.showRightAxis')}>
                <IconButton size="small" onClick={onToggleRightAxisLabels} sx={{ p: 0.5 }}>
                    {showRightAxisLabels ? (
                        <LabelOutlinedIcon sx={{ fontSize: '1.1rem', color: 'text.primary' }} />
                    ) : (
                        <LabelOffOutlinedIcon sx={{ fontSize: '1.1rem', color: 'text.secondary' }} />
                    )}
                </IconButton>
            </Tooltip>
            <Tooltip title={tBtn('chartPanel.export')}>
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
            <Tooltip title={tBtn('chartPanel.fullscreen')}>
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
    hideObsAndPriceRow = false,
    showImbalance, showImbalanceQuantity, showImbalanceSurplusRate, showImbalanceDeficitRate, showIntraday, selectedInterconnectionFields = new Set(), selectedBatteryFields = new Set(), selectedBidPlanFields = new Set(), selectedBidPlanCategories = new Set(['spot']), selectedTdgcFields = new Set(), selectedTdgcCategories = new Set(), selectedTdgcDataTypes = new Set(['prompt']), selectedTdgcGroups = new Set(['origin']), showOcctoArea,
    showWeather, showWeatherActual, showWeatherForecast,
    selectedOcctoFields = new Set(), selectedWeatherFieldsActual = new Set(), selectedWeatherFieldsForecast = new Set(),
    onDownload, onFullscreen, timezone,
    showRightAxisLabels, onToggleRightAxisLabels,
    subchartLayout, setSubchartLayout,
    seriesAxisConfig, setSeriesAxisConfig,
    globalPrimaryRange, setGlobalPrimaryRange,
    globalSecondaryRange, setGlobalSecondaryRange,
    showActualPrice, showIntradayAverage
}) => {

    const { t } = useTranslation('forecast');
    const PANEL_HEIGHT = 100;

    // 天氣欄位設定
    const getWeatherIcon = (field: string) => {
        if (field.includes('temperature') || field.includes('temp')) return ThermostatIcon;
        if (field.includes('precipitation') || field.includes('rain') || field.includes('snow')) return WaterDropIcon;
        if (field.includes('wind')) return AirIcon;
        if (field.includes('humidity')) return OpacityIcon;
        if (field.includes('cloud')) return CloudIcon;
        if (field.includes('radiation') || field.includes('sun')) return WbSunnyIcon;
        if (field.includes('pressure')) return CompressIcon; // Add this if available or use a fallback
        return HelpOutlineIcon;
    };

    const getWeatherColor = (field: string) => {
        const scalePattern = /_(\d+m?|0_to_7cm|7_to_28cm|28_to_100cm|100_to_255cm|0_to_100cm|max|min|mean|sum)$/;
        const baseFieldName = field.replace(scalePattern, '');
        const base = (weatherFields as any[]).find(f => f.value === field || f.value === baseFieldName);
        return base?.color || '#888';
    };

    const isDailyField = (field: string) => {
        return DAILY_CATEGORIES.some(cat => cat.fields.includes(field));
    };

    const buildWeatherLabel = (field: string, isForecast: boolean) => {
        const display = WEATHER_FIELD_DISPLAY[field];
        const baseLabel = display?.shortLabelKey ? t(display.shortLabelKey) : field;
        const typeStr = isForecast ? t('chartPanel.weatherForecast') : t('chartPanel.weatherActual');
        const freqStr = isDailyField(field) ? t('chartPanel.daily') : t('chartPanel.hourly');
        return `[${typeStr}·${freqStr}] ${baseLabel}`;
    };

    // OCCTO 欄位設定 (包含圖示與顏色查找)
    const getOcctoConfig = (field: string) => {
        const color = OCCTO_COLOR_MAP[field] || '#26a69a'; // Fallback teal
        let icon = FactoryIcon;
        let label = field;

        if (field.includes('solar')) { icon = WbSunnyIcon; label = t('fields.occto.solar'); }
        else if (field.includes('wind')) { icon = ModeFanOffIcon; label = t('fields.occto.wind'); }
        else if (field.includes('nuclear') || field.includes('thermal')) { icon = BoltIcon; label = field.includes('nuclear') ? t('fields.occto.nuclear') : t('fields.occto.thermal'); }
        else if (field === 'area_demand') { label = t('fields.occto.areaDemand'); }
        else if (field === 'interconnection_line') { label = t('fields.occto.interconnection'); }

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
                <Box sx={{ display: 'flex', height: '100%', position: 'relative' }}>
                    {/* Left zone: Layout toggle + hint */}
                    <Box sx={{
                        minWidth: 120,
                        borderRight: `1px solid ${colors.tooltipBorder}`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 1.5,
                        bgcolor: alpha(colors.subText || '#000', 0.03),
                    }}>
                        <Typography variant="caption" sx={{ color: colors.subText, opacity: 0.6, letterSpacing: 0.5, fontSize: '0.6rem', textAlign: 'center' }}>
                            {t('chartPanel.hoverForDetails')}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <TuneIcon sx={{ fontSize: '0.8rem', color: colors.subText, opacity: 0.5 }} />
                            <ToggleButtonGroup
                                size="small"
                                exclusive
                                value={subchartLayout}
                                onChange={(_, val) => { if (val) setSubchartLayout?.(val as 'split' | 'overlay') }}
                                sx={{
                                    '& .MuiToggleButton-root': { py: 0.2, px: 1, fontSize: '0.6rem', height: 22 }
                                }}
                            >
                                <ToggleButton value="split">{t('chartPanel.split')}</ToggleButton>
                                <ToggleButton value="overlay">{t('chartPanel.overlay')}</ToggleButton>
                            </ToggleButtonGroup>
                        </Box>
                    </Box>

                    {/* Right zone: Unified axis controls */}
                    <Box sx={{ flex: 1, px: 1.5, display: 'flex', gap: 1.5, height: '100%', alignItems: 'center', overflow: 'hidden' }}>
                        {/* Global Y1 info */}
                        <Box sx={{ minWidth: 80, display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="caption" sx={{ fontSize: '0.55rem', color: colors.subText, fontWeight: 700 }}>{t('chartPanel.y1Primary')}</Typography>
                                <IconButton size="small" onClick={() => setGlobalPrimaryRange?.(null)} sx={{ p: 0.1, color: colors.actual }}>
                                    <RestartAltIcon sx={{ fontSize: '0.7rem' }} />
                                </IconButton>
                            </Box>
                            <Typography variant="caption" sx={{ fontSize: '0.5rem', color: colors.text, opacity: 0.6 }}>
                                {globalPrimaryRange ? `${globalPrimaryRange.min.toFixed(0)} – ${globalPrimaryRange.max.toFixed(0)}` : t('chartPanel.auto')}
                            </Typography>
                        </Box>

                        {/* Global Y2 info */}
                        <Box sx={{ minWidth: 80, display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="caption" sx={{ fontSize: '0.55rem', color: colors.subText, fontWeight: 700 }}>{t('chartPanel.y2Secondary')}</Typography>
                                <IconButton size="small" onClick={() => setGlobalSecondaryRange?.(null)} sx={{ p: 0.1, color: colors.actual }}>
                                    <RestartAltIcon sx={{ fontSize: '0.7rem' }} />
                                </IconButton>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 0.3 }}>
                                <TextField
                                    size="small"
                                    placeholder={t('chartPanel.min')}
                                    value={globalSecondaryRange?.min ?? ''}
                                    onChange={e => {
                                        const val = e.target.value === '' ? undefined : Number(e.target.value);
                                        if (val !== undefined) setGlobalSecondaryRange?.({ min: val, max: globalSecondaryRange?.max ?? 100 });
                                        else if (!globalSecondaryRange?.max) setGlobalSecondaryRange?.(null);
                                        else setGlobalSecondaryRange?.({ min: 0, max: globalSecondaryRange.max });
                                    }}
                                    sx={{ '& .MuiInputBase-input': { p: '1px 3px', fontSize: '0.55rem', textAlign: 'center' } }}
                                />
                                <TextField
                                    size="small"
                                    placeholder={t('chartPanel.max')}
                                    value={globalSecondaryRange?.max ?? ''}
                                    onChange={e => {
                                        const val = e.target.value === '' ? undefined : Number(e.target.value);
                                        if (val !== undefined) setGlobalSecondaryRange?.({ min: globalSecondaryRange?.min ?? 0, max: val });
                                        else if (!globalSecondaryRange?.min) setGlobalSecondaryRange?.(null);
                                        else setGlobalSecondaryRange?.({ min: globalSecondaryRange.min, max: 0 });
                                    }}
                                    sx={{ '& .MuiInputBase-input': { p: '1px 3px', fontSize: '0.55rem', textAlign: 'center' } }}
                                />
                            </Box>
                        </Box>

                        <Box sx={{ height: '60%', borderRight: `1px solid ${colors.tooltipBorder}`, opacity: 0.4 }} />

                        {/* Scrollable series axis list */}
                        <Box sx={{
                            flex: 1,
                            height: '85%',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0.4,
                            pr: 0.5,
                            '&::-webkit-scrollbar': { width: 3 },
                            '&::-webkit-scrollbar-thumb': { bgcolor: 'var(--scrollbar-thumb)', borderRadius: 2 }
                        }}>
                            {(() => {
                                const activeItems: { key: string; label: string; color: string; hasRange?: boolean; supportsLineType?: boolean }[] = [];
                                if (showActualPrice && !hideObsAndPriceRow) activeItems.push({ key: 'price', label: t('chartPanel.actualPrice'), color: colors.actual, hasRange: true, supportsLineType: true });
                                selectedModels.forEach((m: any) => activeItems.push({ key: `model-${m.id}|${m.name}`, label: m.name, color: m.color, hasRange: true, supportsLineType: true }));

                                if (!hideObsAndPriceRow) {
                                    if (showImbalanceSurplusRate) activeItems.push({ key: 'imbalance_surplus', label: t('chartPanel.surplusRate'), color: '#4caf50', supportsLineType: true });
                                    if (showImbalanceDeficitRate) activeItems.push({ key: 'imbalance_deficit', label: t('chartPanel.deficitRate'), color: '#e65100', supportsLineType: true });
                                    if (showIntraday) activeItems.push({ key: 'intraday', label: t('chartPanel.intradayCandle'), color: '#ffa726' });
                                    if (showIntradayAverage) activeItems.push({ key: 'intraday_avg', label: t('chartPanel.intradayAvgLine'), color: '#ffa726', supportsLineType: true });
                                }

                                const activeWeatherFieldsActual = Array.from(selectedWeatherFieldsActual) as string[];
                                activeWeatherFieldsActual.forEach(fieldValue => {
                                    const display = WEATHER_FIELD_DISPLAY[fieldValue];
                                    if (display) {
                                        const color = getWeatherColor(fieldValue);
                                        const freqStr = isDailyField(fieldValue) ? 'day' : 'hour';
                                        const itemKey = `weather-actual-${freqStr}-${fieldValue}`;
                                        activeItems.push({ key: itemKey, label: buildWeatherLabel(fieldValue, false), color: color, hasRange: true });
                                    }
                                });

                                const activeWeatherFieldsForecast = Array.from(selectedWeatherFieldsForecast) as string[];
                                activeWeatherFieldsForecast.forEach(fieldValue => {
                                    const display = WEATHER_FIELD_DISPLAY[fieldValue];
                                    if (display) {
                                        const color = getWeatherColor(fieldValue);
                                        const freqStr = isDailyField(fieldValue) ? 'day' : 'hour';
                                        const itemKey = `weather-forecast-${freqStr}-${fieldValue}`;
                                        activeItems.push({ key: itemKey, label: buildWeatherLabel(fieldValue, true), color: color, hasRange: true });
                                    }
                                });

                                // TDGC price fields — Y1/Y2 axis control (only the band's ave + bands themselves)
                                if (!hideObsAndPriceRow) {
                                    const tdgcDts = (selectedTdgcDataTypes as Set<string>).size > 0 ? selectedTdgcDataTypes as Set<string> : new Set(['prompt']);
                                    const tdgcGroups = (selectedTdgcGroups as Set<string>).size > 0 ? selectedTdgcGroups as Set<string> : new Set(['origin']);
                                    const showTdgcDtLabel = tdgcDts.size > 1;
                                    tdgcDts.forEach((dataType: string) => {
                                        const dtSuffix = showTdgcDtLabel ? ` (${t(`controlBar.${dataType}`)})` : '';
                                        Array.from(selectedTdgcCategories as Set<string>).forEach((category: string) => {
                                            const catCfg = TDGC_CATEGORIES[category];
                                            const catLabel = catCfg ? t(catCfg.labelKey) : category;
                                            const catColor = catCfg?.color ?? '#999';
                                            TDGC_FIELDS
                                                .filter(f => f.type === 'price' && tdgcGroups.has(f.group))
                                                .filter(f => !f.bandRole || f.bandRole === 'ave')
                                                .forEach(f => {
                                                    if (!(selectedTdgcFields as Set<string>).has(f.key)) return;
                                                    activeItems.push({
                                                        key: `tdgc_${dataType}_${category}_${f.key}`,
                                                        label: `${catLabel} ${t(f.labelKey)}${dtSuffix}`,
                                                        color: catColor,
                                                        supportsLineType: true,
                                                    });
                                                });
                                        });
                                    });
                                }

                                if (activeItems.length === 0) {
                                    return (
                                        <Typography variant="caption" sx={{ color: colors.subText, opacity: 0.5, fontSize: '0.55rem', textAlign: 'center', py: 1 }}>
                                            {t('chartPanel.noDataSources')}
                                        </Typography>
                                    );
                                }

                                return activeItems.map(item => (
                                    <Box key={item.key} sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.4,
                                        bgcolor: alpha(item.color || '#888', 0.05),
                                        p: '1px 4px',
                                        borderRadius: 0.5,
                                        border: `1px solid ${alpha(item.color || '#888', 0.1)}`,
                                        flexShrink: 0,
                                    }}>
                                        <Typography variant="caption" noWrap sx={{ fontSize: '0.55rem', color: item.color, fontWeight: 700, flex: 1, minWidth: 0 }}>
                                            {item.label}
                                        </Typography>

                                        <ToggleButtonGroup
                                            size="small"
                                            exclusive
                                            value={seriesAxisConfig?.[item.key]?.axis || 'Y1'}
                                            onChange={(_, val) => {
                                                if (val) setSeriesAxisConfig?.((prev: any) => ({ ...prev, [item.key]: { ...prev[item.key], axis: val } }));
                                            }}
                                            sx={{ '& .MuiToggleButton-root': { py: 0, px: 0.5, fontSize: '0.5rem', height: 15, minWidth: 20 } }}
                                        >
                                            <ToggleButton value="Y1">Y1</ToggleButton>
                                            <ToggleButton value="Y2">Y2</ToggleButton>
                                        </ToggleButtonGroup>

                                        {item.supportsLineType && (
                                            <ToggleButtonGroup
                                                size="small"
                                                exclusive
                                                value={seriesAxisConfig?.[item.key]?.lineType ?? 'steps'}
                                                onChange={(_, val) => {
                                                    if (val) setSeriesAxisConfig?.((prev: any) => ({ ...prev, [item.key]: { ...prev[item.key], lineType: val } }));
                                                }}
                                                sx={{ '& .MuiToggleButton-root': { py: 0, px: 0.3, height: 15, minWidth: 18 } }}
                                            >
                                                <ToggleButton value="line" title={t('chartPanel.lineTypeLine')}>
                                                    <ShowChartIcon sx={{ fontSize: '0.7rem' }} />
                                                </ToggleButton>
                                                <ToggleButton value="steps" title={t('chartPanel.lineTypeSteps')}>
                                                    <StairsIcon sx={{ fontSize: '0.7rem' }} />
                                                </ToggleButton>
                                            </ToggleButtonGroup>
                                        )}

                                        {item.hasRange && (
                                            <Box sx={{ display: 'flex', gap: 0.2, width: 52 }}>
                                                <TextField
                                                    size="small"
                                                    placeholder={t('chartPanel.min')}
                                                    value={seriesAxisConfig?.[item.key]?.scale?.min ?? ''}
                                                    onChange={e => {
                                                        const val = e.target.value === '' ? undefined : Number(e.target.value);
                                                        setSeriesAxisConfig?.((prev: any) => ({ ...prev, [item.key]: { ...prev[item.key], scale: { ...prev[item.key]?.scale, min: val } } }));
                                                    }}
                                                    sx={{ '& .MuiInputBase-input': { p: '0px 2px', fontSize: '0.5rem', textAlign: 'center' } }}
                                                />
                                                <TextField
                                                    size="small"
                                                    placeholder={t('chartPanel.max')}
                                                    value={seriesAxisConfig?.[item.key]?.scale?.max ?? ''}
                                                    onChange={e => {
                                                        const val = e.target.value === '' ? undefined : Number(e.target.value);
                                                        setSeriesAxisConfig?.((prev: any) => ({ ...prev, [item.key]: { ...prev[item.key], scale: { ...prev[item.key]?.scale, max: val } } }));
                                                    }}
                                                    sx={{ '& .MuiInputBase-input': { p: '0px 2px', fontSize: '0.5rem', textAlign: 'center' } }}
                                                />
                                            </Box>
                                        )}
                                    </Box>
                                ));
                            })()}
                        </Box>
                    </Box>

                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        px: 1,
                        ml: 'auto',
                        borderLeft: `1px solid ${colors.tooltipBorder}`,
                        bgcolor: alpha(colors.subText || '#000', 0.02)
                    }}>
                        <ActionButtons onDownload={onDownload} onFullscreen={onFullscreen} showRightAxisLabels={showRightAxisLabels} onToggleRightAxisLabels={onToggleRightAxisLabels} />
                    </Box>
                </Box>
            ) : (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5, height: 20 }}>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                            <Typography variant="caption" sx={{ color: colors.subText, fontWeight: 700, fontSize: '0.7rem' }}>
                                {areaName}
                            </Typography>
                            <Typography variant="body2" sx={{ color: colors.text, fontWeight: 700, fontFamily: 'Monospace', fontSize: '0.85rem' }}>
                                {formattedTime}
                            </Typography>
                        </Box>
                        {/* ActionButtons hidden during hover per user request */}
                    </Box>

                    {/* --- Row 2: Prices (hidden on weather-only page; no Obs/model data) --- */}
                    {!hideObsAndPriceRow && (
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
                                <Typography variant="caption" sx={{ color: colors.subText, mr: 0.5 }}>{t('chartPanel.obs')}</Typography>
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
                    )}

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
                            <DataChip icon={TrendingUpIcon} label={t('chartPanel.intradayAvgLine')} value={hoveredData.intraday_average} unit="¥" color="#ffa726" />
                        )}
                        {showImbalance && (
                            <>
                                {showImbalanceQuantity && hoveredData.imbalance != null && (
                                    <DataChip icon={ElectricBoltIcon} label={t('chartPanel.imbalanceValue')} value={hoveredData.imbalance} unit="kWh" color="#ef5350" />
                                )}
                                {showImbalanceSurplusRate && hoveredData.imbalance_surplus_rate != null && (
                                    <DataChip icon={ElectricBoltIcon} label={t('chartPanel.surplusRate')} value={hoveredData.imbalance_surplus_rate} unit="¥" color="#4caf50" />
                                )}
                                {showImbalanceDeficitRate && hoveredData.imbalance_deficit_rate != null && (
                                    <DataChip icon={ElectricBoltIcon} label={t('chartPanel.deficitRate')} value={hoveredData.imbalance_deficit_rate} unit="¥" color="#e65100" />
                                )}
                            </>
                        )}
                        {Array.from(selectedInterconnectionFields).map((fieldKey) => {
                            const f = INTERCONNECTION_FIELDS.find(x => x.key === fieldKey);
                            if (!f) return null;
                            const val = (hoveredData as any)[f.pointKey];
                            if (val == null) return null;
                            return (
                                <DataChip key={f.key} icon={CompareArrowsIcon} label={t(f.labelKey)} value={val} unit="MW" color={f.color} />
                            );
                        })}
                        {(() => {
                            // Raw data: 賣出(放電)=正、買入(充電)=負. Flip here so display matches the
                            // chart: charge → positive (▲ green), discharge → negative (▼ red).
                            const volumeFields = BATTERY_FIELDS.filter(f => f.isVolume && (selectedBatteryFields as Set<string>).has(f.key));
                            const socFields = BATTERY_FIELDS.filter(f => !f.isVolume && (selectedBatteryFields as Set<string>).has(f.key));
                            const CHARGE_COLOR = '#22c55e';
                            const DISCHARGE_COLOR = '#ef4444';
                            const NEUTRAL_COLOR = '#94a3b8';
                            const out: React.ReactNode[] = [];
                            let netFlipped = 0;
                            let visibleVolumeCount = 0;
                            volumeFields.forEach(f => {
                                const raw = (hoveredData as any)[f.pointKey];
                                if (raw == null) return;
                                const flipped = -raw;
                                netFlipped += flipped;
                                visibleVolumeCount++;
                                const arrow = flipped > 0 ? '▲' : flipped < 0 ? '▼' : '·';
                                const color = flipped > 0 ? CHARGE_COLOR : flipped < 0 ? DISCHARGE_COLOR : NEUTRAL_COLOR;
                                out.push(
                                    <DataChip key={f.key} icon={ElectricBoltIcon}
                                        label={`${arrow} ${t(f.labelKey)}`}
                                        value={flipped} unit=" kWh" color={color} decimals={1} />
                                );
                            });
                            if (visibleVolumeCount >= 2) {
                                const netArrow = netFlipped > 0 ? '▲' : netFlipped < 0 ? '▼' : '·';
                                const netColor = netFlipped > 0 ? CHARGE_COLOR : netFlipped < 0 ? DISCHARGE_COLOR : NEUTRAL_COLOR;
                                out.push(
                                    <DataChip key="battery-net" icon={ElectricBoltIcon}
                                        label={`${netArrow} Net`}
                                        value={netFlipped} unit=" kWh" color={netColor} decimals={1} />
                                );
                            }
                            socFields.forEach(f => {
                                const val = (hoveredData as any)[f.pointKey];
                                if (val == null) return;
                                out.push(
                                    <DataChip key={f.key} icon={ElectricBoltIcon}
                                        label={t(f.labelKey)} value={val} unit=" kWh" color={f.color} decimals={0} />
                                );
                            });
                            return out;
                        })()}
                        {/* Bid Plan Fields - 根据选中的 category 显示 */}
                        {selectedBidPlanCategories.has('spot') && Array.from(selectedBidPlanFields as Set<string>).map((fieldKey) => {
                            // fieldKey 是 'buy_price' 等（去掉 'bid_' 前缀）
                            const f = BID_PLAN_SPOT_FIELDS.find(x => x.key.replace('bid_', '') === fieldKey);
                            if (!f) return null;
                            const val = (hoveredData as any)[f.pointKey];
                            if (val == null) return null;
                            return (
                                <DataChip key={`bp-spot-${fieldKey}`} icon={TrendingUpIcon} label={t(f.labelPrefix) + t(f.labelKey)} value={val} unit="" color={f.color} decimals={fieldKey.includes('price') ? 2 : 0} />
                            );
                        })}
                        {selectedBidPlanCategories.has('intraday') && Array.from(selectedBidPlanFields as Set<string>).map((fieldKey) => {
                            // fieldKey 是 'buy_price' 等（去掉 'bid_' 前缀）
                            const f = BID_PLAN_INTRADAY_FIELDS.find(x => x.key.replace('bid_', '') === fieldKey);
                            if (!f) return null;
                            const val = (hoveredData as any)[f.pointKey];
                            if (val == null) return null;
                            return (
                                <DataChip key={`bp-intraday-${fieldKey}`} icon={TrendingUpIcon} label={t(f.labelPrefix) + t(f.labelKey)} value={val} unit="" color={f.color} decimals={fieldKey.includes('price') ? 2 : 0} />
                            );
                        })}

                        {/* TDGC Fields — band trio collapses to one min/avg/max chip */}
                        {(() => {
                            const tdgcDts = (selectedTdgcDataTypes as Set<string>).size > 0 ? selectedTdgcDataTypes as Set<string> : new Set(['prompt']);
                            const tdgcGroups = (selectedTdgcGroups as Set<string>).size > 0 ? selectedTdgcGroups as Set<string> : new Set(['origin']);
                            const showDtLabel = tdgcDts.size > 1;
                            const out: React.ReactNode[] = [];
                            const visibleFields = TDGC_FIELDS.filter(f =>
                                (selectedTdgcFields as Set<string>).has(f.key) && tdgcGroups.has(f.group)
                            );

                            tdgcDts.forEach((dataType: string) => {
                                const dtLabel = showDtLabel ? ` (${t(`controlBar.${dataType}`)})` : '';
                                Array.from(selectedTdgcCategories as Set<string>).forEach((category: string) => {
                                    const catCfg = TDGC_CATEGORIES[category];
                                    const catLabel = catCfg ? t(catCfg.labelKey) : category;
                                    const catColor = catCfg?.color ?? '#999';

                                    const readVal = (f: typeof TDGC_FIELDS[number]) => {
                                        const short = f.pointKey.replace(/^tdgc_/, '');
                                        return (hoveredData as any)?.[`tdgc_${dataType}_${category}_${short}`];
                                    };

                                    // 1. Band trios — show as "{min} / {avg} / {max}" chip when 2+ roles present.
                                    const handledBandKeys = new Set<string>();
                                    visibleFields.forEach(f => {
                                        if (!f.bandKey) return;
                                        if (handledBandKeys.has(f.bandKey)) return;
                                        const trio = visibleFields.filter(x => x.bandKey === f.bandKey);
                                        if (trio.length < 2) return;
                                        const byRole: Record<string, number | null> = { min: null, ave: null, max: null };
                                        trio.forEach(x => { byRole[x.bandRole!] = readVal(x); });
                                        if (byRole.min == null && byRole.ave == null && byRole.max == null) return;
                                        handledBandKeys.add(f.bandKey);
                                        const fmt = (v: number | null) => v == null ? '–' : v.toFixed(2);
                                        const groupLabel = f.group === 'tso' ? t('tdgcTab.groups.tso') : t('tdgcTab.groups.origin');
                                        const display = `${fmt(byRole.min)} / ${fmt(byRole.ave)} / ${fmt(byRole.max)}`;
                                        out.push(
                                            <DataChip key={`tdgc-band-${dataType}-${category}-${f.bandKey}`} icon={ElectricBoltIcon}
                                                label={`${catLabel} ${t('tdgcTab.priceRange')} ${groupLabel}${dtLabel}`}
                                                value={display} unit="" color={catColor} decimals={0} />
                                        );
                                    });

                                    // 2. Remaining selected fields (excluding band members already shown).
                                    visibleFields.forEach(f => {
                                        if (f.bandKey && handledBandKeys.has(f.bandKey)) return;
                                        const val = readVal(f);
                                        if (val == null) return;
                                        out.push(
                                            <DataChip key={`tdgc-${dataType}-${category}-${f.key}`} icon={ElectricBoltIcon}
                                                label={`${catLabel} ${t(f.labelKey)}${dtLabel}`} value={val} unit=""
                                                color={catColor} decimals={f.type === 'price' ? 2 : 0} />
                                        );
                                    });
                                });
                            });
                            return out;
                        })()}

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
                                    const display = WEATHER_FIELD_DISPLAY[field];
                                    return (
                                        <DataChip
                                            key={`act-${field}`}
                                            icon={getWeatherIcon(field)}
                                            label={buildWeatherLabel(field, false)}
                                            value={hoveredData.weather_data_actual?.[field]}
                                            unit={display?.unit}
                                            color={getWeatherColor(field)}
                                            decimals={(field.includes('temp') || field.includes('wind')) ? 1 : 0}
                                        />
                                    );
                                })}
                                {showWeatherForecast && Array.from(selectedWeatherFieldsForecast).map((field: any) => {
                                    const display = WEATHER_FIELD_DISPLAY[field];
                                    return (
                                        <DataChip
                                            key={`fcst-${field}`}
                                            icon={getWeatherIcon(field)}
                                            label={buildWeatherLabel(field, true)}
                                            value={hoveredData.weather_data_forecast?.[field]}
                                            unit={display?.unit}
                                            color={getWeatherColor(field)}
                                            isForecast
                                            decimals={(field.includes('temp') || field.includes('wind')) ? 1 : 0}
                                        />
                                    );
                                })}
                            </>
                        )}
                    </Box>
                </>
            )
            }
        </Paper >
    );
};