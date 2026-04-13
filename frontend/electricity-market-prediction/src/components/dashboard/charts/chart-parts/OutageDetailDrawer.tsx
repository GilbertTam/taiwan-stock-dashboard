
import React, { useMemo } from 'react';
import { Box, Typography, IconButton, Drawer, Divider } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BoltIcon from '@mui/icons-material/Bolt';
import { format, differenceInDays } from 'date-fns';
import { HjksOutage } from '@/types';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

interface OutageDetailDrawerProps {
    open: boolean;
    onClose: () => void;
    outages: HjksOutage[];
    darkMode: boolean;
}

// Stop type keys for matching raw data (Japanese values from ES)
const STOP_TYPE_MATCH_ORDER = ['緊急停止', '事故停止', '計画外停止', '出力低下', '計画停止'] as const;

// Map match keys to i18n translation keys
const STOP_TYPE_I18N_MAP: Record<string, string> = {
    '緊急停止': 'outage.drawer.types.emergency',
    '事故停止': 'outage.drawer.types.accident',
    '計画外停止': 'outage.drawer.types.unplanned',
    '出力低下': 'outage.drawer.types.reducedOutput',
    '計画停止': 'outage.drawer.types.planned',
};

// Color config per stop type (keyed by match key)
const STOP_TYPE_COLORS: Record<string, { bg: string; text: string; border: string; accent: string }> = {
    '緊急停止':   { bg: 'rgba(239,68,68,0.1)',   text: '#ef4444', border: 'rgba(239,68,68,0.25)', accent: '#ef4444' },
    '事故停止':   { bg: 'rgba(239,68,68,0.1)',   text: '#ef4444', border: 'rgba(239,68,68,0.25)', accent: '#ef4444' },
    '計画外停止': { bg: 'rgba(249,115,22,0.1)',  text: '#f97316', border: 'rgba(249,115,22,0.25)', accent: '#f97316' },
    '出力低下':   { bg: 'rgba(168,85,247,0.1)',  text: '#a855f7', border: 'rgba(168,85,247,0.25)', accent: '#a855f7' },
    '計画停止':   { bg: 'rgba(59,130,246,0.1)',  text: '#3b82f6', border: 'rgba(59,130,246,0.25)', accent: '#3b82f6' },
};

const DEFAULT_COLORS = {
    bg: 'rgba(255,255,255,0.05)',
    text: 'var(--muted)',
    border: 'rgba(255,255,255,0.1)',
    accent: 'rgba(255,255,255,0.3)',
};

function getStopTypeColors(type: string | undefined) {
    if (!type) return DEFAULT_COLORS;
    if (type.includes('緊急') || type.includes('事故')) return STOP_TYPE_COLORS['緊急停止'];
    if (type.includes('計画外')) return STOP_TYPE_COLORS['計画外停止'];
    if (type.includes('出力低下')) return STOP_TYPE_COLORS['出力低下'];
    if (type.includes('計画')) return STOP_TYPE_COLORS['計画停止'];
    return DEFAULT_COLORS;
}

function formatDuration(o: HjksOutage, t: TFunction): string {
    if (!o.start_datetime) return '-';
    const start = new Date(o.start_datetime);
    if (!o.end_datetime) return `${format(start, 'MM/dd HH:mm')} ~ ${t('outage.drawer.undetermined')}`;
    const end = new Date(o.end_datetime);
    const days = differenceInDays(end, start);
    if (days > 0) return `${format(start, 'MM/dd')} ~ ${format(end, 'MM/dd')} (${t('outage.drawer.days', { count: days })})`;
    return `${format(start, 'MM/dd HH:mm')} ~ ${format(end, 'HH:mm')}`;
}

function formatCapacity(o: HjksOutage): { value: string; estimated: boolean } {
    if (o.down_capacity != null) return { value: o.down_capacity.toLocaleString(), estimated: false };
    if (o.max_capacity != null) return { value: o.max_capacity.toLocaleString(), estimated: true };
    return { value: '-', estimated: false };
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <Box
            sx={{
                flex: 1,
                px: 1.5,
                py: 1,
                borderRadius: 1,
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                textAlign: 'center',
            }}
        >
            <Typography sx={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.25 }}>
                {label}
            </Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: color ?? 'var(--foreground)', fontFamily: 'monospace' }}>
                {value}
            </Typography>
        </Box>
    );
}

export function OutageDetailDrawer({ open, onClose, outages, darkMode }: OutageDetailDrawerProps) {
    const { t } = useTranslation('dashboard');

    const { activeOutages, largestOutage, grouped, endedCount } = useMemo(() => {
        const now = new Date();
        const active = outages.filter((o) => !o.end_datetime || new Date(o.end_datetime) > now);
        const ended = outages.filter((o) => o.end_datetime && new Date(o.end_datetime) <= now);

        const largest = active.reduce<HjksOutage | null>((prev, curr) => {
            const currCap = curr.down_capacity ?? curr.max_capacity ?? 0;
            const prevCap = prev ? (prev.down_capacity ?? prev.max_capacity ?? 0) : 0;
            return currCap > prevCap ? curr : prev;
        }, null);

        const groups: Array<{ type: string; i18nKey: string; items: HjksOutage[]; colors: typeof DEFAULT_COLORS }> = STOP_TYPE_MATCH_ORDER
            .map((type) => ({
                type: type as string,
                i18nKey: STOP_TYPE_I18N_MAP[type],
                items: active.filter((o) => {
                    const st = o.stop_type || '';
                    if (type === '緊急停止') return st.includes('緊急') || st.includes('事故');
                    if (type === '事故停止') return false; // merged into 緊急停止
                    if (type === '計画外停止') return st.includes('計画外');
                    if (type === '出力低下') return st.includes('出力低下');
                    if (type === '計画停止') return st.includes('計画') && !st.includes('計画外');
                    return false;
                }),
                colors: getStopTypeColors(type),
            }))
            .filter((g) => g.items.length > 0);

        const categorized = new Set(groups.flatMap((g) => g.items.map((i) => i.id)));
        const uncategorized = active.filter((o) => !categorized.has(o.id));
        if (uncategorized.length > 0) {
            groups.push({ type: 'other', i18nKey: 'outage.drawer.types.other', items: uncategorized, colors: DEFAULT_COLORS });
        }

        return {
            activeOutages: active,
            largestOutage: largest,
            grouped: groups,
            endedCount: ended.length,
        };
    }, [outages]);

    const largestCap = largestOutage
        ? (largestOutage.down_capacity ?? largestOutage.max_capacity ?? 0)
        : 0;

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            variant="temporary"
            PaperProps={{
                sx: {
                    width: 340,
                    backgroundColor: darkMode
                        ? 'rgba(15, 18, 30, 0.72)'
                        : 'rgba(255, 255, 255, 0.78)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    borderLeft: '1px solid var(--card-border)',
                    backgroundImage: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                },
            }}
            slotProps={{
                backdrop: { sx: { backgroundColor: 'rgba(0,0,0,0.25)' } },
            }}
            sx={{ zIndex: 1300 }}
        >
            {/* Header */}
            <Box
                sx={{
                    px: 2,
                    py: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    borderBottom: '1px solid var(--card-border)',
                    flexShrink: 0,
                }}
            >
                <WarningAmberIcon sx={{ fontSize: 16, color: '#f87171' }} />
                <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>
                        {t('outage.drawer.title')}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.3 }}>
                        {t('outage.drawer.description')}
                    </Typography>
                </Box>
                <IconButton size="small" onClick={onClose} sx={{ color: 'var(--muted)', flexShrink: 0 }}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Box>

            {/* Scrollable content */}
            <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>

                {activeOutages.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography sx={{ fontSize: 12, color: 'var(--muted)' }}>{t('outage.drawer.noActiveOutages')}</Typography>
                    </Box>
                ) : (
                    <>
                        {/* Summary stats */}
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <StatBox label={t('outage.drawer.count')} value={t('outage.drawer.items', { count: activeOutages.length })} color="#f87171" />
                            <StatBox
                                label={t('outage.drawer.maxSingle')}
                                value={largestOutage
                                    ? `${largestCap.toLocaleString()} MW`
                                    : '-'}
                            />
                        </Box>

                        {largestOutage && (
                            <Typography sx={{ fontSize: 10, color: 'var(--muted)', textAlign: 'right', mt: -0.5 }}>
                                {t('outage.drawer.largest', { name: largestOutage.name, unit: largestOutage.unit_name || '' })}
                            </Typography>
                        )}

                        <Divider sx={{ borderColor: 'var(--card-border)' }} />

                        {/* Grouped list */}
                        {grouped.map(({ type, i18nKey, items, colors }) => (
                            <Box key={type}>
                                {/* Group header */}
                                <Box
                                    sx={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                        px: 1,
                                        py: 0.25,
                                        borderRadius: 0.75,
                                        backgroundColor: colors.bg,
                                        border: `1px solid ${colors.border}`,
                                        mb: 0.75,
                                    }}
                                >
                                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: colors.text }}>
                                        {t(i18nKey)}
                                    </Typography>
                                    <Typography sx={{ fontSize: 10, color: colors.text, opacity: 0.7 }}>
                                        {t('outage.drawer.items', { count: items.length })}
                                    </Typography>
                                </Box>

                                {/* Outage items */}
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                    {items.map((outage) => {
                                        const cap = formatCapacity(outage);
                                        return (
                                            <Box
                                                key={outage.id}
                                                sx={{
                                                    display: 'flex',
                                                    borderRadius: 1,
                                                    overflow: 'hidden',
                                                    backgroundColor: 'rgba(255,255,255,0.03)',
                                                    border: `1px solid rgba(255,255,255,0.07)`,
                                                }}
                                            >
                                                {/* Left accent bar */}
                                                <Box sx={{ width: 3, flexShrink: 0, backgroundColor: colors.accent }} />

                                                <Box sx={{ flex: 1, px: 1.25, py: 1, minWidth: 0 }}>
                                                    {/* Plant name + area */}
                                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
                                                        <Typography
                                                            sx={{
                                                                fontSize: 11,
                                                                fontWeight: 700,
                                                                color: 'var(--foreground)',
                                                                lineHeight: 1.3,
                                                                flex: 1,
                                                                minWidth: 0,
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            {outage.name}
                                                            {outage.unit_name && (
                                                                <Box component="span" sx={{ fontWeight: 400, color: 'var(--muted)', ml: 0.5 }}>
                                                                    {outage.unit_name}
                                                                </Box>
                                                            )}
                                                        </Typography>
                                                        {/* Area chip */}
                                                        <Box
                                                            sx={{
                                                                flexShrink: 0,
                                                                px: 0.75,
                                                                py: 0.125,
                                                                borderRadius: 0.5,
                                                                backgroundColor: 'rgba(255,255,255,0.08)',
                                                                border: '1px solid rgba(255,255,255,0.12)',
                                                            }}
                                                        >
                                                            <Typography sx={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'monospace' }}>
                                                                {outage.area}
                                                            </Typography>
                                                        </Box>
                                                    </Box>

                                                    {/* Capacity + duration */}
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: colors.text, fontFamily: 'monospace' }}>
                                                            {cap.value} MW{cap.estimated && <Box component="span" sx={{ fontSize: 9, fontWeight: 400, ml: 0.25 }}>({t('outage.drawer.estimated')})</Box>}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'monospace' }}>
                                                            {formatDuration(outage, t)}
                                                        </Typography>
                                                    </Box>

                                                    {/* Factor */}
                                                    {outage.factor && (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.375 }}>
                                                            <BoltIcon sx={{ fontSize: 10, color: '#facc15', flexShrink: 0 }} />
                                                            <Typography
                                                                sx={{
                                                                    fontSize: 9,
                                                                    color: 'var(--muted)',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                }}
                                                            >
                                                                {outage.factor}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                </Box>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </Box>
                        ))}
                    </>
                )}

                {/* Ended outage count */}
                {endedCount > 0 && (
                    <Typography sx={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center', mt: 0.5 }}>
                        {t('outage.drawer.endedCount', { count: endedCount })}
                    </Typography>
                )}
            </Box>
        </Drawer>
    );
}
