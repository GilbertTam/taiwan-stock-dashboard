import { startOfDay, addMinutes, differenceInMinutes } from 'date-fns';

/**
 * JEPX Market Rules:
 * - 48 periods per day (30 mins each)
 * - Period 1: 00:00 - 00:30
 * - Period 48: 23:30 - 24:00 (next day 00:00)
 */

export const JEPX_PERIOD_DURATION_MINUTES = 30;
export const JEPX_PERIODS_PER_DAY = 48;

/**
 * Calculates the JEPX time code (1-48) for a given date.
 * @param dateDate
 * @returns number (1-48)
 */
export function getJepxTimeCode(date: Date | string): number {
    const d = new Date(date);
    const start = startOfDay(d);
    const minutes = differenceInMinutes(d, start);
    return Math.floor(minutes / JEPX_PERIOD_DURATION_MINUTES) + 1;
}

/**
 * Returns the formatted time code string (e.g., "01", "48").
 */
export function formatJepxTimeCode(timeCode: number): string {
    return timeCode.toString().padStart(2, '0');
}

/**
 * Returns the start and end time for a specific time code on a given date.
 */
export function getTimeSlotRange(date: Date, timeCode: number): { start: Date; end: Date } {
    const dayStart = startOfDay(date);
    const minutesOffset = (timeCode - 1) * JEPX_PERIOD_DURATION_MINUTES;
    const start = addMinutes(dayStart, minutesOffset);
    const end = addMinutes(start, JEPX_PERIOD_DURATION_MINUTES);
    return { start, end };
}
