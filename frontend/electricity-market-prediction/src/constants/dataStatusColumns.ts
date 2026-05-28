/**
 * Column definitions for the Records tab in the Data Status detail drawer.
 * Each entry maps a source_key to the ordered list of fields to display.
 *
 * Mirrors the field lists in backend es_service.py `_preview_config()`.
 * Dynamic sources (prediction_*, tdgc_*) are handled via prefix matching below.
 *
 * `labelKey` is an i18n key within the 'dataStatus' namespace (e.g. 'columns.area_price').
 */

export interface RecordColumn {
    field: string;
    labelKey: string;   // i18n key within 'dataStatus' namespace
    unit?: string;
    text?: boolean;     // if true, left-align and skip numeric formatting
}

// Static source column definitions
export const SOURCE_RECORD_COLUMNS: Record<string, RecordColumn[]> = {
    spot_price: [
        { field: 'area_price', labelKey: 'columns.area_price', unit: '¥/kWh' },
    ],
    jepx_system: [
        { field: 'system_price',           labelKey: 'columns.system_price',           unit: '¥/kWh' },
        { field: 'sell_bid_volume',        labelKey: 'columns.sell_bid_volume',        unit: 'kWh'    },
        { field: 'buy_bid_volume',         labelKey: 'columns.buy_bid_volume',         unit: 'kWh'    },
        { field: 'contracted_total_volume',labelKey: 'columns.contracted_total_volume', unit: 'kWh'    },
    ],
    intraday: [
        { field: 'opening_price',            labelKey: 'columns.opening_price',            unit: '¥/kWh' },
        { field: 'high_price',               labelKey: 'columns.high_price',               unit: '¥/kWh' },
        { field: 'low_price',                labelKey: 'columns.low_price',                unit: '¥/kWh' },
        { field: 'closing_price',            labelKey: 'columns.closing_price',            unit: '¥/kWh' },
        { field: 'average_price',            labelKey: 'columns.average_price',            unit: '¥/kWh' },
        { field: 'total_contracted_volume',  labelKey: 'columns.total_contracted_volume',  unit: 'kWh'    },
    ],
    imbalance: [
        { field: 'imbalance_surplus_rate', labelKey: 'columns.imbalance_surplus_rate', unit: '¥/kWh' },
        { field: 'imbalance_deficit_rate', labelKey: 'columns.imbalance_deficit_rate', unit: '¥/kWh' },
        { field: 'imbalance_quantity',     labelKey: 'columns.imbalance_quantity',     unit: 'kWh'    },
    ],
    occto_area: [
        { field: 'area_demand',                     labelKey: 'columns.area_demand',           unit: 'MW' },
        { field: 'total',                           labelKey: 'columns.total_supply',          unit: 'MW' },
        { field: 'solar_power_generation_actual',   labelKey: 'columns.solar_power',           unit: 'MW' },
        { field: 'wind_power_generation_actual',    labelKey: 'columns.wind_power',            unit: 'MW' },
        { field: 'solar_power_output_control',      labelKey: 'columns.solar_curtailment',     unit: 'MW' },
        { field: 'wind_power_output_control',       labelKey: 'columns.wind_curtailment',      unit: 'MW' },
        { field: 'nuclear_power',                   labelKey: 'columns.nuclear_power',         unit: 'MW' },
        { field: 'thermal',                         labelKey: 'columns.thermal',               unit: 'MW' },
        { field: 'hydropower',                      labelKey: 'columns.hydropower',            unit: 'MW' },
        { field: 'pumped_storage',                  labelKey: 'columns.pumped_storage',        unit: 'MW' },
        { field: 'interconnection_line',            labelKey: 'columns.interconnection_line',   unit: 'MW' },
    ],
    occto_inter: [
        { field: 'interconnection_name',       labelKey: 'columns.interconnection_name',       unit: '', text: true },
        { field: 'forward_planned_flow',       labelKey: 'columns.forward_planned_flow',       unit: 'MW' },
        { field: 'reverse_planned_flow',       labelKey: 'columns.reverse_planned_flow',       unit: 'MW' },
        { field: 'forward_available_capacity', labelKey: 'columns.forward_available_capacity', unit: 'MW' },
        { field: 'reverse_available_capacity', labelKey: 'columns.reverse_available_capacity', unit: 'MW' },
    ],
    // occto_event has special card-list rendering — no column definition needed
    occto_event: [],
};

// Columns for all tdgc_* sources (commodity_category varies but fields are the same)
// Layout mirrors EPRX 調整力市場 table: origin-area metrics first, then TSO-side metrics.
export const TDGC_RECORD_COLUMNS: RecordColumn[] = [
    // ── Origin area (電源属地別) ───────────────────────────────────────────────
    { field: 'corrected_unit_price_ave',         labelKey: 'columns.corrected_unit_price_ave',         unit: '¥/kWh' },
    { field: 'corrected_unit_price_max',         labelKey: 'columns.corrected_unit_price_max',         unit: '¥/kWh' },
    { field: 'corrected_unit_price_min',         labelKey: 'columns.corrected_unit_price_min',         unit: '¥/kWh' },
    { field: 'offer_count',                      labelKey: 'columns.offer_count',                      unit: ''       },
    { field: 'offer_id_count',                   labelKey: 'columns.offer_id_count',                   unit: ''       },
    { field: 'offer_count_quantity_in_total',    labelKey: 'columns.offer_count_quantity_in_total',    unit: 'kWh'    },
    { field: 'offer_id_count_quantity_in_total', labelKey: 'columns.offer_id_count_quantity_in_total', unit: 'kWh'    },
    // ── TSO side (TSO別) ─────────────────────────────────────────────────────
    { field: 'tso_price_ave',                    labelKey: 'columns.tso_price_ave',                    unit: '¥/kWh' },
    { field: 'tso_price_max',                    labelKey: 'columns.tso_price_max',                    unit: '¥/kWh' },
    { field: 'tso_price_min',                    labelKey: 'columns.tso_price_min',                    unit: '¥/kWh' },
    { field: 'reserve_requirement',              labelKey: 'columns.reserve_requirement',              unit: 'kWh'    },
    { field: 'total_contract_quantity',          labelKey: 'columns.total_contract_quantity',          unit: 'kWh'    },
    { field: 'in_area_quantity',                 labelKey: 'columns.in_area_quantity',                 unit: 'kWh'    },
];

// Columns for all prediction_* sources (P50 is stored as forecast_price after expansion)
// calculate_time is intentionally first so users can distinguish multiple forecasting runs
export const PREDICTION_RECORD_COLUMNS: RecordColumn[] = [
    { field: 'calculate_time', labelKey: 'columns.calculate_time',     unit: ''       },
    { field: 'forecast_price', labelKey: 'columns.forecast_price_p50', unit: '¥/kWh' },
];

// Key weather fields to display (subset of the full schema — keeps table readable)
export const WEATHER_RECORD_COLUMNS: RecordColumn[] = [
    { field: 'temperature_2m',               labelKey: 'columns.temperature_2m',          unit: '°C'    },
    { field: 'apparent_temperature',         labelKey: 'columns.apparent_temperature',    unit: '°C'    },
    { field: 'relative_humidity_2m',         labelKey: 'columns.relative_humidity_2m',    unit: '%'     },
    { field: 'precipitation',                labelKey: 'columns.precipitation',           unit: 'mm'    },
    { field: 'wind_speed_10m',               labelKey: 'columns.wind_speed_10m',          unit: 'm/s'   },
    { field: 'wind_speed_100m',              labelKey: 'columns.wind_speed_100m',         unit: 'm/s'   },
    { field: 'shortwave_radiation',          labelKey: 'columns.shortwave_radiation',     unit: 'W/m²'  },
    { field: 'cloud_cover',                  labelKey: 'columns.cloud_cover',             unit: '%'     },
    { field: 'surface_pressure',             labelKey: 'columns.surface_pressure',        unit: 'hPa'   },
    // daily-only fields
    { field: 'temperature_2m_max',           labelKey: 'columns.temperature_2m_max',      unit: '°C'    },
    { field: 'temperature_2m_min',           labelKey: 'columns.temperature_2m_min',      unit: '°C'    },
    { field: 'precipitation_sum',            labelKey: 'columns.precipitation_sum',       unit: 'mm'    },
    { field: 'wind_speed_10m_max',           labelKey: 'columns.wind_speed_10m_max',      unit: 'm/s'   },
    { field: 'shortwave_radiation_sum',      labelKey: 'columns.shortwave_radiation_sum', unit: 'MJ/m²' },
];

/**
 * Returns the column definitions for a given source_key.
 * Handles static keys, tdgc_* prefixes, prediction_* prefixes, and weather_* prefixes.
 */
export function getRecordColumns(sourceKey: string): RecordColumn[] {
    if (sourceKey.startsWith('prediction_')) return PREDICTION_RECORD_COLUMNS;
    if (sourceKey.startsWith('tdgc_'))       return TDGC_RECORD_COLUMNS;
    if (sourceKey.startsWith('weather_'))    return WEATHER_RECORD_COLUMNS;
    return SOURCE_RECORD_COLUMNS[sourceKey] ?? [];
}
