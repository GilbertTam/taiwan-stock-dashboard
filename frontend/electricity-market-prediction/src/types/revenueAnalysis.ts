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
    SoC_init_pct: 0.02,
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
    action: 'Charge' | 'Spot' | 'Balance' | 'Idle';
    power: number;
    soc: number;
    price: number;
    revenue: number;
}

export interface GanttChartData {
    optimal: GanttOperation[];
    models: Record<string, GanttOperation[]>;
    dateRange: { start: string; end: string };
}

export interface ViewOptions {
    showOperation: boolean;
    showSoC: boolean;
    showGrid: boolean;
    showTooltips: boolean;
}

export const DEFAULT_VIEW_OPTIONS: ViewOptions = {
    showOperation: true,
    showSoC: true,
    showGrid: true,
    showTooltips: true
};
