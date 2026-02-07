
'use client';

import React, { useEffect, useLayoutEffect, useRef, useMemo, useState, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
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
import { OutageMarkersPrimitive, type OutagePoint } from './OutageMarkersPrimitive';
import { OutageTooltip } from './chart-parts/OutageTooltip';
import { OutageIndicatorBar } from './chart-parts/OutageIndicatorBar';
import { ChartLegend } from './chart-parts/ChartLegend';

// 9個不同區域的顏色定義，用於圖表線條與圖例
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
    areas: Area[]; // 區域列表
    allAreasChartData: Record<string, ChartDataPoint[]>; // 所有區域的圖表數據，key 為區域名稱
    loading?: boolean; // 是否正在載入
    highlightedArea?: string | null; // 當前高亮的區域（滑鼠懸停特定卡片時）
    onHoverData?: (data: { areaName: string; price: number; time: string }[] | null) => void; // 回調：當滑鼠在圖表上移動時傳回數據
    outages?: HjksOutage[]; // 停機事件列表
}

/**
 * 將時間戳轉換為 Lightweight Charts 需要的 UTCTimestamp 格式 (秒)
 */
const toUTCTimestamp = (timestamp: number): UTCTimestamp => {
    return Math.floor(timestamp / 1000) as UTCTimestamp;
};

/**
 * 所有區域電價趨勢圖組件
 * 包含：
 * 1. 線圖 (Lightweight Charts)
 * 2. 停機事件標記 (OutageMarkersPrimitive)
 * 3. 停機事件列表 (OutageIndicatorBar)
 * 4. 懸停 Tooltip (OutageTooltip)
 */
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

    // Refs 用於存儲圖表實例與狀態，避免閉包問題
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesMapRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
    const outagePrimitiveRef = useRef<OutageMarkersPrimitive | null>(null);

    // 使用 ref 追蹤最新的 props，供圖表回調函數使用
    const dataRef = useRef(allAreasChartData);
    const areasRef = useRef(areas);
    const colorsRef = useRef(colors);
    const onHoverDataRef = useRef(onHoverData);

    const mergedPointsRef = useRef<OutagePoint[]>([]);
    const lastMousePositionRef = useRef({ x: 0, y: 0 });
    const setHoveredOutageRef = useRef<((v: { outages: HjksOutage[]; position: { x: number; y: number } } | null) => void) | null>(null);

    const [chartInitialized, setChartInitialized] = useState(false);
    const [hoveredOutage, setHoveredOutage] = useState<{ outages: HjksOutage[]; position: { x: number; y: number } } | null>(null);

    // 用於淡化非高亮區域的透明度動畫
    const dimOpacityRef = useRef(1);
    const dimAnimationRef = useRef<number | null>(null);

    setHoveredOutageRef.current = setHoveredOutage;

    // 同步 Refs
    useEffect(() => { dataRef.current = allAreasChartData; }, [allAreasChartData]);
    useEffect(() => { areasRef.current = areas; }, [areas]);
    useEffect(() => { colorsRef.current = colors; }, [colors]);
    useEffect(() => { onHoverDataRef.current = onHoverData; }, [onHoverData]);

    // 輔助函數：將停機開始時間轉為 UTC 秒
    const outageStartToUtcSec = useCallback((o: HjksOutage): number | null => {
        if (!o.start_datetime) return null;
        const t = new Date(o.start_datetime).getTime();
        if (isNaN(t)) return null;
        return Math.floor(t / 1000);
    }, []);

    // 處理停機數據：將同一時間、同一區域的停機事件合併為一個點 (OutagePoint)
    // 這樣在地圖上只會繪製一個標記，Hover 時顯示列表
    const outagePoints = useMemo((): OutagePoint[] => {
        const timeMs = (sec: number) => sec * 1000;
        const byKey = new Map<string, { time: number; area: string; outages: HjksOutage[]; timeMs: number }>();

        for (const o of outages) {
            const timeSec = outageStartToUtcSec(o);
            if (timeSec === null) continue;
            // Key: 區域|時間
            const key = `${o.area}|${timeSec}`;
            const existing = byKey.get(key);
            if (existing) {
                existing.outages.push(o);
            } else {
                byKey.set(key, { time: timeSec, area: o.area, outages: [o], timeMs: timeSec * 1000 });
            }
        }

        const result: OutagePoint[] = [];
        // 為每個停機點找到對應時間點的各區域電價，用於決定標記在圖表上的 Y 軸位置 (通常跟隨該區域的價格線)
        byKey.forEach((g) => {
            const prices: Record<string, number> = {};
            areas.forEach((area) => {
                const areaData = allAreasChartData[area.name] || [];
                // 尋找最接近停機時間的價格點
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

    // 整理線圖數據：排序並去除重複的時間點
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

            // 去重
            const seen = new Set<number>();
            result[area.name] = filtered.filter((item) => {
                if (seen.has(item.time)) return false;
                seen.add(item.time);
                return true;
            });
        });
        return result;
    }, [areas, allAreasChartData]);

    // 初始化圖表
    useEffect(() => {
        const container = containerRef.current;
        if (!container || areas.length === 0) return;

        const initAreas = [...areas];
        const c = colorsRef.current;

        // 確保容器有尺寸才初始化
        const checkAndInit = () => {
            const width = container.clientWidth;
            const height = container.clientHeight;
            if (width < 100 || height < 100) {
                requestAnimationFrame(checkAndInit);
                return;
            }

            if (chartRef.current) return;

            // 創建 Lightweight Chart
            const chart = createChart(container, {
                width,
                height,
                layout: {
                    background: { type: ColorType.Solid, color: 'transparent' },
                    textColor: c.text,
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    attributionLogo: false,
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

            // 為每個區域添加線圖系列 (Series)
            initAreas.forEach((area, idx) => {
                const series = chart.addSeries(LineSeries, {
                    color: AREA_COLORS[idx % AREA_COLORS.length],
                    lineWidth: 2,
                    title: area.name_ch,
                    priceLineVisible: false, // 不顯示最新價格線
                    lastValueVisible: true,  // 顯示最新數值標籤
                });
                seriesMapRef.current.set(area.name, series);
            });

            // 添加停機事件標記的原語 (Custom Primitive)
            const outagePrimitive = new OutageMarkersPrimitive();
            const firstSeries = seriesMapRef.current.get(initAreas[0]?.name);
            // 必須附加到任意一個 Series 上才能運作
            if (firstSeries) {
                firstSeries.attachPrimitive(outagePrimitive);
                outagePrimitiveRef.current = outagePrimitive;
            }

            const NEAR_OUTAGE_THRESHOLD_SEC = 1800; // 30 min Range 用於判定是否懸停在停機事件附近

            // 訂閱十字準線移動事件，處理數據懸停顯示與停機事件提示
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

                // 收集當前時間點所有區域的價格
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

                // 檢查是否懸停在停機標記附近
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

        // 監聽容器大小變化自動調整圖表
        const resizeObserver = new ResizeObserver((entries) => {
            if (chartRef.current && entries[0]) {
                const { width, height } = entries[0].contentRect;
                if (width > 100 && height > 100) {
                    chartRef.current.applyOptions({ width, height });
                }
            }
        });
        resizeObserver.observe(container);

        // 清理函數
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

    // 當顏色主題變更時應用到圖表
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

    // 當數據變更時更新停機標記
    useEffect(() => {
        if (!chartInitialized) return;
        const prim = outagePrimitiveRef.current;
        if (prim) prim.setOutagePoints(outagePoints, areas.map((a) => a.name), AREA_COLORS);
    }, [outagePoints, areas, chartInitialized]);

    // 當數據變更時更新線圖數據
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

        // 自動調整時間軸範圍以適應數據
        if (chartRef.current) {
            chartRef.current.timeScale().fitContent();
        }
    }, [areasLineData, chartInitialized, areas]);

    // 平滑淡化動畫：處理區域高亮/取消高亮時的視覺效果
    // 動畫值 dimOpacity: 1 (不淡化) -> 0.2 (淡化)
    const DIM_TARGET = 0.2;
    const DIM_DURATION_MS = 320;

    useLayoutEffect(() => {
        if (!chartInitialized) return;

        const prim = outagePrimitiveRef.current;
        const chart = chartRef.current;

        // 更新原語的高亮狀態
        if (typeof prim?.setHighlightedArea === 'function') {
            const area = highlightedArea != null ? areas.find((a) => a.name === highlightedArea) : null;
            prim.setHighlightedArea(highlightedArea ?? null, area?.name_ch ?? null);
        }

        const targetDim = highlightedArea != null ? DIM_TARGET : 1;
        const container = containerRef.current;

        // 執行一幀動畫渲染
        const applyDim = (t: number) => {
            if (typeof prim?.setDimOpacity === 'function') prim.setDimOpacity(t);
            const alphaHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');

            areas.forEach((area, idx) => {
                const series = seriesMapRef.current.get(area.name);
                if (!series) return;
                const isHighlighted = highlightedArea === area.name;
                const isDimmed = highlightedArea != null && !isHighlighted;
                const baseColor = AREA_COLORS[idx % AREA_COLORS.length];

                // 計算當前顏色：若需淡化則加上 alpha 值
                const color = isDimmed ? `${baseColor}${alphaHex(t)}` : baseColor;
                series.applyOptions({
                    lineWidth: isHighlighted ? 3 : 2, // 高亮時加粗線條
                    color,
                });
            });
            // 強制重繪
            if (chart && container) chart.resize(container.clientWidth, container.clientHeight);
        };

        if (dimAnimationRef.current != null) cancelAnimationFrame(dimAnimationRef.current);

        const start = performance.now();
        const startVal = targetDim === DIM_TARGET ? 1 : dimOpacityRef.current;

        const tick = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(1, elapsed / DIM_DURATION_MS);
            const eased = 1 - (1 - progress) * (1 - progress); // Ease-out quad
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

    // 處理停機列表條目的懸停事件
    const handleOutageBarHover = useCallback((outages: HjksOutage[], e: React.MouseEvent) => {
        setHoveredOutage({ outages, position: { x: e.clientX, y: e.clientY } });
    }, []);

    const handleOutageBarLeave = useCallback(() => {
        setHoveredOutage(null);
    }, []);

    // 載入中狀態
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
                {/* 簡單的 CSS 旋轉加載動畫 */}
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
            {/* 停機事件指示條 (顯示總數與橫向捲動列表) */}
            <OutageIndicatorBar
                outages={outages}
                outagePoints={outagePoints}
                highlightedArea={highlightedArea}
                areas={areas}
                onHover={handleOutageBarHover}
                onLeave={handleOutageBarLeave}
            />

            {/* 圖表容器 - 追蹤滑鼠位置用於 Tooltip 定位 */}
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

            {/* 懸停 Tooltip - 使用 Portal 渲染在頂層 */}
            {hoveredOutage && (
                <OutageTooltip outages={hoveredOutage.outages} position={hoveredOutage.position} />
            )}

            {/* 圖例 */}
            <ChartLegend
                areas={areas}
                highlightedArea={highlightedArea}
                colors={AREA_COLORS}
            />
        </Box>
    );
}
