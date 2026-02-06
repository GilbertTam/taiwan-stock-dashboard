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

// Weather field definitions - 使用與其他資料來源明顯不同的調色
export const weatherFields = [
    { value: 'temperature', label: 'Temp', unit: '°C', color: '#ff4d4f' },      // 飽和紅
    { value: 'rainfall', label: 'Rain', unit: 'mm', color: '#1e90ff' },         // 明亮藍
    { value: 'snowfall', label: 'Snow', unit: 'mm', color: '#91d5ff' },         // 淺藍
    { value: 'wind_speed', label: 'Wind', unit: 'm/s', color: '#52c41a' },      // 鮮綠
    { value: 'relative_humidity', label: 'Humid', unit: '%', color: '#722ed1' },// 紫色
    { value: 'clouds_all', label: 'Clouds', unit: '%', color: '#8c8c8c' },      // 中灰
];

