'use client';

import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
    Box,
    alpha
} from '@mui/material';
import { format } from 'date-fns';
import { WEATHER_FIELD_DISPLAY, DAILY_CATEGORIES } from '@/constants/weatherCategories';
import { formatInTimezone, dateToJstTimestamp } from '@/utils/chart/dates';
import { weatherFields } from '../price-chart/constants';

interface WeatherDataTableProps {
    data: any[];
    selectedFieldsActual: Set<string>;
    selectedFieldsForecast: Set<string>;
    darkMode: boolean;
    colors: any;
    startDate: Date | null;
    endDate: Date | null;
}

export const WeatherDataTable: React.FC<WeatherDataTableProps> = ({
    data,
    selectedFieldsActual,
    selectedFieldsForecast,
    darkMode,
    colors,
    startDate,
    endDate
}) => {
    if (!data || data.length === 0) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                    無資料可顯示 (No data to display)
                </Typography>
            </Box>
        );
    }

    const isDailyField = (field: string) => {
        return DAILY_CATEGORIES.some(cat => cat.fields.includes(field));
    };

    const getFieldLabel = (field: string, isForecast: boolean) => {
        const display = WEATHER_FIELD_DISPLAY[field];
        const baseLabel = display?.shortLabel || field;
        const typeStr = isForecast ? '預測' : '實測';
        const freqStr = isDailyField(field) ? '日' : '時';
        return `[${typeStr}·${freqStr}] ${baseLabel} (${display?.unit || ''})`;
    };

    // Filter out points that don't have ANY weather data, AND fit within the selected date range in JST
    const startTs = dateToJstTimestamp(startDate);
    const endTs = dateToJstTimestamp(endDate);

    const weatherDataPoints = data.filter(p => {
        const hasData = (p.weather_data_actual && Object.keys(p.weather_data_actual).length > 0) ||
            (p.weather_data_forecast && Object.keys(p.weather_data_forecast).length > 0);

        if (!hasData) return false;
        if (!startTs || !endTs) return true;

        return p.timestamp >= startTs && p.timestamp <= endTs;
    });

    const activeActual = Array.from(selectedFieldsActual);
    const activeForecast = Array.from(selectedFieldsForecast);

    if (activeActual.length === 0 && activeForecast.length === 0) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                    請在左側勾選欲顯示的天氣項目 (Please select weather items to display)
                </Typography>
            </Box>
        );
    }

    return (
        <TableContainer
            component={Paper}
            variant="outlined"
            sx={{
                height: '100%',
                overflow: 'auto',
                bgcolor: 'var(--card-bg)',
                borderColor: 'var(--card-border)',
                borderRadius: 1,
                '&::-webkit-scrollbar': { width: 8, height: 8 },
                '&::-webkit-scrollbar-thumb': {
                    bgcolor: alpha(colors.subText || '#888', 0.2),
                    borderRadius: 4
                }
            }}
        >
            <Table stickyHeader size="small" sx={{ minWidth: 650 }}>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ bgcolor: 'var(--card-bg)', fontWeight: 'bold', borderBottom: `2px solid ${colors.grid}` }}>
                            時間 (Time)
                        </TableCell>
                        {activeActual.map(field => {
                            const scalePattern = /_(\d+m?|0_to_7cm|7_to_28cm|28_to_100cm|100_to_255cm|0_to_100cm|max|min|mean|sum)$/;
                            const baseFieldName = field.replace(scalePattern, '');
                            const weatherConfig = weatherFields.find(w => w.value === field || w.value === baseFieldName);
                            const color = weatherConfig?.color || '#888';

                            return (
                                <TableCell
                                    key={`head-act-${field}`}
                                    sx={{
                                        bgcolor: 'var(--card-bg)',
                                        fontWeight: 'bold',
                                        borderBottom: `2px solid ${colors.grid}`,
                                        color: color
                                    }}
                                >
                                    {getFieldLabel(field, false)}
                                </TableCell>
                            );
                        })}
                        {activeForecast.map(field => {
                            const scalePattern = /_(\d+m?|0_to_7cm|7_to_28cm|28_to_100cm|100_to_255cm|0_to_100cm|max|min|mean|sum)$/;
                            const baseFieldName = field.replace(scalePattern, '');
                            const weatherConfig = weatherFields.find(w => w.value === field || w.value === baseFieldName);
                            const color = weatherConfig?.color || '#888';

                            return (
                                <TableCell
                                    key={`head-fcst-${field}`}
                                    sx={{
                                        bgcolor: 'var(--card-bg)',
                                        fontWeight: 'bold',
                                        borderBottom: `2px solid ${colors.grid}`,
                                        color: alpha(color, 0.7)
                                    }}
                                >
                                    {getFieldLabel(field, true)}
                                </TableCell>
                            );
                        })}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {weatherDataPoints.map((row, idx) => (
                        <TableRow
                            key={row.timestamp}
                            sx={{
                                '&:hover': { bgcolor: alpha(colors.actual, 0.05) },
                                bgcolor: idx % 2 === 0 ? 'transparent' : alpha(colors.subText || '#888', 0.02)
                            }}
                        >
                            <TableCell sx={{ fontFamily: 'Monospace', fontSize: '0.85rem' }}>
                                {formatInTimezone(row.timestamp, 'Asia/Tokyo', {
                                    year: 'numeric', month: '2-digit', day: '2-digit',
                                    hour: '2-digit', minute: '2-digit', hour12: false
                                }).replace(',', '')}
                            </TableCell>
                            {activeActual.map(field => {
                                const val = row.weather_data_actual?.[field];
                                return (
                                    <TableCell key={`cell-act-${field}`}>
                                        {val != null ? val.toFixed(field.includes('temp') || field.includes('wind') ? 1 : 0) : '-'}
                                    </TableCell>
                                );
                            })}
                            {activeForecast.map(field => {
                                const val = row.weather_data_forecast?.[field];
                                return (
                                    <TableCell key={`cell-fcst-${field}`}>
                                        {val != null ? val.toFixed(field.includes('temp') || field.includes('wind') ? 1 : 0) : '-'}
                                    </TableCell>
                                );
                            })}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};
