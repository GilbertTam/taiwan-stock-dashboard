import type { MetricKey } from '@/components/daily-compare/DailyCompareControls';

// ─── API response types ──────────────────────────────────────────────────────

export interface Preset<T = Record<string, unknown>> {
    id: number;
    page_key: string;
    name: string;
    data: T;
    is_default: boolean;
    created_at: string;
    updated_at: string | null;
}

export interface PresetListResponse<T = Record<string, unknown>> {
    presets: Preset<T>[];
    count: number;
}

// ─── Page-specific preset data shapes ────────────────────────────────────────

export interface ForecastPresetData {
    // Data layer toggles
    showActualPrice: boolean;
    showImbalance: boolean;
    showImbalanceQuantity: boolean;
    showImbalanceSurplusRate: boolean;
    showImbalanceDeficitRate: boolean;
    showIntraday: boolean;
    showIntradayAverage: boolean;
    showWeather: boolean;
    showWeatherActual: boolean;
    showWeatherForecast: boolean;
    showOcctoArea: boolean;

    // Model selection
    selectedModels: Array<{
        id: string | number;
        name: string;
        color: string;
        calculatingDate: string;
    }>;

    // Weather model selections
    selectedWeatherModelActual: string | null;
    selectedWeatherModelForecast: string | null;

    // Field selections (Set serialized as string[])
    selectedOcctoFields: string[];
    occtoChartType: 'stacked' | 'area';
    selectedInterconnectionFields: string[];
    selectedBatteryFields: string[];
    selectedBidPlanFields: string[];
    selectedBidPlanCategories: string[];
    selectedSiteIds: string[];
    selectedWeatherFieldsActual: string[];
    selectedWeatherFieldsForecast: string[];
}

export interface WeatherPresetData {
    showActualHourly: boolean;
    showActualDaily: boolean;
    showForecastHourly: boolean;
    showForecastDaily: boolean;
    selectedModelActualHourly: string | null;
    selectedModelActualDaily: string | null;
    selectedModelForecastHourly: string | null;
    selectedModelForecastDaily: string | null;
    selectedFields: string[];
    weatherHeightByField: Record<string, string>;
}

export interface DailyComparePresetData {
    selectedAreas: string[];
    selectedMetric: MetricKey;
}
