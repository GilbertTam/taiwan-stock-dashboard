import React, { MouseEvent } from 'react';
import { Box, Typography, Select, MenuItem, ToggleButton, Tooltip as MuiTooltip, FormControl, Paper } from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import BarChartIcon from '@mui/icons-material/BarChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import BalanceIcon from '@mui/icons-material/Balance';
import MapIcon from '@mui/icons-material/Map';
import VisibilityIcon from '@mui/icons-material/Visibility';
import StackedLineChartIcon from '@mui/icons-material/StackedLineChart'; // Fallback or use custom
import LayersIcon from '@mui/icons-material/Layers';

import { usePriceChart } from './context/PriceChartContext';
import { occtoFields, occtoStackedFields } from './constants';

export const PriceChartControls: React.FC = () => {
    const {
        // Toggles
        showPredictionRange, setShowPredictionRange,
        showImbalance, setShowImbalance,
        showIntraday, setShowIntraday,
        showInterconnection, setShowInterconnection,
        showOcctoArea, setShowOcctoArea,
        showZScore, setShowZScore,

        // Metadata for disabled states
        hasImbalanceData,
        hasIntradayData,
        hasInterconnectionData,
        hasOcctoAreaData,

        // Settings
        chartType, setChartType,
        occtoChartType, setOcctoChartType,
        selectedOcctoField, setSelectedOcctoField,
        selectedOcctoFields, setSelectedOcctoFields,

        colors
    } = usePriceChart();

    const handleLayerChange = (event: MouseEvent<HTMLElement>, newFormats: string[]) => {
        // We aren't using a single array for all because they are separate states in context
        // But for ToggleButtonGroup we can fake it or just use individual buttons if we want "exclusive" behavior or multi-select
        // However, since we have separate specialized setters, it's easier to use individual ToggleButtons or groups by category.
    };

    // Helper for Toggle Button
    const renderToggle = (
        value: boolean,
        onChange: (val: boolean) => void,
        icon: React.ReactNode,
        title: string,
        disabled: boolean = false,
        activeColor: string = 'primary.main'
    ) => (
        <MuiTooltip title={disabled ? "No Data" : title} arrow>
            <span>
                <ToggleButton
                    value="check"
                    selected={value}
                    onChange={() => onChange(!value)}
                    disabled={disabled}
                    size="small"
                    sx={{
                        border: 'none',
                        borderRadius: 1,
                        mr: 0.5,
                        color: colors.subText,
                        '&.Mui-selected': {
                            backgroundColor: `${activeColor}22`, // 22 = low opacity
                            color: activeColor,
                            '&:hover': {
                                backgroundColor: `${activeColor}33`,
                            }
                        }
                    }}
                >
                    {icon}
                    <Typography variant="caption" sx={{ ml: 0.5, fontWeight: value ? 'bold' : 'normal' }}>
                        {title}
                    </Typography>
                </ToggleButton>
            </span>
        </MuiTooltip>
    );

    return (
        <Paper
            elevation={0}
            sx={{
                p: 1,
                mb: 1,
                backgroundColor: 'rgba(0,0,0,0.02)',
                border: `1px solid ${colors.grid}`,
                borderRadius: 2
            }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>

                {/* Top Row: Main Layers & Chart Type */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>

                    {/* Layer Toggles */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ mr: 1, color: colors.subText, fontWeight: 'bold' }}>
                            VIEW:
                        </Typography>

                        {renderToggle(showPredictionRange, setShowPredictionRange, <VisibilityIcon fontSize="small" />, "Forecast", false, colors.predicted)}
                        {renderToggle(showImbalance, setShowImbalance, <BalanceIcon fontSize="small" />, "Imbalance", !hasImbalanceData, colors.imbalance)}
                        {renderToggle(showIntraday, setShowIntraday, <TimelineIcon fontSize="small" />, "Intraday", !hasIntradayData, colors.intraday)}
                        {renderToggle(showInterconnection, setShowInterconnection, <CompareArrowsIcon fontSize="small" />, "Interconn.", !hasInterconnectionData, colors.interconnection)}
                        {renderToggle(showOcctoArea, setShowOcctoArea, <MapIcon fontSize="small" />, "Occto", !hasOcctoAreaData, colors.occtoArea)}
                        {renderToggle(showZScore, setShowZScore, <BarChartIcon fontSize="small" />, "Z-Score", false, colors.warning)}
                    </Box>

                    {/* Chart Type Config */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FormControl size="small">
                            <Select
                                value={chartType}
                                onChange={(e) => setChartType(e.target.value as 'line' | 'stepLine')}
                                displayEmpty
                                variant="standard"
                                disableUnderline
                                sx={{
                                    fontSize: '0.85rem',
                                    color: colors.text,
                                    '& .MuiSelect-select': { py: 0.5 }
                                }}
                            >
                                <MenuItem value="line"><ShowChartIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'text-bottom' }} /> Smooth</MenuItem>
                                <MenuItem value="stepLine"><StackedLineChartIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'text-bottom' }} /> Step</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </Box>

                {/* Sub Row: Occto Specifics (Conditional) */}
                {showOcctoArea && (
                    <Box sx={{
                        pl: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        animation: 'fadeIn 0.3s ease-in-out',
                        borderTop: `1px dashed ${colors.grid}`,
                        pt: 1
                    }}>
                        {/* Chart Type and Field Toggles Row */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                            <Typography variant="caption" sx={{ color: colors.occtoArea, fontWeight: 'bold' }}>
                                OCCTO CONFIG:
                            </Typography>

                            <FormControl size="small">
                                <Select
                                    value={occtoChartType}
                                    onChange={(e) => setOcctoChartType(e.target.value as 'line' | 'stacked')}
                                    variant="standard"
                                    disableUnderline
                                    sx={{ fontSize: '0.8rem', color: colors.text }}
                                >
                                    <MenuItem value="line">Line Chart</MenuItem>
                                    <MenuItem value="stacked">Stacked Bar</MenuItem>
                                </Select>
                            </FormControl>

                            {/* Field Toggles */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                                <Typography variant="caption" sx={{ color: colors.subText, mr: 0.5 }}>
                                    Fields:
                                </Typography>
                                {occtoFields.map((field) => {
                                    const isSelected = selectedOcctoFields.has(field.value);
                                    // Keep colors consistent with stacked chart.
                                    // If a field exists in occtoStackedFields, use that color; otherwise fallback to OCCTO theme color.
                                    const stackedField = occtoStackedFields.find(sf => sf.key === field.value);
                                    const fieldColor: string = stackedField?.color ?? colors.occtoArea;

                                    return (
                                        <MuiTooltip key={field.value} title={field.label} arrow>
                                            <span>
                                                <ToggleButton
                                                    value={field.value}
                                                    selected={isSelected}
                                                    onChange={() => {
                                                        setSelectedOcctoFields((prev) => {
                                                            const newSet = new Set(prev);
                                                            if (newSet.has(field.value)) {
                                                                newSet.delete(field.value);
                                                            } else {
                                                                newSet.add(field.value);
                                                            }
                                                            // Ensure at least one field is selected
                                                            if (newSet.size === 0) {
                                                                newSet.add('area_demand');
                                                            }
                                                            return newSet;
                                                        });
                                                    }}
                                                    size="small"
                                                    sx={{
                                                        border: `1px solid ${fieldColor}40`,
                                                        borderRadius: 1,
                                                        px: 1,
                                                        py: 0.25,
                                                        fontSize: '0.7rem',
                                                        color: colors.subText,
                                                        backgroundColor: 'transparent',
                                                        '&.Mui-selected': {
                                                            backgroundColor: `${fieldColor}22`,
                                                            color: fieldColor,
                                                            fontWeight: 'bold',
                                                            borderColor: `${fieldColor}80`,
                                                            '&:hover': {
                                                                backgroundColor: `${fieldColor}33`,
                                                            }
                                                        },
                                                        '&:hover': {
                                                            backgroundColor: `${fieldColor}11`,
                                                            borderColor: `${fieldColor}60`,
                                                        }
                                                    }}
                                                >
                                                    {field.label}
                                                </ToggleButton>
                                            </span>
                                        </MuiTooltip>
                                    );
                                })}
                            </Box>
                        </Box>
                    </Box>
                )}
            </Box>
        </Paper>
    );
};
