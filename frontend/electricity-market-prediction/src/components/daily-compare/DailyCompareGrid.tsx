'use client';

import React, { useMemo } from 'react';
import { Box, Typography, Alert } from '@mui/material';
import { Area } from '@/types';
import { MetricConfig } from './DailyCompareControls';
import { DailyOverlayChart } from './DailyOverlayChart';

interface DailyCompareGridProps {
    selectedAreas: string[];
    areas: Area[];
    /** areaName → (date → 48-slot values) */
    rawDataMap: Map<string, Map<string, (number | null)[]>>;
    metric: MetricConfig;
    isLoading: boolean;
    /** ECharts group id for cross-panel crosshair sync */
    groupId: string;
}

export const DailyCompareGrid: React.FC<DailyCompareGridProps> = ({
    selectedAreas,
    areas,
    rawDataMap,
    metric,
    isLoading,
    groupId,
}) => {
    const areaLabelMap = useMemo(() => {
        const m = new Map<string, string>();
        for (const a of areas) m.set(a.name, a.name_ch);
        return m;
    }, [areas]);

    if (!isLoading && selectedAreas.length === 0) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Alert severity="info" sx={{ maxWidth: 400 }}>
                    <Typography variant="body2">請在左側選擇至少一個地區以顯示疊圖比較。</Typography>
                </Alert>
            </Box>
        );
    }

    // Calculate grid columns
    const count = selectedAreas.length;
    const cols = count <= 1 ? 1 : count <= 4 ? 2 : 3;
    const rows = Math.ceil(count / cols);

    // Panel height: fill available space, equal rows
    // Use a min so small counts get reasonable height
    const panelHeight = `calc((100% - ${(rows - 1) * 8}px) / ${rows})`;

    return (
        <Box
            sx={{
                width: '100%',
                height: '100%',
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gridTemplateRows: `repeat(${rows}, ${panelHeight})`,
                gap: '8px',
                overflow: 'hidden',
            }}
        >
            {selectedAreas.map((areaName) => {
                const seriesData = rawDataMap.get(areaName) ?? new Map();
                const sortedDates = [...seriesData.keys()].sort((a, b) => b.localeCompare(a));
                const label = areaLabelMap.get(areaName) ?? areaName;

                return (
                    <Box
                        key={areaName}
                        sx={{
                            border: '1px solid var(--card-border)',
                            borderRadius: 1,
                            backgroundColor: 'var(--card-bg)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            minHeight: 0,
                        }}
                    >
                        <DailyOverlayChart
                            seriesData={seriesData}
                            sortedDates={sortedDates}
                            metric={metric}
                            isLoading={isLoading && seriesData.size === 0}
                            areaLabel={label}
                            groupId={groupId}
                        />
                    </Box>
                );
            })}
        </Box>
    );
};
