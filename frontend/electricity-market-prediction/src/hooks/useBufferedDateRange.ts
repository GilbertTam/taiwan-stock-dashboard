'use client';

import { useEffect, useState } from 'react';

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

    if (newStart && newEnd && newStart.getTime() !== newEnd.getTime()) {
      setStartDate(newStart);
      setEndDate(newEnd);
      clearPreset();
    }
  };

  const onDateMenuClose = () => {
    // 只有在「開始與結束是不同日期」時，才在關閉彈窗時覆寫全域日期
    // 避免使用者已經選好一個完整區間後，又被最後一次單日點擊蓋掉成「只有開始日」
    if (
      tempStartDate &&
      tempEndDate &&
      tempStartDate.getTime() !== tempEndDate.getTime()
    ) {
      setStartDate(tempStartDate);
      setEndDate(tempEndDate);
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

