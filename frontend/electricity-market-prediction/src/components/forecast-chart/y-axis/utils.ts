import { YAxisRange } from './types';

// Depending on the user's data structures, we'll assume a generic DataSource type:
export interface DataSource {
    id?: string;
    values: number[];
}

/**
 * Calculates a reasonable default Y-axis range based on a list of data sources.
 * It ignores NaN and Infinity values, and adds a 10% padding boundary.
 * If there is no valid data, defaults to 0-100.
 */
export function calculateDefaultRange(dataSources: DataSource[]): YAxisRange {
    try {
        const allValues = dataSources.flatMap((ds) => ds.values);

        if (allValues.length === 0) {
            return { min: 0, max: 100 };
        }

        // Filter valid numbers
        const validValues = allValues.filter((v) => Number.isFinite(v) && !Number.isNaN(v));

        if (validValues.length === 0) {
            return { min: 0, max: 100 };
        }

        const min = Math.min(...validValues);
        const max = Math.max(...validValues);

        // If all values are identical
        if (min === max) {
            const padding = Math.abs(min) * 0.1 || 1;
            return {
                min: min - padding,
                max: max + padding,
            };
        }

        // Normal case with padding
        const padding = (max - min) * 0.1;
        return {
            min: min - padding,
            max: max + padding,
        };
    } catch (error) {
        if (process.env.NODE_ENV !== 'test') {
            console.error('Failed to calculate default range', error);
        }
        return { min: 0, max: 100 };
    }
}
