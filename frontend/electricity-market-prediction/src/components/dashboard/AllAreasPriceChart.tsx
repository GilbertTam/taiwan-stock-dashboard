'use client';

import React, { useEffect, useLayoutEffect, useRef, useMemo, useState, useCallback } from 'react';
import { Box, Typography, Portal } from '@mui/material';
import {
    createChart,
    LineSeries,
    ColorType,
    LineStyle,
    type IChartApi,
    type ISeriesApi,
    type UTCTimestamp,
} from 'lightweight-charts';
import { useTheme } from '@/app/ThemeProvider';
import { useChartColors } from '@/utils/chartColors';
import type { Area, HjksOutage } from '@/types';
import { ChartDataPoint } from '@/utils/chartUtils';
import { format } from 'date-fns';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BoltIcon from '@mui/icons-material/Bolt';
import { OutageMarkersPrimitive, type OutagePoint } from './OutageMarkersPrimitive';

// Distinct colors for 9 regions
const AREA_COLORS = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#14b8a6', // teal
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#6b7280', // gray
];

interface AllAreasPriceChartProps {
    areas: Area[];
    allAreasChartData: Record<string, ChartDataPoint[]>;
    loading?: boolean;
    highlightedArea?: string | null;
    onHoverData?: (data: { areaName: string; price: number; time: string }[] | null) => void;
    outages?: HjksOutage[];
}

const toUTCTimestamp = (timestamp: number): UTCTimestamp => {
    return Math.floor(timestamp / 1000) as UTCTimestamp;
};

// Outage tooltip - supports multiple merged events (same area + time)
interface OutageTooltipProps {
    outages: HjksOutage[];
    position: { x: number; y: number };
}

function OutageTooltip({ outages, position }: OutageTooltipProps) {
    return (
        <Portal>
            <Box
                sx={{
                    position: 'fixed',
                    left: position.x + 15,
                    top: position.y - 10,
                    width: 280,
                    maxHeight: '70vh',
                    overflowY: 'auto',
                    background: 'linear-gradient(145deg, rgba(30, 30, 45, 0.98), rgba(20, 20, 35, 0.98))',
                    backdropFilter: 'blur(12px)',
                    borderRadius: 2,
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    boxShadow: '0 8px 32px rgba(239, 68, 68, 0.2), 0 0 60px rgba(239, 68, 68, 0.1)',
                    p: 1.5,
                    zIndex: 9999,
                    pointerEvents: 'none',
                    animation: 'fadeIn 0.15s ease-out',
                    '@keyframes fadeIn': {
                        from: { opacity: 0, transform: 'translateY(5px)' },
                        to: { opacity: 1, transform: 'translateY(0)' },
                    },
                }}
            >
                {outages.length > 1 && (
                    <Typography sx={{ fontSize: 10, color: '#f87171', fontWeight: 600, mb: 1 }}>
                        同區域同時間 {outages.length} 件
                    </Typography>
                )}
                {outages.map((outage, idx) => (
                    <Box key={outage.id} sx={{ mb: idx < outages.length - 1 ? 1.5 : 0, pb: idx < outages.length - 1 ? 1.5 : 0, borderBottom: idx < outages.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                            <Box
                                sx={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 1,
                                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <WarningAmberIcon sx={{ fontSize: 14, color: '#fff' }} />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                                    {outage.name} {outage.unit_name || ''}
                                </Typography>
                                <Typography sx={{ fontSize: 9, color: '#f87171', fontWeight: 600 }}>
                                    {outage.stop_category} · {outage.format}
                                </Typography>
                            </Box>
                        </Box>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, fontSize: 10 }}>
                            <Box>
                                <Typography sx={{ fontSize: 8, color: 'var(--muted)', textTransform: 'uppercase' }}>停機容量</Typography>
                                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#f87171', fontFamily: 'monospace' }}>
                                    {(outage.down_capacity || outage.max_capacity || 0).toLocaleString()} MW
                                </Typography>
                            </Box>
                            <Box>
                                <Typography sx={{ fontSize: 8, color: 'var(--muted)', textTransform: 'uppercase' }}>開始</Typography>
                                <Typography sx={{ fontSize: 10, color: '#fff', fontFamily: 'monospace' }}>
                                    {outage.start_datetime ? format(new Date(outage.start_datetime), 'MM/dd HH:mm') : '-'}
                                </Typography>
                            </Box>
                        </Box>
                        {outage.factor && (
                            <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <BoltIcon sx={{ fontSize: 10, color: '#facc15' }} />
                                <Typography sx={{ fontSize: 9, color: '#fbbf24' }}>{outage.factor}</Typography>
                            </Box>
                        )}
                    </Box>
                ))}
            </Box>
        </Portal>
    );
}

export function AllAreasPriceChart({
    areas,
    allAreasChartData,
    loading,
    highlightedArea,
    onHoverData,
    outages = [],
}: AllAreasPriceChartProps) {
    const { darkMode } = useTheme();
    const colors = useChartColors();
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesMapRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
    const outagePrimitiveRef = useRef<OutageMarkersPrimitive | null>(null);
    const dataRef = useRef(allAreasChartData);
    const areasRef = useRef(areas);
    const colorsRef = useRef(colors);
    const onHoverDataRef = useRef(onHoverData);
    const mergedPointsRef = useRef<OutagePoint[]>([]);
    const lastMousePositionRef = useRef({ x: 0, y: 0 });
    const setHoveredOutageRef = useRef<((v: { outages: HjksOutage[]; position: { x: number; y: number } } | null) => void) | null>(null);
    const [chartInitialized, setChartInitialized] = useState(false);
    const [hoveredOutage, setHoveredOutage] = useState<{ outages: HjksOutage[]; position: { x: number; y: number } } | null>(null);
    const dimOpacityRef = useRef(1);
    const dimAnimationRef = useRef<number | null>(null);

    setHoveredOutageRef.current = setHoveredOutage;

    // Keep refs in sync (so init effect and callbacks don't need these in deps)
    useEffect(() => {
        dataRef.current = allAreasChartData;
    }, [allAreasChartData]);

    useEffect(() => {
        areasRef.current = areas;
    }, [areas]);

    useEffect(() => {
        colorsRef.current = colors;
    }, [colors]);

    useEffect(() => {
        onHoverDataRef.current = onHoverData;
    }, [onHoverData]);

    // Parse outage start to UTC seconds
    const outageStartToUtcSec = useCallback((o: HjksOutage): number | null => {
        if (!o.start_datetime) return null;
        const t = new Date(o.start_datetime).getTime();
        if (isNaN(t)) return null;
        return Math.floor(t / 1000);
    }, []);

    // Merged outage points: one per (area, time) so same area+time events draw one mark and show in one tooltip
    const outagePoints = useMemo((): OutagePoint[] => {
        const timeMs = (sec: number) => sec * 1000;
        const byKey = new Map<string, { time: number; area: string; outages: HjksOutage[]; timeMs: number }>();
        for (const o of outages) {
            const timeSec = outageStartToUtcSec(o);
            if (timeSec === null) continue;
            const key = `${o.area}|${timeSec}`;
            const existing = byKey.get(key);
            if (existing) {
                existing.outages.push(o);
            } else {
                byKey.set(key, { time: timeSec, area: o.area, outages: [o], timeMs: timeSec * 1000 });
            }
        }
        const result: OutagePoint[] = [];
        byKey.forEach((g) => {
            const prices: Record<string, number> = {};
            areas.forEach((area) => {
                const areaData = allAreasChartData[area.name] || [];
                const closest = areaData.reduce((prev, curr) => {
                    if (!prev) return curr;
                    return Math.abs(curr.timestamp - g.timeMs) < Math.abs(prev.timestamp - g.timeMs) ? curr : prev;
                }, null as ChartDataPoint | null);
                if (closest?.actualPrice != null) prices[area.name] = closest.actualPrice;
            });
            result.push({ time: g.time, area: g.area, outages: g.outages, prices });
        });
        return result;
    }, [outages, areas, allAreasChartData, outageStartToUtcSec]);

    useEffect(() => {
        mergedPointsRef.current = outagePoints;
    }, [outagePoints]);

    // Generate line data for each area - with sorting and deduplication
    const areasLineData = useMemo(() => {
        const result: Record<string, { time: UTCTimestamp; value: number }[]> = {};
        areas.forEach((area) => {
            const areaData = allAreasChartData[area.name] || [];
            const filtered = areaData
                .filter((p) => p.actualPrice != null && !isNaN(p.actualPrice))
                .map((p) => ({
                    time: toUTCTimestamp(p.timestamp),
                    value: p.actualPrice as number,
                }))
                .sort((a, b) => a.time - b.time);

            // Dedupe by time
            const seen = new Set<number>();
            result[area.name] = filtered.filter((item) => {
                if (seen.has(item.time)) return false;
                seen.add(item.time);
                return true;
            });
        });
        return result;
    }, [areas, allAreasChartData]);

    // Chart initialization - only when areas change (not on every parent re-render)
    useEffect(() => {
        const container = containerRef.current;
        if (!container || areas.length === 0) return;

        const initAreas = [...areas];
        const c = colorsRef.current;

        const checkAndInit = () => {
            const width = container.clientWidth;
            const height = container.clientHeight;
            if (width < 100 || height < 100) {
                requestAnimationFrame(checkAndInit);
                return;
            }

            if (chartRef.current) return;

            const chart = createChart(container, {
                width,
                height,
                layout: {
                    background: { type: ColorType.Solid, color: 'transparent' },
                    textColor: c.text,
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                },
                grid: {
                    vertLines: { color: c.grid, style: LineStyle.Dotted },
                    horzLines: { color: c.grid, style: LineStyle.Dotted },
                },
                rightPriceScale: {
                    borderColor: c.grid,
                    scaleMargins: { top: 0.05, bottom: 0.05 },
                },
                timeScale: {
                    borderColor: c.grid,
                    timeVisible: true,
                    secondsVisible: false,
                },
                crosshair: {
                    vertLine: { color: '#888', width: 1, style: LineStyle.Dashed },
                    horzLine: { color: '#888', width: 1, style: LineStyle.Dashed },
                },
            });
            chartRef.current = chart;

            initAreas.forEach((area, idx) => {
                const series = chart.addSeries(LineSeries, {
                    color: AREA_COLORS[idx % AREA_COLORS.length],
                    lineWidth: 2,
                    title: area.name_ch,
                    priceLineVisible: false,
                    lastValueVisible: true,
                });
                seriesMapRef.current.set(area.name, series);
            });

            const outagePrimitive = new OutageMarkersPrimitive();
            const firstSeries = seriesMapRef.current.get(initAreas[0]?.name);
            if (firstSeries) {
                firstSeries.attachPrimitive(outagePrimitive);
                outagePrimitiveRef.current = outagePrimitive;
            }

            const NEAR_OUTAGE_THRESHOLD_SEC = 1800; // 30 min

            chart.subscribeCrosshairMove((param) => {
                const setHover = setHoveredOutageRef.current;
                const pos = lastMousePositionRef.current;

                const callOnHoverData = (data: { areaName: string; price: number; time: string }[] | null) => {
                    const fn = onHoverDataRef.current;
                    if (typeof fn === 'function') fn(data);
                };

                if (!param.time) {
                    callOnHoverData(null);
                    setHover?.(null);
                    return;
                }
                const timeSec = param.time as number;
                const timestamp = timeSec * 1000;
                const hoverResults: { areaName: string; price: number; time: string }[] = [];

                areasRef.current.forEach((area) => {
                    const areaData = dataRef.current[area.name] || [];
                    const closest = areaData.reduce((prev, curr) => {
                        if (!prev) return curr;
                        return Math.abs(curr.timestamp - timestamp) < Math.abs(prev.timestamp - timestamp) ? curr : prev;
                    }, null as ChartDataPoint | null);

                    if (closest && closest.actualPrice != null) {
                        hoverResults.push({
                            areaName: area.name_ch,
                            price: closest.actualPrice,
                            time: format(new Date(closest.timestamp), 'HH:mm'),
                        });
                    }
                });

                callOnHoverData(hoverResults.length > 0 ? hoverResults : null);

                const points = mergedPointsRef.current;
                const near = points.find((p) => Math.abs(timeSec - p.time) <= NEAR_OUTAGE_THRESHOLD_SEC);
                if (near && near.outages.length > 0) {
                    setHover?.({ outages: near.outages, position: { x: pos.x, y: pos.y } });
                } else {
                    setHover?.(null);
                }
            });

            setChartInitialized(true);
        };

        checkAndInit();

        const resizeObserver = new ResizeObserver((entries) => {
            if (chartRef.current && entries[0]) {
                const { width, height } = entries[0].contentRect;
                if (width > 100 && height > 100) {
                    chartRef.current.applyOptions({ width, height });
                }
            }
        });
        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
            if (chartRef.current) {
                try {
                    chartRef.current.remove();
                } catch (e) {
                    // Ignore
                }
                outagePrimitiveRef.current = null;
                chartRef.current = null;
                seriesMapRef.current.clear();
                setChartInitialized(false);
            }
        };
    }, [areas]);

    // Apply theme/colors when they change (without re-creating chart)
    useEffect(() => {
        if (!chartRef.current || !chartInitialized) return;
        const c = colorsRef.current;
        chartRef.current.applyOptions({
            layout: { textColor: c.text },
            grid: {
                vertLines: { color: c.grid, style: LineStyle.Dotted },
                horzLines: { color: c.grid, style: LineStyle.Dotted },
            },
            rightPriceScale: { borderColor: c.grid },
            timeScale: { borderColor: c.grid },
        });
    }, [colors, chartInitialized]);

    // Update outage markers (vertical line + curve intersection dots) when data changes
    useEffect(() => {
        if (!chartInitialized) return;
        const prim = outagePrimitiveRef.current;
        if (prim) prim.setOutagePoints(outagePoints, areas.map((a) => a.name), AREA_COLORS);
    }, [outagePoints, areas, chartInitialized]);

    // Update series data when chart data changes
    useEffect(() => {
        if (!chartInitialized) return;

        areas.forEach((area) => {
            const series = seriesMapRef.current.get(area.name);
            if (series) {
                const lineData = areasLineData[area.name] || [];
                if (lineData.length > 0) {
                    series.setData(lineData);
                }
            }
        });

        // Auto-fit content
        if (chartRef.current) {
            chartRef.current.timeScale().fitContent();
        }
    }, [areasLineData, chartInitialized, areas]);

    // Smooth dim: animate dimOpacity (1 → 0.2 or 0.2 → 1) for markers + curves
    const DIM_TARGET = 0.2;
    const DIM_DURATION_MS = 320;

    useLayoutEffect(() => {
        if (!chartInitialized) return;

        const prim = outagePrimitiveRef.current;
        const chart = chartRef.current;
        if (typeof prim?.setHighlightedArea === 'function') {
            const area = highlightedArea != null ? areas.find((a) => a.name === highlightedArea) : null;
            prim.setHighlightedArea(highlightedArea ?? null, area?.name_ch ?? null);
        }

        const targetDim = highlightedArea != null ? DIM_TARGET : 1;

        const container = containerRef.current;
        const applyDim = (t: number) => {
            if (typeof prim?.setDimOpacity === 'function') prim.setDimOpacity(t);
            const alphaHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
            areas.forEach((area, idx) => {
                const series = seriesMapRef.current.get(area.name);
                if (!series) return;
                const isHighlighted = highlightedArea === area.name;
                const isDimmed = highlightedArea != null && !isHighlighted;
                const baseColor = AREA_COLORS[idx % AREA_COLORS.length];
                const color = isDimmed ? `${baseColor}${alphaHex(t)}` : baseColor;
                series.applyOptions({
                    lineWidth: isHighlighted ? 3 : 2,
                    color,
                });
            });
            if (chart && container) chart.resize(container.clientWidth, container.clientHeight);
        };

        if (dimAnimationRef.current != null) cancelAnimationFrame(dimAnimationRef.current);

        const start = performance.now();
        // When switching to a new card (highlighting), always animate from 1 → 0.2 so transition is visible
        const startVal = targetDim === DIM_TARGET ? 1 : dimOpacityRef.current;

        const tick = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(1, elapsed / DIM_DURATION_MS);
            const eased = 1 - (1 - progress) * (1 - progress);
            const t = startVal + (targetDim - startVal) * eased;
            dimOpacityRef.current = t;
            applyDim(t);
            if (progress < 1) {
                dimAnimationRef.current = requestAnimationFrame(tick);
            } else {
                dimOpacityRef.current = targetDim;
                dimAnimationRef.current = null;
            }
        };
        dimAnimationRef.current = requestAnimationFrame(tick);

        return () => {
            if (dimAnimationRef.current != null) cancelAnimationFrame(dimAnimationRef.current);
        };
    }, [highlightedArea, chartInitialized, areas]);

    const handleOutageBarHover = useCallback((outages: HjksOutage[], e: React.MouseEvent) => {
        setHoveredOutage({ outages, position: { x: e.clientX, y: e.clientY } });
    }, []);

    const handleOutageBarLeave = useCallback(() => {
        setHoveredOutage(null);
    }, []);

    if (loading) {
        return (
            <Box
                sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                }}
            >
                <Box
                    sx={{
                        width: 48,
                        height: 48,
                        position: 'relative',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '50%',
                            border: '3px solid',
                            borderColor: 'var(--card-border)',
                            opacity: 0.35,
                        },
                        '&::after': {
                            content: '""',
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '50%',
                            border: '3px solid transparent',
                            borderTopColor: 'var(--primary)',
                            borderRightColor: 'var(--primary)',
                            animation: 'chartLoaderSpin 0.75s linear infinite',
                        },
                        '@keyframes chartLoaderSpin': {
                            '0%': { transform: 'rotate(0deg)' },
                            '100%': { transform: 'rotate(360deg)' },
                        },
                    }}
                />
                <Typography sx={{ color: 'var(--muted)', fontSize: 12, fontWeight: 500 }}>
                    載入圖表...
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {/* Outage indicator bar - static list, horizontal scroll if many */}
            {outages.length > 0 && (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 1.5,
                        py: 0.5,
                        mb: 0.5,
                        borderRadius: 1,
                        background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.15), transparent)',
                        borderLeft: '3px solid #ef4444',
                        flexShrink: 0,
                        minHeight: 32,
                    }}
                >
                    <WarningAmberIcon
                        sx={{
                            fontSize: 14,
                            color: '#f87171',
                            flexShrink: 0,
                            animation: 'blink 2s infinite',
                            '@keyframes blink': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.5 } },
                        }}
                    />
                    <Typography sx={{ fontSize: 11, color: '#f87171', fontWeight: 600, flexShrink: 0 }}>
                        {outages.length}件停機事件
                    </Typography>
                    <Box
                        sx={{
                            flex: 1,
                            minWidth: 0,
                            overflowX: 'auto',
                            overflowY: 'hidden',
                            display: 'flex',
                            gap: 0.75,
                            alignItems: 'center',
                            py: 0.25,
                            '&::-webkit-scrollbar': { height: 4 },
                            '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 },
                        }}
                    >
                        {outagePoints.map((point, i) => {
                            const isRelated = highlightedArea == null || (() => {
                                if (point.area === highlightedArea) return true;
                                const a = areas.find((ar) => ar.name === highlightedArea);
                                return a != null && point.area === a.name_ch;
                            })();
                            const isDimmed = highlightedArea != null && !isRelated;
                            const label = point.outages.length > 1
                                ? `${point.area} ${point.outages.length}件`
                                : point.outages[0].name;
                            return (
                                <Box
                                    key={`${point.time}-${point.area}-${i}`}
                                    component="span"
                                    onMouseEnter={(e: React.MouseEvent) => handleOutageBarHover(point.outages, e)}
                                    onMouseLeave={handleOutageBarLeave}
                                    sx={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        minHeight: 22,
                                        px: 0.75,
                                        py: 0.25,
                                        borderRadius: 0.5,
                                        backgroundColor: isRelated && highlightedArea != null ? 'rgba(239, 68, 68, 0.5)' : 'rgba(239, 68, 68, 0.2)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        outline: isRelated && highlightedArea != null ? '2px solid #ef4444' : '2px solid transparent',
                                        outlineOffset: -1,
                                        cursor: 'pointer',
                                        transition: 'opacity 0.2s, background-color 0.2s, outline 0.2s',
                                        flexShrink: 0,
                                        opacity: isDimmed ? 0.2 : 1,
                                        boxShadow: isRelated && highlightedArea != null ? '0 0 8px rgba(239, 68, 68, 0.4)' : 'none',
                                        '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.5)' },
                                    }}
                                >
                                    <Typography sx={{ fontSize: 9, color: isRelated && highlightedArea != null ? '#fff' : '#fca5a5', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                                        {label}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>
                </Box>
            )}

            {/* Chart container - track mouse for outage tooltip position when crosshair is on outage line */}
            <Box
                ref={containerRef}
                onMouseMove={(e) => {
                    lastMousePositionRef.current = { x: e.clientX, y: e.clientY };
                }}
                onMouseLeave={() => setHoveredOutage(null)}
                sx={{
                    flex: 1,
                    minHeight: 0,
                    position: 'relative',
                }}
            />

            {/* Outage tooltip - rendered via Portal */}
            {hoveredOutage && (
                <OutageTooltip outages={hoveredOutage.outages} position={hoveredOutage.position} />
            )}

            {/* Legend */}
            <Box
                sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1,
                    mt: 1,
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
            >
                {areas.map((area, idx) => (
                    <Box
                        key={area.name}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            opacity: highlightedArea && highlightedArea !== area.name ? 0.3 : 1,
                            transition: 'opacity 0.15s',
                        }}
                    >
                        <Box
                            sx={{
                                width: 10,
                                height: 3,
                                backgroundColor: AREA_COLORS[idx % AREA_COLORS.length],
                                borderRadius: 1,
                            }}
                        />
                        <Typography variant="caption" sx={{ fontSize: 10, color: 'var(--muted)' }}>
                            {area.name_ch}
                        </Typography>
                    </Box>
                ))}
            </Box>
        </Box>
    );
}
