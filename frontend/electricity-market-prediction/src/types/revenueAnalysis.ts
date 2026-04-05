export interface BatteryConfig {
    E_cap: number;
    P_max_dis: number;
    P_max_ch: number;
    Min_bid: number;
    eff_ch: number;
    eff_dis: number;
    beta_bal: number;
    E_loss: number;
    SoC_min_pct: number;
    SoC_max_pct: number;
    SoC_init_pct: number;
    SoC_end_pct: number;
    Cycle_limit: number;
    Cost_cycle: number;
    T: number;
    dt: number;
}

export const DEFAULT_BATTERY_CONFIG: BatteryConfig = {
    E_cap: 104.9,
    P_max_dis: 49.9,
    P_max_ch: 51.1,
    Min_bid: 1.0,
    eff_ch: 0.921,
    eff_dis: 0.974,
    beta_bal: 0.5,
    E_loss: 0.2,
    SoC_min_pct: 0.01,
    SoC_max_pct: 1.0,
    SoC_init_pct: 0.5,
    SoC_end_pct: 0.01,
    Cycle_limit: 1.0,
    Cost_cycle: 0,
    T: 48,
    dt: 0.5
};

export interface OptimizationResult {
    status: string;
    summary: {
        total_revenue: number;
    };
    results: Array<{
        time_step: number;
        price_spot: number;
        price_bal: number;
        action: string;
        direction: string | null;
        commodity_category: string | null;
        power_ch: number;
        power_spot: number;
        power_bal: number;
        soc_mwh: number;
        soc_pct: number;
        revenue: number;
    }>;
}

export interface GanttOperation {
    timeStep: number;
    timeCode: number; // 1-48
    datetime: string;
    action: 'Charge' | 'Spot' | 'Balance' | 'Idle' | 'Discharge' | null;
    power: number | null;
    soc: number | null;
    price: number | null;
    revenue: number | null;
    // New fields for Actual vs Predicted
    priceActual?: number | null;
    pricePredicted?: number | null;
    revenueRealized?: number | null;  // Revenue at actual prices
    revenueEstimated?: number | null; // Revenue at predicted prices (model only)
    // Manual schedule clamping info
    requestedPower?: number | null;   // User-specified power before SoC clamping
    wasClamped?: boolean;             // True if SoC clamping reduced the actual power
}

export interface GanttChartData {
    optimal: GanttOperation[];
    models: Record<string, GanttOperation[]>;
    manual?: GanttOperation[];
    dateRange: { start: string; end: string };
}

// Manual schedule types
export interface ManualSlot {
    timeStep: number;       // 0-based index (0..47)
    action: 'Charge' | 'Discharge' | 'Idle';
    power: number | null;   // MW; null = use P_max from config
}

// Keyed by date string "YYYY-MM-DD"
export type ManualSchedule = Record<string, ManualSlot[]>;


