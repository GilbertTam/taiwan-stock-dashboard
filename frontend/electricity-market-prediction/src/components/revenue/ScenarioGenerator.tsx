'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
    Box,
    Typography,
    ToggleButton,
    ToggleButtonGroup,
    Slider,
    Button,
    Chip,
    Tooltip,
    CircularProgress,
    Select,
    MenuItem,
    FormControl,
} from '@mui/material';
import { format, subDays, parseISO } from 'date-fns';
import { fetchActualPrices } from '@/services/marketApi';
import { fetchPredictions } from '@/services/predictionsApi';
import { ManualSlot, BatteryConfig } from '@/types/revenueAnalysis';
import { useTranslation } from 'react-i18next';
import {
    ScenarioType,
    NDayAvgParams,
    PercentileParams,
    FixedWindowParams,
    CycleTargetParams,
    SpreadThresholdParams,
    PeakValleyParams,
    PriceMomentumParams,
    ConservativeParams,
    calcPhysicsSlots,
    generateNDayAvgScenario,
    generatePercentileScenario,
    generateFixedWindowScenario,
    generateCycleTargetScenario,
    generateSpreadThresholdScenario,
    generatePeakValleyScenario,
    generatePriceMomentumScenario,
    generateConservativeScenario,
} from '@/utils/scenarioGenerators';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert time-step index (0–47) to "HH:MM" label. */
function stepToTime(step: number): string {
    const totalMinutes = step * 30;
    const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
    const m = (totalMinutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
}

const SCENARIO_TYPES: ScenarioType[] = [
    'nday-avg', 'percentile', 'fixed-window', 'cycle-target',
    'spread-threshold', 'peak-valley', 'price-momentum', 'conservative',
];

// ---------------------------------------------------------------------------
// Mini slot preview bar
// ---------------------------------------------------------------------------

function SlotPreviewBar({ slots }: { slots: ManualSlot[] }) {
    return (
        <Box sx={{ display: 'flex', gap: '1px', mt: 0.75, mb: 0.25 }}>
            {slots.map((slot, i) => (
                <Box
                    key={i}
                    sx={{
                        flex: 1,
                        height: 10,
                        borderRadius: '1px',
                        bgcolor:
                            slot.action === 'Charge' ? '#29b6f6' :
                            slot.action === 'Discharge' ? '#ef5350' :
                            'rgba(255,255,255,0.08)',
                    }}
                />
            ))}
        </Box>
    );
}

// ---------------------------------------------------------------------------
// Shared slider row component
// ---------------------------------------------------------------------------

interface SliderRowProps {
    label: string;
    tooltip?: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    format?: (v: number) => string;
    onChange: (v: number) => void;
}

function SliderRow({ label, tooltip, value, min, max, step = 1, format, onChange }: SliderRowProps) {
    const display = format ? format(value) : String(value);
    const content = (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{
                fontSize: '0.68rem', color: 'text.secondary',
                minWidth: 64, flexShrink: 0,
                borderBottom: tooltip ? '1px dashed rgba(255,255,255,0.2)' : 'none',
                cursor: tooltip ? 'help' : 'default',
            }}>
                {label}
            </Typography>
            <Slider
                size="small"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(_, v) => onChange(v as number)}
                sx={{
                    flex: 1,
                    color: 'var(--primary)',
                    '& .MuiSlider-thumb': { width: 10, height: 10 },
                    '& .MuiSlider-track': { height: 3 },
                    '& .MuiSlider-rail': { height: 3, opacity: 0.3 },
                }}
            />
            <Typography sx={{ fontSize: '0.68rem', color: 'var(--text-primary)', minWidth: 36, textAlign: 'right', flexShrink: 0 }}>
                {display}
            </Typography>
        </Box>
    );
    if (!tooltip) return content;
    return <Tooltip title={tooltip} placement="right" arrow>{content}</Tooltip>;
}

// ---------------------------------------------------------------------------
// Parameter panels per scenario
// ---------------------------------------------------------------------------

function NDayAvgPanel({ params, onChange, config }: { params: NDayAvgParams; onChange: (p: NDayAvgParams) => void; config: BatteryConfig }) {
    const { t } = useTranslation('siteRevenue');
    const { slotsPerCharge, slotsPerDischarge } = calcPhysicsSlots(config);
    const maxCharge = slotsPerCharge * params.cycleCount;
    const maxDischarge = slotsPerDischarge * params.cycleCount;
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <SliderRow label={t('scenario.params.ndays')} tooltip={t('scenario.params.ndaysTooltip')} value={params.nDays} min={1} max={30}
                format={v => `${v} ${t('scenario.params.unitDays')}`}
                onChange={v => onChange({ ...params, nDays: v })} />
            <SliderRow label={t('scenario.params.chargeSlotCount')} tooltip={t('scenario.params.chargeSlotCountTooltip', { max: maxCharge })} value={Math.min(params.chargeSlotCount, maxCharge)} min={1} max={Math.max(1, maxCharge)}
                format={v => `${v} ${t('scenario.params.unitSlots')}`}
                onChange={v => onChange({ ...params, chargeSlotCount: v })} />
            <SliderRow label={t('scenario.params.dischargeSlotCount')} tooltip={t('scenario.params.dischargeSlotCountTooltip', { max: maxDischarge })} value={Math.min(params.dischargeSlotCount, maxDischarge)} min={1} max={Math.max(1, maxDischarge)}
                format={v => `${v} ${t('scenario.params.unitSlots')}`}
                onChange={v => onChange({ ...params, dischargeSlotCount: v })} />
            <SliderRow label={t('scenario.params.cycleCount')} tooltip={t('scenario.params.cycleCountTooltip')} value={params.cycleCount} min={1} max={3}
                format={v => `${v} ${t('scenario.params.unitCycles')}`}
                onChange={v => onChange({ ...params, cycleCount: v })} />
        </Box>
    );
}

function PercentilePanel({ params, onChange, config }: { params: PercentileParams; onChange: (p: PercentileParams) => void; config: BatteryConfig }) {
    const { t } = useTranslation('siteRevenue');
    const { slotsPerCharge, slotsPerDischarge } = calcPhysicsSlots(config);
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <SliderRow label={t('scenario.params.chargeThreshold')} tooltip={t('scenario.params.chargeThresholdTooltip')} value={Math.round(params.chargeThresholdPct * 100)} min={5} max={50}
                format={v => `≤ ${v}%`}
                onChange={v => onChange({ ...params, chargeThresholdPct: v / 100 })} />
            <SliderRow label={t('scenario.params.dischargeThreshold')} tooltip={t('scenario.params.dischargeThresholdTooltip')} value={Math.round(params.dischargeThresholdPct * 100)} min={50} max={95}
                format={v => `≥ ${v}%`}
                onChange={v => onChange({ ...params, dischargeThresholdPct: v / 100 })} />
            <SliderRow label={t('scenario.params.cycleCount')} tooltip={t('scenario.params.cycleCountPhysicsTooltip', { ch: slotsPerCharge, dis: slotsPerDischarge })} value={params.cycleCount} min={1} max={3}
                format={v => `${v} ${t('scenario.params.unitCycles')}`}
                onChange={v => onChange({ ...params, cycleCount: v })} />
        </Box>
    );
}

function FixedWindowPanel({ params, onChange }: { params: FixedWindowParams; onChange: (p: FixedWindowParams) => void }) {
    const { t } = useTranslation('siteRevenue');
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <SliderRow label={t('scenario.params.chargeStart')} tooltip={t('scenario.params.chargeStartTooltip')} value={params.chargeStart} min={0} max={47}
                format={stepToTime}
                onChange={v => onChange({ ...params, chargeStart: Math.min(v, params.chargeEnd) })} />
            <SliderRow label={t('scenario.params.chargeEnd')} tooltip={t('scenario.params.chargeEndTooltip')} value={params.chargeEnd} min={0} max={47}
                format={stepToTime}
                onChange={v => onChange({ ...params, chargeEnd: Math.max(v, params.chargeStart) })} />
            <SliderRow label={t('scenario.params.dischargeStart')} tooltip={t('scenario.params.dischargeStartTooltip')} value={params.dischargeStart} min={0} max={47}
                format={stepToTime}
                onChange={v => onChange({ ...params, dischargeStart: Math.min(v, params.dischargeEnd) })} />
            <SliderRow label={t('scenario.params.dischargeEnd')} tooltip={t('scenario.params.dischargeEndTooltip')} value={params.dischargeEnd} min={0} max={47}
                format={stepToTime}
                onChange={v => onChange({ ...params, dischargeEnd: Math.max(v, params.dischargeStart) })} />
        </Box>
    );
}

function CycleTargetPanel({ params, onChange, config }: { params: CycleTargetParams; onChange: (p: CycleTargetParams) => void; config: BatteryConfig }) {
    const { t } = useTranslation('siteRevenue');
    const { slotsPerCharge, slotsPerDischarge } = calcPhysicsSlots(config);
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <SliderRow label={t('scenario.params.cycleCount')} tooltip={t('scenario.params.cycleCountTargetTooltip')} value={params.cycleCount} min={1} max={3}
                format={v => `${v} ${t('scenario.params.unitCycles')}`}
                onChange={v => onChange({ cycleCount: v })} />
            <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>
                {t('scenario.params.autoCalcSlots', {
                    ch: Math.min(24, slotsPerCharge * params.cycleCount),
                    dis: Math.min(24, slotsPerDischarge * params.cycleCount),
                })}
            </Typography>
        </Box>
    );
}

function SpreadThresholdPanel({ params, onChange }: { params: SpreadThresholdParams; onChange: (p: SpreadThresholdParams) => void }) {
    const { t } = useTranslation('siteRevenue');
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <SliderRow label={t('scenario.params.minSpread')} tooltip={t('scenario.params.minSpreadTooltip')} value={params.minSpread} min={0} max={30} step={0.5}
                format={v => `${v} ¥/kWh`}
                onChange={v => onChange({ ...params, minSpread: v })} />
            <SliderRow label={t('scenario.params.cycleCount')} tooltip={t('scenario.params.cycleCountSpreadTooltip')} value={params.cycleCount} min={1} max={2}
                format={v => `${v} ${t('scenario.params.unitCycles')}`}
                onChange={v => onChange({ ...params, cycleCount: v })} />
        </Box>
    );
}

function PeakValleyPanel({ params, onChange }: { params: PeakValleyParams; onChange: (p: PeakValleyParams) => void }) {
    const { t } = useTranslation('siteRevenue');
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <SliderRow label={t('scenario.params.morningPeakSlots')} tooltip={t('scenario.params.morningPeakSlotsTooltip')} value={params.morningPeakSlots} min={1} max={8}
                format={v => `${v} ${t('scenario.params.unitSlots')}`}
                onChange={v => onChange({ ...params, morningPeakSlots: v })} />
            <SliderRow label={t('scenario.params.eveningPeakSlots')} tooltip={t('scenario.params.eveningPeakSlotsTooltip')} value={params.eveningPeakSlots} min={1} max={8}
                format={v => `${v} ${t('scenario.params.unitSlots')}`}
                onChange={v => onChange({ ...params, eveningPeakSlots: v })} />
            <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>
                {t('scenario.params.chargeWindow')}
            </Typography>
        </Box>
    );
}

function PriceMomentumPanel({ params, onChange }: { params: PriceMomentumParams; onChange: (p: PriceMomentumParams) => void }) {
    const { t } = useTranslation('siteRevenue');
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <SliderRow label={t('scenario.params.refDays')} tooltip={t('scenario.params.refDaysTooltip')} value={params.nDays} min={1} max={14}
                format={v => `${v} ${t('scenario.params.unitDays')}`}
                onChange={v => onChange({ ...params, nDays: v })} />
            <SliderRow label={t('scenario.params.chargePct')} tooltip={t('scenario.params.chargePctTooltip')} value={Math.round(params.chargeBelow * 100)} min={10} max={40}
                format={v => `< ${v}%`}
                onChange={v => onChange({ ...params, chargeBelow: v / 100 })} />
            <SliderRow label={t('scenario.params.dischargePct')} tooltip={t('scenario.params.dischargePctTooltip')} value={Math.round(params.dischargeAbove * 100)} min={60} max={90}
                format={v => `> ${v}%`}
                onChange={v => onChange({ ...params, dischargeAbove: v / 100 })} />
            <SliderRow label={t('scenario.params.cycleCount')} tooltip={t('scenario.params.cycleCountMomentumTooltip')} value={params.cycleCount} min={1} max={2}
                format={v => `${v} ${t('scenario.params.unitCycles')}`}
                onChange={v => onChange({ ...params, cycleCount: v })} />
        </Box>
    );
}

function ConservativePanel({ params, onChange }: { params: ConservativeParams; onChange: (p: ConservativeParams) => void }) {
    const { t } = useTranslation('siteRevenue');
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <SliderRow label={t('scenario.params.extremePct')} tooltip={t('scenario.params.extremePctTooltip')} value={params.topPct} min={5} max={25}
                format={v => `${v}%`}
                onChange={v => onChange({ ...params, topPct: v })} />
            <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>
                {t('scenario.params.fixedOneCycle')}
            </Typography>
        </Box>
    );
}

// ---------------------------------------------------------------------------
// Cycle indicator row
// ---------------------------------------------------------------------------

function CycleIndicator({
    slots,
    config,
}: {
    slots: ManualSlot[];
    config: BatteryConfig;
}) {
    const { t } = useTranslation('siteRevenue');
    const dischargeCount = slots.filter(s => s.action === 'Discharge').length;
    const estimatedCycles = config.E_cap > 0
        ? (dischargeCount * config.P_max_dis * config.dt) / (config.eff_dis * config.E_cap)
        : 0;
    const overLimit = estimatedCycles > config.Cycle_limit + 0.05;

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography sx={{
                fontSize: '0.62rem',
                color: overLimit ? 'warning.main' : 'text.secondary',
            }}>
                {t('scenario.estCycles', { est: estimatedCycles.toFixed(2), limit: config.Cycle_limit })}
            </Typography>
            {overLimit && (
                <Typography sx={{ fontSize: '0.60rem', color: 'warning.main' }}>
                    {t('scenario.overLimit')}
                </Typography>
            )}
        </Box>
    );
}

// ---------------------------------------------------------------------------
// Historical price fetcher
// ---------------------------------------------------------------------------

/**
 * Fetches up to 30 days of historical spot prices before `targetDate`.
 * For 'actual' source uses the JEPX actual price API.
 * For a model source (format 'modelId|modelName') uses the predictions API (price_50).
 */
async function fetchHistoricalPrices(
    area: string,
    priceSource: string,
    targetDate: string,
): Promise<Record<string, number[]>> {
    const target = parseISO(targetDate);
    const startStr = format(subDays(target, 30), 'yyyyMMdd');
    const endStr   = format(subDays(target, 1),  'yyyyMMdd');
    const result: Record<string, number[]> = {};

    if (priceSource === 'actual') {
        const rows = await fetchActualPrices({ start_date: startStr, end_date: endStr, name: area });
        for (const row of rows) {
            if (!result[row.trade_date]) result[row.trade_date] = new Array(48).fill(0);
            result[row.trade_date][row.time_code - 1] = row.price; // time_code is 1-indexed
        }
    } else {
        const modelName = priceSource.split('|')[1];
        const rows = await fetchPredictions({
            start_date: startStr,
            end_date: endStr,
            area_name: area,
            model_name: modelName,
            latest_only: true,
        });
        for (const row of rows) {
            if (!result[row.trade_date]) result[row.trade_date] = new Array(48).fill(0);
            result[row.trade_date][row.time_code - 1] = row.price_50;
        }
    }
    return result;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ScenarioGeneratorProps {
    spotPricesByDate?: Record<string, number[]>;
    targetDate: string | null;
    config: BatteryConfig;
    onApply: (slots: ManualSlot[]) => void;
    /** Grid region (English) — required for historical price fetching */
    area?: string;
    /** 'actual' or 'modelId|modelName' — determines which price series to fetch for history */
    priceSource?: string;
    /** Callback to update priceSource in parent — enables the in-component 排程參照 selector */
    onPriceSourceChange?: (source: string) => void;
    /** Models with prediction data in current range — shown in the 排程參照 dropdown */
    availableModels?: Array<{ id: string; name: string }>;
    /** All available dates — enables "apply to all days" button */
    availableDates?: string[];
    /** Called when user applies scenario to every available date (each day computed independently) */
    onApplyAll?: (schedule: Record<string, ManualSlot[]>) => void;
}

export default function ScenarioGenerator({
    spotPricesByDate,
    targetDate,
    config,
    onApply,
    area,
    priceSource,
    onPriceSourceChange,
    availableModels = [],
    availableDates,
    onApplyAll,
}: ScenarioGeneratorProps) {
    const { t } = useTranslation('siteRevenue');
    const [open, setOpen] = useState(false);
    const [scenarioType, setScenarioType] = useState<ScenarioType>('nday-avg');
    const [appliedLabel, setAppliedLabel] = useState<string | null>(null);

    const scenarioLabels = useMemo<Record<ScenarioType, string>>(() => ({
        'nday-avg':         t('scenario.labels.ndayAvg'),
        'percentile':       t('scenario.labels.percentile'),
        'fixed-window':     t('scenario.labels.fixedWindow'),
        'cycle-target':     t('scenario.labels.cycleTarget'),
        'spread-threshold': t('scenario.labels.spreadThreshold'),
        'peak-valley':      t('scenario.labels.peakValley'),
        'price-momentum':   t('scenario.labels.priceMomentum'),
        'conservative':     t('scenario.labels.conservative'),
    }), [t]);

    const scenarioDescriptions = useMemo<Record<ScenarioType, string>>(() => ({
        'nday-avg':         t('scenario.descriptions.ndayAvg'),
        'percentile':       t('scenario.descriptions.percentile'),
        'fixed-window':     t('scenario.descriptions.fixedWindow'),
        'cycle-target':     t('scenario.descriptions.cycleTarget'),
        'spread-threshold': t('scenario.descriptions.spreadThreshold'),
        'peak-valley':      t('scenario.descriptions.peakValley'),
        'price-momentum':   t('scenario.descriptions.priceMomentum'),
        'conservative':     t('scenario.descriptions.conservative'),
    }), [t]);

    // Historical price cache — keyed by `area|priceSource` to auto-invalidate on source change
    const historicalCacheRef = useRef<{ key: string; data: Record<string, number[]> } | null>(null);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [hasHistoryError, setHasHistoryError] = useState(false);

    // Model-fill cache — stores model predictions for missing historical dates
    const modelFillCacheRef = useRef<{ key: string; data: Record<string, number[]> } | null>(null);
    const [isModelFillLoading, setIsModelFillLoading] = useState(false);
    // 'null' = no fill; otherwise a modelKey string (e.g. 'modelId|modelName')
    const [fillGapsWithModel, setFillGapsWithModel] = useState<string | null>(null);

    const { slotsPerCharge, slotsPerDischarge } = useMemo(() => calcPhysicsSlots(config), [config]);

    // State for each scenario's params
    const [ndayParams, setNdayParams] = useState<NDayAvgParams>({
        nDays: 7,
        chargeSlotCount: slotsPerCharge,
        dischargeSlotCount: slotsPerDischarge,
        cycleCount: 1,
    });
    const [percentileParams, setPercentileParams] = useState<PercentileParams>({
        chargeThresholdPct: 0.30,
        dischargeThresholdPct: 0.70,
        cycleCount: 1,
    });
    const [fixedParams, setFixedParams] = useState<FixedWindowParams>({
        chargeStart: 2,
        chargeEnd: 15,
        dischargeStart: 34,
        dischargeEnd: 43,
    });
    const [cycleParams, setCycleParams] = useState<CycleTargetParams>({ cycleCount: 1 });
    const [spreadParams, setSpreadParams] = useState<SpreadThresholdParams>({ minSpread: 5.0, cycleCount: 1 });
    const [peakValleyParams, setPeakValleyParams] = useState<PeakValleyParams>({ morningPeakSlots: 4, eveningPeakSlots: 4 });
    const [momentumParams, setMomentumParams] = useState<PriceMomentumParams>({
        nDays: 5,
        chargeBelow: 0.25,
        dischargeAbove: 0.75,
        cycleCount: 1,
    });
    const [conservativeParams, setConservativeParams] = useState<ConservativeParams>({ topPct: 10 });

    // Lazy-fetch historical prices when a history-dependent scenario is active
    const needsHistoricalData = open && (scenarioType === 'nday-avg' || scenarioType === 'price-momentum');

    useEffect(() => {
        if (!needsHistoricalData || !targetDate || !area) return;
        const cacheKey = `${area}|${priceSource ?? 'actual'}`;
        if (historicalCacheRef.current?.key === cacheKey) return;

        let cancelled = false;
        setIsHistoryLoading(true);
        setHasHistoryError(false);

        fetchHistoricalPrices(area, priceSource ?? 'actual', targetDate)
            .then(data => {
                if (cancelled) return;
                historicalCacheRef.current = { key: cacheKey, data };
                setIsHistoryLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setHasHistoryError(true);
                setIsHistoryLoading(false);
            });
        return () => { cancelled = true; };
    }, [needsHistoricalData, area, priceSource, targetDate]);

    // Reset fillGapsWithModel when scenario type changes away from history-dependent ones
    useEffect(() => {
        if (scenarioType !== 'nday-avg' && scenarioType !== 'price-momentum') {
            setFillGapsWithModel(null);
        }
    }, [scenarioType]);

    // Reset fillGapsWithModel when there are no longer any available models
    useEffect(() => {
        if (availableModels.length === 0) setFillGapsWithModel(null);
    }, [availableModels]);

    // Fetch model predictions for dates where actual historical data is missing
    useEffect(() => {
        if (!fillGapsWithModel || !needsHistoricalData || !targetDate || !area) return;
        const fillKey = `${area}|${fillGapsWithModel}|${targetDate}`;
        if (modelFillCacheRef.current?.key === fillKey) return;

        const historicalActual = historicalCacheRef.current?.data ?? {};
        const target = parseISO(targetDate);
        const missingDates = Array.from({ length: 30 }, (_, i) =>
            format(subDays(target, 30 - i), 'yyyy-MM-dd')
        ).filter(d => !historicalActual[d] || !historicalActual[d].some(p => p > 0));

        if (missingDates.length === 0) {
            modelFillCacheRef.current = { key: fillKey, data: {} };
            return;
        }

        let cancelled = false;
        setIsModelFillLoading(true);
        const modelName = fillGapsWithModel.split('|')[1];
        const startStr = format(subDays(target, 30), 'yyyyMMdd');
        const endStr   = format(subDays(target, 1),  'yyyyMMdd');

        fetchPredictions({ start_date: startStr, end_date: endStr, area_name: area, model_name: modelName, latest_only: true })
            .then(rows => {
                if (cancelled) return;
                const result: Record<string, number[]> = {};
                for (const row of rows) {
                    if (!result[row.trade_date]) result[row.trade_date] = new Array(48).fill(0);
                    result[row.trade_date][row.time_code - 1] = row.price_50;
                }
                // Only keep dates where actual data is truly missing
                for (const d of Object.keys(result)) {
                    if (historicalActual[d]?.some(p => p > 0)) delete result[d];
                }
                modelFillCacheRef.current = { key: fillKey, data: result };
                setIsModelFillLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setIsModelFillLoading(false);
            });
        return () => { cancelled = true; };
    // isHistoryLoading in deps ensures we re-evaluate after the historical actual fetch completes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fillGapsWithModel, needsHistoricalData, targetDate, area, isHistoryLoading]);

    // Merge fetched historical prices with the in-range prices from props.
    // Priority: spotPricesByDate (user range) > historical actual > model fill for gaps
    // spotPricesByDate (user-selected range) takes precedence for overlapping dates
    const mergedSpotPricesByDate = useMemo(() => {
        const cacheKey = `${area ?? ''}|${priceSource ?? 'actual'}`;
        const cached = historicalCacheRef.current?.key === cacheKey
            ? historicalCacheRef.current.data : {};

        // Model-fill: only for dates that are genuinely missing from actual history
        let modelFill: Record<string, number[]> = {};
        if (fillGapsWithModel && modelFillCacheRef.current) {
            const fillKey = `${area ?? ''}|${fillGapsWithModel}|${targetDate ?? ''}`;
            if (modelFillCacheRef.current.key === fillKey) {
                modelFill = modelFillCacheRef.current.data;
            }
        }

        return { ...modelFill, ...cached, ...(spotPricesByDate ?? {}) };
    // isHistoryLoading / isModelFillLoading trigger re-run after each fetch completes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [spotPricesByDate, area, priceSource, targetDate, fillGapsWithModel, isHistoryLoading, isModelFillLoading]);

    const noData = !spotPricesByDate || Object.keys(spotPricesByDate).length === 0;
    const currentPrices = targetDate && spotPricesByDate ? spotPricesByDate[targetDate] : undefined;

    // Warn when the user has "actual" selected but the current day has no real price data
    const noActualDataWarning =
        (priceSource === 'actual' || !priceSource) &&
        !!targetDate &&
        (!currentPrices || currentPrices.every(p => p === 0));

    const needsPriceWarning =
        (scenarioType === 'percentile' || scenarioType === 'cycle-target' ||
         scenarioType === 'spread-threshold' || scenarioType === 'peak-valley' ||
         scenarioType === 'conservative') && !currentPrices;
    const needsHistoryWarning = (scenarioType === 'nday-avg' || scenarioType === 'price-momentum') &&
        targetDate && mergedSpotPricesByDate
        ? Object.keys(mergedSpotPricesByDate).filter(d => d < targetDate).length === 0 && !currentPrices
        : false;

    // How many of the requested historical days actually have data (for nday-avg / price-momentum)
    const historicalAvailability = useMemo(() => {
        if (!needsHistoricalData || !targetDate || isHistoryLoading) return null;
        const cacheKey = `${area ?? ''}|${priceSource ?? 'actual'}`;
        if (historicalCacheRef.current?.key !== cacheKey) return null;
        const requestedN = scenarioType === 'nday-avg' ? ndayParams.nDays : momentumParams.nDays;
        const available = Object.keys(historicalCacheRef.current.data)
            .filter(d => d < targetDate && historicalCacheRef.current!.data[d].some(p => p > 0)).length;
        return { available, requested: requestedN };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [needsHistoricalData, targetDate, area, priceSource, isHistoryLoading, scenarioType, ndayParams.nDays, momentumParams.nDays]);

    // Count how many days were supplemented by model fill
    const modelFillCount = useMemo(() => {
        if (!fillGapsWithModel || isModelFillLoading || !modelFillCacheRef.current) return 0;
        const fillKey = `${area ?? ''}|${fillGapsWithModel}|${targetDate ?? ''}`;
        if (modelFillCacheRef.current.key !== fillKey) return 0;
        return Object.keys(modelFillCacheRef.current.data).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fillGapsWithModel, isModelFillLoading, area, targetDate]);

    // Core computation — called for any date independently (used by preview + apply-all)
    const computeSlotsForDate = useCallback((date: string): ManualSlot[] | null => {
        const prices = spotPricesByDate?.[date];
        try {
            switch (scenarioType) {
                case 'nday-avg':
                    return generateNDayAvgScenario(mergedSpotPricesByDate, date, ndayParams, config);
                case 'percentile':
                    return generatePercentileScenario(prices ?? [], percentileParams, config);
                case 'fixed-window':
                    return generateFixedWindowScenario(fixedParams);
                case 'cycle-target':
                    return generateCycleTargetScenario(prices ?? [], cycleParams, config);
                case 'spread-threshold':
                    return generateSpreadThresholdScenario(prices ?? [], spreadParams, config);
                case 'peak-valley':
                    return generatePeakValleyScenario(prices ?? [], peakValleyParams, config);
                case 'price-momentum':
                    return generatePriceMomentumScenario(mergedSpotPricesByDate, date, momentumParams, config);
                case 'conservative':
                    return generateConservativeScenario(prices ?? [], conservativeParams, config);
                default:
                    return null;
            }
        } catch {
            return null;
        }
    }, [
        scenarioType, spotPricesByDate, mergedSpotPricesByDate, config,
        ndayParams, percentileParams, fixedParams, cycleParams,
        spreadParams, peakValleyParams, momentumParams, conservativeParams,
    ]);

    // Live preview for the currently selected date
    const previewSlots = useMemo<ManualSlot[] | null>(
        () => (targetDate ? computeSlotsForDate(targetDate) : null),
        [computeSlotsForDate, targetDate],
    );

    function getPriceLabel() {
        return !priceSource || priceSource === 'actual'
            ? t('scenario.actualJepx')
            : priceSource.split('|')[1] ?? priceSource;
    }

    function handleApply() {
        if (!targetDate || !previewSlots) return;
        onApply(previewSlots);
        setAppliedLabel(t('scenario.applied', { label: `${scenarioLabels[scenarioType]}（${getPriceLabel()}）` }));
    }

    function handleReset() {
        if (!targetDate) return;
        onApply(Array.from({ length: 48 }, (_, i) => ({ timeStep: i, action: 'Idle' as const, power: null })));
        setAppliedLabel(null);
    }

    function handleApplyAll() {
        if (!availableDates?.length || !onApplyAll) return;
        const result: Record<string, ManualSlot[]> = {};
        for (const date of availableDates) {
            const slots = computeSlotsForDate(date);
            if (slots) result[date] = slots;
        }
        if (Object.keys(result).length === 0) return;
        onApplyAll(result);
        setAppliedLabel(t('scenario.applied', { label: `${scenarioLabels[scenarioType]}（${getPriceLabel()}）` }));
    }

    return (
        <Box>
            {/* Collapsible header row */}
            <Box
                onClick={() => setOpen(o => !o)}
                sx={{
                    display: 'flex', alignItems: 'center', gap: 0.75,
                    cursor: 'pointer', py: 0.5,
                    '&:hover': { opacity: 0.8 },
                }}
            >
                <Typography sx={{
                    fontSize: '0.7rem', color: 'text.secondary', userSelect: 'none',
                    transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                    lineHeight: 1,
                }}>
                    ▶
                </Typography>
                <Typography sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500, userSelect: 'none' }}>
                    {t('scenario.header')}
                </Typography>
                {appliedLabel && !open && (
                    <Chip
                        label={appliedLabel}
                        size="small"
                        sx={{
                            height: 16, fontSize: '0.58rem',
                            bgcolor: 'var(--primary)', color: '#000',
                            '& .MuiChip-label': { px: 0.75 },
                        }}
                    />
                )}
            </Box>

            {/* Collapsible content */}
            <Box sx={{
                maxHeight: open ? 640 : 0,
                overflow: 'hidden',
                transition: 'max-height 0.32s cubic-bezier(0.4,0,0.2,1)',
            }}>
                <Box sx={{
                    pt: 0.75, pb: 1, display: 'flex', flexDirection: 'column', gap: 1,
                    borderTop: '1px solid var(--card-border)', mt: 0.25,
                }}>
                    {/* 排程參照 — price source selector, shown when model predictions are available */}
                    {availableModels.length > 0 && (
                        <Box sx={{
                            display: 'flex', flexDirection: 'column', gap: 0.75,
                            p: 1, borderRadius: 1,
                            bgcolor: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--card-border)',
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.secondary', flexShrink: 0, minWidth: 56 }}>
                                    {t('scenario.scheduleRef')}
                                </Typography>
                                <FormControl size="small" sx={{ flex: 1 }}>
                                    <Select
                                        value={priceSource ?? 'actual'}
                                        onChange={e => onPriceSourceChange?.(e.target.value)}
                                        sx={{
                                            fontSize: '0.72rem', height: 26,
                                            '& .MuiSelect-select': { py: 0.3, px: 0.75 },
                                            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--card-border)' },
                                            color: (!priceSource || priceSource === 'actual') ? 'text.primary' : 'var(--primary)',
                                        }}
                                    >
                                        <MenuItem value="actual" sx={{ fontSize: '0.72rem' }}>{t('scenario.actualJepx')}</MenuItem>
                                        {availableModels.map(m => (
                                            <MenuItem key={`${m.id}|${m.name}`} value={`${m.id}|${m.name}`} sx={{ fontSize: '0.72rem' }}>
                                                {m.name}{t('scenario.estimatedSuffix')}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Box>
                            <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled', lineHeight: 1.4 }}>
                                {t('scenario.refNote')}
                            </Typography>
                        </Box>
                    )}

                    {/* Warning: actual selected but current day has no price data */}
                    {noActualDataWarning && (
                        <Box sx={{
                            display: 'flex', alignItems: 'flex-start', gap: 0.75, p: 0.75,
                            bgcolor: 'rgba(237,108,2,0.08)', borderRadius: 1,
                            border: '1px solid rgba(237,108,2,0.25)',
                        }}>
                            <Typography sx={{ fontSize: '0.62rem', color: 'warning.main', lineHeight: 1.5 }}>
                                {t('scenario.noActualWarning')}
                            </Typography>
                        </Box>
                    )}

                    {/* Scenario type selector */}
                    <ToggleButtonGroup
                        value={scenarioType}
                        exclusive
                        onChange={(_, v) => v && setScenarioType(v as ScenarioType)}
                        size="small"
                        sx={{
                            flexWrap: 'wrap', gap: 0.5,
                            '& .MuiToggleButtonGroup-grouped': { border: 'none !important', borderRadius: '4px !important' },
                        }}
                    >
                        {SCENARIO_TYPES.map(type => (
                            <ToggleButton
                                key={type}
                                value={type}
                                sx={{
                                    fontSize: '0.62rem', px: 0.75, py: 0.3, lineHeight: 1.4,
                                    color: 'text.secondary',
                                    border: '1px solid var(--card-border) !important',
                                    borderRadius: '4px !important',
                                    '&.Mui-selected': {
                                        bgcolor: 'var(--primary)',
                                        color: '#000',
                                        '&:hover': { bgcolor: 'var(--primary)' },
                                    },
                                }}
                            >
                                {scenarioLabels[type]}
                            </ToggleButton>
                        ))}
                    </ToggleButtonGroup>

                    {/* Scenario description */}
                    <Typography sx={{
                        fontSize: '0.62rem', color: 'text.secondary', lineHeight: 1.5,
                        borderLeft: '2px solid var(--primary)', pl: 0.75,
                    }}>
                        {scenarioDescriptions[scenarioType]}
                    </Typography>

                    {/* Parameter panel */}
                    <Box sx={{ px: 0.25 }}>
                        {scenarioType === 'nday-avg' && (
                            <NDayAvgPanel params={ndayParams} onChange={setNdayParams} config={config} />
                        )}
                        {scenarioType === 'percentile' && (
                            <PercentilePanel params={percentileParams} onChange={setPercentileParams} config={config} />
                        )}
                        {scenarioType === 'fixed-window' && (
                            <FixedWindowPanel params={fixedParams} onChange={setFixedParams} />
                        )}
                        {scenarioType === 'cycle-target' && (
                            <CycleTargetPanel params={cycleParams} onChange={setCycleParams} config={config} />
                        )}
                        {scenarioType === 'spread-threshold' && (
                            <SpreadThresholdPanel params={spreadParams} onChange={setSpreadParams} />
                        )}
                        {scenarioType === 'peak-valley' && (
                            <PeakValleyPanel params={peakValleyParams} onChange={setPeakValleyParams} />
                        )}
                        {scenarioType === 'price-momentum' && (
                            <PriceMomentumPanel params={momentumParams} onChange={setMomentumParams} />
                        )}
                        {scenarioType === 'conservative' && (
                            <ConservativePanel params={conservativeParams} onChange={setConservativeParams} />
                        )}
                    </Box>

                    {/* Slot preview + cycle indicator */}
                    {previewSlots && (
                        <Box sx={{ px: 0.25 }}>
                            <SlotPreviewBar slots={previewSlots} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography sx={{ fontSize: '0.60rem', color: 'text.disabled' }}>
                                    {t('scenario.chargeSlots', { count: previewSlots.filter(s => s.action === 'Charge').length })}{' '}
                                    {t('scenario.dischargeSlots', { count: previewSlots.filter(s => s.action === 'Discharge').length })}
                                </Typography>
                                <CycleIndicator slots={previewSlots} config={config} />
                            </Box>
                        </Box>
                    )}

                    {/* History loading / error */}
                    {isHistoryLoading && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                            <CircularProgress size={12} sx={{ color: 'var(--primary)' }} />
                            <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>
                                {t('scenario.historyLoading')}
                            </Typography>
                        </Box>
                    )}
                    {hasHistoryError && (
                        <Typography sx={{ fontSize: '0.62rem', color: 'warning.main', lineHeight: 1.4 }}>
                            {t('scenario.historyFetchError')}
                        </Typography>
                    )}

                    {/* Historical data availability + model gap-fill (history-dependent scenarios) */}
                    {!isHistoryLoading && historicalAvailability && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                <Typography sx={{
                                    fontSize: '0.62rem', lineHeight: 1.4,
                                    color: historicalAvailability.available < historicalAvailability.requested
                                        ? 'warning.main' : 'success.main',
                                }}>
                                    {t('scenario.histDays', { available: historicalAvailability.available, requested: historicalAvailability.requested })}
                                </Typography>
                                {historicalAvailability.available < historicalAvailability.requested && (
                                    <Typography sx={{ fontSize: '0.60rem', color: 'text.disabled' }}>
                                        {t('scenario.histGapNote')}
                                    </Typography>
                                )}
                            </Box>

                            {/* Model fill option — only when there are gaps and models are available */}
                            {historicalAvailability.available < historicalAvailability.requested && availableModels.length > 0 && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                    <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', flexShrink: 0 }}>
                                        {t('scenario.fillGaps')}
                                    </Typography>
                                    <FormControl size="small" sx={{ flex: 1 }}>
                                        <Select
                                            value={fillGapsWithModel ?? 'none'}
                                            onChange={e => setFillGapsWithModel(e.target.value === 'none' ? null : e.target.value)}
                                            sx={{
                                                fontSize: '0.62rem', height: 22,
                                                '& .MuiSelect-select': { py: 0.2, px: 0.75 },
                                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--card-border)' },
                                            }}
                                        >
                                            <MenuItem value="none" sx={{ fontSize: '0.62rem' }}>{t('scenario.noFill')}</MenuItem>
                                            {availableModels.map(m => (
                                                <MenuItem key={`${m.id}|${m.name}`} value={`${m.id}|${m.name}`} sx={{ fontSize: '0.62rem' }}>
                                                    {m.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    {isModelFillLoading && <CircularProgress size={10} sx={{ color: 'var(--primary)', flexShrink: 0 }} />}
                                </Box>
                            )}

                            {/* Confirmation of model fill */}
                            {fillGapsWithModel && !isModelFillLoading && modelFillCount > 0 && (
                                <Typography sx={{ fontSize: '0.60rem', color: 'info.main', lineHeight: 1.4 }}>
                                    {t('scenario.fillConfirm', { count: modelFillCount, model: fillGapsWithModel.split('|')[1] })}
                                </Typography>
                            )}
                        </Box>
                    )}

                    {/* Warnings */}
                    {(needsPriceWarning || needsHistoryWarning) && (
                        <Typography sx={{ fontSize: '0.62rem', color: 'warning.main', lineHeight: 1.4 }}>
                            {needsHistoryWarning
                                ? t('scenario.noHistoryWarning')
                                : t('scenario.noPriceWarning')}
                        </Typography>
                    )}

                    {/* Action row */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            {/* Reset current day */}
                            <Tooltip title={t('scenario.resetTodayTooltip')} placement="top">
                                <span>
                                    <Button
                                        variant="text"
                                        size="small"
                                        disabled={!targetDate}
                                        onClick={handleReset}
                                        sx={{
                                            fontSize: '0.65rem', py: 0.25, px: 0.75,
                                            color: 'text.secondary',
                                            minWidth: 0,
                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                                            '&.Mui-disabled': { opacity: 0.35 },
                                        }}
                                    >
                                        {t('scenario.resetToday')}
                                    </Button>
                                </span>
                            </Tooltip>

                            <Box sx={{ flex: 1 }} />

                            {/* Apply to current day */}
                            <Tooltip title={!targetDate ? t('scenario.applyNoDateTooltip') : t('scenario.applyDateTooltip')} placement="top">
                                <span>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        disabled={!targetDate || (noData && scenarioType !== 'fixed-window') || isHistoryLoading}
                                        onClick={handleApply}
                                        sx={{
                                            fontSize: '0.68rem', py: 0.3, px: 1.25,
                                            borderColor: 'var(--primary)',
                                            color: 'var(--primary)',
                                            '&:hover': { borderColor: 'var(--primary)', bgcolor: 'rgba(255,220,0,0.08)' },
                                            '&.Mui-disabled': { opacity: 0.4 },
                                        }}
                                    >
                                        {t('scenario.applyToday')}
                                    </Button>
                                </span>
                            </Tooltip>

                            {/* Apply to all days — shown only when multiple dates are available */}
                            {(availableDates?.length ?? 0) > 1 && onApplyAll && (
                                <Tooltip title={t('scenario.applyAllTooltip')} placement="top">
                                    <span>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            disabled={(noData && scenarioType !== 'fixed-window') || isHistoryLoading}
                                            onClick={handleApplyAll}
                                            sx={{
                                                fontSize: '0.68rem', py: 0.3, px: 1.25,
                                                borderColor: '#ab47bc',
                                                color: '#ab47bc',
                                                '&:hover': { borderColor: '#ab47bc', bgcolor: 'rgba(171,71,188,0.08)' },
                                                '&.Mui-disabled': { opacity: 0.4 },
                                            }}
                                        >
                                            {t('scenario.applyAll')}
                                        </Button>
                                    </span>
                                </Tooltip>
                            )}
                        </Box>

                        {/* Applied label */}
                        {appliedLabel && (
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <Chip
                                    label={appliedLabel}
                                    size="small"
                                    onDelete={() => setAppliedLabel(null)}
                                    sx={{
                                        height: 18, fontSize: '0.60rem',
                                        bgcolor: 'var(--primary)', color: '#000',
                                        '& .MuiChip-label': { px: 0.75 },
                                        '& .MuiChip-deleteIcon': { color: '#000', fontSize: '0.75rem' },
                                    }}
                                />
                            </Box>
                        )}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
