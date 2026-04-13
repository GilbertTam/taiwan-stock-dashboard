/**
 * 區域圖例元件 | Area chart legend — displays color-coded area names with highlight support.
 *
 * 顯示每個區域對應的顏色，支援與圖表的高亮狀態連動，自動淡化非高亮區域。
 * Renders a color indicator and Chinese name for each area. When a specific area
 * is highlighted, non-highlighted items are dimmed for visual emphasis.
 *
 * @param areas - 區域列表 | Array of area objects
 * @param highlightedArea - 當前高亮區域名稱 | Currently highlighted area name (optional)
 * @param colors - 顏色列表 | Array of colors matching area indices
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import { Area } from '@/types';
import { useTranslation } from 'react-i18next';
import { getAreaName } from '@/utils/areaI18n';

interface AreaChartLegendProps {
    /** 區域列表 | Area list */
    areas: Area[];
    /** 當前高亮區域 | Currently highlighted area name */
    highlightedArea?: string | null;
    /** 顏色列表 | Color palette */
    colors: string[];
}

export function AreaChartLegend({ areas, highlightedArea, colors }: AreaChartLegendProps) {
    const { t } = useTranslation('common');
    return (
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
                        // 如果有高亮區域且不是當前區域，則將透明度設為 0.3
                        // Dim non-highlighted items when an area is focused
                        opacity: highlightedArea && highlightedArea !== area.name ? 0.3 : 1,
                        transition: 'opacity 0.15s',
                    }}
                >
                    {/* 顏色指示條 | Color indicator bar */}
                    <Box
                        sx={{
                            width: 10,
                            height: 3,
                            backgroundColor: colors[idx % colors.length],
                            borderRadius: 1,
                        }}
                    />
                    {/* 區域名稱 | Area name */}
                    <Typography variant="caption" sx={{ fontSize: 10, color: 'var(--muted)' }}>
                        {getAreaName(t, area.name)}
                    </Typography>
                </Box>
            ))}
        </Box>
    );
}
