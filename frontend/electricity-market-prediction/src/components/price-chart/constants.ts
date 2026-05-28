export const occtoFields = [
    { value: 'area_demand', labelKey: 'fields.occto.areaDemand' },
    { value: 'nuclear_power', labelKey: 'fields.occto.nuclear' },
    { value: 'thermal', labelKey: 'fields.occto.thermal' },
    { value: 'hydropower', labelKey: 'fields.occto.hydro' },
    { value: 'geothermal_power', labelKey: 'fields.occto.geothermal' },
    { value: 'biomass', labelKey: 'fields.occto.biomass' },
    { value: 'solar_power_generation_actual', labelKey: 'fields.occto.solarActual' },
    { value: 'wind_power_generation_actual', labelKey: 'fields.occto.windActual' },
    { value: 'pumped_storage', labelKey: 'fields.occto.pumpedStorage' },
    { value: 'battery_storage', labelKey: 'fields.occto.battery' },
    { value: 'interconnection_line', labelKey: 'fields.occto.interconnection' },
];

export const occtoStackedFields = [
    { key: 'area_demand', color: '#6366f1', gradient: ['#818cf8', '#6366f1'], labelKey: 'fields.occto.areaDemand' },
    { key: 'nuclear_power', color: '#e6a23c', gradient: ['#f4d03f', '#e6a23c'], labelKey: 'fields.occto.nuclear' },
    { key: 'thermal', color: '#f56c6c', gradient: ['#ff8787', '#f56c6c'], labelKey: 'fields.occto.thermal' },
    { key: 'hydropower', color: '#409eff', gradient: ['#66b3ff', '#409eff'], labelKey: 'fields.occto.hydro' },
    { key: 'geothermal_power', color: '#8e44ad', gradient: ['#bb8fce', '#8e44ad'], labelKey: 'fields.occto.geothermal' },
    { key: 'biomass', color: '#27ae60', gradient: ['#58d68d', '#27ae60'], labelKey: 'fields.occto.biomass' },
    { key: 'solar_power_generation_actual', color: '#f1c40f', gradient: ['#f7dc6f', '#f1c40f'], labelKey: 'fields.occto.solar' },
    { key: 'wind_power_generation_actual', color: '#2ecc71', gradient: ['#58d68d', '#2ecc71'], labelKey: 'fields.occto.wind' },
    { key: 'pumped_storage', color: '#3498db', gradient: ['#5dade2', '#3498db'], labelKey: 'fields.occto.pumpedStorage' },
    { key: 'battery_storage', color: '#909399', gradient: ['#bdc3c7', '#909399'], labelKey: 'fields.occto.battery' },
    { key: 'interconnection_line', color: '#d35400', gradient: ['#e67e22', '#d35400'], labelKey: 'fields.occto.interconnection' },
    { key: 'others', color: '#7f8c8d', gradient: ['#aab7b8', '#7f8c8d'], labelKey: 'fields.occto.others' },
];

/** 互連 (occto_inter) 可選欄位：對應 ProcessedDataPoint 上的屬性 */
export const INTERCONNECTION_FIELDS = [
    { key: 'flow_diff', labelKey: 'fields.interconnection.flowDiff', pointKey: 'interconnection_flow_diff' as const, color: '#00bcd4' },
    { key: 'forward_planned_flow', labelKey: 'fields.interconnection.forwardPlannedFlow', pointKey: 'interconnection_forward' as const, color: '#26a69a' },
    { key: 'reverse_planned_flow', labelKey: 'fields.interconnection.reversePlannedFlow', pointKey: 'interconnection_reverse' as const, color: '#78909c' },
    { key: 'actual_flow', labelKey: 'fields.interconnection.actualFlow', pointKey: 'interconnection_actual_flow' as const, color: '#ff7043' },
    { key: 'forward_available_capacity', labelKey: 'fields.interconnection.forwardAvailableCapacity', pointKey: 'interconnection_forward_available_capacity' as const, color: '#66bb6a' },
    { key: 'reverse_available_capacity', labelKey: 'fields.interconnection.reverseAvailableCapacity', pointKey: 'interconnection_reverse_available_capacity' as const, color: '#ab47bc' },
    { key: 'forward_margin', labelKey: 'fields.interconnection.forwardMargin', pointKey: 'interconnection_forward_margin' as const, color: '#42a5f5' },
    { key: 'reverse_margin', labelKey: 'fields.interconnection.reverseMargin', pointKey: 'interconnection_reverse_margin' as const, color: '#ef5350' },
];

/** 電池 (battery_data) 可選欄位：負=充電、正=放電 */
export const BATTERY_FIELDS = [
    { key: 'spot_value', labelKey: 'fields.battery.spotValue', pointKey: 'battery_spot_value' as const, color: '#7e57c2' },
    { key: 'intraday_value', labelKey: 'fields.battery.intradayValue', pointKey: 'battery_intraday_value' as const, color: '#5c6bc0' },
    { key: 'primary_value', labelKey: 'fields.battery.primaryValue', pointKey: 'battery_primary_value' as const, color: '#7986cb' },
    { key: 'soc_kwh', labelKey: 'fields.battery.socKwh', pointKey: 'battery_soc_kwh' as const, color: '#26a69a' },
    { key: 'actual_soc_kwh', labelKey: 'fields.battery.actualSocKwh', pointKey: 'battery_actual_soc_kwh' as const, color: '#66bb6a' },
];

// Weather field definitions - 使用與其他資料來源明顯不同的調色
export const weatherFields = [
    { value: 'temperature_2m', labelKey: 'fields.weather.temperature', unit: '°C', color: '#ff9800' },
    { value: 'apparent_temperature', labelKey: 'fields.weather.apparentTemp', unit: '°C', color: '#ffcc80' },
    { value: 'precipitation', labelKey: 'fields.weather.precipitation', unit: 'mm', color: '#2196f3' },
    { value: 'rain', labelKey: 'fields.weather.rain', unit: 'mm', color: '#42a5f5' },
    { value: 'snowfall', labelKey: 'fields.weather.snowfall', unit: 'cm', color: '#b3e5fc' },
    { value: 'wind_speed_10m', labelKey: 'fields.weather.windSpeed', unit: 'm/s', color: '#4caf50' },
    { value: 'wind_gusts_10m', labelKey: 'fields.weather.windGusts', unit: 'm/s', color: '#81c784' },
    { value: 'relative_humidity_2m', labelKey: 'fields.weather.humidity', unit: '%', color: '#9c27b0' },
    { value: 'cloud_cover', labelKey: 'fields.weather.cloudCover', unit: '%', color: '#607d8b' },
    { value: 'sunshine_duration', labelKey: 'fields.weather.sunshine', unit: 'h', color: '#ffd700' },
    { value: 'shortwave_radiation', labelKey: 'fields.weather.radiation', unit: 'W/m²', color: '#ff8c00' },
    { value: 'soil_temperature', labelKey: 'fields.weather.soilTemp', unit: '°C', color: '#795548' },
    { value: 'soil_moisture', labelKey: 'fields.weather.soilMoisture', unit: 'm³/m³', color: '#009688' },
    { value: 'pressure_msl', labelKey: 'fields.weather.pressure', unit: 'hPa', color: '#e91e63' },
];

/** TDGC (調整力市場) 商品分類定義 — 共用常數 (TdgcPanel + overlay) */
export const TDGC_CATEGORIES: Record<string, { labelKey: string; color: string }> = {
    '1000': { labelKey: 'tdgcTab.categories.primary',          color: '#e53935' },
    '1100': { labelKey: 'tdgcTab.categories.secondary1',       color: '#fb8c00' },
    '2100': { labelKey: 'tdgcTab.categories.secondary2',       color: '#fdd835' },
    '2200': { labelKey: 'tdgcTab.categories.tertiary1',        color: '#43a047' },
    '3100': { labelKey: 'tdgcTab.categories.tertiary2',        color: '#1e88e5' },
    '3200': { labelKey: 'tdgcTab.categories.supplyDemandAdj',  color: '#8e24aa' },
    '4000': { labelKey: 'tdgcTab.categories.forward',          color: '#00897b' },
};

/**
 * TDGC (調整力市場) — 對應 EPRX 調整力市場表格的 13 個指標。
 *
 *  - group: 'origin' = 電源属地別、'tso' = TSO別
 *  - bandRole/bandKey: 同 bandKey 的 min/max/ave 在圖上合成透明上下區間 (band) + 平均線
 *  - type: 'price' = 折線 (band 中心線)，'quantity' = 直方圖
 *  - isMwh: true 表示原始值為 kWh，呈現時需 / 1000 轉成 MWh
 *
 *  pointKey 命名格式: `tdgc_<group>_<shortKey>`，merge 層再加 dataType+category prefix。
 */
export interface TdgcFieldDef {
    key: string;
    labelKey: string;
    pointKey: string;
    color: string;
    type: 'price' | 'quantity';
    group: 'origin' | 'tso';
    bandRole?: 'min' | 'max' | 'ave';
    bandKey?: string;
    isMwh: boolean;
}

export const TDGC_FIELDS: TdgcFieldDef[] = [
    // ── Origin (電源属地別) — 7 fields ────────────────────────────────────────
    { key: 'corrected_unit_price_ave',         labelKey: 'fields.tdgc.origin.priceAve',   pointKey: 'tdgc_origin_price_ave',     color: '#e91e63', type: 'price',    group: 'origin', bandRole: 'ave', bandKey: 'origin_price', isMwh: false },
    { key: 'corrected_unit_price_max',         labelKey: 'fields.tdgc.origin.priceMax',   pointKey: 'tdgc_origin_price_max',     color: '#e91e63', type: 'price',    group: 'origin', bandRole: 'max', bandKey: 'origin_price', isMwh: false },
    { key: 'corrected_unit_price_min',         labelKey: 'fields.tdgc.origin.priceMin',   pointKey: 'tdgc_origin_price_min',     color: '#e91e63', type: 'price',    group: 'origin', bandRole: 'min', bandKey: 'origin_price', isMwh: false },
    { key: 'offer_count_quantity_in_total',    labelKey: 'fields.tdgc.origin.offerQty',   pointKey: 'tdgc_origin_offer_qty',     color: '#fb8c00', type: 'quantity', group: 'origin', isMwh: true  },
    { key: 'offer_id_count_quantity_in_total', labelKey: 'fields.tdgc.origin.awardQty',   pointKey: 'tdgc_origin_award_qty',     color: '#7e57c2', type: 'quantity', group: 'origin', isMwh: true  },
    { key: 'offer_count',                      labelKey: 'fields.tdgc.origin.offerCount', pointKey: 'tdgc_origin_offer_count',   color: '#ef5350', type: 'quantity', group: 'origin', isMwh: false },
    { key: 'offer_id_count',                   labelKey: 'fields.tdgc.origin.awardCount', pointKey: 'tdgc_origin_award_count',   color: '#66bb6a', type: 'quantity', group: 'origin', isMwh: false },

    // ── TSO (TSO別) — 6 fields ─────────────────────────────────────────────────
    { key: 'tso_price_ave',                    labelKey: 'fields.tdgc.tso.priceAve',      pointKey: 'tdgc_tso_price_ave',        color: '#9c27b0', type: 'price',    group: 'tso',    bandRole: 'ave', bandKey: 'tso_price',    isMwh: false },
    { key: 'tso_price_max',                    labelKey: 'fields.tdgc.tso.priceMax',      pointKey: 'tdgc_tso_price_max',        color: '#9c27b0', type: 'price',    group: 'tso',    bandRole: 'max', bandKey: 'tso_price',    isMwh: false },
    { key: 'tso_price_min',                    labelKey: 'fields.tdgc.tso.priceMin',      pointKey: 'tdgc_tso_price_min',        color: '#9c27b0', type: 'price',    group: 'tso',    bandRole: 'min', bandKey: 'tso_price',    isMwh: false },
    { key: 'reserve_requirement',              labelKey: 'fields.tdgc.tso.reserveReq',    pointKey: 'tdgc_tso_reserve_req',      color: '#5c6bc0', type: 'quantity', group: 'tso',    isMwh: true  },
    { key: 'total_contract_quantity',          labelKey: 'fields.tdgc.tso.contractQty',   pointKey: 'tdgc_tso_contract_qty',     color: '#7e57c2', type: 'quantity', group: 'tso',    isMwh: true  },
    { key: 'in_area_quantity',                 labelKey: 'fields.tdgc.tso.inAreaQty',     pointKey: 'tdgc_tso_in_area_qty',      color: '#26a69a', type: 'quantity', group: 'tso',    isMwh: true  },
];

/** 預設選取的 TDGC 群組 (電源属地別預設開、TSO別預設關) */
export const TDGC_DEFAULT_GROUPS = ['origin'] as const;

/** 預設選取的 TDGC 欄位 (band trio + 落札量合計) */
export const TDGC_DEFAULT_FIELDS = [
    'corrected_unit_price_ave',
    'corrected_unit_price_max',
    'corrected_unit_price_min',
    'offer_id_count_quantity_in_total',
] as const;

/** 投標計畫 (bid_plans) 基礎欄位定義 */
export const BID_PLAN_BASE_FIELDS = [
    { key: 'bid_buy_price', labelKey: 'fields.bidPlan.buyPrice', color: '#fbc02d' },
    { key: 'bid_buy_volume', labelKey: 'fields.bidPlan.buyVolume', color: '#00897b' },
    { key: 'bid_sell_price', labelKey: 'fields.bidPlan.sellPrice', color: '#fb8c00' },
    { key: 'bid_sell_volume', labelKey: 'fields.bidPlan.sellVolume', color: '#8e24aa' },
];

/** 投標計畫 (bid_plans) 可選欄位 - 現貨市場 (spot) */
export const BID_PLAN_SPOT_FIELDS = BID_PLAN_BASE_FIELDS.map(f => ({
    ...f,
    pointKey: `bid_spot_${f.key.replace('bid_', '')}` as const,
    labelKey: f.labelKey,
    labelPrefix: 'fields.bidPlan.spotPrefix' as const,
    category: 'spot' as const,
}));

/** 投標計畫 (bid_plans) 可選欄位 - 日內市場 (intraday) */
export const BID_PLAN_INTRADAY_FIELDS = BID_PLAN_BASE_FIELDS.map(f => ({
    ...f,
    pointKey: `bid_intraday_${f.key.replace('bid_', '')}` as const,
    labelKey: f.labelKey,
    labelPrefix: 'fields.bidPlan.intradayPrefix' as const,
    category: 'intraday' as const,
    // 使用稍微不同的颜色以区分
    color: f.key === 'bid_buy_price' ? '#ffc107' :
        f.key === 'bid_buy_volume' ? '#009688' :
            f.key === 'bid_sell_price' ? '#ff9800' : '#9c27b0',
}));

/** 投標計畫 (bid_plans) 可選欄位 - 向後兼容，默認使用 spot */
export const BID_PLAN_FIELDS = BID_PLAN_SPOT_FIELDS;

/** 投標計畫 (bid_plans) 副圖縮放參數 */
// 量: 以最大絕對值為基礎，對稱放大整個刻度範圍，讓 0 在中間、最大柱子大約落在 75% 高度
//    範圍約為 [-maxAbs * BID_PLAN_VOLUME_PADDING_FACTOR, maxAbs * BID_PLAN_VOLUME_PADDING_FACTOR]
export const BID_PLAN_VOLUME_PADDING_FACTOR = 2.0;
// 價格: 以實際最大絕對值為基礎，再放大一定倍率，讓線條不貼邊
export const BID_PLAN_PRICE_RANGE_FACTOR = 4.0;
// 價格 / 電量 的最小可視 range，避免所有值幾乎為 0 時圖像完全扁平
export const BID_PLAN_MIN_VISUAL_RANGE = 10;

