import { startOfDay, format } from 'date-fns';

/**
 * Generates ticks for the X-axis based on the time range of the data.
 * @param processedChartData Array of chart data objects containing a 'timestamp' field.
 * @returns Array of timestamp numbers representing tick positions.
 */
export const generateXAxisTicks = (processedChartData: any[]) => {
    if (!processedChartData || processedChartData.length === 0) return [];

    const startTime = processedChartData[0].timestamp;
    const endTime = processedChartData[processedChartData.length - 1].timestamp;
    const duration = endTime - startTime;
    const hoursTotal = duration / (1000 * 60 * 60);

    let intervalHours = 3;
    if (hoursTotal > 48) intervalHours = 6;
    if (hoursTotal > 96) intervalHours = 12;
    if (hoursTotal > 168) intervalHours = 24;

    const ticks: number[] = [];
    let current = startOfDay(new Date(startTime)).getTime();

    // Adjust start
    while (current < startTime) {
        current += intervalHours * 60 * 60 * 1000;
    }

    while (current <= endTime) {
        ticks.push(current);
        current += intervalHours * 60 * 60 * 1000;
    }

    return ticks;
};

/**
 * Formats the X-axis tick labels.
 * @param value Timestamp or date string.
 * @returns Formatted date string (HH:mm or MM/dd).
 */
export const formatXAxis = (value: string | number) => {
    if (value === null || value === undefined) return '';
    let date: Date;
    if (typeof value === 'number') {
        date = new Date(value);
    } else {
        try {
            const isoString = value.includes('T') ? value : value.replace(' ', 'T');
            date = new Date(isoString);
        } catch (e) { return ''; }
    }
    if (isNaN(date.getTime())) return '';

    const hour = date.getHours();
    const minute = date.getMinutes();
    if (hour === 0 && minute === 0) {
        return format(date, 'MM/dd');
    }
    return format(date, 'HH:mm');
};
