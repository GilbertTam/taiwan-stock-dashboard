import React from 'react';
import { Box, Typography } from '@mui/material';
import { usePriceChart } from '../../context/PriceChartContext';
import { occtoStackedFields, weatherFields } from '../../constants';

export const ChartLegend: React.FC = () => {
    const {
        modelColorMap,
        selectedModels,
        showImbalance,
        showIntraday,
        showIntradayAverage,
        showInterconnection,
        showOcctoArea,
        selectedOcctoFields,
        showWeather,
        showWeatherActual,
        showWeatherForecast,
        selectedWeatherFieldsActual,
        selectedWeatherFieldsForecast,
        colors,
        areaName
    } = usePriceChart();

    const LegendItem = ({ color, label, type = 'line', opacity = 1 }: { color: string; label: string; type?: 'line' | 'dashed' | 'box' | 'circle' | 'candlestick' | 'split-line'; opacity?: number }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {type === 'line' && <Box sx={{ width: '12px', height: '2px', bgcolor: color, opacity }} />}
            {type === 'dashed' && <Box sx={{ width: '12px', height: '2px', bgcolor: color, borderStyle: 'dashed', borderBottom: '2px dashed', opacity }} />}
            {type === 'split-line' && (
                <Box sx={{ display: 'flex', width: '12px', height: '2px', opacity }}>
                    <Box sx={{ width: '6px', height: '100%', bgcolor: color }} />
                    <Box sx={{ width: '6px', height: '100%', bgcolor: color, borderStyle: 'dashed', borderBottom: '2px dashed' }} />
                </Box>
            )}
            {type === 'box' && <Box sx={{ width: '10px', height: '10px', bgcolor: color, opacity, borderRadius: 0.5 }} />}
            {type === 'circle' && <Box sx={{ width: '8px', height: '8px', borderRadius: '50%', bgcolor: color, opacity }} />}
            {type === 'candlestick' && (
                <Box sx={{ width: '12px', height: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Box sx={{ width: '1px', height: '12px', bgcolor: color, position: 'absolute' }} />
                    <Box sx={{ width: '6px', height: '8px', bgcolor: color, zIndex: 1 }} />
                </Box>
            )}
            <Typography sx={{ fontSize: 11, color: 'var(--foreground)', whiteSpace: 'nowrap' }}>
                {label}
            </Typography>
        </Box>
    );

    const GroupSeparator = ({ label }: { label: string }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', mx: 1 }}>
            <Box sx={{ width: '1px', height: '12px', bgcolor: 'var(--card-border)', mr: 1 }} />
            <Typography sx={{ fontSize: 10, color: 'var(--muted-foreground)', fontWeight: 500 }}>
                {label}
            </Typography>
        </Box>
    );

    return (
        <Box sx={{
            px: 2,
            py: 1.5,
            borderTop: '1px solid var(--card-border)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            backgroundColor: 'var(--card-bg)',
            alignItems: 'center',
            fontSize: '11px',
            minHeight: '40px',
            rowGap: 1
        }}>
            {/* --- Price Section --- */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <LegendItem color={colors.actual} label="現貨實際價格" />
                {selectedModels.map(model => (
                    <LegendItem
                        key={model.id}
                        color={modelColorMap[`${model.id}|${model.name}`] || model.color}
                        label={model.name}
                    />
                ))}
            </Box>

            {/* --- Intraday Section --- */}
            {(showIntraday || showIntradayAverage || showImbalance || showInterconnection) && (
                <>
                    <GroupSeparator label="市場" />
                    {showIntraday && <LegendItem color={colors.intraday} label="即時" type="candlestick" />}
                    {showIntradayAverage && <LegendItem color="#ffa726" label="即時(平均)" type="dashed" />}
                    {showImbalance && <LegendItem color={colors.imbalance} label="不平衡值" />}
                    {showInterconnection && <LegendItem color={colors.interconnection} label="互連流量" />}
                </>
            )}

            {/* --- OCCTO Section --- */}
            {showOcctoArea && selectedOcctoFields.size > 0 && (
                <>
                    <GroupSeparator label="OCCTO" />
                    {occtoStackedFields
                        .filter(f => selectedOcctoFields.has(f.key))
                        .map(f => (
                            <LegendItem key={f.key} color={f.color} label={f.label} type="box" />
                        ))
                    }
                </>
            )}

            {/* --- Weather Section --- */}
            {(showWeather || showWeatherActual || showWeatherForecast) && (
                <>
                    <GroupSeparator label="天氣" />
                    {weatherFields.map(f => {
                        const hasActual = showWeatherActual && selectedWeatherFieldsActual.has(f.value);
                        const hasForecast = showWeatherForecast && selectedWeatherFieldsForecast.has(f.value);

                        if (hasActual && hasForecast) {
                            return <LegendItem key={f.value} color={f.color} label={f.label} type="split-line" />;
                        }
                        if (hasActual) {
                            return <LegendItem key={f.value} color={f.color} label={f.label} />;
                        }
                        if (hasForecast) {
                            return <LegendItem key={f.value} color={f.color} label={`${f.label} (預)`} type="dashed" opacity={0.7} />;
                        }
                        return null;
                    })}
                </>
            )}
        </Box>
    );
};
