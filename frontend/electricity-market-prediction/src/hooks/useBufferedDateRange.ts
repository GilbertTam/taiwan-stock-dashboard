'use client';

import { useEffect, useRef, useState } from 'react';

interface UseBufferedDateRangeArgs {
  startDate: Date | null;
  endDate: Date | null;
  setStartDate: (d: Date | null) => void;
  setEndDate: (d: Date | null) => void;
  clearPreset: () => void;
  /**
   * Optional: when provided, called instead of setStartDate/setEndDate so that
   * selectionVersion in useMarketData increments and forces a re-fetch even
   * when the formatted dates match the previous selection.
   */
  commitDateSelection?: (start: Date, end: Date, preset: string | null) => void;
}

/**
 * Buffer date changes locally so we only commit (fetch-triggering) changes
 * when selection is completed (range has two different dates) or when the
 * popover closes.
 */
export function useBufferedDateRange({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  clearPreset,
  commitDateSelection,
}: UseBufferedDateRangeArgs) {
  const [tempStartDate, setTempStartDate] = useState<Date | null>(startDate);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(endDate);

  /** 剛在 onChange 裡提交過區間時，關閉彈窗不要再拿暫存覆寫（暫存仍是舊的） */
  const skipNextCloseCommitRef = useRef(false);

  // Sync local state with global state when global changes (e.g. presets).
  // Normalize to midnight so react-date-range sees identical timestamps for same-day
  // ranges — if we pass 00:00/23:59 the library treats it as a "completed range" and
  // extends it backward when clicking a date before the current start, instead of
  // starting a fresh single-day selection.
  useEffect(() => {
    if (startDate) { const d = new Date(startDate); d.setHours(0, 0, 0, 0); setTempStartDate(d); }
    else setTempStartDate(null);
    if (endDate) { const d = new Date(endDate); d.setHours(0, 0, 0, 0); setTempEndDate(d); }
    else setTempEndDate(null);
  }, [startDate, endDate]);

  const onDateRangeChange = (ranges: any) => {
    const newStart = ranges.selection.startDate as Date | null;
    const newEnd = ranges.selection.endDate as Date | null;
    setTempStartDate(newStart);
    setTempEndDate(newEnd);

    if (newStart && newEnd) {
      const isDifferentDays = newStart.getTime() !== newEnd.getTime();
      // Also commit single-day changes when the date actually moved (e.g. ‹ › arrows on 1D preset).
      // This differs from the calendar picker's first click where temp stays unchanged until commit.
      const isSingleDayShift = !isDifferentDays && (
        newStart.getTime() !== (tempStartDate?.getTime() ?? 0) ||
        newEnd.getTime()   !== (tempEndDate?.getTime()   ?? 0)
      );

      // Commit when the range is complete (two different days) or when it's a real single-day shift.
      // Normalize to start-of-day / end-of-day so the ISO-timestamp dateKey always matches
      // the dates produced by presets (which also use 00:00:00 / 23:59:59.999).  Without this,
      // the calendar's midnight endDate and the preset's 23:59 endDate produce different dateKeys
      // for the same calendar date, causing a cache-hit with an identical actualPrices reference
      // that React bails on, leaving waitingForDataRef stuck at true.
      if (isDifferentDays || isSingleDayShift) {
        const normStart = new Date(newStart); normStart.setHours(0, 0, 0, 0);
        const normEnd   = new Date(newEnd);   normEnd.setHours(23, 59, 59, 999);
        if (commitDateSelection) {
          commitDateSelection(normStart, normEnd, null);
        } else {
          setStartDate(normStart);
          setEndDate(normEnd);
          clearPreset();
        }
        skipNextCloseCommitRef.current = true; // 待會 onDateMenuClose 別再用暫存覆寫
      }
    }
  };

  const onDateMenuClose = () => {
    if (skipNextCloseCommitRef.current) {
      skipNextCloseCommitRef.current = false;
      return;
    }
    // 關閉彈窗時提交暫存（含單日選擇），此時才觸發載入
    if (tempStartDate && tempEndDate) {
      const normStart = new Date(tempStartDate); normStart.setHours(0, 0, 0, 0);
      const normEnd   = new Date(tempEndDate);   normEnd.setHours(23, 59, 59, 999);
      if (commitDateSelection) {
        commitDateSelection(normStart, normEnd, null);
      } else {
        setStartDate(normStart);
        setEndDate(normEnd);
        clearPreset();
      }
    }
  };

  return {
    tempStartDate,
    tempEndDate,
    setTempStartDate,
    setTempEndDate,
    onDateRangeChange,
    onDateMenuClose,
  };
}

