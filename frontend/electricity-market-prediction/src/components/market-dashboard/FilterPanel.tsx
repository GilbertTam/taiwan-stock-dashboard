import React from 'react';
import {
    Grid, Paper, Typography, FormControl, InputLabel, Select, MenuItem,
    OutlinedInput, Box, Chip, Checkbox, ListItemText, Divider,
    ButtonGroup, Button, TextField, Popover, IconButton, InputAdornment,
    Tooltip, SelectChangeEvent, useTheme, ToggleButton, ToggleButtonGroup
} from '@mui/material';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { DateRange } from 'react-date-range';
import { zhTW } from 'date-fns/locale';
import { format } from 'date-fns';
import RefreshIcon from '@mui/icons-material/Refresh';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

import { Area } from '@/types';

interface FilterPanelProps {
    areas: Area[];
    selectedArea: string;
    startDate: Date | null;
    endDate: Date | null;
    dateRangePreset: string | null;
    onAreaChange: (event: SelectChangeEvent) => void;
    onDateRangePreset: (preset: string | null) => void;
    onDateRangeChange: (ranges: any) => void;
    onMoveMonthBackward: () => void;
    onMoveMonthForward: () => void;
    onRefresh: () => void;


    onDownloadCsv: () => void;
    onDateMenuClose?: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
    areas,
    selectedArea,
    startDate,
    endDate,
    dateRangePreset,
    onAreaChange,
    onDateRangePreset,
    onDateRangeChange,
    onMoveMonthBackward,
    onMoveMonthForward,
    onRefresh,

    onDownloadCsv,
    onDateMenuClose,
}) => {
    const theme = useTheme();

    // Popover state for Date Range
    const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

    const handleDateClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleDateClose = () => {
        setAnchorEl(null);
        if (onDateMenuClose) {
            onDateMenuClose();
        }
    };

    const openDateData = Boolean(anchorEl);

    // Force apply styles to date picker after it renders
    React.useEffect(() => {
        if (openDateData && anchorEl) {
            const applyDatePickerStyles = () => {
                // Detect current theme
                const isLightMode = document.body.dataset.theme === 'light';
                const textColor = isLightMode ? '#1a1a1a' : '#ffffff';
                const passiveColor = isLightMode ? '#999' : '#888';

                // Find all date picker elements
                const datePickerWrapper = document.querySelector('.rdrDateRangeWrapper');
                if (datePickerWrapper) {
                    // Apply styles to all day numbers
                    const dayNumbers = datePickerWrapper.querySelectorAll('.rdrDayNumber span');
                    dayNumbers.forEach((span) => {
                        const dayElement = span.closest('.rdrDay');
                        if (dayElement?.classList.contains('rdrDayPassive')) {
                            (span as HTMLElement).style.color = passiveColor;
                            (span as HTMLElement).style.opacity = '0.7';
                        } else if (dayElement?.classList.contains('rdrInRange') ||
                            dayElement?.classList.contains('rdrStartEdge') ||
                            dayElement?.classList.contains('rdrEndEdge') ||
                            dayElement?.classList.contains('rdrSelected')) {
                            // Selected dates - white text for contrast with darker green
                            (span as HTMLElement).style.color = '#ffffff';
                            (span as HTMLElement).style.fontWeight = 'bold';
                        } else if (!dayElement?.classList.contains('rdrDayDisabled')) {
                            (span as HTMLElement).style.color = textColor;
                            (span as HTMLElement).style.fontWeight = '500';
                        }
                    });

                    // Ensure selected date range has darker green background for better contrast
                    const inRangeDays = datePickerWrapper.querySelectorAll('.rdrDay.rdrInRange');
                    inRangeDays.forEach((day) => {
                        (day as HTMLElement).style.opacity = '0.7';
                        (day as HTMLElement).style.backgroundColor = 'var(--date-picker-selected, #00cc7a)';
                    });

                    const startEndDays = datePickerWrapper.querySelectorAll('.rdrDay.rdrStartEdge, .rdrDay.rdrEndEdge');
                    startEndDays.forEach((day) => {
                        (day as HTMLElement).style.opacity = '1';
                        (day as HTMLElement).style.backgroundColor = 'var(--date-picker-selected, #00cc7a)';
                    });

                    const selectedDays = datePickerWrapper.querySelectorAll('.rdrDay.rdrSelected');
                    selectedDays.forEach((day) => {
                        (day as HTMLElement).style.backgroundColor = 'var(--date-picker-selected, #00cc7a)';
                    });

                    // Apply styles to selects
                    const selects = datePickerWrapper.querySelectorAll('select');
                    selects.forEach((select) => {
                        select.style.color = textColor;
                        select.style.backgroundColor = 'var(--card-bg)';
                        select.style.border = '1px solid var(--card-border)';
                        select.style.borderRadius = '4px';
                        select.style.padding = '4px 8px';
                        select.style.fontWeight = '500';
                    });

                    // Apply styles to month name
                    const monthNames = datePickerWrapper.querySelectorAll('.rdrMonthName');
                    monthNames.forEach((el) => {
                        (el as HTMLElement).style.color = 'var(--primary)';
                        (el as HTMLElement).style.fontWeight = 'bold';
                    });

                    // Apply styles to week days
                    const weekDays = datePickerWrapper.querySelectorAll('.rdrWeekDay');
                    weekDays.forEach((el) => {
                        (el as HTMLElement).style.color = textColor;
                        (el as HTMLElement).style.fontWeight = '600';
                        (el as HTMLElement).style.opacity = '1';
                    });
                }
            };

            // Apply immediately
            applyDatePickerStyles();

            // Also apply after a short delay to catch dynamically rendered elements
            const timeout = setTimeout(applyDatePickerStyles, 100);
            const interval = setInterval(applyDatePickerStyles, 500);

            return () => {
                clearTimeout(timeout);
                clearInterval(interval);
            };
        }
    }, [openDateData, anchorEl]);
    const idDateData = openDateData ? 'date-range-popover' : undefined;

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
        <Paper sx={{ p: 2, mb: 1, mt: 2, borderRadius: 2, boxShadow: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                    資料選擇
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={onRefresh}
                        size="small"
                    >
                        刷新數據
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={onDownloadCsv}
                        size="small"
                    >
                        下載 CSV
                    </Button>
                </Box>
            </Box>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={3}>
                {/* Area Selection */}
                <Grid item xs={12}>
                    <FormControl fullWidth size="small">
                        <InputLabel>選擇地區</InputLabel>
                        <Select
                            value={selectedArea}
                            onChange={onAreaChange}
                            label="選擇地區"
                            MenuProps={{
                                PaperProps: {
                                    sx: {
                                        backgroundColor: theme.palette.mode === 'dark'
                                            ? 'rgba(30, 30, 30, 0.98)'
                                            : 'rgba(255, 255, 255, 0.98)',
                                        backdropFilter: 'blur(10px)',
                                        border: `1px solid ${theme.palette.divider}`,
                                        maxHeight: 300,
                                    }
                                }
                            }}
                        >
                            {areas.map((area) => (
                                <MenuItem key={area.id} value={area.name}>
                                    {area.name_ch} ({area.name})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

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
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'left',
                            }}
                            PaperProps={{
                                sx: {
                                    mt: 1,
                                    p: 0,
                                    backgroundColor: 'var(--card-bg)',
                                    backgroundImage: 'none',
                                    backdropFilter: 'blur(20px)',
                                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                                    border: '1px solid var(--card-border)',
                                    borderRadius: 2,
                                    overflow: 'hidden'
                                }
                            }}
                        >
                            <Box
                                sx={{
                                    p: 0,
                                    backgroundColor: 'var(--card-bg)',
                                    '& .rdrDateRangeWrapper': {
                                        backgroundColor: 'var(--card-bg) !important',
                                    },
                                    '& .rdrDateRangePickerWrapper': {
                                        backgroundColor: 'var(--card-bg) !important',
                                    },
                                    '& .rdrCalendarWrapper': {
                                        backgroundColor: 'var(--card-bg) !important',
                                    },
                                    // 强制覆盖所有日期数字的文字颜色 - 使用CSS变量支持亮/暗模式
                                    '& .rdrDayNumber span': {
                                        color: '#63c573ff',
                                        fontWeight: '500 !important',
                                    },
                                    '& .rdrDay:not(.rdrDayPassive):not(.rdrDayDisabled) .rdrDayNumber span': {
                                        color: '#63c573ff',
                                        fontWeight: '500 !important',
                                    },
                                    // 被动日期（其他月份的日期）
                                    '& .rdrDayPassive .rdrDayNumber span': {
                                        color: '#63c573ff',
                                        opacity: '0.5 !important',
                                    },
                                    // 月份和年份选择器
                                    '& .rdrMonthAndYearPickers select': {
                                        color: '#63c573ff',
                                        backgroundColor: 'var(--card-bg) !important',
                                        border: '1px solid var(--card-border) !important',
                                        borderRadius: '4px !important',
                                        padding: '4px 8px !important',
                                        fontWeight: '500 !important',
                                    },
                                    '& .rdrMonthAndYearPickers select option': {
                                        color: '#63c573ff !important',
                                        backgroundColor: 'var(--card-bg) !important',
                                    },
                                    // 月份名称
                                    '& .rdrMonthName': {
                                        color: '#63c573ff !important',
                                        fontWeight: 'bold !important',
                                    },
                                    // 星期标签
                                    '& .rdrWeekDay': {
                                        color: '#63c573ff !important',
                                        fontWeight: '600 !important',
                                        opacity: '1 !important',
                                    },
                                    // 导航按钮
                                    '& .rdrNextPrevButton': {
                                        color: '#63c573ff !important',
                                        backgroundColor: 'var(--hover-bg) !important',
                                    },
                                    '& .rdrNextPrevButton i': {
                                        borderColor: 'transparent transparent transparent #63c573ff !important',
                                    },
                                    '& .rdrPprevButton i': {
                                        borderColor: 'transparent #63c573ff transparent transparent !important',
                                    }
                                }}
                            >
                                <DateRange
                                    editableDateInputs={true}
                                    onChange={(ranges) => {
                                        onDateRangeChange(ranges);
                                        const { startDate, endDate } = ranges.selection;
                                        if (startDate && endDate && startDate.getTime() !== endDate.getTime()) {
                                            setAnchorEl(null);
                                        }
                                    }}
                                    moveRangeOnFirstSelection={false}
                                    ranges={[
                                        {
                                            startDate: startDate || new Date(),
                                            endDate: endDate || new Date(),
                                            key: 'selection'
                                        }
                                    ]}
                                    locale={zhTW}
                                    months={2}
                                    direction="horizontal"
                                    showDateDisplay={false}
                                    showMonthAndYearPickers={true}
                                    rangeColors={['#00cc7a']}
                                />
                            </Box>
                        </Popover>

                    </Box>
                </Grid>
            </Grid>
        </Paper>
    );
};
