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

import { usePriceChart } from '../../context/PriceChartContext';
import { occtoFields, occtoStackedFields } from '../../constants';

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

                {/* Top Row: Chart Type Config */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>

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
            </Box>
        </Paper>
    );
};

