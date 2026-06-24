'use client';

/**
 * 漲停股主表 — 10 欄（所/代號/名稱/收盤/漲跌%/量/外資/投信/自營/子族群/族群）。
 * 點任一列可展開 BrokerSection（法人籌碼 + 券商買賣超 + 主力動向泡泡圖）。
 * 排序支援：代號、收盤、漲跌%、量、外資、投信、自營。
 */

import React, { useMemo, useState } from 'react';
import { Box, Collapse } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import type { DailyStock } from '@/types/stock';
import { getChangeColor, formatPercent, netColor, formatLots } from '@/utils/twseColor';
import { BrokerSection } from './BrokerSection';

type SortKey = 'code' | 'close' | 'changePercent' | 'volume' | 'foreign' | 'trust' | 'dealer';
type SortDir = 'asc' | 'desc';

const HEAD: { key: SortKey | null; label: string; align: 'left' | 'right' | 'center'; hideMobile?: boolean }[] = [
    { key: null, label: '所', align: 'center' },
    { key: 'code', label: '代號', align: 'left' },
    { key: null, label: '名稱', align: 'left' },
    { key: 'close', label: '收盤', align: 'right' },
    { key: 'changePercent', label: '漲跌%', align: 'right' },
    { key: 'volume', label: '量(張)', align: 'right' },
    { key: 'foreign', label: '外資', align: 'right' },
    { key: 'trust', label: '投信', align: 'right' },
    { key: 'dealer', label: '自營', align: 'right' },
    { key: null, label: '子族群', align: 'left' },
    { key: null, label: '族群', align: 'left', hideMobile: true },
];

const cellSx = {
    px: 1, py: 0.75,
    fontSize: 12.5,
    color: 'var(--foreground)',
    borderBottom: '1px solid var(--card-border)',
    whiteSpace: 'nowrap' as const,
};

export function DailyTable({
    stocks,
    tradeDate,
}: {
    stocks: DailyStock[];
    /** 歷史日期(YYYY-MM-DD)時傳入,BrokerSection 會帶 ?date= 查 DB */
    tradeDate?: string | null;
}) {
    const [sortKey, setSortKey] = useState<SortKey>('code');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [expanded, setExpanded] = useState<string | null>(null);

    const sorted = useMemo(() => {
        const arr = [...stocks];
        arr.sort((a, b) => {
            if (sortKey === 'code') {
                return sortDir === 'asc' ? a.code.localeCompare(b.code) : b.code.localeCompare(a.code);
            }
            const av = a[sortKey] as number;
            const bv = b[sortKey] as number;
            return sortDir === 'asc' ? av - bv : bv - av;
        });
        return arr;
    }, [stocks, sortKey, sortDir]);

    const onSort = (key: SortKey | null) => {
        if (!key) return;
        if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        else {
            setSortKey(key);
            setSortDir(key === 'code' ? 'asc' : 'desc');
        }
    };

    return (
        <Box sx={{ overflowX: 'auto', border: '1px solid var(--card-border)', borderRadius: 2, background: 'var(--card-bg)' }}>
            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                <Box component="thead">
                    <Box component="tr" sx={{ background: 'var(--subtle-bg)' }}>
                        <Box component="th" sx={{ ...cellSx, width: 28 }} />
                        {HEAD.map((h) => (
                            <Box
                                key={h.label}
                                component="th"
                                onClick={() => onSort(h.key)}
                                sx={{
                                    ...cellSx,
                                    textAlign: h.align,
                                    fontWeight: 700,
                                    color: 'var(--muted)',
                                    cursor: h.key ? 'pointer' : 'default',
                                    userSelect: 'none',
                                    display: h.hideMobile ? { xs: 'none', md: 'table-cell' } : 'table-cell',
                                    '&:hover': h.key ? { color: 'var(--primary)' } : {},
                                }}
                            >
                                {h.label}
                                {h.key === sortKey ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                            </Box>
                        ))}
                    </Box>
                </Box>
                <Box component="tbody">
                    {sorted.map((s) => {
                        const c = getChangeColor(s.changePercent);
                        const isOpen = expanded === s.code;
                        return (
                            <React.Fragment key={s.code}>
                                <Box
                                    component="tr"
                                    onClick={() => setExpanded(isOpen ? null : s.code)}
                                    sx={{
                                        cursor: 'pointer',
                                        background: isOpen ? 'var(--hover-bg)' : 'transparent',
                                        '&:hover': { background: 'var(--hover-bg)' },
                                    }}
                                >
                                    <Box component="td" sx={{ ...cellSx, textAlign: 'center', width: 28 }}>
                                        <KeyboardArrowDownIcon
                                            sx={{
                                                fontSize: 16,
                                                color: 'var(--muted)',
                                                transform: isOpen ? 'rotate(180deg)' : 'none',
                                                transition: 'transform 0.15s',
                                            }}
                                        />
                                    </Box>
                                    <Box component="td" sx={{ ...cellSx, textAlign: 'center' }}>
                                        <Box
                                            component="span"
                                            sx={{
                                                fontSize: 11,
                                                px: 0.5,
                                                borderRadius: '4px',
                                                color: s.market === 'twse' ? '#FBBF24' : '#60A5FA',
                                                border: `1px solid ${s.market === 'twse' ? '#FBBF24' : '#60A5FA'}`,
                                            }}
                                        >
                                            {s.market === 'twse' ? '市' : '櫃'}
                                        </Box>
                                    </Box>
                                    <Box component="td" sx={{ ...cellSx, fontWeight: 700, fontFamily: 'monospace' }}>
                                        {s.code}
                                    </Box>
                                    <Box component="td" sx={cellSx}>{s.name}</Box>
                                    <Box component="td" sx={{ ...cellSx, textAlign: 'right', fontWeight: 700, color: c.text }}>
                                        {s.close.toFixed(2)}
                                    </Box>
                                    <Box component="td" sx={{ ...cellSx, textAlign: 'right' }}>
                                        <Box
                                            component="span"
                                            sx={{
                                                background: c.bg, color: c.fg,
                                                px: 0.75, py: 0.25, borderRadius: '4px',
                                                fontWeight: 700, fontSize: 12,
                                            }}
                                        >
                                            {formatPercent(s.changePercent)}
                                        </Box>
                                    </Box>
                                    <Box component="td" sx={{ ...cellSx, textAlign: 'right', color: 'var(--muted)' }}>
                                        {s.volume.toLocaleString('en-US')}
                                    </Box>
                                    <Box component="td" sx={{ ...cellSx, textAlign: 'right', color: netColor(s.foreign) }}>
                                        {formatLots(s.foreign)}
                                    </Box>
                                    <Box component="td" sx={{ ...cellSx, textAlign: 'right', color: netColor(s.trust) }}>
                                        {formatLots(s.trust)}
                                    </Box>
                                    <Box component="td" sx={{ ...cellSx, textAlign: 'right', color: netColor(s.dealer) }}>
                                        {formatLots(s.dealer)}
                                    </Box>
                                    <Box component="td" sx={{ ...cellSx, color: 'var(--primary)' }}>
                                        {s.concept || '—'}
                                    </Box>
                                    <Box component="td" sx={{ ...cellSx, display: { xs: 'none', md: 'table-cell' }, color: 'var(--muted)' }}>
                                        {s.concept_reason || '—'}
                                    </Box>
                                </Box>
                                <Box component="tr">
                                    <Box component="td" colSpan={HEAD.length + 1} sx={{ p: 0, border: 0 }}>
                                        <Collapse in={isOpen} unmountOnExit>
                                            <BrokerSection stock={s} tradeDate={tradeDate ?? null} />
                                        </Collapse>
                                    </Box>
                                </Box>
                            </React.Fragment>
                        );
                    })}
                </Box>
            </Box>
        </Box>
    );
}
