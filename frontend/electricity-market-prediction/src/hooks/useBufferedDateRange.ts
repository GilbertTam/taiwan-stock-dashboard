'use client';

import { useEffect, useRef, useState } from 'react';

interface UseBufferedDateRangeArgs {
  startDate: Date | null;
  endDate: Date | null;
  setStartDate: (d: Date | null) => void;
  setEndDate: (d: Date | null) => void;
  clearPreset: () => void;
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
}: UseBufferedDateRangeArgs) {
  const [tempStartDate, setTempStartDate] = useState<Date | null>(startDate);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(endDate);

  /** 剛在 onChange 裡提交過區間時，關閉彈窗不要再拿暫存覆寫（暫存仍是舊的） */
  const skipNextCloseCommitRef = useRef(false);

  // Sync local state with global state when global changes (e.g. presets)
  useEffect(() => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
  }, [startDate, endDate]);

  const onDateRangeChange = (ranges: any) => {
    const newStart = ranges.selection.startDate as Date | null;
    const newEnd = ranges.selection.endDate as Date | null;
    setTempStartDate(newStart);
    setTempEndDate(newEnd);

    // 只有選完「區間」（起訖不同日）才提交，避免只點開始日就觸發載入
    if (newStart && newEnd && newStart.getTime() !== newEnd.getTime()) {
      setStartDate(newStart);
      setEndDate(newEnd);
      clearPreset();
      skipNextCloseCommitRef.current = true; // 待會 onDateMenuClose 別再用暫存覆寫
    }
  };

  const onDateMenuClose = () => {
    if (skipNextCloseCommitRef.current) {
      skipNextCloseCommitRef.current = false;
      return;
    }
    // 關閉彈窗時提交暫存（含單日選擇），此時才觸發載入
    if (tempStartDate && tempEndDate) {
      setStartDate(tempStartDate);
      setEndDate(tempEndDate);
      clearPreset();
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

