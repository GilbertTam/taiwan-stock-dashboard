
import React from 'react';
import { Box, Typography } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Area, HjksOutage } from '@/types';
import { OutagePoint } from '../OutageMarkersPrimitive';

interface OutageIndicatorBarProps {
    outages: HjksOutage[]; // 原始停機資料
    outagePoints: OutagePoint[]; // 合併後的停機點資料
    highlightedArea?: string | null; // 目前高亮的區域
    areas: Area[]; // 區域定義
    onHover: (outages: HjksOutage[], e: React.MouseEvent) => void; // 懸停事件回調
    onLeave: () => void; // 離開懸停事件回調
}

/**
 * 停機事件指示條組件
 * 位於圖表上方，顯示當前視圖中的停機事件總數，並提供橫向捲動的事件列表
 * 支援與圖表的高亮連動：當圖表高亮時，非相關區域的事件會淡化
 */
export function OutageIndicatorBar({
    outages,
    outagePoints,
    highlightedArea,
    areas,
    onHover,
    onLeave
}: OutageIndicatorBarProps) {
    if (outages.length === 0) return null;

    return (
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
            {/* 閃爍的警告圖標 */}
            <WarningAmberIcon
                sx={{
                    fontSize: 14,
                    color: '#f87171',
                    flexShrink: 0,
                    animation: 'blink 2s infinite',
                    '@keyframes blink': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.5 } },
                }}
            />
            {/* 總數顯示 */}
            <Typography sx={{ fontSize: 11, color: '#f87171', fontWeight: 600, flexShrink: 0 }}>
                {outages.length}件停機事件
            </Typography>

            {/* 橫向捲動列表 */}
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
                    // 自定義捲軸樣式
                    '&::-webkit-scrollbar': { height: 4 },
                    '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 },
                }}
            >
                {outagePoints.map((point, i) => {
                    // 判斷此事件是否與高顯區域相關
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
                            onMouseEnter={(e: React.MouseEvent) => onHover(point.outages, e)}
                            onMouseLeave={onLeave}
                            sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                minHeight: 22,
                                px: 0.75,
                                py: 0.25,
                                borderRadius: 0.5,
                                // 動態樣式：根據高亮狀態調整背景與邊框
                                backgroundColor: isRelated && highlightedArea != null ? 'rgba(239, 68, 68, 0.5)' : 'rgba(239, 68, 68, 0.2)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                outline: isRelated && highlightedArea != null ? '2px solid #ef4444' : '2px solid transparent',
                                outlineOffset: -1,
                                cursor: 'pointer',
                                transition: 'opacity 0.2s, background-color 0.2s, outline 0.2s',
                                flexShrink: 0,
                                opacity: isDimmed ? 0.2 : 1, // 淡化效果
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
    );
}
