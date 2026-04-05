import { ManualSlot, BatteryConfig } from '@/types/revenueAnalysis';

export type ScenarioType =
    | 'nday-avg'
    | 'percentile'
    | 'fixed-window'
    | 'cycle-target'
    | 'spread-threshold'
    | 'peak-valley'
    | 'price-momentum'
    | 'conservative';

export interface NDayAvgParams {
    nDays: number;
    chargeSlotCount: number;
    dischargeSlotCount: number;
    cycleCount: number;
}

export interface PercentileParams {
    chargeThresholdPct: number;   // 0–1 (e.g. 0.30 = 30th percentile)
    dischargeThresholdPct: number; // 0–1 (e.g. 0.70 = 70th percentile)
    cycleCount: number;
}

export interface FixedWindowParams {
    chargeStart: number;    // 0–47 (inclusive)
    chargeEnd: number;      // 0–47 (inclusive)
    dischargeStart: number; // 0–47 (inclusive)
    dischargeEnd: number;   // 0–47 (inclusive)
}

export interface CycleTargetParams {
    cycleCount: number; // 1–3
}

export interface SpreadThresholdParams {
    minSpread: number;  // ¥/kWh minimum charge–discharge price spread
    cycleCount: number; // 1–2
}

export interface PeakValleyParams {
    morningPeakSlots: number;  // 1–8 discharge slots in morning peak window
    eveningPeakSlots: number;  // 1–8 discharge slots in evening peak window
}

export interface PriceMomentumParams {
    nDays: number;         // 1–14 reference days
    chargeBelow: number;   // 0.10–0.40 percentile threshold for charging
    dischargeAbove: number; // 0.60–0.90 percentile threshold for discharging
    cycleCount: number;    // 1–2
}

export interface ConservativeParams {
    topPct: number; // 5–25% — use only the top/bottom X% price slots
}

// ---------------------------------------------------------------------------
// Physics helper
// ---------------------------------------------------------------------------

/**
 * Compute how many 30-min slots are needed to complete one full charge or
 * discharge cycle based on battery capacity and power/efficiency limits.
 */
export function calcPhysicsSlots(config: BatteryConfig): { slotsPerCharge: number; slotsPerDischarge: number } {
    const { E_cap, SoC_max_pct, SoC_min_pct, P_max_ch, P_max_dis, eff_ch, eff_dis, dt } = config;
    const usableEnergy = E_cap * (SoC_max_pct - SoC_min_pct);
    const slotsPerCharge = Math.max(1, Math.ceil(usableEnergy / (P_max_ch * eff_ch * dt)));
    const slotsPerDischarge = Math.max(1, Math.ceil(usableEnergy / (P_max_dis * eff_dis * dt)));
    return { slotsPerCharge, slotsPerDischarge };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function makeIdleSlots(): ManualSlot[] {
    return Array.from({ length: 48 }, (_, i) => ({
        timeStep: i,
        action: 'Idle' as const,
        power: null,
    }));
}

/** Return the value at the given percentile (0–1) of an array. */
function computePercentile(arr: number[], p: number): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = p * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/**
 * Given a 48-element price array, mark the `chargeCount` cheapest slots as
 * Charge and the `dischargeCount` most expensive as Discharge.
 * Discharge wins if a slot would qualify for both.
 */
function buildFromPrices(
    prices: number[],
    chargeCount: number,
    dischargeCount: number,
): ManualSlot[] {
    const slots = makeIdleSlots();
    const indices = Array.from({ length: 48 }, (_, i) => i);
    const byPrice = [...indices].sort((a, b) => (prices[a] ?? 0) - (prices[b] ?? 0));
    const safeCharge = Math.min(48, Math.max(0, chargeCount));
    const safeDischarge = Math.min(48, Math.max(0, dischargeCount));
    const chargeSet = new Set(byPrice.slice(0, safeCharge));
    const dischargeSet = new Set(byPrice.slice(48 - safeDischarge));
    for (let i = 0; i < 48; i++) {
        if (dischargeSet.has(i)) {
            slots[i].action = 'Discharge';
        } else if (chargeSet.has(i)) {
            slots[i].action = 'Charge';
        }
    }
    return slots;
}

// ---------------------------------------------------------------------------
// Scenario 1: N-day historical average
// ---------------------------------------------------------------------------

/**
 * Averages prices slot-by-slot over the N days immediately before targetDate,
 * then marks the cheapest slots as Charge and the most expensive as Discharge.
 * Slot counts are capped to `config.Cycle_limit × physics_slots_per_cycle`.
 */
export function generateNDayAvgScenario(
    spotPricesByDate: Record<string, number[]>,
    targetDate: string,
    params: NDayAvgParams,
    config?: BatteryConfig,
): ManualSlot[] {
    const { nDays, cycleCount } = params;
    let { chargeSlotCount, dischargeSlotCount } = params;

    // Cap by physics-based cycle limit
    if (config) {
        const { slotsPerCharge, slotsPerDischarge } = calcPhysicsSlots(config);
        chargeSlotCount = Math.min(chargeSlotCount, slotsPerCharge * cycleCount);
        dischargeSlotCount = Math.min(dischargeSlotCount, slotsPerDischarge * cycleCount);
    }

    const historicalDates = Object.keys(spotPricesByDate)
        .filter(d => d < targetDate)
        .sort()
        .slice(-nDays);

    let priceSources = historicalDates.map(d => spotPricesByDate[d]).filter(Boolean);
    if (priceSources.length === 0 && spotPricesByDate[targetDate]) {
        priceSources = [spotPricesByDate[targetDate]];
    }
    if (priceSources.length === 0) return makeIdleSlots();

    const avgPrices: number[] = Array.from({ length: 48 }, (_, i) => {
        const vals = priceSources.map(p => p[i]).filter(v => v != null && !isNaN(v));
        return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    });

    return buildFromPrices(avgPrices, chargeSlotCount, dischargeSlotCount);
}

// ---------------------------------------------------------------------------
// Scenario 2: Percentile threshold
// ---------------------------------------------------------------------------

/**
 * Uses the current day's prices. Slots at or below chargeThresholdPct → Charge;
 * slots at or above dischargeThresholdPct → Discharge.
 * Excess slots beyond the physics-based cycle limit are trimmed (best prices kept).
 */
export function generatePercentileScenario(
    prices: number[],
    params: PercentileParams,
    config?: BatteryConfig,
): ManualSlot[] {
    if (!prices || prices.length === 0) return makeIdleSlots();

    const filled = prices.slice(0, 48);
    const pLow = computePercentile(filled, params.chargeThresholdPct);
    const pHigh = computePercentile(filled, params.dischargeThresholdPct);
    const cycleCount = params.cycleCount ?? 1;

    const slots = makeIdleSlots();
    for (let i = 0; i < 48; i++) {
        const price = filled[i] ?? 0;
        if (price >= pHigh) {
            slots[i].action = 'Discharge';
        } else if (price <= pLow) {
            slots[i].action = 'Charge';
        }
    }

    // Cap to physics-based cycle limit
    if (config) {
        const { slotsPerCharge, slotsPerDischarge } = calcPhysicsSlots(config);
        const maxCharge = slotsPerCharge * cycleCount;
        const maxDischarge = slotsPerDischarge * cycleCount;

        // Keep only the most expensive discharge slots
        const dSlots = slots
            .map((s, i) => ({ i, price: filled[i] ?? 0 }))
            .filter((_, i) => slots[i].action === 'Discharge')
            .sort((a, b) => b.price - a.price);
        if (dSlots.length > maxDischarge) {
            dSlots.slice(maxDischarge).forEach(x => { slots[x.i].action = 'Idle'; });
        }

        // Keep only the cheapest charge slots
        const cSlots = slots
            .map((s, i) => ({ i, price: filled[i] ?? 0 }))
            .filter((_, i) => slots[i].action === 'Charge')
            .sort((a, b) => a.price - b.price);
        if (cSlots.length > maxCharge) {
            cSlots.slice(maxCharge).forEach(x => { slots[x.i].action = 'Idle'; });
        }
    }

    return slots;
}

// ---------------------------------------------------------------------------
// Scenario 3: Fixed time window
// ---------------------------------------------------------------------------

/**
 * All slots in [chargeStart, chargeEnd] → Charge.
 * All slots in [dischargeStart, dischargeEnd] → Discharge.
 * Overlap: Discharge wins. Both ends are inclusive.
 */
export function generateFixedWindowScenario(params: FixedWindowParams): ManualSlot[] {
    const { chargeStart, chargeEnd, dischargeStart, dischargeEnd } = params;
    const slots = makeIdleSlots();
    for (let i = 0; i < 48; i++) {
        const inCharge = i >= chargeStart && i <= chargeEnd;
        const inDischarge = i >= dischargeStart && i <= dischargeEnd;
        if (inDischarge) {
            slots[i].action = 'Discharge';
        } else if (inCharge) {
            slots[i].action = 'Charge';
        }
    }
    return slots;
}

// ---------------------------------------------------------------------------
// Scenario 4: Cycle count target
// ---------------------------------------------------------------------------

/**
 * Calculates slots needed for the target number of full cycles using battery
 * physics, then picks the cheapest (charge) and most expensive (discharge) slots.
 */
export function generateCycleTargetScenario(
    prices: number[],
    params: CycleTargetParams,
    config: BatteryConfig,
): ManualSlot[] {
    if (!prices || prices.length === 0) return makeIdleSlots();

    const { cycleCount } = params;
    const { slotsPerCharge, slotsPerDischarge } = calcPhysicsSlots(config);

    const totalCharge = Math.min(24, slotsPerCharge * cycleCount);
    const totalDischarge = Math.min(24, slotsPerDischarge * cycleCount);

    const filled = prices.slice(0, 48);
    return buildFromPrices(filled, totalCharge, totalDischarge);
}

// ---------------------------------------------------------------------------
// Scenario 5: Spread threshold
// ---------------------------------------------------------------------------

/**
 * Only operates when the average discharge price minus average charge price
 * exceeds `minSpread` (¥/kWh). Returns all-Idle if the spread is insufficient.
 * Slot counts are determined by `cycleCount × physics slots`.
 */
export function generateSpreadThresholdScenario(
    prices: number[],
    params: SpreadThresholdParams,
    config: BatteryConfig,
): ManualSlot[] {
    if (!prices || prices.length === 0) return makeIdleSlots();

    const { minSpread, cycleCount } = params;
    const filled = prices.slice(0, 48);
    const { slotsPerCharge, slotsPerDischarge } = calcPhysicsSlots(config);

    const totalCharge = Math.min(24, slotsPerCharge * cycleCount);
    const totalDischarge = Math.min(24, slotsPerDischarge * cycleCount);

    const indices = Array.from({ length: 48 }, (_, i) => i);
    const byPrice = [...indices].sort((a, b) => (filled[a] ?? 0) - (filled[b] ?? 0));

    const chargeSlots = byPrice.slice(0, totalCharge);
    const dischargeSlots = byPrice.slice(48 - totalDischarge);

    const avgCharge = chargeSlots.reduce((s, i) => s + (filled[i] ?? 0), 0) / Math.max(1, chargeSlots.length);
    const avgDischarge = dischargeSlots.reduce((s, i) => s + (filled[i] ?? 0), 0) / Math.max(1, dischargeSlots.length);

    // Spread insufficient — stay idle to avoid unprofitable trades
    if (avgDischarge - avgCharge < minSpread) return makeIdleSlots();

    const chargeSet = new Set(chargeSlots);
    const dischargeSet = new Set(dischargeSlots);
    const slots = makeIdleSlots();
    for (let i = 0; i < 48; i++) {
        if (dischargeSet.has(i)) {
            slots[i].action = 'Discharge';
        } else if (chargeSet.has(i)) {
            slots[i].action = 'Charge';
        }
    }
    return slots;
}

// ---------------------------------------------------------------------------
// Scenario 6: Peak-Valley (Japanese grid morning/evening peak pattern)
// ---------------------------------------------------------------------------

/**
 * Charges during overnight off-peak hours (slots 0–15, 0:00–7:30),
 * then discharges during the morning peak (slots 15–23, ~7:30–11:30)
 * and evening peak (slots 33–43, ~16:30–21:30).
 * Within each window the most expensive slots are selected.
 */
export function generatePeakValleyScenario(
    prices: number[],
    params: PeakValleyParams,
    config: BatteryConfig,
): ManualSlot[] {
    if (!prices || prices.length === 0) return makeIdleSlots();

    const { morningPeakSlots, eveningPeakSlots } = params;
    const filled = prices.slice(0, 48);

    // Night valley charge window: slots 0–15 (0:00–7:30)
    const nightIndices = Array.from({ length: 16 }, (_, i) => i);
    // Morning peak discharge window: slots 15–23 (~7:30–11:30)
    const morningIndices = Array.from({ length: 9 }, (_, i) => i + 15);
    // Evening peak discharge window: slots 33–43 (~16:30–21:30)
    const eveningIndices = Array.from({ length: 11 }, (_, i) => i + 33);

    const totalDischarge = morningPeakSlots + eveningPeakSlots;

    // Number of charge slots needed to support the discharge (physics-based)
    const { slotsPerCharge, slotsPerDischarge } = calcPhysicsSlots(config);
    const cyclesNeeded = Math.ceil(totalDischarge / Math.max(1, slotsPerDischarge));
    const chargeSlotCount = Math.min(nightIndices.length, slotsPerCharge * cyclesNeeded);

    // Select cheapest night slots for charging
    const sortedNight = [...nightIndices].sort((a, b) => (filled[a] ?? 0) - (filled[b] ?? 0));
    const chargeSet = new Set(sortedNight.slice(0, chargeSlotCount));

    // Select most expensive morning slots for discharge
    const sortedMorning = [...morningIndices].sort((a, b) => (filled[b] ?? 0) - (filled[a] ?? 0));
    const morningDischarge = new Set(sortedMorning.slice(0, morningPeakSlots));

    // Select most expensive evening slots for discharge
    const sortedEvening = [...eveningIndices].sort((a, b) => (filled[b] ?? 0) - (filled[a] ?? 0));
    const eveningDischarge = new Set(sortedEvening.slice(0, eveningPeakSlots));

    const slots = makeIdleSlots();
    for (let i = 0; i < 48; i++) {
        if (morningDischarge.has(i) || eveningDischarge.has(i)) {
            slots[i].action = 'Discharge';
        } else if (chargeSet.has(i)) {
            slots[i].action = 'Charge';
        }
    }
    return slots;
}

// ---------------------------------------------------------------------------
// Scenario 7: Price momentum (compare today vs historical distribution)
// ---------------------------------------------------------------------------

/**
 * For each time slot, computes the historical price distribution across the
 * last N days. Today's price below the `chargeBelow` percentile → charge candidate;
 * above `dischargeAbove` percentile → discharge candidate.
 * Trades when today's price is unusually cheap or expensive vs. history.
 */
export function generatePriceMomentumScenario(
    spotPricesByDate: Record<string, number[]>,
    targetDate: string,
    params: PriceMomentumParams,
    config: BatteryConfig,
): ManualSlot[] {
    const currentPrices = spotPricesByDate[targetDate];
    if (!currentPrices || currentPrices.length === 0) return makeIdleSlots();

    const { nDays, chargeBelow, dischargeAbove, cycleCount } = params;
    const { slotsPerCharge, slotsPerDischarge } = calcPhysicsSlots(config);
    const maxChargeSlots = slotsPerCharge * cycleCount;
    const maxDischargeSlots = slotsPerDischarge * cycleCount;

    const historicalDates = Object.keys(spotPricesByDate)
        .filter(d => d < targetDate)
        .sort()
        .slice(-nDays);

    const priceSources = historicalDates.map(d => spotPricesByDate[d]).filter(Boolean);
    if (priceSources.length === 0) return makeIdleSlots();

    const chargeCandidates: number[] = [];
    const dischargeCandidates: number[] = [];

    for (let i = 0; i < 48; i++) {
        const todayPrice = currentPrices[i] ?? 0;
        const histPrices = priceSources.map(p => p[i]).filter(v => v != null && !isNaN(v));
        if (histPrices.length === 0) continue;

        const histLow = computePercentile(histPrices, chargeBelow);
        const histHigh = computePercentile(histPrices, dischargeAbove);

        if (todayPrice <= histLow) chargeCandidates.push(i);
        if (todayPrice >= histHigh) dischargeCandidates.push(i);
    }

    const filled = currentPrices.slice(0, 48);

    // Keep the cheapest charge and most expensive discharge within the cap
    const selectedCharge = [...chargeCandidates]
        .sort((a, b) => (filled[a] ?? 0) - (filled[b] ?? 0))
        .slice(0, maxChargeSlots);
    const selectedDischarge = [...dischargeCandidates]
        .sort((a, b) => (filled[b] ?? 0) - (filled[a] ?? 0))
        .slice(0, maxDischargeSlots);

    const chargeSet = new Set(selectedCharge);
    const dischargeSet = new Set(selectedDischarge);
    const slots = makeIdleSlots();
    for (let i = 0; i < 48; i++) {
        if (dischargeSet.has(i)) {
            slots[i].action = 'Discharge';
        } else if (chargeSet.has(i)) {
            slots[i].action = 'Charge';
        }
    }
    return slots;
}

// ---------------------------------------------------------------------------
// Scenario 8: Conservative low-risk
// ---------------------------------------------------------------------------

/**
 * Only uses the top `topPct%` most expensive slots for discharge and the
 * bottom `topPct%` cheapest slots for charge. Forces a wide price spread and
 * minimises cycle wear — maximises revenue per cycle rather than total revenue.
 */
export function generateConservativeScenario(
    prices: number[],
    params: ConservativeParams,
    config: BatteryConfig,
): ManualSlot[] {
    if (!prices || prices.length === 0) return makeIdleSlots();

    const { topPct } = params;
    const filled = prices.slice(0, 48);
    const rawCount = Math.max(1, Math.ceil(48 * topPct / 100));

    // Conservative: always 1 cycle maximum — cap to physics
    const { slotsPerCharge, slotsPerDischarge } = calcPhysicsSlots(config);
    const chargeCount = Math.min(rawCount, slotsPerCharge);
    const dischargeCount = Math.min(rawCount, slotsPerDischarge);

    return buildFromPrices(filled, chargeCount, dischargeCount);
}
