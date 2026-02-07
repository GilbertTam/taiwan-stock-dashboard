
import React, { useState } from 'react';
import {
    List,
    ListItem,
    ListItemText,
    ListItemButton,
    ListItemIcon,
    Checkbox,
    Typography,
    Collapse,
    Paper,
    Box,
    alpha
} from '@mui/material';
import {
    ExpandMore, ExpandLess,
    Balance, SwapHoriz, Cloud, Map, ShowChart, BarChart, Percent
} from '@mui/icons-material';
import { useMarketDataContext } from '@/context/MarketDataContext';
import { usePriceChart } from '@/components/price-chart/context/PriceChartContext';
import { occtoFields, occtoStackedFields, weatherFields } from '@/components/price-chart/constants';
import { SectionHeader, SubHeader, SOURCE_COLORS } from './shared';

interface DataSourceSelectorProps {
    expanded: boolean;
    onToggle: () => void;
}

export const DataSourceSelector: React.FC<DataSourceSelectorProps> = ({
    expanded,
    onToggle
}) => {
    const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({
        weather: true,
        occto: true,
    });

    const {
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
        showActualPrice, setShowActualPrice,
        imbalanceData,
        intradayData,
        interconnectionData,
        weatherActual,
        weatherForecast,
        occtoAreaData,
    } = useMarketDataContext();

    // Data availability checks
    const hasImbalanceData = imbalanceData && imbalanceData.length > 0;
    const hasIntradayData = intradayData && intradayData.length > 0;
    const hasInterconnectionData = interconnectionData && interconnectionData.length > 0;
    const hasWeatherActualData = weatherActual && weatherActual.length > 0;
    const hasWeatherForecastData = weatherForecast && weatherForecast.length > 0;
    const hasWeatherData = hasWeatherActualData || hasWeatherForecastData;
    const hasOcctoData = occtoAreaData && occtoAreaData.length > 0;

    // Context getters with fallbacks
    let selectedOcctoFields: Set<string> = new Set(['area_demand']);
    let setSelectedOcctoFields: (fn: (prev: Set<string>) => Set<string>) => void = () => { };
    let selectedWeatherFieldsActual: Set<string> = new Set(['temperature']);
    let setSelectedWeatherFieldsActual: (fn: (prev: Set<string>) => Set<string>) => void = () => { };
    let selectedWeatherFieldsForecast: Set<string> = new Set(['temperature']);
    let setSelectedWeatherFieldsForecast: (fn: (prev: Set<string>) => Set<string>) => void = () => { };
    let occtoChartType: 'stacked' | 'area' = 'stacked';
    let setOcctoChartType: (val: 'stacked' | 'area') => void = () => { };

    try {
        const chartContext = usePriceChart();
        selectedOcctoFields = chartContext.selectedOcctoFields;
        setSelectedOcctoFields = chartContext.setSelectedOcctoFields;
        selectedWeatherFieldsActual = (chartContext as any).selectedWeatherFieldsActual ?? new Set(['temperature']);
        setSelectedWeatherFieldsActual = (chartContext as any).setSelectedWeatherFieldsActual ?? (() => { });
        selectedWeatherFieldsForecast = (chartContext as any).selectedWeatherFieldsForecast ?? new Set(['temperature']);
        setSelectedWeatherFieldsForecast = (chartContext as any).setSelectedWeatherFieldsForecast ?? (() => { });
        occtoChartType = chartContext.occtoChartType;
        setOcctoChartType = chartContext.setOcctoChartType;
    } catch { }

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

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: 0,
                backgroundColor: 'transparent',
                flexShrink: 0,
            }}
        >
            <SectionHeader
                onClick={onToggle}
                expanded={expanded}
            >
                資料來源層
            </SectionHeader>

            <Collapse in={expanded}>
                <List dense sx={{ p: 0 }}>

                    <SubHeader label="市場價格與平衡" />

                    {/* Actual Price Toggle */}
                    <ListItem disablePadding>
                        <ListItemButton
                            onClick={() => setShowActualPrice(!showActualPrice)}
                            sx={{
                                borderLeft: showActualPrice ? `4px solid #ef5350` : '4px solid transparent',
                                backgroundColor: showActualPrice ? alpha('#ef5350', 0.1) : 'transparent',
                                '&:hover': { backgroundColor: alpha('#ef5350', 0.15) }
                            }}
                        >
                            <Checkbox
                                checked={showActualPrice}
                                size="small"
                                sx={{ color: '#ef5350', '&.Mui-checked': { color: '#ef5350' } }}
                                onChange={(e) => { e.stopPropagation(); setShowActualPrice(e.target.checked); }}
                                onClick={e => e.stopPropagation()}
                            />
                            <ListItemIcon sx={{ minWidth: 32 }}>
                                <ShowChart sx={{ fontSize: '1.1rem', color: showActualPrice ? '#ef5350' : 'text.disabled' }} />
                            </ListItemIcon>
                            <ListItemText primary="Actual Price" primaryTypographyProps={{ fontSize: '0.85rem' }} />
                        </ListItemButton>
                    </ListItem>


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
                                setExpandedGroups(prev => ({ ...prev, weather: !prev.weather }));
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
                            {hasWeatherData && (expandedGroups.weather ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />)}
                        </ListItemButton>

                        <Collapse in={expandedGroups.weather} timeout="auto" unmountOnExit>
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
                                setExpandedGroups(prev => ({ ...prev, occto: !prev.occto }));
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
                                onChange={(e) => { e.stopPropagation(); setShowOcctoArea(e.target.checked); }}
                                onClick={e => e.stopPropagation()}
                            />
                            <ListItemIcon sx={{ minWidth: 32 }}>
                                <Map sx={{ fontSize: '1.1rem', color: showOcctoArea ? SOURCE_COLORS.occto : 'text.disabled' }} />
                            </ListItemIcon>
                            <ListItemText
                                primary="OCCTO Area Data"
                                secondary="廣域營運數據"
                                primaryTypographyProps={{ fontSize: '0.85rem' }}
                                secondaryTypographyProps={{ fontSize: '0.7rem' }}
                            />
                            {hasOcctoData && (expandedGroups.occto ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />)}
                        </ListItemButton>

                        <Collapse in={expandedGroups.occto} timeout="auto" unmountOnExit>
                            <Box sx={{ pl: 6, pr: 2, pb: 1.5, pt: 0.5, bgcolor: alpha(SOURCE_COLORS.occto, 0.02) }}>
                                {/* Chart Type Toggle */}
                                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                    <Box
                                        onClick={() => setOcctoChartType('stacked')}
                                        sx={{
                                            display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5,
                                            borderRadius: 1, cursor: 'pointer',
                                            bgcolor: occtoChartType === 'stacked' ? alpha(SOURCE_COLORS.occto, 0.2) : 'transparent',
                                            border: '1px solid',
                                            borderColor: occtoChartType === 'stacked' ? SOURCE_COLORS.occto : 'transparent'
                                        }}
                                    >
                                        <BarChart sx={{ fontSize: '1rem', color: occtoChartType === 'stacked' ? SOURCE_COLORS.occto : 'text.secondary' }} />
                                        <Typography variant="caption" color={occtoChartType === 'stacked' ? 'text.primary' : 'text.secondary'}>堆疊</Typography>
                                    </Box>
                                    <Box
                                        onClick={() => setOcctoChartType('area')}
                                        sx={{
                                            display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5,
                                            borderRadius: 1, cursor: 'pointer',
                                            bgcolor: occtoChartType === 'area' ? alpha(SOURCE_COLORS.occto, 0.2) : 'transparent',
                                            border: '1px solid',
                                            borderColor: occtoChartType === 'area' ? SOURCE_COLORS.occto : 'transparent'
                                        }}
                                    >
                                        <Percent sx={{ fontSize: '1rem', color: occtoChartType === 'area' ? SOURCE_COLORS.occto : 'text.secondary' }} />
                                        <Typography variant="caption" color={occtoChartType === 'area' ? 'text.primary' : 'text.secondary'}>百分比</Typography>
                                    </Box>
                                </Box>

                                {/* Fields */}
                                <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>數據欄位</Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {occtoStackedFields.map((fieldObj) => {
                                        const isSelected = selectedOcctoFields.has(fieldObj.key);

                                        return (
                                            <Box
                                                key={fieldObj.key}
                                                onClick={() => toggleOcctoField(fieldObj.key)}
                                                sx={{
                                                    px: 1, py: 0.5, borderRadius: 10, cursor: 'pointer',
                                                    fontSize: '0.65rem',
                                                    bgcolor: isSelected ? alpha(fieldObj.color, 0.15) : 'transparent',
                                                    color: isSelected ? fieldObj.color : 'text.secondary',
                                                    border: `1px solid ${isSelected ? fieldObj.color : 'var(--card-border)'}`,
                                                    '&:hover': { bgcolor: alpha(fieldObj.color, 0.25) }
                                                }}
                                            >
                                                {fieldObj.label}
                                            </Box>
                                        )
                                    })}
                                </Box>
                            </Box>
                        </Collapse>
                    </ListItem>

                </List>
            </Collapse>
        </Paper>
    );
};
