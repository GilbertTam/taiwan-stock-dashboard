'use client';

import React, { useState, useRef } from 'react';
import {
  Box,
  Paper,
  ButtonBase,
  Tooltip,
  Popover,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { DateRange } from 'react-date-range';
import { zhTW } from 'date-fns/locale';
import { format } from 'date-fns';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { DateRangePicker } from '@/components/selectors/DateRangePicker';

export interface DownloadAction {
  label: string;
  onClick: () => void;
}

interface SimpleToolbarProps {
  /** When 'minimal', toolbar is hidden (nav is in the sidebar). */
  variant?: 'full' | 'minimal';
  startDate?: Date | null;
  endDate?: Date | null;
  dateRangePreset?: string | null;
  /** Legacy: used by pages still on useBufferedDateRange */
  onDateRangeChange?: (ranges: any) => void;
  onDateRangePreset?: (preset: string | null) => void;
  /** Legacy: used by pages still on useBufferedDateRange */
  onDateMenuClose?: () => void;
  /**
   * New API: called by DateRangePicker when the user commits a date selection.
   * When provided, renders DateRangePicker (split start/end inputs) instead of
   * the legacy single-range calendar.
   */
  onDateChange?: (startDate: Date, endDate: Date, preset: string | null) => void;
  onRefresh?: () => void;
  /** Page-specific download options (e.g. CSV, report). Rendered as single button or dropdown. */
  downloadActions?: DownloadAction[];
  /** Current tab key for highlight (price | market-info). Only relevant on forecast page. */
  currentTab?: string;
  isLoading?: boolean;
}

const DATE_PRESETS = [
  { key: '1D',          label: '1D'  },
  { key: '3D',          label: '3D'  },
  { key: 'week',        label: '1W'  },
  { key: 'twoWeeks',    label: '2W'  },
  { key: 'month',       label: '1M'  },
  { key: 'twoMonths',   label: '2M'  },
  { key: 'threeMonths', label: '3M'  },
];

// Shared button height
const BTN_H = 28;

export const DashboardToolbar: React.FC<SimpleToolbarProps> = ({
  variant = 'full',
  startDate = null,
  endDate = null,
  dateRangePreset = null,
  onDateRangeChange,
  onDateRangePreset,
  onDateMenuClose,
  onDateChange,
  onRefresh,
  downloadActions = [],
  isLoading = false,
}) => {
  const [dateAnchorEl, setDateAnchorEl] = useState<HTMLElement | null>(null);
  const [downloadAnchorEl, setDownloadAnchorEl] = useState<HTMLElement | null>(null);
  const firstClickDoneRef = useRef(false);

  // Minimal pages (settings/about) don't need a toolbar — sidebar handles navigation
  if (variant === 'minimal') return null;

  const handleDateClick = (event: React.MouseEvent<HTMLElement>) => {
    setDateAnchorEl(event.currentTarget);
    firstClickDoneRef.current = false;
  };

  const handleDateClose = () => {
    setDateAnchorEl(null);
    firstClickDoneRef.current = false;
    onDateMenuClose?.();
  };

  const openDateData = Boolean(dateAnchorEl);
  const idDateData = openDateData ? 'date-range-popover' : undefined;

  const shiftDate = (dir: -1 | 1) => {
    if (!startDate || !endDate) return;
    const ONE_DAY = 86_400_000;
    onDateRangeChange?.({
      selection: {
        startDate: new Date(startDate.getTime() + dir * ONE_DAY),
        endDate:   new Date(endDate.getTime()   + dir * ONE_DAY),
      },
    });
  };

  return (
    <Box component="span" sx={{ display: 'contents' }}>
      <Paper
        elevation={0}
        sx={{
          px: 1.5,
          py: 0.75,
          borderRadius: 1.5,
          border: '1px solid var(--card-border)',
          background: 'var(--card-bg)',
          mb: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          minHeight: 44,
        }}
      >
        {/* ── Date stepper: new split picker OR legacy range picker ── */}
        {onDateChange ? (
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={onDateChange}
            isLoading={isLoading}
          />
        ) : (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              height: BTN_H,
              border: '1px solid var(--card-border)',
              borderRadius: 1,
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {/* Prev */}
            <Tooltip title="上一天">
              <ButtonBase
                disableRipple
                onClick={() => shiftDate(-1)}
                sx={{
                  width: 26,
                  height: '100%',
                  color: 'var(--muted)',
                  fontSize: 16,
                  fontWeight: 300,
                  borderRight: '1px solid var(--card-border)',
                  transition: 'all 0.12s',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.07)', color: 'var(--foreground)' },
                }}
              >
                ‹
              </ButtonBase>
            </Tooltip>

            {/* Date display / open picker */}
            <ButtonBase
              disableRipple
              onClick={handleDateClick}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.625,
                px: 1.25,
                height: '100%',
                transition: 'background 0.12s',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' },
              }}
            >
              <CalendarTodayIcon sx={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }} />
              <Typography
                sx={{
                  fontSize: 12,
                  color: 'var(--foreground)',
                  fontFamily: 'monospace',
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                  letterSpacing: 0.3,
                }}
              >
                {startDate ? format(startDate, 'MM/dd') : '--/--'}
                <Box component="span" sx={{ color: 'var(--muted)', mx: 0.5 }}>–</Box>
                {endDate ? format(endDate, 'MM/dd') : '--/--'}
              </Typography>
            </ButtonBase>

            {/* Next */}
            <Tooltip title="下一天">
              <ButtonBase
                disableRipple
                onClick={() => shiftDate(1)}
                sx={{
                  width: 26,
                  height: '100%',
                  color: 'var(--muted)',
                  fontSize: 16,
                  fontWeight: 300,
                  borderLeft: '1px solid var(--card-border)',
                  transition: 'all 0.12s',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.07)', color: 'var(--foreground)' },
                }}
              >
                ›
              </ButtonBase>
            </Tooltip>
          </Box>
        )}

        {/* ── Preset chips ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          {DATE_PRESETS.map(({ key, label }) => {
            const active = dateRangePreset === key;
            return (
              <ButtonBase
                key={key}
                disableRipple
                onClick={() => onDateRangePreset?.(key)}
                sx={{
                  height: BTN_H,
                  px: 0.875,
                  borderRadius: 0.75,
                  fontSize: 11,
                  fontWeight: active ? 700 : 500,
                  fontFamily: 'monospace',
                  color: active ? 'var(--primary)' : 'var(--muted)',
                  backgroundColor: active ? 'rgba(0,204,122,0.12)' : 'transparent',
                  border: '1px solid',
                  borderColor: active ? 'rgba(0,204,122,0.3)' : 'transparent',
                  transition: 'all 0.12s',
                  '&:hover': {
                    backgroundColor: active ? 'rgba(0,204,122,0.18)' : 'rgba(255,255,255,0.06)',
                    color: active ? 'var(--primary)' : 'var(--foreground)',
                    borderColor: active ? 'rgba(0,204,122,0.4)' : 'rgba(255,255,255,0.1)',
                  },
                }}
              >
                {label}
              </ButtonBase>
            );
          })}
        </Box>

        {/* spacer */}
        <Box sx={{ flex: 1 }} />

        {/* ── Right action group ── */}
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            height: BTN_H,
            border: '1px solid var(--card-border)',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          {/* Refresh */}
          <Tooltip title="刷新數據">
            <span>
              <ButtonBase
                disableRipple
                onClick={() => onRefresh?.()}
                disabled={isLoading}
                sx={{
                  width: BTN_H,
                  height: BTN_H,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.12s',
                  opacity: isLoading ? 0.4 : 1,
                  borderRight: downloadActions.length > 0 ? '1px solid var(--card-border)' : 'none',
                  '&:hover:not(:disabled)': { backgroundColor: 'rgba(255,255,255,0.07)' },
                }}
              >
                <RefreshIcon
                  sx={{
                    fontSize: 14,
                    color: 'var(--muted)',
                    animation: isLoading ? 'spin 1s linear infinite' : 'none',
                    '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
                  }}
                />
              </ButtonBase>
            </span>
          </Tooltip>

          {/* Download — single action */}
          {downloadActions.length === 1 && (
            <Tooltip title={downloadActions[0].label}>
              <ButtonBase
                disableRipple
                onClick={downloadActions[0].onClick}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1,
                  height: BTN_H,
                  transition: 'all 0.12s',
                  '&:hover': { backgroundColor: 'rgba(0,204,122,0.1)' },
                }}
              >
                <DownloadIcon sx={{ fontSize: 13, color: 'var(--muted)' }} />
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', fontFamily: 'monospace' }}>
                  {downloadActions[0].label}
                </Typography>
              </ButtonBase>
            </Tooltip>
          )}

          {/* Download — multiple actions dropdown */}
          {downloadActions.length > 1 && (
            <>
              <ButtonBase
                disableRipple
                onClick={(e: React.MouseEvent<HTMLElement>) => setDownloadAnchorEl(e.currentTarget)}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1,
                  height: BTN_H,
                  transition: 'all 0.12s',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.07)' },
                }}
              >
                <DownloadIcon sx={{ fontSize: 13, color: 'var(--muted)' }} />
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', fontFamily: 'monospace' }}>
                  下載
                </Typography>
              </ButtonBase>
              <Menu
                anchorEl={downloadAnchorEl}
                open={Boolean(downloadAnchorEl)}
                onClose={() => setDownloadAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                  paper: {
                    sx: {
                      mt: 0.5,
                      backgroundColor: 'var(--card-bg)',
                      border: '1px solid var(--card-border)',
                      backgroundImage: 'none',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                    },
                  },
                }}
              >
                {downloadActions.map((action, idx) => (
                  <MenuItem
                    key={idx}
                    onClick={() => { action.onClick(); setDownloadAnchorEl(null); }}
                    sx={{ fontSize: 13 }}
                  >
                    {action.label}
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}
        </Box>
      </Paper>

      {/* ── Date picker popover ── */}
      <Popover
        id={idDateData}
        open={openDateData}
        anchorEl={dateAnchorEl}
        onClose={handleDateClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{
          sx: {
            mt: 0.75,
            p: 0,
            backgroundColor: 'var(--card-bg)',
            backgroundImage: 'none',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
            border: '1px solid var(--card-border)',
            borderRadius: 2,
            overflow: 'hidden',
          },
        }}
      >
        <Box
          className="hdjp-date-range"
          sx={{
            '& .rdrDateRangeWrapper':       { backgroundColor: 'var(--card-bg) !important' },
            '& .rdrDateRangePickerWrapper':  { backgroundColor: 'var(--card-bg) !important' },
            '& .rdrCalendarWrapper':         { backgroundColor: 'var(--card-bg) !important' },
          }}
        >
          <DateRange
            editableDateInputs={true}
            onChange={(ranges) => {
              const { startDate: s, endDate: e } = ranges.selection;
              onDateRangeChange?.(ranges);
              if (s && e) {
                if (s.getTime() !== e.getTime()) {
                  handleDateClose();
                } else if (firstClickDoneRef.current) {
                  handleDateClose();
                } else {
                  firstClickDoneRef.current = true;
                }
              }
            }}
            moveRangeOnFirstSelection={false}
            ranges={[{ startDate: startDate || new Date(), endDate: endDate || new Date(), key: 'selection' }]}
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
  );
};
