/**
 * Column definitions for the Records tab in the Data Status detail drawer.
 * Each entry maps a source_key to the ordered list of fields to display.
 *
 * Mirrors the field lists in backend es_service.py `_preview_config()`.
 * Dynamic sources (prediction_*, tdgc_*) are handled via prefix matching below.
 */

export interface RecordColumn {
    field: string;
    label: string;
    unit?: string;
    text?: boolean;     // if true, left-align and skip numeric formatting
}

// Static source column definitions
export const SOURCE_RECORD_COLUMNS: Record<string, RecordColumn[]> = {
    spot_price: [
        { field: 'area_price', label: '地區現貨價', unit: '¥/kWh' },
    ],
    jepx_system: [
        { field: 'system_price',           label: '系統現貨價', unit: '¥/kWh' },
        { field: 'sell_bid_volume',        label: '賣出申告量', unit: 'kWh'    },
        { field: 'buy_bid_volume',         label: '買入申告量', unit: 'kWh'    },
        { field: 'contracted_total_volume',label: '成交量',     unit: 'kWh'    },
    ],
    intraday: [
        { field: 'opening_price',            label: '開盤價',   unit: '¥/kWh' },
        { field: 'high_price',               label: '最高價',   unit: '¥/kWh' },
        { field: 'low_price',                label: '最低價',   unit: '¥/kWh' },
        { field: 'closing_price',            label: '收盤價',   unit: '¥/kWh' },
        { field: 'average_price',            label: '平均價',   unit: '¥/kWh' },
        { field: 'total_contracted_volume',  label: '成交量',   unit: 'kWh'    },
    ],
    imbalance: [
        { field: 'imbalance_surplus_rate', label: '剩餘費率',   unit: '¥/kWh' },
        { field: 'imbalance_deficit_rate', label: '不足費率',   unit: '¥/kWh' },
        { field: 'imbalance_quantity',     label: '不平衡量',   unit: 'kWh'    },
    ],
    occto_area: [
        { field: 'area_demand',                     label: '地區需求',     unit: 'MW' },
        { field: 'total',                           label: '總供電',       unit: 'MW' },
        { field: 'solar_power_generation_actual',   label: '太陽能',       unit: 'MW' },
        { field: 'wind_power_generation_actual',    label: '風力',         unit: 'MW' },
        { field: 'solar_power_output_control',      label: '太陽能抑制',   unit: 'MW' },
        { field: 'wind_power_output_control',       label: '風力抑制',     unit: 'MW' },
        { field: 'nuclear_power',                   label: '核能',         unit: 'MW' },
        { field: 'thermal',                         label: '火力',         unit: 'MW' },
        { field: 'hydropower',                      label: '水力',         unit: 'MW' },
        { field: 'pumped_storage',                  label: '抽蓄',         unit: 'MW' },
        { field: 'interconnection_line',            label: '連絡線融通',   unit: 'MW' },
    ],
    occto_inter: [
        { field: 'interconnection_name',       label: '連絡線名稱',     unit: '', text: true },
        { field: 'forward_planned_flow',       label: '正向計劃潮流',   unit: 'MW' },
        { field: 'reverse_planned_flow',       label: '逆向計劃潮流',   unit: 'MW' },
        { field: 'forward_available_capacity', label: '正向可用容量',   unit: 'MW' },
        { field: 'reverse_available_capacity', label: '逆向可用容量',   unit: 'MW' },
    ],
    // occto_event has special card-list rendering — no column definition needed
    occto_event: [],
};

// Columns for all tdgc_* sources (commodity_category varies but fields are the same)
export const TDGC_RECORD_COLUMNS: RecordColumn[] = [
    { field: 'corrected_unit_price_ave', label: '補正後單價 (Ave)', unit: '¥/kWh' },
    { field: 'tso_price_ave',            label: 'TSO 價格 (Ave)',   unit: '¥/kWh' },
    { field: 'in_area_quantity',         label: '地區需求量',       unit: 'kWh'    },
    { field: 'total_contract_quantity',  label: '總成交量',         unit: 'kWh'    },
];

// Columns for all prediction_* sources (P50 is stored as forecast_price after expansion)
// calculate_time is intentionally first so users can distinguish multiple forecasting runs
export const PREDICTION_RECORD_COLUMNS: RecordColumn[] = [
    { field: 'calculate_time', label: '計算日',       unit: ''       },
    { field: 'forecast_price', label: 'P50 (中位數)', unit: '¥/kWh' },
];

// Key weather fields to display (subset of the full schema — keeps table readable)
export const WEATHER_RECORD_COLUMNS: RecordColumn[] = [
    { field: 'temperature_2m',               label: '氣溫',         unit: '°C'    },
    { field: 'apparent_temperature',         label: '體感溫度',     unit: '°C'    },
    { field: 'relative_humidity_2m',         label: '相對濕度',     unit: '%'     },
    { field: 'precipitation',                label: '降水量',       unit: 'mm'    },
    { field: 'wind_speed_10m',               label: '風速 10m',     unit: 'm/s'   },
    { field: 'wind_speed_100m',              label: '風速 100m',    unit: 'm/s'   },
    { field: 'shortwave_radiation',          label: '短波輻射',     unit: 'W/m²'  },
    { field: 'cloud_cover',                  label: '雲量',         unit: '%'     },
    { field: 'surface_pressure',             label: '地面氣壓',     unit: 'hPa'   },
    // daily-only fields
    { field: 'temperature_2m_max',           label: '最高溫',       unit: '°C'    },
    { field: 'temperature_2m_min',           label: '最低溫',       unit: '°C'    },
    { field: 'precipitation_sum',            label: '日降水量',     unit: 'mm'    },
    { field: 'wind_speed_10m_max',           label: '最大風速 10m', unit: 'm/s'   },
    { field: 'shortwave_radiation_sum',      label: '日照輻射總量', unit: 'MJ/m²' },
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
