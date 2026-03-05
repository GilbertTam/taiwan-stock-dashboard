export const HOURLY_CATEGORIES = [
    {
        id: 'hourly_temperature',
        label: '溫度與體感',
        fields: ['temperature_2m', 'apparent_temperature', 'dew_point_2m']
    },
    {
        id: 'hourly_humidity',
        label: '濕度',
        fields: ['relative_humidity_2m']
    },
    {
        id: 'hourly_precipitation',
        label: '降水與雪',
        fields: ['precipitation', 'rain', 'snowfall', 'snow_depth']
    },
    {
        id: 'hourly_wind',
        label: '風',
        fields: ['wind_speed_10m', 'wind_gusts_10m', 'wind_direction_10m']
    },
    {
        id: 'hourly_cloud_radiation',
        label: '雲量與輻射',
        fields: ['cloud_cover', 'shortwave_radiation', 'sunshine_duration']
    },
    {
        id: 'hourly_pressure',
        label: '氣壓',
        fields: ['pressure_msl', 'surface_pressure']
    },
    {
        id: 'hourly_soil',
        label: '土壤（進階）',
        fields: ['soil_temperature_0_to_7cm', 'soil_moisture_0_to_7cm']
    }
];

export const DAILY_CATEGORIES = [
    {
        id: 'daily_temperature',
        label: '日溫度',
        fields: ['temperature_2m_max', 'temperature_2m_min', 'temperature_2m_mean']
    },
    {
        id: 'daily_precipitation_radiation',
        label: '日降水與輻射',
        fields: ['precipitation_sum', 'shortwave_radiation_sum', 'rain_sum', 'snowfall_sum']
    },
    {
        id: 'daily_sunshine',
        label: '日照與晝長',
        fields: ['sunshine_duration', 'daylight_duration', 'sunrise', 'sunset']
    },
    {
        id: 'daily_wind',
        label: '日風力',
        fields: ['wind_speed_10m_max', 'wind_speed_10m_mean', 'wind_gusts_10m_max']
    },
    {
        id: 'daily_humidity',
        label: '日濕度',
        fields: ['relative_humidity_2m_mean', 'relative_humidity_2m_max', 'relative_humidity_2m_min']
    },
    {
        id: 'daily_pressure',
        label: '日氣壓',
        fields: ['pressure_msl_mean', 'pressure_msl_min', 'pressure_msl_max']
    }
];

export const DEFAULT_SELECTED_HOURLY = [
    'hourly_temperature',
    'hourly_precipitation',
    'hourly_wind',
    'hourly_cloud_radiation'
];

export const DEFAULT_SELECTED_DAILY = [
    'daily_temperature',
    'daily_precipitation_radiation',
    'daily_sunshine'
];

export const WEATHER_FIELD_DISPLAY: Record<string, { shortLabel: string; longLabel: string; unit?: string }> = {
    temperature_2m: { shortLabel: '氣溫', longLabel: '氣溫 (2m)', unit: '°C' },
    apparent_temperature: { shortLabel: '體感', longLabel: '體感溫度', unit: '°C' },
    dew_point_2m: { shortLabel: '露點', longLabel: '露點溫度', unit: '°C' },
    precipitation: { shortLabel: '降水', longLabel: '總降水量', unit: 'mm' },
    rain: { shortLabel: '雨', longLabel: '雨量', unit: 'mm' },
    snowfall: { shortLabel: '雪', longLabel: '降雪量', unit: 'mm' },
    snow_depth: { shortLabel: '積雪', longLabel: '積雪深度', unit: 'm' },
    relative_humidity_2m: { shortLabel: '濕度', longLabel: '相對濕度', unit: '%' },
    wind_speed_10m: { shortLabel: '風速', longLabel: '風速 (10m)', unit: 'm/s' },
    wind_gusts_10m: { shortLabel: '陣風', longLabel: '陣風 (10m)', unit: 'm/s' },
    cloud_cover: { shortLabel: '雲量', longLabel: '雲量', unit: '%' },
    shortwave_radiation: { shortLabel: '短波輻射', longLabel: '短波輻射', unit: 'W/m²' },
    pressure_msl: { shortLabel: '海平面氣壓', longLabel: '海平面氣壓', unit: 'hPa' },
    surface_pressure: { shortLabel: '地表氣壓', longLabel: '地表氣壓', unit: 'hPa' },
    soil_temperature_0_to_7cm: { shortLabel: '土壤溫度', longLabel: '土壤溫度 (0-7cm)', unit: '°C' },
    soil_moisture_0_to_7cm: { shortLabel: '土壤濕度', longLabel: '土壤濕度 (0-7cm)', unit: 'm³/m³' },
    // Daily specific prefixes
    temperature_2m_max: { shortLabel: '最高溫', longLabel: '最高氣溫 (2m)', unit: '°C' },
    temperature_2m_min: { shortLabel: '最低溫', longLabel: '最低氣溫 (2m)', unit: '°C' },
    temperature_2m_mean: { shortLabel: '平均溫', longLabel: '平均氣溫 (2m)', unit: '°C' },
    precipitation_sum: { shortLabel: '總降水量', longLabel: '總降水量', unit: 'mm' },
    shortwave_radiation_sum: { shortLabel: '總短波輻射', longLabel: '總短波輻射', unit: 'MJ/m²' },
    sunshine_duration: { shortLabel: '日照時數', longLabel: '日照時數', unit: 'h' },
    daylight_duration: { shortLabel: '晝長', longLabel: '晝長', unit: 'h' },
    wind_speed_10m_max: { shortLabel: '最大風速', longLabel: '最大風速 (10m)', unit: 'm/s' },
    wind_speed_10m_mean: { shortLabel: '平均風速', longLabel: '平均風速 (10m)', unit: 'm/s' },
    wind_gusts_10m_max: { shortLabel: '最大陣風', longLabel: '最大陣風 (10m)', unit: 'm/s' },
    relative_humidity_2m_mean: { shortLabel: '平均濕度', longLabel: '平均相對濕度', unit: '%' },
    relative_humidity_2m_max: { shortLabel: '最高濕度', longLabel: '最高相對濕度', unit: '%' },
    relative_humidity_2m_min: { shortLabel: '最低濕度', longLabel: '最低相對濕度', unit: '%' },
    pressure_msl_mean: { shortLabel: '平均氣壓', longLabel: '平均海平面氣壓', unit: 'hPa' },
    pressure_msl_max: { shortLabel: '最高氣壓', longLabel: '最高海平面氣壓', unit: 'hPa' },
    pressure_msl_min: { shortLabel: '最低氣壓', longLabel: '最低海平面氣壓', unit: 'hPa' },
};

export type DataSourceType = 'actual' | 'forecast' | 'daily_mean' | 'daily_max' | 'daily_min' | 'none';

export function buildLegendLabel(fieldKey: string, source: DataSourceType = 'none'): string {
    const base = WEATHER_FIELD_DISPLAY[fieldKey]?.shortLabel ?? fieldKey;
    if (source === 'actual') return `${base} (實際)`;
    if (source === 'forecast') return `${base} (預報)`;
    if (source === 'daily_mean') return `${base} (日均)`;
    if (source === 'daily_max') return `${base} (日最高)`;
    if (source === 'daily_min') return `${base} (日最低)`;
    return base;
}
