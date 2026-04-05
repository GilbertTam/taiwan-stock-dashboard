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

const SCENARIO_LABELS: Record<ScenarioType, string> = {
    'nday-avg':          'N日均價',
    'percentile':        '百分位閾值',
    'fixed-window':      '固定時段',
    'cycle-target':      '指定循環次數',
    'spread-threshold':  '價差閾值',
    'peak-valley':       '朝夕峰谷',
    'price-momentum':    '歷史均值偏離',
    'conservative':      '保守低風險',
};

const SCENARIO_DESCRIPTIONS: Record<ScenarioType, string> = {
    'nday-avg':
        '參考過去 N 天同時段的平均電價，將最便宜的時段設為充電、最貴的時段設為放電。適合電價走勢穩定、波動不大的日子。充放電格數受電池容量與設定循環次數限制。',
    'percentile':
        '以當日電價的分位數作為閾值，低於下限分位的時段充電、高於上限分位的時段放電。活用當日市場的相對高低，不依賴歷史資料。',
    'fixed-window':
        '以時刻為基準的固定排程，不看市場價格，在指定時間範圍內強制充放電。適合有固定運轉合約或設備排程需求的場所。充放電次數由電池容量自動決定上限。',
    'cycle-target':
        '指定每天目標循環次數（1–3），自動根據電池容量計算所需格數，並從當日電價中選出最便宜（充電）與最貴（放電）的時段。',
    'spread-threshold':
        '僅在充放電平均價差超過設定門檻時才執行，否則全天待機。避免在電價平坦日做低利潤或虧損交易，適合重視每次操作獲利的保守運用。',
    'peak-valley':
        '依照日本電力市場常見的「深夜谷、早晚峰」模式，於凌晨低需求時段（0:00–7:30）充電，分別在早高峰（~7:30–11:30）與晚高峰（~16:30–21:30）選擇最高價時段放電。',
    'price-momentum':
        '針對每個時段計算過去 N 天的歷史價格分布，當今日電價低於歷史分位下限時充電、高於上限時放電。只在電價相對歷史偏低或偏高時才操作，適合電價具均值回歸特性的市場。',
    'conservative':
        '只取當日最高價的前 X% 時段放電、最低價的前 X% 時段充電，強制大價差操作。每循環獲利最大但操作機會較少，適合重視電池壽命或折舊成本高的場景。',
};

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
    const { slotsPerCharge, slotsPerDischarge } = calcPhysicsSlots(config);
    const maxCharge = slotsPerCharge * params.cycleCount;
    const maxDischarge = slotsPerDischarge * params.cycleCount;
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <SliderRow label="歷史天數" tooltip="參考幾天前的同時段電價來計算平均值，天數越多越穩定但越落後" value={params.nDays} min={1} max={30}
                format={v => `${v} 天`}
                onChange={v => onChange({ ...params, nDays: v })} />
            <SliderRow label="充電格數" tooltip={`每格 30 分鐘，最多受電池容量限制（目前上限 ${maxCharge} 格）`} value={Math.min(params.chargeSlotCount, maxCharge)} min={1} max={Math.max(1, maxCharge)}
                format={v => `${v} 格`}
                onChange={v => onChange({ ...params, chargeSlotCount: v })} />
            <SliderRow label="放電格數" tooltip={`每格 30 分鐘，最多受電池容量限制（目前上限 ${maxDischarge} 格）`} value={Math.min(params.dischargeSlotCount, maxDischarge)} min={1} max={Math.max(1, maxDischarge)}
                format={v => `${v} 格`}
                onChange={v => onChange({ ...params, dischargeSlotCount: v })} />
            <SliderRow label="循環次數" tooltip="目標每天充放電幾個循環，決定充放電格數上限" value={params.cycleCount} min={1} max={3}
                format={v => `${v} 次`}
                onChange={v => onChange({ ...params, cycleCount: v })} />
        </Box>
    );
}

function PercentilePanel({ params, onChange, config }: { params: PercentileParams; onChange: (p: PercentileParams) => void; config: BatteryConfig }) {
    const { slotsPerCharge, slotsPerDischarge } = calcPhysicsSlots(config);
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <SliderRow label="充電門檻" tooltip="當日電價低於此百分位的時段才充電，數字越小選到的時段越少但越便宜" value={Math.round(params.chargeThresholdPct * 100)} min={5} max={50}
                format={v => `≤ ${v}%`}
                onChange={v => onChange({ ...params, chargeThresholdPct: v / 100 })} />
            <SliderRow label="放電門檻" tooltip="當日電價高於此百分位的時段才放電，數字越大選到的時段越少但越貴" value={Math.round(params.dischargeThresholdPct * 100)} min={50} max={95}
                format={v => `≥ ${v}%`}
                onChange={v => onChange({ ...params, dischargeThresholdPct: v / 100 })} />
            <SliderRow label="循環次數" tooltip={`決定充放電格數上限（每循環約需充電 ${slotsPerCharge} 格、放電 ${slotsPerDischarge} 格）`} value={params.cycleCount} min={1} max={3}
                format={v => `${v} 次`}
                onChange={v => onChange({ ...params, cycleCount: v })} />
        </Box>
    );
}

function FixedWindowPanel({ params, onChange }: { params: FixedWindowParams; onChange: (p: FixedWindowParams) => void }) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <SliderRow label="充電開始" tooltip="充電時段的起始時刻" value={params.chargeStart} min={0} max={47}
                format={stepToTime}
                onChange={v => onChange({ ...params, chargeStart: Math.min(v, params.chargeEnd) })} />
            <SliderRow label="充電結束" tooltip="充電時段的結束時刻（含）" value={params.chargeEnd} min={0} max={47}
                format={stepToTime}
                onChange={v => onChange({ ...params, chargeEnd: Math.max(v, params.chargeStart) })} />
            <SliderRow label="放電開始" tooltip="放電時段的起始時刻" value={params.dischargeStart} min={0} max={47}
                format={stepToTime}
                onChange={v => onChange({ ...params, dischargeStart: Math.min(v, params.dischargeEnd) })} />
            <SliderRow label="放電結束" tooltip="放電時段的結束時刻（含）" value={params.dischargeEnd} min={0} max={47}
                format={stepToTime}
                onChange={v => onChange({ ...params, dischargeEnd: Math.max(v, params.dischargeStart) })} />
        </Box>
    );
}

function CycleTargetPanel({ params, onChange, config }: { params: CycleTargetParams; onChange: (p: CycleTargetParams) => void; config: BatteryConfig }) {
    const { slotsPerCharge, slotsPerDischarge } = calcPhysicsSlots(config);
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <SliderRow label="循環次數" tooltip="目標每天完整充放電幾個循環，系統自動計算所需格數" value={params.cycleCount} min={1} max={3}
                format={v => `${v} 次`}
                onChange={v => onChange({ cycleCount: v })} />
            <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>
                充電 {Math.min(24, slotsPerCharge * params.cycleCount)} 格 ·
                放電 {Math.min(24, slotsPerDischarge * params.cycleCount)} 格（依電池容量自動計算）
            </Typography>
        </Box>
    );
}

function SpreadThresholdPanel({ params, onChange }: { params: SpreadThresholdParams; onChange: (p: SpreadThresholdParams) => void }) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <SliderRow label="最小價差" tooltip="充放電平均價差須超過此門檻才執行，否則全天待機。單位：¥/kWh" value={params.minSpread} min={0} max={30} step={0.5}
                format={v => `${v} ¥/kWh`}
                onChange={v => onChange({ ...params, minSpread: v })} />
            <SliderRow label="循環次數" tooltip="在價差足夠時，目標執行幾個充放電循環" value={params.cycleCount} min={1} max={2}
                format={v => `${v} 次`}
                onChange={v => onChange({ ...params, cycleCount: v })} />
        </Box>
    );
}

function PeakValleyPanel({ params, onChange }: { params: PeakValleyParams; onChange: (p: PeakValleyParams) => void }) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <SliderRow label="早峰放電格" tooltip="早高峰（~7:30–11:30）選幾格最高價時段放電，不足該窗口格數則從中取最貴的" value={params.morningPeakSlots} min={1} max={8}
                format={v => `${v} 格`}
                onChange={v => onChange({ ...params, morningPeakSlots: v })} />
            <SliderRow label="晚峰放電格" tooltip="晚高峰（~16:30–21:30）選幾格最高價時段放電，不足該窗口格數則從中取最貴的" value={params.eveningPeakSlots} min={1} max={8}
                format={v => `${v} 格`}
                onChange={v => onChange({ ...params, eveningPeakSlots: v })} />
            <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>
                充電窗口：0:00–7:30（深夜低需求）
            </Typography>
        </Box>
    );
}

function PriceMomentumPanel({ params, onChange }: { params: PriceMomentumParams; onChange: (p: PriceMomentumParams) => void }) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <SliderRow label="參照天數" tooltip="計算歷史分布所用的天數，天數越多基準越穩定" value={params.nDays} min={1} max={14}
                format={v => `${v} 天`}
                onChange={v => onChange({ ...params, nDays: v })} />
            <SliderRow label="充電分位" tooltip="今日電價低於歷史同期此分位時充電（例如 25% 表示比歷史便宜四分之三的情況才充電）" value={Math.round(params.chargeBelow * 100)} min={10} max={40}
                format={v => `< ${v}%`}
                onChange={v => onChange({ ...params, chargeBelow: v / 100 })} />
            <SliderRow label="放電分位" tooltip="今日電價高於歷史同期此分位時放電（例如 75% 表示比歷史貴四分之三才放電）" value={Math.round(params.dischargeAbove * 100)} min={60} max={90}
                format={v => `> ${v}%`}
                onChange={v => onChange({ ...params, dischargeAbove: v / 100 })} />
            <SliderRow label="循環次數" tooltip="最多執行幾個充放電循環" value={params.cycleCount} min={1} max={2}
                format={v => `${v} 次`}
                onChange={v => onChange({ ...params, cycleCount: v })} />
        </Box>
    );
}

function ConservativePanel({ params, onChange }: { params: ConservativeParams; onChange: (p: ConservativeParams) => void }) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <SliderRow label="極端價帶%" tooltip="只使用最高/最低電價中的前 X% 時段，比例越小選到的時段越少、價差越大" value={params.topPct} min={5} max={25}
                format={v => `${v}%`}
                onChange={v => onChange({ ...params, topPct: v })} />
            <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>
                固定 1 個循環，最大化每循環收益
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
                預估循環：{estimatedCycles.toFixed(2)} 次 / 上限：{config.Cycle_limit} 次
            </Typography>
            {overLimit && (
                <Typography sx={{ fontSize: '0.60rem', color: 'warning.main' }}>
                    ⚠ 超過上限，模擬將自動截停
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
    const [open, setOpen] = useState(false);
    const [scenarioType, setScenarioType] = useState<ScenarioType>('nday-avg');
    const [appliedLabel, setAppliedLabel] = useState<string | null>(null);

    // Historical price cache — keyed by `area|priceSource` to auto-invalidate on source change
    const historicalCacheRef = useRef<{ key: string; data: Record<string, number[]> } | null>(null);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [historyFetchError, setHistoryFetchError] = useState<string | null>(null);

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
        setHistoryFetchError(null);

        fetchHistoricalPrices(area, priceSource ?? 'actual', targetDate)
            .then(data => {
                if (cancelled) return;
                historicalCacheRef.current = { key: cacheKey, data };
                setIsHistoryLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setHistoryFetchError('歷史價格載入失敗，情境建議可能不準確。');
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
            ? '實際值'
            : priceSource.split('|')[1] ?? priceSource;
    }

    function handleApply() {
        if (!targetDate || !previewSlots) return;
        onApply(previewSlots);
        setAppliedLabel(`${SCENARIO_LABELS[scenarioType]}（${getPriceLabel()}）`);
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
        setAppliedLabel(`${SCENARIO_LABELS[scenarioType]}（${getPriceLabel()}，共 ${Object.keys(result).length} 天）`);
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
                    劇本快速套用
                </Typography>
                {appliedLabel && !open && (
                    <Chip
                        label={`已套用: ${appliedLabel}`}
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
                                <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.secondary', whiteSpace: 'nowrap', flexShrink: 0, width: 56 }}>
                                    排程參照
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
                                        <MenuItem value="actual" sx={{ fontSize: '0.72rem' }}>實際值（JEPX）</MenuItem>
                                        {availableModels.map(m => (
                                            <MenuItem key={`${m.id}|${m.name}`} value={`${m.id}|${m.name}`} sx={{ fontSize: '0.72rem' }}>
                                                {m.name}（預測值）
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Box>
                            <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled', lineHeight: 1.4 }}>
                                ※ 排程參照決定劇本建議充放電時段；收益計算基準與上方 KPI 相同。
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
                                ⚠ 此日期無實際價格資料。以「實際值」為參照套用劇本，所有格子將為 Idle。建議改選模型預測作為排程參照。
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
                        {(Object.keys(SCENARIO_LABELS) as ScenarioType[]).map(type => (
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
                                {SCENARIO_LABELS[type]}
                            </ToggleButton>
                        ))}
                    </ToggleButtonGroup>

                    {/* Scenario description */}
                    <Typography sx={{
                        fontSize: '0.62rem', color: 'text.secondary', lineHeight: 1.5,
                        borderLeft: '2px solid var(--primary)', pl: 0.75,
                    }}>
                        {SCENARIO_DESCRIPTIONS[scenarioType]}
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
                                    {previewSlots.filter(s => s.action === 'Charge').length} 格充電 ·{' '}
                                    {previewSlots.filter(s => s.action === 'Discharge').length} 格放電
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
                                載入歷史價格…
                            </Typography>
                        </Box>
                    )}
                    {historyFetchError && (
                        <Typography sx={{ fontSize: '0.62rem', color: 'warning.main', lineHeight: 1.4 }}>
                            {historyFetchError}
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
                                    {historicalAvailability.available}/{historicalAvailability.requested} 天有歷史資料
                                </Typography>
                                {historicalAvailability.available < historicalAvailability.requested && (
                                    <Typography sx={{ fontSize: '0.60rem', color: 'text.disabled' }}>
                                        （缺失天以當日或鄰近資料填補）
                                    </Typography>
                                )}
                            </Box>

                            {/* Model fill option — only when there are gaps and models are available */}
                            {historicalAvailability.available < historicalAvailability.requested && availableModels.length > 0 && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                    <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', flexShrink: 0 }}>
                                        以模型預測補充：
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
                                            <MenuItem value="none" sx={{ fontSize: '0.62rem' }}>不補充</MenuItem>
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
                                    ✓ 補充 {modelFillCount} 天模型預測資料（{fillGapsWithModel.split('|')[1]}）
                                </Typography>
                            )}
                        </Box>
                    )}

                    {/* Warnings */}
                    {(needsPriceWarning || needsHistoryWarning) && (
                        <Typography sx={{ fontSize: '0.62rem', color: 'warning.main', lineHeight: 1.4 }}>
                            {needsHistoryWarning
                                ? '無歷史價格資料，將以當天價格替代（若有）。'
                                : '當天價格尚未載入，套用後所有格子為 Idle。'}
                        </Typography>
                    )}

                    {/* Action row */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            {/* Reset current day */}
                            <Tooltip title="清除當天所有排程，恢復為全部待機（Idle）" placement="top">
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
                                        恢復到預設
                                    </Button>
                                </span>
                            </Tooltip>

                            <Box sx={{ flex: 1 }} />

                            {/* Apply to current day */}
                            <Tooltip title={!targetDate ? '請先選擇日期' : '套用到目前選取的日期'} placement="top">
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
                                        套用到當天
                                    </Button>
                                </span>
                            </Tooltip>

                            {/* Apply to all days — shown only when multiple dates are available */}
                            {(availableDates?.length ?? 0) > 1 && onApplyAll && (
                                <Tooltip title="以當前劇本設定，為每一天分別依其當日價格計算最佳排程並批次套用" placement="top">
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
                                            套用到每一天
                                        </Button>
                                    </span>
                                </Tooltip>
                            )}
                        </Box>

                        {/* Applied label */}
                        {appliedLabel && (
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <Chip
                                    label={`已套用: ${appliedLabel}`}
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
