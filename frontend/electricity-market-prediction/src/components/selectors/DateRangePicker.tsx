'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Box, ButtonBase, Popover, Tooltip, Typography } from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { DateRange } from 'react-date-range';
import { zhTW } from 'date-fns/locale';
import { format, addDays } from 'date-fns';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

export interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  /**
   * Called when the user commits a new date range.
   * Both dates are normalized to 00:00:00.000 local time.
   * Called ONCE per complete user selection (never on intermediate state).
   */
  onChange: (startDate: Date, endDate: Date, preset: string | null) => void;
  isLoading?: boolean;
}

const BTN_H = 28;

function startOfDay(d: Date): Date {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}

const calendarPopoverSx = {
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
};

const calendarWrapperSx = {
  '& .rdrDateRangeWrapper':      { backgroundColor: 'var(--card-bg) !important' },
  '& .rdrDateRangePickerWrapper':{ backgroundColor: 'var(--card-bg) !important' },
  '& .rdrCalendarWrapper':       { backgroundColor: 'var(--card-bg) !important' },
};

/**
 * Date range picker with split start/end labels.
 *
 * Design: both labels open ONE shared DateRange calendar popover.
 * The calendar uses the same two-click selection as before, so there is
 * exactly ONE commitDateSelection call per range selection — no intermediate
 * commits that would trigger spurious simulations.
 */
export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  isLoading = false,
}) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [tempStart, setTempStart] = useState<Date | null>(startDate);
  const [tempEnd, setTempEnd] = useState<Date | null>(endDate);

  // true after the user's first click in the calendar (waiting for second click to close)
  const firstClickDoneRef = useRef(false);
  // prevent onClose from double-committing when we already closed programmatically
  const skipNextCloseRef = useRef(false);

  // Sync temp state when external selection changes (preset, arrow, etc.)
  useEffect(() => {
    setTempStart(startDate);
    setTempEnd(endDate);
  }, [startDate, endDate]);

  const openCalendar = (e: React.MouseEvent<HTMLElement>) => {
    firstClickDoneRef.current = false;
    skipNextCloseRef.current = false;
    setTempStart(startDate);
    setTempEnd(endDate);
    setAnchor(e.currentTarget);
  };

  const commitAndClose = (s: Date, e: Date) => {
    skipNextCloseRef.current = true;
    setAnchor(null);
    onChange(startOfDay(s), startOfDay(e), null);
  };

  const handleRangeChange = (ranges: any) => {
    const s = ranges.selection.startDate as Date;
    const e = ranges.selection.endDate as Date;
    setTempStart(s);
    setTempEnd(e);

    if (s && e) {
      const sameDay = s.getTime() === e.getTime();
      if (!sameDay) {
        // Two different dates selected — range is complete
        commitAndClose(s, e);
      } else if (firstClickDoneRef.current) {
        // Same day clicked twice — treat as single-day selection
        commitAndClose(s, s);
      } else {
        // First click on a day; wait for second click
        firstClickDoneRef.current = true;
      }
    }
  };

  const handleClose = () => {
    if (skipNextCloseRef.current) {
      skipNextCloseRef.current = false;
      return;
    }
    // Closed without completing (Escape / outside click):
    // commit whatever is currently selected in tempStart/tempEnd
    if (tempStart) {
      const s = startOfDay(tempStart);
      const e = tempEnd ? startOfDay(tempEnd) : s;
      onChange(s, e >= s ? e : s, null);
    }
    setAnchor(null);
  };

  const shiftDate = (dir: -1 | 1) => {
    if (!startDate || !endDate || isLoading) return;
    onChange(addDays(startDate, dir), addDays(endDate, dir), null);
  };

  const open = Boolean(anchor);

  const dateFieldSx = (active: boolean) => ({
    px: 1.25,
    height: '100%',
    display: 'inline-flex',
    alignItems: 'center',
    transition: 'background 0.12s',
    backgroundColor: active ? 'rgba(0,204,122,0.1)' : 'transparent',
    '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' },
  });

  const dateLabelSx = (active: boolean) => ({
    fontSize: 12,
    color: active ? 'var(--primary)' : 'var(--foreground)',
    fontFamily: 'monospace',
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
    letterSpacing: 0.3,
  });

  return (
    <>
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
        {/* Prev arrow */}
        <Tooltip title="上一天">
          <ButtonBase
            disableRipple
            onClick={() => shiftDate(-1)}
            disabled={isLoading}
            sx={{
              width: 26,
              height: '100%',
              color: 'var(--muted)',
              fontSize: 16,
              fontWeight: 300,
              borderRight: '1px solid var(--card-border)',
              transition: 'all 0.12s',
              '&:hover:not(:disabled)': { backgroundColor: 'rgba(255,255,255,0.07)', color: 'var(--foreground)' },
            }}
          >
            ‹
          </ButtonBase>
        </Tooltip>

        {/* Calendar icon */}
        <Box sx={{ display: 'flex', alignItems: 'center', pl: 0.75, pr: 0.25 }}>
          <CalendarTodayIcon sx={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }} />
        </Box>

        {/* Start date label — opens calendar */}
        <Tooltip title="選擇開始日期">
          <ButtonBase disableRipple onClick={openCalendar} sx={dateFieldSx(open)}>
            <Typography sx={dateLabelSx(open)}>
              {startDate ? format(startDate, 'MM/dd') : '--/--'}
            </Typography>
          </ButtonBase>
        </Tooltip>

        {/* Separator */}
        <Box component="span" sx={{ color: 'var(--muted)', fontSize: 12, userSelect: 'none' }}>
          –
        </Box>

        {/* End date label — also opens the same calendar */}
        <Tooltip title="選擇結束日期">
          <ButtonBase disableRipple onClick={openCalendar} sx={dateFieldSx(open)}>
            <Typography sx={dateLabelSx(open)}>
              {endDate ? format(endDate, 'MM/dd') : '--/--'}
            </Typography>
          </ButtonBase>
        </Tooltip>

        {/* Next arrow */}
        <Tooltip title="下一天">
          <ButtonBase
            disableRipple
            onClick={() => shiftDate(1)}
            disabled={isLoading}
            sx={{
              width: 26,
              height: '100%',
              color: 'var(--muted)',
              fontSize: 16,
              fontWeight: 300,
              borderLeft: '1px solid var(--card-border)',
              transition: 'all 0.12s',
              '&:hover:not(:disabled)': { backgroundColor: 'rgba(255,255,255,0.07)', color: 'var(--foreground)' },
            }}
          >
            ›
          </ButtonBase>
        </Tooltip>
      </Box>

      {/* Shared calendar popover */}
      <Popover
        open={open}
        anchorEl={anchor}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{ sx: calendarPopoverSx }}
      >
        <Box className="hdjp-date-range" sx={calendarWrapperSx}>
          <DateRange
            editableDateInputs={true}
            onChange={handleRangeChange}
            moveRangeOnFirstSelection={false}
            ranges={[{
              startDate: tempStart || new Date(),
              endDate: tempEnd || new Date(),
              key: 'selection',
            }]}
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
