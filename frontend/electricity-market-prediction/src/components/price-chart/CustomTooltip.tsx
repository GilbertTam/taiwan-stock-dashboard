import React, { useMemo } from 'react';
import { Paper, Box, Typography, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import { format } from 'date-fns';
import { occtoFields, occtoStackedFields } from './constants';
import { ModelPrediction } from '@/utils/chartUtils';
import InfoIcon from '@mui/icons-material/Info';

export const CustomTooltip = ({
    active,
    payload,
    label,
    processedChartData,
    adjacentPointsCount,
    colors,
    areaName,
    selectedModels,
    modelColorMap,
    showIntraday,
    showImbalance,
    showInterconnection,
    showOcctoArea,
    selectedOcctoField,
    selectedOcctoFields,
    occtoChartType
}: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const formattedDateTime = format(new Date(data.timestamp), 'MM/dd HH:mm');

        const currentIndex = processedChartData.findIndex((p: any) => p.timestamp === data.timestamp);
        const startIndex = Math.max(0, currentIndex - adjacentPointsCount);
        const endIndex = Math.min(processedChartData.length - 1, currentIndex + adjacentPointsCount);

        const displayPoints = [];
        for (let i = startIndex; i <= endIndex; i++) {
            displayPoints.push({
                data: processedChartData[i],
                isCurrent: i === currentIndex
            });
        }

        const pointWidth = 110;
        const baseWidth = 120;
        const availableWidth = Math.min(window.innerWidth * 0.95 - 40, 1200);
        const maxPoints = Math.floor((availableWidth - baseWidth) / pointWidth);
        const maxDisplayPoints = Math.max(3, maxPoints);

        const actualDisplayPoints = displayPoints.length > maxDisplayPoints
            ? displayPoints.slice(0, maxDisplayPoints)
            : displayPoints;


        const formatTimeDisplay = (value: string | number) => {
            if (value === null || value === undefined) return '';
            try {
                if (typeof value === 'number') {
                    return format(new Date(value), 'HH:mm');
                }
                if (typeof value === 'string') {
                    const date = new Date(value.replace(' ', 'T'));
                    if (!isNaN(date.getTime())) {
                        return format(date, 'HH:mm');
                    }
                }
            } catch (e) { return ''; }
            return '';
        };

        return (
            <Paper elevation={3} sx={{
                p: 1,
                backgroundColor: colors.tooltipBg,
                color: colors.text,
                border: `1px solid ${colors.tooltipBorder}`,
                pointerEvents: 'auto'
            }}>

                <Box sx={{
                    backgroundColor: colors.tooltipHeaderBg,
                    p: 1,
                    borderBottom: `1px solid ${colors.tooltipBorder}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ borderBottom: `1px solid ${colors.tooltipBorder}`, pb: 0.5, mb: 0.5 }}>
                        {`${areaName} - ${formattedDateTime}`}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <InfoIcon fontSize="small" sx={{ color: colors.subText }} />
                        <Typography variant="caption" sx={{ color: colors.subText }}>
                            {`Beginning of period`}
                        </Typography>
                    </Box>
                </Box>

                {displayPoints.length > maxDisplayPoints && (
                    <Typography variant="caption" sx={{ px: 2, py: 0.5, color: colors.warning, display: 'block' }}>
                        顯示 {actualDisplayPoints.length}/{displayPoints.length} 個時間點。滑動圖表查看更多。
                    </Typography>
                )}

                <Box sx={{ overflowX: 'auto', width: '100%' }}>
                    <Table size="small" sx={{
                        minWidth: `${actualDisplayPoints.length * 100}px`,
                        '& .MuiTableCell-root': {
                            borderBottom: 'none',
                            py: 0.5,
                            px: 1.5,
                            minWidth: '90px',
                            whiteSpace: 'nowrap'
                        }
                    }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ color: colors.subText, width: '100px', minWidth: '100px' }}>Date/Time:</TableCell>
                                {actualDisplayPoints.map((point, index) => {
                                    return (
                                        <TableCell
                                            key={`time-${index}`}
                                            align="center"
                                            sx={{
                                                color: colors.text,
                                                fontWeight: point.isCurrent ? 'bold' : 'normal',
                                                backgroundColor: point.isCurrent ? 'rgba(255,255,255,0.05)' : 'transparent',
                                                width: '80px',
                                                minWidth: '80px'
                                            }}
                                        >
                                            {formatTimeDisplay(point.data.timestamp || point.data.dateTime)}
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {/* Models Forecast */}
                            {selectedModels.map((model: any, index: number) => {
                                const modelKey = `${model.id}|${model.name}`;
                                const modelColor = modelColorMap[modelKey];

                                return (
                                    <TableRow key={`model-${modelKey}-${index}`}>
                                        <TableCell sx={{ color: modelColor }}>
                                            {`${model.name}:`}
                                            <Typography variant="caption" display="block" sx={{ color: colors.subText }}>
                                                {model.calculatingDate === 'latest' ? '(最新)' : `(${model.calculatingDate})`}
                                            </Typography>
                                        </TableCell>
                                        {actualDisplayPoints.map((point, index) => {
                                            const modelPrediction = point.data.modelPredictions.find(
                                                (mp: ModelPrediction) => `${mp.modelId}|${mp.modelName}` === modelKey
                                            );

                                            return (
                                                <TableCell
                                                    key={`forecast-${modelKey}-${index}`}
                                                    align="center"
                                                    sx={{
                                                        color: modelColor,
                                                        fontWeight: point.isCurrent ? 'bold' : 'normal',
                                                        backgroundColor: point.isCurrent ? 'rgba(255,255,255,0.05)' : 'transparent'
                                                    }}
                                                >
                                                    {modelPrediction?.predictedPrice !== null && modelPrediction?.predictedPrice !== undefined
                                                        ? modelPrediction.predictedPrice.toFixed(2)
                                                        : '-'}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                );
                            })}

                            {/* Models Diff */}
                            {selectedModels.map((model: any, index: number) => {
                                const modelKey = `${model.id}|${model.name}`;

                                return (
                                    <TableRow key={`diff-${modelKey}-${index}`}>
                                        <TableCell sx={{
                                            color: model.color || colors.subText
                                        }}>
                                            {`${model.name} Δ:`}
                                        </TableCell>
                                        {actualDisplayPoints.map((point, index) => {
                                            const difference = point.data.modelDifferences?.[modelKey];

                                            return (
                                                <TableCell
                                                    key={`diff-${modelKey}-${index}`}
                                                    align="center"
                                                    sx={{
                                                        color: (difference ?? 0) > 0
                                                            ? colors.delta.positive
                                                            : (difference ?? 0) < 0
                                                                ? colors.delta.negative
                                                                : colors.delta.neutral,
                                                        fontWeight: point.isCurrent ? 'bold' : 'normal',
                                                        backgroundColor: point.isCurrent ? 'rgba(255,255,255,0.05)' : 'transparent'
                                                    }}
                                                >
                                                    {difference !== null && difference !== undefined
                                                        ? difference.toFixed(2)
                                                        : '-'}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                );
                            })}

                            {/* Actual Price */}
                            <TableRow>
                                <TableCell sx={{ color: colors.actual }}>Observation:</TableCell>
                                {actualDisplayPoints.map((point, index) => (
                                    <TableCell
                                        key={`actual-${index}`}
                                        align="center"
                                        sx={{
                                            color: colors.actual,
                                            fontWeight: point.isCurrent ? 'bold' : 'normal',
                                            backgroundColor: point.isCurrent ? 'rgba(255,255,255,0.05)' : 'transparent'
                                        }}
                                    >
                                        {point.data.actualPrice !== null
                                            ? point.data.actualPrice.toFixed(2)
                                            : '-'}
                                    </TableCell>
                                ))}
                            </TableRow>

                            {/* Actual Delta */}
                            <TableRow>
                                <TableCell sx={{ color: colors.subText }}>Actual Delta:</TableCell>
                                {actualDisplayPoints.map((point, index) => (
                                    <TableCell
                                        key={`actualDelta-${index}`}
                                        align="center"
                                        sx={{
                                            color: (point.data.actualDelta ?? 0) > 0
                                                ? colors.delta.positive
                                                : (point.data.actualDelta ?? 0) < 0
                                                    ? colors.delta.negative
                                                    : colors.delta.neutral,
                                            fontWeight: point.isCurrent ? 'bold' : 'normal',
                                            backgroundColor: point.isCurrent ? 'rgba(255,255,255,0.05)' : 'transparent'
                                        }}
                                    >
                                        {point.data.actualDelta !== null && point.data.actualDelta !== undefined
                                            ? point.data.actualDelta.toFixed(2)
                                            : '-'}
                                    </TableCell>
                                ))}
                            </TableRow>

                            {/* Intraday */}
                            {showIntraday && (
                                <TableRow>
                                    <TableCell sx={{ color: colors.intraday }}>Intraday Avg:</TableCell>
                                    {actualDisplayPoints.map((point, index) => (
                                        <TableCell key={`intraday-${index}`} align="center" sx={{ color: colors.intraday, fontWeight: point.isCurrent ? 'bold' : 'normal', backgroundColor: point.isCurrent ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
                                            {point.data.intraday_average !== null && point.data.intraday_average !== undefined
                                                ? point.data.intraday_average.toFixed(2)
                                                : '-'}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            )}

                            {/* Imbalance */}
                            {showImbalance && (
                                <TableRow>
                                    <TableCell sx={{ color: colors.imbalance }}>Imbalance Quantity:</TableCell>
                                    {actualDisplayPoints.map((point, index) => (
                                        <TableCell
                                            key={`imbalance-${index}`}
                                            align="center"
                                            sx={{
                                                color: colors.imbalance,
                                                fontWeight: point.isCurrent ? 'bold' : 'normal',
                                                backgroundColor: point.isCurrent ? 'rgba(255,255,255,0.05)' : 'transparent'
                                            }}
                                        >
                                            {point.data.imbalance !== null && point.data.imbalance !== undefined
                                                ? point.data.imbalance.toFixed(2)
                                                : '-'}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            )}

                            {/* Interconnection */}
                            {showInterconnection && (
                                <TableRow>
                                    <TableCell sx={{ color: '#ff7300' }}>連系線流量差異 (MW):</TableCell>
                                    {actualDisplayPoints.map((point, index) => (
                                        <TableCell
                                            key={`interconnection-${index}`}
                                            align="center"
                                            sx={{
                                                color: colors.interconnection,
                                                fontWeight: point.isCurrent ? 'bold' : 'normal',
                                                backgroundColor: point.isCurrent ? 'rgba(255,255,255,0.05)' : 'transparent'
                                            }}
                                        >
                                            {point.data.interconnection_flow_diff !== null && point.data.interconnection_flow_diff !== undefined
                                                ? point.data.interconnection_flow_diff.toFixed(2)
                                                : '-'}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            )}

                            {/* Occto */}
                            {/* Occto (Line View) */}
                            {showOcctoArea && occtoChartType !== 'stacked' && Array.from(selectedOcctoFields as Set<string>).map((fieldValue: string) => {
                                const field = occtoFields.find(f => f.value === fieldValue);
                                if (!field) return null;
                                // Keep colors consistent with stacked chart.
                                const stackedField = occtoStackedFields.find(sf => sf.key === fieldValue);
                                const fieldColor = stackedField?.color ?? colors.occtoArea;
                                return (
                                    <TableRow key={`occto-line-${fieldValue}`}>
                                        <TableCell sx={{ color: fieldColor, fontWeight: 'bold' }}>
                                            {field.label}:
                                        </TableCell>
                                        {actualDisplayPoints.map((point, index) => {
                                            const fieldVal = point.data.occto_values?.[fieldValue];
                                            return (
                                                <TableCell
                                                    key={`occto-${fieldValue}-${index}`}
                                                    align="center"
                                                    sx={{
                                                        color: fieldColor,
                                                        fontWeight: point.isCurrent ? 'bold' : 'normal',
                                                        backgroundColor: point.isCurrent ? 'rgba(255,255,255,0.05)' : 'transparent'
                                                    }}
                                                >
                                                    {fieldVal !== null && fieldVal !== undefined
                                                        ? Number(fieldVal).toLocaleString()
                                                        : '-'}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                );
                            })}

                            {/* Occto Stacked Breakdown */}
                            {showOcctoArea && occtoChartType === 'stacked' && (
                                <>
                                    <TableRow>
                                        <TableCell colSpan={actualDisplayPoints.length + 1} sx={{
                                            backgroundColor: colors.tooltipHeaderBg,
                                            fontWeight: 'bold',
                                            color: colors.text,
                                            py: 0.5
                                        }}>
                                            Energy Mix
                                        </TableCell>
                                    </TableRow>
                                    {occtoStackedFields
                                        .filter(field => selectedOcctoFields.has(field.key))
                                        .map(field => {
                                        return (
                                            <TableRow key={`occto-stack-${field.key}`}>
                                                <TableCell sx={{ color: field.color, pl: 4, borderLeft: `2px solid ${colors.tooltipBorder}` }}>
                                                    {field.label}
                                                </TableCell>
                                                {actualDisplayPoints.map((point, index) => {
                                                    const val = point.data.occto_data?.[field.key];
                                                    const total = point.data.occto_data?.total || 1; // avoid div by 0
                                                    const pct = (val && total) ? (val / total * 100).toFixed(1) : '0.0';

                                                    return (
                                                        <TableCell
                                                            key={`occto-stack-${field.key}-${index}`}
                                                            align="center"
                                                            sx={{
                                                                color: field.color,
                                                                fontWeight: point.isCurrent ? 'bold' : 'normal',
                                                                backgroundColor: point.isCurrent ? 'rgba(255,255,255,0.05)' : 'transparent',
                                                                fontSize: '0.75rem'
                                                            }}
                                                        >
                                                            {val !== undefined && val !== null ? (
                                                                <Box component="span" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.1 }}>
                                                                    <span>{Math.round(val).toLocaleString()}</span>
                                                                    <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.8 }}>
                                                                        {pct}%
                                                                    </Typography>
                                                                </Box>
                                                            ) : '-'}
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        );
                                    })}
                                </>
                            )}

                        </TableBody>
                    </Table>
                </Box>
            </Paper >
        );
    }
    return null;
};
