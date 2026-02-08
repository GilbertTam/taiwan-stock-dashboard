
import React from 'react';
import { Box, Typography, Portal } from '@mui/material';
import { format } from 'date-fns';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BoltIcon from '@mui/icons-material/Bolt';
import { HjksOutage } from '@/types';

// 定義 OutageTooltip 的 props 介面
export interface OutageTooltipProps {
    outages: HjksOutage[]; // 需要顯示的停機事件列表
    position: { x: number; y: number }; // Tooltip 顯示的螢幕座標 (clientX, clientY)
}

/**
 * 停機事件懸停提示組件
 * 使用 React Portal 將內容渲染到 DOM 頂層，避免被圖表裁剪
 * 支援顯示多個合併的停機事件 (同一時間、同一區域)
 */
export function OutageTooltip({ outages, position }: OutageTooltipProps) {
    return (
        <Portal>
            <Box
                sx={{
                    position: 'fixed',
                    // 在滑鼠位置右下方顯示，避免遮擋
                    left: position.x + 15,
                    top: position.y - 10,
                    width: 280,
                    maxHeight: '70vh',
                    overflowY: 'auto',
                    // 深色玻璃擬態背景
                    background: 'linear-gradient(145deg, rgba(30, 30, 45, 0.98), rgba(20, 20, 35, 0.98))',
                    backdropFilter: 'blur(12px)',
                    borderRadius: 2,
                    border: '1px solid rgba(239, 68, 68, 0.4)', // 紅色邊框提示警告意味
                    boxShadow: '0 8px 32px rgba(239, 68, 68, 0.2), 0 0 60px rgba(239, 68, 68, 0.1)',
                    p: 1.5,
                    zIndex: 9999,
                    pointerEvents: 'none', // 讓滑鼠事件穿透，避免卡住
                    animation: 'fadeIn 0.15s ease-out',
                    '@keyframes fadeIn': {
                        from: { opacity: 0, transform: 'translateY(5px)' },
                        to: { opacity: 1, transform: 'translateY(0)' },
                    },
                }}
            >
                {/* 若有多個事件，顯示匯總標題 */}
                {outages.length > 1 && (
                    <Typography sx={{ fontSize: 10, color: '#f87171', fontWeight: 600, mb: 1 }}>
                        同區域同時間 {outages.length} 件
                    </Typography>
                )}

                {/* 遍歷渲染每個停機事件 */}
                {outages.map((outage, idx) => (
                    <Box key={outage.id} sx={{ mb: idx < outages.length - 1 ? 1.5 : 0, pb: idx < outages.length - 1 ? 1.5 : 0, borderBottom: idx < outages.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                            {/* 警告圖標 */}
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
                            {/* 事件標題與分類 */}
                            <Box sx={{ flex: 1 }}>
                                <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                                    {outage.name} {outage.unit_name || ''}
                                </Typography>
                                <Typography sx={{ fontSize: 9, color: '#f87171', fontWeight: 600 }}>
                                    {outage.stop_category} · {outage.format}
                                </Typography>
                            </Box>
                        </Box>

                        {/* 詳細數據網格 */}
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

                        {/* 額外資訊 (例如影響因子) */}
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
