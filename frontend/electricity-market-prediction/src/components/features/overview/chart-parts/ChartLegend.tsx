
import React from 'react';
import { Box, Typography } from '@mui/material';
import { Area } from '@/types';

interface ChartLegendProps {
    areas: Area[]; // 區域列表
    highlightedArea?: string | null; // 當前高亮區域
    colors: string[]; // 顏色列表
}

/**
 * 圖表圖例組件
 * 顯示每個區域對應的顏色
 * 支援與圖表的高亮狀態連動，自動淡化非高亮區域
 */
export function ChartLegend({ areas, highlightedArea, colors }: ChartLegendProps) {
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
                        opacity: highlightedArea && highlightedArea !== area.name ? 0.3 : 1,
                        transition: 'opacity 0.15s',
                    }}
                >
                    {/* 顏色指示條 */}
                    <Box
                        sx={{
                            width: 10,
                            height: 3,
                            backgroundColor: colors[idx % colors.length],
                            borderRadius: 1,
                        }}
                    />
                    {/* 域名稱 */}
                    <Typography variant="caption" sx={{ fontSize: 10, color: 'var(--muted)' }}>
                        {area.name_ch}
                    </Typography>
                </Box>
            ))}
        </Box>
    );
}
