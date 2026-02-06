import React from 'react';
import {
    Grid, Typography, FormControl, InputLabel, Select, MenuItem,
    Box, Divider,
    ButtonGroup, Button, TextField, Popover, IconButton, InputAdornment,
    SelectChangeEvent, useTheme
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
import Card from '@/components/common/Card';

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

const AreaSelect: React.FC<{
    areas: Area[];
    selectedArea: string;
    onAreaChange: (event: SelectChangeEvent) => void;
}> = ({ areas, selectedArea, onAreaChange }) => {
    const theme = useTheme();
    return (
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
    );
};

const DatePresetButtons: React.FC<{
    dateRangePreset: string | null;
    onDateRangePreset: (preset: string | null) => void;
}> = ({ dateRangePreset, onDateRangePreset }) => {
    // TradingView-style presets
    const presets = [
        { key: '1D', label: '1天' },
        { key: 'week', label: '1週' },
        { key: 'twoWeeks', label: '2週' },
        { key: 'month', label: '1月' },
        { key: 'threeMonths', label: '3月' },
        { key: 'sixMonths', label: '6月' },
        { key: 'year', label: '1年' },
        { key: 'all', label: '全部' },
    ];

    return (
        <div className="flex flex-wrap gap-1">
            {presets.map((preset) => (
                <button
                    key={preset.key}
                    onClick={() => onDateRangePreset(preset.key)}
                    className={`rounded px-2 py-1 text-xs font-medium transition-colors ${dateRangePreset === preset.key
                        ? 'bg-[var(--primary)] text-black'
                        : 'bg-[var(--hover-bg)] text-[var(--foreground)] hover:bg-[var(--primary)]/20'
                        }`}
                >
                    {preset.label}
                </button>
            ))}
        </div>
    );
};


const DateRangeField: React.FC<{
    startDate: Date | null;
    endDate: Date | null;
    onClick: (event: React.MouseEvent<HTMLElement>) => void;
}> = ({ startDate, endDate, onClick }) => (
    <TextField
        size="small"
        value={`${startDate ? format(startDate, 'yyyy/MM/dd') : ''} - ${endDate ? format(endDate, 'yyyy/MM/dd') : ''}`}
        onClick={onClick}
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
);

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
    const idDateData = openDateData ? 'date-range-popover' : undefined;

    return (
        <Card sx={{ p: 2, mb: 1, mt: 2 }}>
            {/* TradingView-like toolbar row */}
            <Box
                sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    rowGap: 1.5,
                    columnGap: 2,
                    mb: 1.5,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ whiteSpace: 'nowrap' }}>
                        資料選擇
                    </Typography>
                    <Box sx={{ minWidth: 200 }}>
                        <AreaSelect
                            areas={areas}
                            selectedArea={selectedArea}
                            onAreaChange={onAreaChange}
                        />
                    </Box>
                </Box>

                <Box
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 1,
                    }}
                >
                    <DatePresetButtons
                        dateRangePreset={dateRangePreset}
                        onDateRangePreset={onDateRangePreset}
                    />

                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton onClick={onMoveMonthBackward} size="small">
                            <ChevronLeftIcon />
                        </IconButton>
                        <DateRangeField
                            startDate={startDate}
                            endDate={endDate}
                            onClick={handleDateClick}
                        />
                        <IconButton onClick={onMoveMonthForward} size="small">
                            <ChevronRightIcon />
                        </IconButton>
                    </Box>

                    <Divider
                        orientation="vertical"
                        flexItem
                        sx={{ mx: 1, borderColor: 'var(--card-border)', display: { xs: 'none', sm: 'block' } }}
                    />

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
            </Box>

            <Divider sx={{ mb: 1.5 }} />

            {/* Date Picker Popover (shared for toolbar date field) */}
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
                    className="hdjp-date-range"
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
        </Card>
    );
};
