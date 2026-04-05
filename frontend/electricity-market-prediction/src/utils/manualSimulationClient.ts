/**
 * Client-side battery manual simulation.
 * Mirrors the Python logic in backend/app/services/manual_simulation.py.
 * Used for instant UI preview without hitting the API.
 */

import { ManualSlot, BatteryConfig } from '@/types/revenueAnalysis';

export interface ManualSimPreviewSlot {
    timeStep: number;
    action: 'Charge' | 'Discharge' | 'Idle';
    requestedPower: number | null;
    effectivePower: number;    // after SoC clamping
    wasClamped: boolean;       // requested power was reduced
    socAfter: number;          // SoC in MWh after this step
    socPct: number;            // SoC % 0-100
    revenue: number;           // step revenue (if spot price provided)
}

export interface ManualSimPreview {
    slots: ManualSimPreviewSlot[];
    totalRevenue: number;
    effectiveCycles: number; // total discharge energy / E_cap (equivalent full cycles)
    cycleCapHit: boolean;    // true if Cycle_limit was enforced during simulation
}

/**
 * Simulate the manual schedule client-side.
 * @param userSlots     Array of ManualSlot (length up to 48)
 * @param config        BatteryConfig
 * @param spotPrices    Optional array of spot prices (¥/kWh); used for revenue preview
 * @param initialSocMwh Optional starting SoC in MWh (overrides config.SoC_init_pct for cross-day carry-over)
 */
export function simulateManualClient(
    userSlots: ManualSlot[],
    config: BatteryConfig,
    spotPrices?: number[],
    initialSocMwh?: number
): ManualSimPreview {
    const T = 48;
    const E_cap = config.E_cap > 0 ? config.E_cap : 1;
    const SoC_min = E_cap * config.SoC_min_pct;
    const SoC_max = E_cap * config.SoC_max_pct;
    const SoC_init = E_cap * config.SoC_init_pct;
    const { eff_ch, eff_dis, E_loss, dt, P_max_ch, P_max_dis, Cost_cycle, Cycle_limit } = config;

    // Maximum total discharge energy from SoC across the day (cycle limit)
    const maxTotalDischargeEnergy = Cycle_limit > 0 ? E_cap * Cycle_limit : Infinity;

    // Build lookup map
    const slotMap = new Map<number, ManualSlot>();
    for (const s of userSlots) slotMap.set(s.timeStep, s);

    // Use provided initial SoC (cross-day carry-over) or fall back to config default
    let soc = initialSocMwh !== undefined
        ? Math.max(SoC_min, Math.min(SoC_max, initialSocMwh))
        : SoC_init;
    let totalRevenue = 0;
    let totalDischargeEnergy = 0;
    let cycleCapHit = false;
    const result: ManualSimPreviewSlot[] = [];

    for (let t = 0; t < T; t++) {
        const entry = slotMap.get(t) ?? { timeStep: t, action: 'Idle' as const, power: null };
        const spotP = spotPrices?.[t] ?? 0;

        // Apply self-discharge before action
        const socBeforeLoss = Math.max(SoC_min, soc - E_loss);

        let effectivePower = 0;
        let wasClamped = false;
        let action: 'Charge' | 'Discharge' | 'Idle' = 'Idle';
        let revenue = 0;

        if (entry.action === 'Charge') {
            const requested = entry.power != null ? Math.min(entry.power, P_max_ch) : P_max_ch;
            const maxEnergyIn = (SoC_max - socBeforeLoss) / (eff_ch > 0 ? eff_ch : 1);
            const maxPower = maxEnergyIn / (dt > 0 ? dt : 0.5);
            const clamped = Math.max(0, Math.min(requested, maxPower));
            wasClamped = clamped < requested - 1e-6;
            effectivePower = clamped;
            action = 'Charge';
            if (clamped > 1e-6) {
                soc = socBeforeLoss + clamped * dt * eff_ch;
                const cost = clamped * 1000 * spotP * dt;
                revenue = -cost;
            } else {
                soc = socBeforeLoss;
                action = 'Idle';
                wasClamped = true;
            }
        } else if (entry.action === 'Discharge') {
            const requested = entry.power != null ? Math.min(entry.power, P_max_dis) : P_max_dis;
            const maxEnergyOut = (socBeforeLoss - SoC_min) * (eff_dis > 0 ? eff_dis : 1);
            const maxPower = maxEnergyOut / (dt > 0 ? dt : 0.5);
            let clamped = Math.max(0, Math.min(requested, maxPower));

            // Enforce cycle limit: clamp if remaining cycle budget is exhausted
            const energyIfFull = (clamped * dt) / (eff_dis > 0 ? eff_dis : 1);
            const remainingCycleBudget = maxTotalDischargeEnergy - totalDischargeEnergy;
            if (remainingCycleBudget <= 1e-6) {
                clamped = 0;
                cycleCapHit = true;
            } else if (energyIfFull > remainingCycleBudget + 1e-6) {
                const maxPowerByCycle = remainingCycleBudget * (eff_dis > 0 ? eff_dis : 1) / (dt > 0 ? dt : 0.5);
                if (clamped > maxPowerByCycle + 1e-6) cycleCapHit = true;
                clamped = Math.max(0, maxPowerByCycle);
            }

            wasClamped = clamped < requested - 1e-6;
            effectivePower = clamped;
            action = 'Discharge';
            if (clamped > 1e-6) {
                const dischargeEnergy = (clamped * dt) / (eff_dis > 0 ? eff_dis : 1);
                soc = socBeforeLoss - dischargeEnergy;
                totalDischargeEnergy += dischargeEnergy;
                const rev = clamped * 1000 * spotP * dt;
                const degCost = (clamped * dt / (eff_dis > 0 ? eff_dis : 1)) * Cost_cycle;
                revenue = rev - degCost;
            } else {
                soc = socBeforeLoss;
                action = 'Idle';
                wasClamped = true;
            }
        } else {
            soc = socBeforeLoss;
        }

        // Safety clamp
        soc = Math.max(SoC_min, Math.min(SoC_max, soc));
        totalRevenue += revenue;

        result.push({
            timeStep: t,
            action,
            requestedPower: entry.action !== 'Idle' ? (entry.power ?? (entry.action === 'Charge' ? P_max_ch : P_max_dis)) : null,
            effectivePower,
            wasClamped,
            socAfter: soc,
            socPct: E_cap > 0 ? (soc / E_cap) * 100 : 0,
            revenue,
        });
    }

    return { slots: result, totalRevenue, effectiveCycles: E_cap > 0 ? totalDischargeEnergy / E_cap : 0, cycleCapHit };
}
