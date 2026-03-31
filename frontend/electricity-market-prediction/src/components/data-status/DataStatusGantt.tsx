'use client';

import React, { useMemo, useRef, useCallback } from 'react';
import { Box, Typography, Alert } from '@mui/material';
import { BaseChart } from '@/components/charts/BaseChart';
import { CoverageRow } from '@/services/dataStatusApi';
import { SourceConfig, AREA_JP, AREA_ORDER } from './DataStatusControls';
import { useTheme } from '@/app/ThemeProvider';

// ─── Props ────────────────────────────────────────────────────────────────────

interface DataStatusGanttProps {
    rows: CoverageRow[];
    isLoading: boolean;
    sourceConfigs: SourceConfig[];
    selectedSources: Set<string>;
    selectedAreas: Set<string>;
    onCellClick?: (sourceKey: string, area: string, date: string, docCount: number, sourceLabel: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const DataStatusGantt: React.FC<DataStatusGanttProps> = ({
    rows,
    isLoading,
    sourceConfigs,
    selectedSources,
    selectedAreas,
    onCellClick,
}) => {
    // Build a lookup of validation config per source key
    const configByKey = useMemo(() => {
        const m = new Map<string, { validationType: 'fixed' | 'variable' | 'event'; expectedPerDay: number | null }>();
        sourceConfigs.forEach(s => m.set(s.key, { validationType: s.validationType, expectedPerDay: s.expectedPerDay }));
        return m;
    }, [sourceConfigs]);

    const { darkMode } = useTheme();
    const axisColor = darkMode ? '#b8bfc9' : '#4b5563';

    // Keep a ref to latest yRows/xLabels/lookup so the click handler closure stays stable
    type YRow = { label: string; sourceKey: string; area: string; sourceLabel: string };
    const chartDataRef = useRef<{ yRows: YRow[]; xLabels: string[]; lookup: Map<string, number> }>({
        yRows: [], xLabels: [], lookup: new Map(),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const option = useMemo<any>(() => {
        if (rows.length === 0) return null;

        // Build set of all dates (sorted ascending)
        const allDates = [...new Set(rows.map(r => r.date))].sort();

        // Build indexed lookup: `${source_key}||${area}||${date}` → doc_count
        const lookup = new Map<string, number>();
        for (const r of rows) {
            lookup.set(`${r.source_key}||${r.area}||${r.date}`, r.doc_count);
        }

        // Build Y-axis rows in sourceConfigs order, filtered by selection
        const yRows: YRow[] = [];

        for (const src of sourceConfigs) {
            if (!selectedSources.has(src.key)) continue;

            if (src.isSystem) {
                yRows.push({ label: `${src.label}  全域`, sourceKey: src.key, area: 'system', sourceLabel: src.label });
            } else {
                const filteredAreas = AREA_ORDER.filter(a => selectedAreas.has(a));
                for (const area of filteredAreas) {
                    yRows.push({ label: `${src.label}  ${AREA_JP[area] ?? area}`, sourceKey: src.key, area, sourceLabel: src.label });
                }
            }
        }

        if (yRows.length === 0 || allDates.length === 0) return null;

        const yLabels = yRows.map(r => r.label);
        const xLabels = allDates;

        // Store for click handler
        chartDataRef.current = { yRows, xLabels, lookup };

        // Compute median doc_count per sourceKey×area (used to detect partial days).
        // Median is more robust than max: some sources publish varying numbers of docs per day
        // depending on how many forecast horizons are available, so max would incorrectly flag
        // valid complete days as partial. Median captures the typical "complete" day count.
        const medianBySourceArea = new Map<string, number>();
        const countListsByKey = new Map<string, number[]>();
        for (const r of rows) {
            if (r.doc_count === 0) continue;  // ignore zero-doc days in the baseline
            const key = `${r.source_key}||${r.area}`;
            if (!countListsByKey.has(key)) countListsByKey.set(key, []);
            countListsByKey.get(key)!.push(r.doc_count);
        }
        for (const [key, counts] of countListsByKey) {
            const sorted = [...counts].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            const median = sorted.length % 2 === 0
                ? (sorted[mid - 1] + sorted[mid]) / 2
                : sorted[mid];
            medianBySourceArea.set(key, median);
        }

        // Build heatmap data: [xIndex, yIndex, value]
        // value: 1 = complete (green), 0.5 = partial (orange), 0 = missing (red), -1 = N/A (gray)
        const heatData: [number, number, number][] = [];

        for (let yi = 0; yi < yRows.length; yi++) {
            const row = yRows[yi];
            const cfg   = configByKey.get(row.sourceKey);
            const vtype = cfg?.validationType ?? 'variable';
            const epd   = cfg?.expectedPerDay ?? null;

            for (let xi = 0; xi < xLabels.length; xi++) {
                const date  = xLabels[xi];
                const count = lookup.get(`${row.sourceKey}||${row.area}||${date}`);

                let value: number;
                if (count === undefined) {
                    value = -1; // N/A — date not in range for this source
                } else if (vtype === 'event') {
                    // Event sources: binary present/absent — no partial state
                    value = count > 0 ? 1 : 0;
                } else if (vtype === 'fixed' && epd !== null) {
                    // Fixed expected count — explicit comparison, no median estimation
                    value = count === 0 ? 0 : count < epd ? 0.5 : 1;
                } else {
                    // Variable sources (intraday, weather) — use median as baseline
                    const median = medianBySourceArea.get(`${row.sourceKey}||${row.area}`) ?? 0;
                    value = count === 0 ? 0 : median === 0 ? 1 : count < median * 0.8 ? 0.5 : 1;
                }
                heatData.push([xi, yi, value]);
            }
        }

        const leftPad = 170;

        return {
            backgroundColor: 'transparent',
            animation: false,
            grid: {
                left: leftPad,
                right: 16,
                top: 32,
                bottom: 48,
                containLabel: false,
            },
            xAxis: {
                type: 'category',
                data: xLabels,
                splitArea: { show: false },
                splitLine: { show: false },
                axisLine: { show: true },
                axisTick: { show: false },
                axisLabel: {
                    fontSize: 10,
                    color: axisColor,
                    interval: Math.max(0, Math.floor(xLabels.length / 14) - 1),
                    rotate: 30,
                },
            },
            yAxis: {
                type: 'category',
                data: yLabels,
                splitArea: { show: false },
                splitLine: { show: false },
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: {
                    fontSize: 10,
                    color: axisColor,
                    width: leftPad - 8,
                    overflow: 'truncate',
                },
                inverse: true,
            },
            visualMap: {
                show: false,
                type: 'piecewise',
                pieces: [
                    { value: -1,  color: '#374151' },  // N/A gray
                    { value: 0,   color: '#ff4d4f' },  // missing red
                    { value: 0.5, color: '#fa8c16' },  // partial orange
                    { value: 1,   color: '#52c41a' },  // complete green
                ],
            },
            tooltip: {
                trigger: 'item',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter: (params: any) => {
                    if (!params?.value) return '';
                    const [xi, yi, val] = params.value as [number, number, number];
                    const date = xLabels[xi] ?? '';
                    const rowLabel = yLabels[yi] ?? '';
                    const srcKey = yRows[yi]?.sourceKey ?? '';
                    const cfg = configByKey.get(srcKey);
                    const isVariable = cfg?.validationType === 'variable';
                    const isEvent    = cfg?.validationType === 'event';
                    const docCount = lookup.get(`${srcKey}||${yRows[yi]?.area}||${date}`);
                    const countStr = docCount !== undefined ? `　${docCount} 筆` : '';
                    const status =
                        val === 1   ? (isEvent ? '✅ 有事件' : '✅ 完整')
                      : val === 0.5 ? `⚠️ 不完整${isVariable ? '（依中位值判定）' : ''}${countStr}`
                      : val === 0   ? (isEvent ? '─ 無事件' : '❌ 缺失')
                      :               '─ N/A';
                    return `<div style="font-size:12px;"><b>${rowLabel}</b><br/>${date}<br/>${status}${val >= 0 && !isEvent ? countStr : ''}</div>`;
                },
            },
            series: [
                {
                    type: 'heatmap',
                    data: heatData,
                    itemStyle: {
                        borderWidth: 1.5,
                        borderColor: 'var(--card-bg)',
                        borderRadius: 2,
                    },
                    emphasis: {
                        itemStyle: { shadowBlur: 6, shadowColor: 'rgba(0,0,0,0.4)' },
                    },
                },
            ],
        };
    }, [rows, sourceConfigs, selectedSources, selectedAreas, axisColor, configByKey]);

    const handleCellClick = useCallback((params: any) => {
        if (!onCellClick || !params?.value) return;
        const [xi, yi, val] = params.value as [number, number, number];
        if (val === -1) return;  // N/A cell — no detail available
        const { yRows, xLabels, lookup } = chartDataRef.current;
        const date = xLabels[xi];
        const row = yRows[yi];
        if (!date || !row) return;
        const docCount = lookup.get(`${row.sourceKey}||${row.area}||${date}`) ?? 0;
        onCellClick(row.sourceKey, row.area, date, docCount, row.sourceLabel);
    }, [onCellClick]);

    if (!isLoading && rows.length === 0) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Alert severity="info" sx={{ maxWidth: 400 }}>
                    <Typography variant="body2">
                        點擊「重新整理」以載入資料覆蓋狀態。
                    </Typography>
                </Alert>
            </Box>
        );
    }

    if (!isLoading && option === null) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Alert severity="info" sx={{ maxWidth: 400 }}>
                    <Typography variant="body2">
                        目前篩選條件下無資料可顯示，請調整來源或地區篩選。
                    </Typography>
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Legend */}
            <Box sx={{ px: 1, pb: 0.5, flexShrink: 0, display: 'flex', gap: 2, alignItems: 'center' }}>
                {[
                    { color: '#52c41a', label: '完整' },
                    { color: '#fa8c16', label: '不完整' },
                    { color: '#ff4d4f', label: '缺失' },
                    { color: '#374151', label: 'N/A' },
                ].map(({ color, label }) => (
                    <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: 0.5, backgroundColor: color }} />
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                            {label}
                        </Typography>
                    </Box>
                ))}
                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', ml: 'auto' }}>
                    X軸: 日期 | Y軸: 資料來源 × 地區
                </Typography>
            </Box>

            <BaseChart
                option={option ?? {}}
                height="100%"
                showLoading={isLoading}
                onEvents={onCellClick ? { click: handleCellClick } : undefined}
                sx={{ flex: 1, minHeight: 0, cursor: onCellClick ? 'pointer' : 'default' }}
            />
        </Box>
    );
};
