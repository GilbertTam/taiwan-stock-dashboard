
import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { HjksOutage } from '@/types';

interface OutageSummaryChipProps {
    outages: HjksOutage[];
    onClick: () => void;
    loading?: boolean;
    /** Total number of areas in the system — used for the N in "X/N エリア" */
    totalAreas?: number;
}

/**
 * 停機影響摘要徽章
 * 顯示目前停機件數、受影響地區數與總削減容量 (MW)，點擊後開啟詳細抽屜
 */
export function OutageSummaryChip({ outages, onClick, loading, totalAreas }: OutageSummaryChipProps) {
    const { activeCount, affectedAreas, totalDownMW } = useMemo(() => {
        const active = outages.filter(
            (o) => !o.end_datetime || new Date(o.end_datetime) > new Date()
        );
        const areas = new Set(active.map((o) => o.area).filter(Boolean));
        const totalDownMW = active.reduce((sum, o) => sum + (o.down_capacity ?? 0), 0);
        return { activeCount: active.length, affectedAreas: areas.size, totalDownMW };
    }, [outages]);

    const hasOutages = activeCount > 0;
    const areaTotal = totalAreas ?? 9;

    if (loading) {
        return (
            <Box
                sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1.25,
                    py: 0.5,
                    borderRadius: 1,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    height: 28,
                    minWidth: 80,
                }}
            >
                <Typography sx={{ fontSize: 10, color: 'var(--muted)' }}>...</Typography>
            </Box>
        );
    }

    return (
        <Box
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1.25,
                py: 0.5,
                borderRadius: 1,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                height: 28,
                backgroundColor: hasOutages
                    ? 'rgba(239, 68, 68, 0.12)'
                    : 'rgba(255,255,255,0.05)',
                border: hasOutages
                    ? '1px solid rgba(239, 68, 68, 0.3)'
                    : '1px solid rgba(255,255,255,0.1)',
                '&:hover': {
                    backgroundColor: hasOutages
                        ? 'rgba(239, 68, 68, 0.2)'
                        : 'rgba(255,255,255,0.08)',
                },
                '&:focus-visible': {
                    outline: '2px solid var(--primary)',
                    outlineOffset: 2,
                },
            }}
        >
            {hasOutages ? (
                <WarningAmberIcon sx={{ fontSize: 13, color: '#f87171', flexShrink: 0 }} />
            ) : (
                <CheckCircleOutlineIcon sx={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0 }} />
            )}
            <Typography
                sx={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: hasOutages ? '#f87171' : 'var(--muted)',
                    whiteSpace: 'nowrap',
                    fontFamily: 'monospace',
                }}
            >
                {hasOutages
                    ? `${activeCount}件 · ${affectedAreas}/${areaTotal}エリア${totalDownMW > 0 ? ` · ${totalDownMW.toLocaleString()}MW` : ''}`
                    : '停機なし'}
            </Typography>
        </Box>
    );
}
