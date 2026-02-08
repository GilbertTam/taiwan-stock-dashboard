/**
 * @fileoverview Date Range Hook
 *
 * Manages date range selection state for dashboard queries.
 * Supports presets (week, month, etc.) and custom date selection.
 */

import { useState, useCallback } from 'react';
import { subDays, subMonths, addMonths } from 'date-fns';

/** Date range preset identifiers */
export type DateRangePreset = '1D' | '3D' | 'week' | 'twoWeeks' | 'month' | 'twoMonths' | 'threeMonths' | 'sixMonths' | 'year' | 'all' | null;

/** Return type for useDateRange hook */
export interface UseDateRangeReturn {
    startDate: Date | null;
    endDate: Date | null;
    dateRangePreset: string | null;
    setStartDate: React.Dispatch<React.SetStateAction<Date | null>>;
    setEndDate: React.Dispatch<React.SetStateAction<Date | null>>;
    setDateRangePreset: React.Dispatch<React.SetStateAction<string | null>>;
    handleDateRangePreset: (preset: string | null) => void;
    handleMoveMonthBackward: () => void;
    handleMoveMonthForward: () => void;
}

/**
 * Custom hook for managing date range state.
 *
 * @param initialPreset - Initial date range preset (default: 'week')
 * @returns Date range state and handlers
 */
export const useDateRange = (initialPreset: DateRangePreset = 'week'): UseDateRangeReturn => {
    // Calculate initial dates based on preset
    const getInitialDates = () => {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const start = subDays(today, initialPreset === 'week' ? 7 : 7);
        start.setHours(0, 0, 0, 0);
        return { start, end: today };
    };

    const initial = getInitialDates();
    const [startDate, setStartDate] = useState<Date | null>(initial.start);
    const [endDate, setEndDate] = useState<Date | null>(initial.end);
    const [dateRangePreset, setDateRangePreset] = useState<string | null>(initialPreset);

    /**
     * Apply a date range preset.
     */
    const handleDateRangePreset = useCallback((preset: string | null) => {
        if (!preset) {
            setDateRangePreset(null);
            return;
        }
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        let start: Date;
        switch (preset) {
            case '1D': start = subDays(today, 1); break;
            case '3D': start = subDays(today, 3); break;
            case 'week': start = subDays(today, 7); break;
            case 'twoWeeks': start = subDays(today, 14); break;
            case 'month': start = subMonths(today, 1); break;
            case 'twoMonths': start = subMonths(today, 2); break;
            case 'threeMonths': start = subMonths(today, 3); break;
            case 'sixMonths': start = subMonths(today, 6); break;
            case 'year': start = subMonths(today, 12); break;
            case 'all': start = subMonths(today, 24); break;
            default: start = subDays(today, 7);
        }
        start.setHours(0, 0, 0, 0);
        setStartDate(start);
        setEndDate(today);
        setDateRangePreset(preset);
    }, []);

    /**
     * Move date range one month backward.
     */
    const handleMoveMonthBackward = useCallback(() => {
        if (startDate && endDate) {
            setStartDate(subMonths(startDate, 1));
            setEndDate(subMonths(endDate, 1));
            setDateRangePreset(null);
        }
    }, [startDate, endDate]);

    /**
     * Move date range one month forward.
     */
    const handleMoveMonthForward = useCallback(() => {
        if (startDate && endDate) {
            setStartDate(addMonths(startDate, 1));
            setEndDate(addMonths(endDate, 1));
            setDateRangePreset(null);
        }
    }, [startDate, endDate]);

    return {
        startDate,
        endDate,
        dateRangePreset,
        setStartDate,
        setEndDate,
        setDateRangePreset,
        handleDateRangePreset,
        handleMoveMonthBackward,
        handleMoveMonthForward,
    };
};
