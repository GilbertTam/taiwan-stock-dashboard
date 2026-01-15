import React from 'react';
import {
    Grid, Paper, Typography, FormControl, InputLabel, Select, MenuItem,
    OutlinedInput, Box, Chip, Checkbox, ListItemText, Divider,
    ButtonGroup, Button, TextField, Popover, IconButton, InputAdornment,
    Tooltip, SelectChangeEvent
} from '@mui/material';
import { DateRange } from 'react-date-range';
import { zhTW } from 'date-fns/locale';
import { format } from 'date-fns';
import RefreshIcon from '@mui/icons-material/Refresh';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

import { Area, PredictionModel, CalculatingDate } from '@/types';

interface FilterPanelProps {
    areas: Area[];
    models: PredictionModel[];
    selectedArea: string;
    selectedModels: {
        id: string | number;
        name: string;
        color: string;
        calculatingDate: string;
    }[];
    calculatingDatesByModel: { [key: string]: CalculatingDate[] };
    startDate: Date | null;
    endDate: Date | null;
    dateRangePreset: string | null;
    onAreaChange: (event: SelectChangeEvent) => void;
    onModelChange: (event: SelectChangeEvent<string[]>) => void;
    onModelCalculatingDateChange: (modelIndex: number, newDate: string) => void;
    onDateRangePreset: (preset: string | null) => void;
    onDateRangeChange: (ranges: any) => void;
    onMoveMonthBackward: () => void;
    onMoveMonthForward: () => void;
    onRefresh: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
    areas,
    models,
    selectedArea,
    selectedModels,
    calculatingDatesByModel,
    startDate,
    endDate,
    dateRangePreset,
    onAreaChange,
    onModelChange,
    onModelCalculatingDateChange,
    onDateRangePreset,
    onDateRangeChange,
    onMoveMonthBackward,
    onMoveMonthForward,
    onRefresh
}) => {
    // Popover state for Date Range
    const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

    const handleDateClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleDateClose = () => {
        setAnchorEl(null);
    };

    const openDateData = Boolean(anchorEl);
    const idDateData = openDateData ? 'date-range-popover' : undefined;

    const modelOptions = models.map(model => ({
        id: model.id,
        name: model.name,
        value: `${model.id}|${model.name}`
    }));

    const selectedModelValues = selectedModels.map(m => `${m.id}|${m.name}`);

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

    return (
        <Paper sx={{ p: 2, mb: 1, borderRadius: 2, boxShadow: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                    資料選擇
                </Typography>
                <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={onRefresh}
                    size="small"
                >
                    刷新數據
                </Button>
            </Box>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={3}>
                {/* Area Selection */}
                <Grid item xs={12} md={4}>
                    <FormControl fullWidth size="small">
                        <InputLabel>選擇地區</InputLabel>
                        <Select
                            value={selectedArea}
                            onChange={onAreaChange}
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

                {/* Model Selection */}
                <Grid item xs={12} md={8}>
                    <FormControl fullWidth size="small">
                        <InputLabel>選擇模型 (最多5個)</InputLabel>
                        <Select
                            multiple
                            value={selectedModelValues}
                            onChange={onModelChange}
                            input={<OutlinedInput label="選擇模型 (最多5個)" />}
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {(selected as string[]).map((value) => {
                                        const [_, name] = value.split('|');
                                        const model = selectedModels.find(m => `${m.id}|${m.name}` === value);
                                        return (
                                            <Chip
                                                key={value}
                                                label={`${name}`}
                                                size="small"
                                                style={{ backgroundColor: model ? model.color + '33' : '#eee' }}
                                            />
                                        );
                                    })}
                                </Box>
                            )}
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

                {/* Model Calculating Date Selection - Only shown if models are selected */}
                {selectedModels.length > 0 && (
                    <Grid item xs={12}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 1 }}>
                            <Typography variant="subtitle2" color="text.secondary">模型計算日期設定:</Typography>
                            <Grid container spacing={2}>
                                {selectedModels.map((model, index) => {
                                    const modelKey = `${model.id}|${model.name}`;
                                    const availableDates = calculatingDatesByModel[modelKey] || [];

                                    return (
                                        <Grid item xs={12} sm={6} md={4} key={modelKey}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: model.color }}></div>
                                                <Typography variant="body2" noWrap sx={{ minWidth: 80, fontWeight: 'bold' }}>{model.name}:</Typography>
                                                <FormControl size="small" fullWidth>
                                                    <Select
                                                        value={model.calculatingDate}
                                                        onChange={(e) => onModelCalculatingDateChange(index, e.target.value)}
                                                        displayEmpty
                                                        sx={{ height: 32, fontSize: '0.875rem' }}
                                                    >
                                                        <MenuItem value="latest">最新預測</MenuItem>
                                                        {availableDates.map(d => (
                                                            <MenuItem key={d.calculating_date} value={d.calculating_date}>
                                                                {formatCalcDate(d.calculating_date)}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            </Box>
                                        </Grid>
                                    );
                                })}
                            </Grid>
                        </Box>
                    </Grid>
                )}

                {/* Date Selection */}
                <Grid item xs={12}>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: 'text.secondary' }}>
                            日期範圍選擇
                        </Typography>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item>
                                <ButtonGroup variant="outlined" size="small" aria-label="date range button group">
                                    <Button
                                        onClick={() => onDateRangePreset('week')}
                                        variant={dateRangePreset === 'week' ? 'contained' : 'outlined'}
                                    >
                                        近一週
                                    </Button>
                                    <Button
                                        onClick={() => onDateRangePreset('twoWeeks')}
                                        variant={dateRangePreset === 'twoWeeks' ? 'contained' : 'outlined'}
                                    >
                                        近兩週
                                    </Button>
                                    <Button
                                        onClick={() => onDateRangePreset('month')}
                                        variant={dateRangePreset === 'month' ? 'contained' : 'outlined'}
                                    >
                                        近一月
                                    </Button>
                                    <Button
                                        onClick={() => onDateRangePreset('threeMonths')}
                                        variant={dateRangePreset === 'threeMonths' ? 'contained' : 'outlined'}
                                    >
                                        近三月
                                    </Button>
                                </ButtonGroup>
                            </Grid>

                            <Grid item sx={{ display: 'flex', alignItems: 'center' }}>
                                <IconButton onClick={onMoveMonthBackward} size="small">
                                    <ChevronLeftIcon />
                                </IconButton>
                                <TextField
                                    size="small"
                                    value={`${startDate ? format(startDate, 'yyyy/MM/dd') : ''} - ${endDate ? format(endDate, 'yyyy/MM/dd') : ''}`}
                                    onClick={handleDateClick}
                                    InputProps={{
                                        readOnly: true,
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <CalendarTodayIcon fontSize="small" />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{ width: 250, mx: 1, cursor: 'pointer' }}
                                />
                                <IconButton onClick={onMoveMonthForward} size="small">
                                    <ChevronRightIcon />
                                </IconButton>
                            </Grid>
                        </Grid>

                        {/* Date Picker Popover */}
                        <Popover
                            id={idDateData}
                            open={openDateData}
                            anchorEl={anchorEl}
                            onClose={handleDateClose}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                            }}
                        >
                            <Box sx={{ p: 2 }}>
                                <DateRange
                                    editableDateInputs={true}
                                    onChange={onDateRangeChange}
                                    moveRangeOnFirstSelection={false}
                                    ranges={[
                                        {
                                            startDate: startDate || new Date(),
                                            endDate: endDate || new Date(),
                                            key: 'selection'
                                        }
                                    ]}
                                    locale={zhTW}
                                    months={1}
                                    direction="horizontal"
                                />
                            </Box>
                        </Popover>
                    </Box>
                </Grid>
            </Grid>
        </Paper>
    );
};
