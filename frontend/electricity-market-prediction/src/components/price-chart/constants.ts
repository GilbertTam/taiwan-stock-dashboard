export const occtoFields = [
    { value: 'area_demand', label: 'Area Demand' },
    { value: 'nuclear_power', label: 'Nuclear' },
    { value: 'thermal', label: 'Thermal' },
    { value: 'hydropower', label: 'Hydro' },
    { value: 'geothermal_power', label: 'Geothermal' },
    { value: 'biomass', label: 'Biomass' },
    { value: 'solar_power_generation_actual', label: 'Solar Actual' },
    { value: 'wind_power_generation_actual', label: 'Wind Actual' },
    { value: 'pumped_storage', label: 'Pumped Storage' },
    { value: 'battery_storage', label: 'Battery' },
    { value: 'interconnection_line', label: 'Interconnection' },
];

export const occtoStackedFields = [
    { key: 'area_demand', color: '#6366f1', gradient: ['#818cf8', '#6366f1'], label: 'Area Demand' }, // 改為藍紫色，與solar區分
    { key: 'nuclear_power', color: '#e6a23c', gradient: ['#f4d03f', '#e6a23c'], label: 'Nuclear' },
    { key: 'thermal', color: '#f56c6c', gradient: ['#ff8787', '#f56c6c'], label: 'Thermal' },
    { key: 'hydropower', color: '#409eff', gradient: ['#66b3ff', '#409eff'], label: 'Hydro' },
    { key: 'geothermal_power', color: '#8e44ad', gradient: ['#bb8fce', '#8e44ad'], label: 'Geothermal' },
    { key: 'biomass', color: '#27ae60', gradient: ['#58d68d', '#27ae60'], label: 'Biomass' },
    { key: 'solar_power_generation_actual', color: '#f1c40f', gradient: ['#f7dc6f', '#f1c40f'], label: 'Solar' },
    { key: 'wind_power_generation_actual', color: '#2ecc71', gradient: ['#58d68d', '#2ecc71'], label: 'Wind' },
    { key: 'pumped_storage', color: '#3498db', gradient: ['#5dade2', '#3498db'], label: 'Pumped Storage' },
    { key: 'battery_storage', color: '#909399', gradient: ['#bdc3c7', '#909399'], label: 'Battery' },
    { key: 'interconnection_line', color: '#d35400', gradient: ['#e67e22', '#d35400'], label: 'Interconnection' },
    { key: 'others', color: '#7f8c8d', gradient: ['#aab7b8', '#7f8c8d'], label: 'Others' },
];

/** 互連 (occto_inter) 可選欄位：對應 ProcessedDataPoint 上的屬性 */
export const INTERCONNECTION_FIELDS = [
    { key: 'flow_diff', label: '計畫流量差（順向－逆向）', pointKey: 'interconnection_flow_diff' as const, color: '#00bcd4' },
    { key: 'forward_planned_flow', label: '順向計畫流量', pointKey: 'interconnection_forward' as const, color: '#26a69a' },
    { key: 'reverse_planned_flow', label: '逆向計畫流量', pointKey: 'interconnection_reverse' as const, color: '#78909c' },
    { key: 'actual_flow', label: '實際流量', pointKey: 'interconnection_actual_flow' as const, color: '#ff7043' },
    { key: 'forward_available_capacity', label: '順向可用容量', pointKey: 'interconnection_forward_available_capacity' as const, color: '#66bb6a' },
    { key: 'reverse_available_capacity', label: '逆向可用容量', pointKey: 'interconnection_reverse_available_capacity' as const, color: '#ab47bc' },
    { key: 'forward_margin', label: '順向餘裕', pointKey: 'interconnection_forward_margin' as const, color: '#42a5f5' },
    { key: 'reverse_margin', label: '逆向餘裕', pointKey: 'interconnection_reverse_margin' as const, color: '#ef5350' },
];

/** 電池 (battery_data) 可選欄位：負=充電、正=放電 */
export const BATTERY_FIELDS = [
    { key: 'spot_value', label: '現貨電量', pointKey: 'battery_spot_value' as const, color: '#7e57c2' },
    { key: 'intraday_value', label: '日前電量', pointKey: 'battery_intraday_value' as const, color: '#5c6bc0' },
    { key: 'primary_value', label: '一次調整力', pointKey: 'battery_primary_value' as const, color: '#7986cb' },
    { key: 'soc_kwh', label: '虛擬 SOC (kWh)', pointKey: 'battery_soc_kwh' as const, color: '#26a69a' },
    { key: 'actual_soc_kwh', label: '實測 SOC (kWh)', pointKey: 'battery_actual_soc_kwh' as const, color: '#66bb6a' },
];

// Weather field definitions - 使用與其他資料來源明顯不同的調色
export const weatherFields = [
    { value: 'temperature', label: '溫度', unit: '°C', color: '#ff9800' },
    { value: 'rainfall', label: '降雨', unit: 'mm', color: '#2196f3' },
    { value: 'snowfall', label: '降雪', unit: 'cm', color: '#90caf9' },
    { value: 'wind_speed', label: '風速', unit: 'm/s', color: '#4caf50' },
    { value: 'relative_humidity', label: '濕度', unit: '%', color: '#9c27b0' },
    { value: 'clouds_all', label: '雲量', unit: '%', color: '#607d8b' },
];

/** 投標計畫 (bid_plans) 基礎欄位定義 */
export const BID_PLAN_BASE_FIELDS = [
    { key: 'bid_buy_price', label: '買入價格', color: '#fbc02d' },
    { key: 'bid_buy_volume', label: '買入電量', color: '#00897b' },
    { key: 'bid_sell_price', label: '賣出價格', color: '#fb8c00' },
    { key: 'bid_sell_volume', label: '賣出電量', color: '#8e24aa' },
];

/** 投標計畫 (bid_plans) 可選欄位 - 現貨市場 (spot) */
export const BID_PLAN_SPOT_FIELDS = BID_PLAN_BASE_FIELDS.map(f => ({
    ...f,
    pointKey: `bid_spot_${f.key.replace('bid_', '')}` as const,
    label: `現貨-${f.label}`,
    category: 'spot' as const,
}));

/** 投標計畫 (bid_plans) 可選欄位 - 日內市場 (intraday) */
export const BID_PLAN_INTRADAY_FIELDS = BID_PLAN_BASE_FIELDS.map(f => ({
    ...f,
    pointKey: `bid_intraday_${f.key.replace('bid_', '')}` as const,
    label: `日內-${f.label}`,
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

