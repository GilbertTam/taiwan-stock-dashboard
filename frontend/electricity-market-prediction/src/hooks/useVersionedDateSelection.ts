'use client';

import { useState, useRef, useCallback } from 'react';
import { subDays, subMonths } from 'date-fns';
import { DateRangeSelection } from '@/types/dateRange';

interface UseVersionedDateSelectionOptions {
  /** Initial preset key to apply on mount (defaults to 'week') */
  initialPreset?: string;
}

export interface UseVersionedDateSelectionReturn {
  selection: DateRangeSelection;
  /** Commit a new date range. Both dates normalized to startOfDay. Version auto-increments. */
  commit: (startDate: Date, endDate: Date, preset: string | null) => void;
  /** Apply a named preset (same keys as handleDateRangePreset). */
  applyPreset: (presetKey: string) => void;
  /** Shift both dates by N days (positive = forward, negative = backward). */
  shiftByDays: (days: number) => void;
}

function startOfDay(d: Date): Date {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}

function buildPresetDates(preset: string): { start: Date; end: Date } {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  let start: Date;
  switch (preset) {
    case '1D':          start = new Date(today); break;
    case '3D':          start = subDays(today, 2); break;
    case 'week':        start = subDays(today, 6); break;
    case 'twoWeeks':    start = subDays(today, 13); break;
    case 'month':       start = subMonths(today, 1); break;
    case 'twoMonths':   start = subMonths(today, 2); break;
    case 'threeMonths': start = subMonths(today, 3); break;
    case 'sixMonths':   start = subMonths(today, 6); break;
    case 'year':        start = subMonths(today, 12); break;
    case 'all':         start = subMonths(today, 24); break;
    default:            start = subDays(today, 6);
  }
  return { start: startOfDay(start), end: startOfDay(today) };
}

export function useVersionedDateSelection(
  options: UseVersionedDateSelectionOptions = {}
): UseVersionedDateSelectionReturn {
  const { initialPreset = 'week' } = options;
  const versionRef = useRef(0);

  const [selection, setSelection] = useState<DateRangeSelection>(() => {
    const { start, end } = buildPresetDates(initialPreset);
    return { startDate: start, endDate: end, version: 0, preset: initialPreset };
  });

  const commit = useCallback((startDate: Date, endDate: Date, preset: string | null) => {
    versionRef.current += 1;
    setSelection({
      startDate: startOfDay(startDate),
      endDate: startOfDay(endDate),
      version: versionRef.current,
      preset,
    });
  }, []);

  const applyPreset = useCallback((presetKey: string) => {
    const { start, end } = buildPresetDates(presetKey);
    versionRef.current += 1;
    setSelection({
      startDate: start,
      endDate: end,
      version: versionRef.current,
      preset: presetKey,
    });
  }, []);

  const shiftByDays = useCallback((days: number) => {
    setSelection(prev => {
      versionRef.current += 1;
      return {
        startDate: new Date(prev.startDate.getTime() + days * 86_400_000),
        endDate: new Date(prev.endDate.getTime() + days * 86_400_000),
        version: versionRef.current,
        preset: null,
      };
    });
  }, []);

  return { selection, commit, applyPreset, shiftByDays };
}
