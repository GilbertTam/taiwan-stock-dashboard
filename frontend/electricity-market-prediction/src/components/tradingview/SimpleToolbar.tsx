'use client';

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Button,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Popover,
  Divider,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { DateRange } from 'react-date-range';
import { zhTW } from 'date-fns/locale';
import { format } from 'date-fns';
import { MenuButton, MenuDrawer } from './MenuButton';
import { TimeRangeSwitcher } from './TimeRangeSwitcher';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

interface SimpleToolbarProps {
  startDate: Date | null;
  endDate: Date | null;
  dateRangePreset: string | null;
  onDateRangeChange: (ranges: any) => void;
  onDateRangePreset: (preset: string | null) => void;
  onDateMenuClose?: () => void;
  onRefresh: () => void;
  onDownloadCsv: () => void;
}

export const SimpleToolbar: React.FC<SimpleToolbarProps> = ({
  startDate,
  endDate,
  dateRangePreset,
  onDateRangeChange,
  onDateRangePreset,
  onDateMenuClose,
  onRefresh,
  onDownloadCsv,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dateAnchorEl, setDateAnchorEl] = useState<HTMLElement | null>(null);

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleDateClick = (event: React.MouseEvent<HTMLElement>) => {
    setDateAnchorEl(event.currentTarget);
  };

  const handleDateClose = () => {
    setDateAnchorEl(null);
    if (onDateMenuClose) {
      onDateMenuClose();
    }
  };

  const openDateData = Boolean(dateAnchorEl);
  const idDateData = openDateData ? 'date-range-popover' : undefined;

  return (
    <>
      <Paper
        sx={{
          p: 1.5,
          borderRadius: 1,
          border: '1px solid var(--card-border)',
          backgroundColor: 'var(--card-bg)',
          mb: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        {/* Menu Button */}
        <MenuButton onDrawerToggle={handleDrawerToggle} />

        {/* Time Selection */}
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
          sx={{
            width: 250,
            cursor: 'pointer',
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'var(--hover-bg)',
            },
          }}
        />

        {/* Quick Time Range Switcher */}
        <TimeRangeSwitcher
          dateRangePreset={dateRangePreset}
          onDateRangePreset={onDateRangePreset}
        />

        <Box sx={{ flex: 1 }} />

        {/* Action Buttons */}
        <Tooltip title="刷新數據">
          <IconButton
            size="small"
            onClick={onRefresh}
            sx={{
              border: '1px solid var(--card-border)',
              '&:hover': {
                backgroundColor: 'var(--hover-bg)',
              },
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="下載 CSV">
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={onDownloadCsv}
            sx={{
              textTransform: 'none',
            }}
          >
            下載 CSV
          </Button>
        </Tooltip>
      </Paper>

      {/* Menu Drawer */}
      <MenuDrawer open={drawerOpen} onClose={handleDrawerToggle} />

      {/* Date Picker Popover */}
      <Popover
        id={idDateData}
        open={openDateData}
        anchorEl={dateAnchorEl}
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
              const { startDate: newStartDate, endDate: newEndDate } = ranges.selection;

              // 更新暫存日期範圍（由 useBufferedDateRange 處理實際提交）
              onDateRangeChange(ranges);

              // 當使用者選出「開始 ≠ 結束」的一個完整區間時，自動關閉彈窗
              if (
                newStartDate &&
                newEndDate &&
                newStartDate.getTime() !== newEndDate.getTime()
              ) {
                handleDateClose();
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
    </>
  );
};
