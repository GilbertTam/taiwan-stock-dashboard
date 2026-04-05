'use client';

import React, { useState, useMemo } from 'react';
import {
    Box,
    Typography,
    Chip,
} from '@mui/material';
import { SectionHeader } from '@/components/selectors/shared';
import ManualScheduleEditor from './ManualScheduleEditor';
import ScenarioGenerator from './ScenarioGenerator';
import { ManualSchedule, ManualSlot, BatteryConfig } from '@/types/revenueAnalysis';
import { simulateManualClient } from '@/utils/manualSimulationClient';

interface ManualScheduleSidebarProps {
    manualSchedule: ManualSchedule;
    onManualScheduleChange: (schedule: ManualSchedule) => void;
    config: BatteryConfig;
    availableDates: string[];    // "YYYY-MM-DD"
    /** Reference prices (from priceSource) — used by ScenarioGenerator to suggest charge/discharge slots */
    spotPricesByDate?: Record<string, number[]>;
    /** Revenue prices (from global priceBasis) — used by simulateManualClient to calculate revenue */
    revenuePricesByDate?: Record<string, number[]>;
    expanded: boolean;
    onToggleExpanded: () => void;
    /** 參照價格：'actual' or modelKey. Used by ScenarioGenerator for scheduling suggestions. */
    priceSource?: string;
    onPriceSourceChange?: (source: string) => void;
    availableModels?: Array<{ id: string; name: string }>;
    /** Grid region (English), forwarded to ScenarioGenerator for historical price fetching */
    area?: string;
}

export default function ManualScheduleSidebar({
    manualSchedule,
    onManualScheduleChange,
    config,
    availableDates,
    spotPricesByDate,
    revenuePricesByDate,
    expanded,
    onToggleExpanded,
    priceSource = 'actual',
    onPriceSourceChange,
    availableModels = [],
    area,
}: ManualScheduleSidebarProps) {
    const [selectedDate, setSelectedDate] = useState<string | null>(
        availableDates[0] ?? null
    );

    React.useEffect(() => {
        if (availableDates.length > 0 && (!selectedDate || !availableDates.includes(selectedDate))) {
            setSelectedDate(availableDates[0]);
        }
    }, [availableDates, selectedDate]);

    const currentDate = selectedDate ?? availableDates[0] ?? null;
    const currentSlots: ManualSlot[] = currentDate
        ? (manualSchedule[currentDate] ?? Array.from({ length: 48 }, (_, i) => ({ timeStep: i, action: 'Idle' as const, power: null })))
        : Array.from({ length: 48 }, (_, i) => ({ timeStep: i, action: 'Idle' as const, power: null }));

    // Compute the initial SoC (MWh) for the currently-selected date by simulating all preceding days
    const initialSocMwhForCurrentDate = useMemo(() => {
        if (!currentDate) return undefined;
        const precedingDates = availableDates.filter(d => d < currentDate);
        if (precedingDates.length === 0) return undefined;

        let socMwh: number | undefined;
        for (const date of precedingDates) {
            const slots: ManualSlot[] = manualSchedule[date]
                ?? Array.from({ length: 48 }, (_, i) => ({ timeStep: i, action: 'Idle' as const, power: null }));
            const prices = spotPricesByDate?.[date];
            const result = simulateManualClient(slots, config, prices, socMwh);
            const lastSlot = result.slots[result.slots.length - 1];
            if (lastSlot) socMwh = lastSlot.socAfter;
        }
        return socMwh;
    }, [currentDate, availableDates, manualSchedule, config, spotPricesByDate]);

    const handleSlotsChange = (slots: ManualSlot[]) => {
        if (!currentDate) return;
        onManualScheduleChange({ ...manualSchedule, [currentDate]: slots });
    };

    const totalActiveSlots = Object.values(manualSchedule)
        .flat()
        .filter(s => s.action !== 'Idle').length;

    return (
        <>
            <SectionHeader
                expanded={expanded}
                onClick={onToggleExpanded}
                description="手動設定充放電排程"
            >
                手動排程
                {totalActiveSlots > 0 && (
                    <Box component="span" sx={{
                        ml: 1, fontSize: '0.6rem',
                        bgcolor: 'var(--primary)', color: '#000',
                        borderRadius: '8px', px: 0.75, py: 0.1, fontWeight: 700,
                        verticalAlign: 'middle',
                    }}>
                        {totalActiveSlots}
                    </Box>
                )}
            </SectionHeader>

            {/* Animation wrapper: overflow hidden for collapse; inner box scrolls */}
            <Box sx={{
                maxHeight: expanded ? 520 : 0,
                overflow: 'hidden',
                transition: 'max-height 0.32s cubic-bezier(0.4, 0, 0.2, 1)',
            }}>
                <Box sx={{
                    maxHeight: 520,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    p: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.25,
                    '&::-webkit-scrollbar': { width: '5px' },
                    '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
                    '&::-webkit-scrollbar-thumb': { backgroundColor: 'var(--card-border)', borderRadius: '3px' },
                }}>
                    {/* Scenario generator — "排程參照" selector is now inside ScenarioGenerator */}
                    <ScenarioGenerator
                        spotPricesByDate={spotPricesByDate}
                        targetDate={currentDate}
                        config={config}
                        onApply={handleSlotsChange}
                        area={area}
                        priceSource={priceSource}
                        onPriceSourceChange={onPriceSourceChange}
                        availableModels={availableModels}
                        availableDates={availableDates}
                        onApplyAll={(allSlots) => onManualScheduleChange({ ...manualSchedule, ...allSlots })}
                    />

                    {/* Date selector (multi-day) */}
                    {availableDates.length > 1 && (
                        <Box>
                            <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.secondary', mb: 0.5, display: 'block' }}>
                                選擇日期
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {availableDates.map(d => (
                                    <Chip
                                        key={d}
                                        label={d.slice(5)}
                                        size="small"
                                        onClick={() => setSelectedDate(d)}
                                        variant={currentDate === d ? 'filled' : 'outlined'}
                                        sx={{
                                            fontSize: '0.65rem', height: 22,
                                            bgcolor: currentDate === d ? 'var(--primary)' : 'transparent',
                                            color: currentDate === d ? '#000' : 'var(--text-secondary)',
                                            borderColor: currentDate === d ? 'var(--primary)' : 'var(--card-border)',
                                            '&:hover': { bgcolor: currentDate === d ? 'var(--primary)' : 'rgba(255,255,255,0.08)' },
                                        }}
                                    />
                                ))}
                            </Box>
                        </Box>
                    )}

                    {availableDates.length === 0 && (
                        <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
                            請先載入市場資料
                        </Typography>
                    )}

                    {currentDate && (
                        <ManualScheduleEditor
                            slots={currentSlots}
                            config={config}
                            onChange={handleSlotsChange}
                            spotPrices={currentDate ? (revenuePricesByDate ?? spotPricesByDate)?.[currentDate] : undefined}
                            initialSocMwh={initialSocMwhForCurrentDate}
                        />
                    )}

                    <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.secondary', lineHeight: 1.4 }}>
                        排程變更後圖表即時更新（含 SoC 限制與收益計算）。
                    </Typography>
                </Box>
            </Box>
        </>
    );
}
