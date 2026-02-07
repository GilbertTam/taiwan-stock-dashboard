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
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssessmentIcon from '@mui/icons-material/Assessment';
import InfoIcon from '@mui/icons-material/Info';
import { DateRange } from 'react-date-range';
import { zhTW } from 'date-fns/locale';
import { format } from 'date-fns';
import { useRouter, usePathname } from 'next/navigation';
import { TimeRangeSwitcher } from '@/components/features/nav/TimeRangeSwitcher';
import UserMenu from '@/components/features/nav/UserMenu';
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
  /** Current tab key for highlight (price | model-performance | market-info). Only relevant on price-prediction page. */
  currentTab?: string;
}

const NAV_ITEMS: { key: string; label: string; path: string; Icon: React.ElementType }[] = [
  { key: 'home', label: '首頁', path: '/dashboard', Icon: DashboardIcon },
  { key: 'price', label: '價格預測', path: '/dashboard/price-prediction?tab=price', Icon: TrendingUpIcon },
  { key: 'model-performance', label: '模型效能', path: '/dashboard/price-prediction?tab=model-performance', Icon: AssessmentIcon },
  { key: 'market-info', label: '市場資訊', path: '/dashboard/price-prediction?tab=market-info', Icon: InfoIcon },
];

export const DashboardToolbar: React.FC<SimpleToolbarProps> = ({
  startDate,
  endDate,
  dateRangePreset,
  onDateRangeChange,
  onDateRangePreset,
  onDateMenuClose,
  onRefresh,
  onDownloadCsv,
  currentTab = 'price',
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [dateAnchorEl, setDateAnchorEl] = useState<HTMLElement | null>(null);

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
        {/* Nav: 首頁, 價格預測, 模型效能, 市場資訊 */}
        {NAV_ITEMS.map(({ key, label, path, Icon }) => {
          const isActive = key === 'home' ? pathname === '/dashboard' : currentTab === key;
          return (
            <Button
              key={key}
              size="small"
              startIcon={<Icon sx={{ fontSize: 18 }} />}
              onClick={() => router.push(path)}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                color: isActive ? 'var(--primary)' : 'var(--foreground)',
                borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                borderRadius: 0,
                minWidth: 'auto',
                px: 1.5,
                '&:hover': {
                  backgroundColor: 'var(--hover-bg)',
                },
              }}
            >
              {label}
            </Button>
          );
        })}

        <Box sx={{ width: 16, flexShrink: 0, borderLeft: '1px solid var(--card-border)', alignSelf: 'stretch', mx: 0.5 }} />

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

        {/* Navigation Buttons */}
        <Tooltip title="上一段區間">
          <IconButton
            size="small"
            onClick={() => {
              if (startDate && endDate) {
                const diff = endDate.getTime() - startDate.getTime();
                // Shift back by the current range duration (or 1 day if preferred, but range makes sense for "previous view")
                // User asked for "Forward/Backward X days". Let's stick to 1 day shift for granular control as per common dashboard UX, 
                // OR shift by the range length.
                // Let's implement shifting by 1 day as a safe default for "scrolling".
                const shiftMs = 24 * 60 * 60 * 1000;
                // Wait, if I'm looking at a week, moving 1 day is slow.
                // Let's use 20% of the range or 1 day, whichever is larger?
                // Actually, "control forward/backward few days" - let's do 1 day for now as requested by "few days".
                const ONE_DAY = 24 * 60 * 60 * 1000;
                onDateRangeChange({
                  selection: {
                    startDate: new Date(startDate.getTime() - ONE_DAY),
                    endDate: new Date(endDate.getTime() - ONE_DAY),
                  }
                });
              }
            }}
            sx={{ border: '1px solid var(--card-border)', mr: 1 }}
          >
            <Box component="span" sx={{ fontSize: '1.2rem', lineHeight: 1 }}>{'<'}</Box>
          </IconButton>
        </Tooltip>

        <Tooltip title="下一段區間">
          <IconButton
            size="small"
            onClick={() => {
              if (startDate && endDate) {
                const ONE_DAY = 24 * 60 * 60 * 1000;
                onDateRangeChange({
                  selection: {
                    startDate: new Date(startDate.getTime() + ONE_DAY),
                    endDate: new Date(endDate.getTime() + ONE_DAY),
                  }
                });
              }
            }}
            sx={{ border: '1px solid var(--card-border)', mr: 1 }}
          >
            <Box component="span" sx={{ fontSize: '1.2rem', lineHeight: 1 }}>{'>'}</Box>
          </IconButton>
        </Tooltip>

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

        <Box sx={{ display: 'flex', alignItems: 'center', ml: 1, pl: 1, borderLeft: '1px solid var(--card-border)' }}>
          <UserMenu showLabel size="small" />
        </Box>
      </Paper>

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
