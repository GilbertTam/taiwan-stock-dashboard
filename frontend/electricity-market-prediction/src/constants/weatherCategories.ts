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
        fields: ['wind_speed_10m', 'wind_speed_100m', 'wind_gusts_10m', 'wind_direction_10m', 'wind_direction_100m']
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
    wind_speed_100m: { shortLabel: '風速 (100m)', longLabel: '風速 (100m)', unit: 'm/s' },
    wind_gusts_10m: { shortLabel: '陣風', longLabel: '陣風 (10m)', unit: 'm/s' },
    wind_direction_10m: { shortLabel: '風向 (10m)', longLabel: '風向 (10m)', unit: '°' },
    wind_direction_100m: { shortLabel: '風向 (100m)', longLabel: '風向 (100m)', unit: '°' },
    cloud_cover: { shortLabel: '雲量', longLabel: '雲量', unit: '%' },
    shortwave_radiation: { shortLabel: '短波輻射', longLabel: '短波輻射', unit: 'W/m²' },
    sunshine_duration: { shortLabel: '日照時數', longLabel: '日照時數', unit: 's' },
    pressure_msl: { shortLabel: '海平面氣壓', longLabel: '海平面氣壓', unit: 'hPa' },
    surface_pressure: { shortLabel: '地表氣壓', longLabel: '地表氣壓', unit: 'hPa' },
    vapour_pressure_deficit: { shortLabel: '飽和壓力差', longLabel: '飽和壓力差', unit: 'kPa' },

    // Soil variants (Hourly)
    soil_temperature_0_to_7cm: { shortLabel: '土壤溫度(0-7cm)', longLabel: '土壤溫度 (0-7cm)', unit: '°C' },
    soil_temperature_7_to_28cm: { shortLabel: '土壤溫度(7-28cm)', longLabel: '土壤溫度 (7-28cm)', unit: '°C' },
    soil_temperature_28_to_100cm: { shortLabel: '土壤溫度(28-100cm)', longLabel: '土壤溫度 (28-100cm)', unit: '°C' },
    soil_temperature_100_to_255cm: { shortLabel: '土壤溫度(100-255cm)', longLabel: '土壤溫度 (100-255cm)', unit: '°C' },
    soil_moisture_0_to_7cm: { shortLabel: '土壤濕度(0-7cm)', longLabel: '土壤濕度 (0-7cm)', unit: 'm³/m³' },
    soil_moisture_7_to_28cm: { shortLabel: '土壤濕度(7-28cm)', longLabel: '土壤濕度 (7-28cm)', unit: 'm³/m³' },
    soil_moisture_28_to_100cm: { shortLabel: '土壤濕度(28-100cm)', longLabel: '土壤濕度 (28-100cm)', unit: 'm³/m³' },
    soil_moisture_100_to_255cm: { shortLabel: '土壤濕度(100-255cm)', longLabel: '土壤濕度 (100-255cm)', unit: 'm³/m³' },

    // Daily specific prefixes
    temperature_2m_max: { shortLabel: '最高溫', longLabel: '最高氣溫 (2m)', unit: '°C' },
    temperature_2m_min: { shortLabel: '最低溫', longLabel: '最低氣溫 (2m)', unit: '°C' },
    temperature_2m_mean: { shortLabel: '平均溫', longLabel: '平均氣溫 (2m)', unit: '°C' },
    precipitation_sum: { shortLabel: '總降水量', longLabel: '總降水量', unit: 'mm' },
    rain_sum: { shortLabel: '總雨量', longLabel: '總雨量', unit: 'mm' },
    snowfall_sum: { shortLabel: '總降雪量', longLabel: '總降雪量', unit: 'cm' },
    shortwave_radiation_sum: { shortLabel: '總短波輻射', longLabel: '總短波輻射', unit: 'MJ/m²' },
    sunshine_duration_sum: { shortLabel: '日照總時數', longLabel: '日照總時數', unit: 'h' },
    daylight_duration: { shortLabel: '晝長', longLabel: '晝長', unit: 'h' },
    wind_speed_10m_max: { shortLabel: '最大風速(10m)', longLabel: '最大風速 (10m)', unit: 'm/s' },
    wind_speed_10m_mean: { shortLabel: '平均風速(10m)', longLabel: '平均風速 (10m)', unit: 'm/s' },
    wind_speed_10m_min: { shortLabel: '最小風速(10m)', longLabel: '最小風速 (10m)', unit: 'm/s' },
    wind_gusts_10m_max: { shortLabel: '最大陣風(10m)', longLabel: '最大陣風 (10m)', unit: 'm/s' },
    wind_gusts_10m_mean: { shortLabel: '平均陣風(10m)', longLabel: '平均陣風 (10m)', unit: 'm/s' },
    wind_gusts_10m_min: { shortLabel: '最小陣風(10m)', longLabel: '最小陣風 (10m)', unit: 'm/s' },
    relative_humidity_2m_mean: { shortLabel: '平均濕度', longLabel: '平均相對濕度', unit: '%' },
    relative_humidity_2m_max: { shortLabel: '最高濕度', longLabel: '最高相對濕度', unit: '%' },
    relative_humidity_2m_min: { shortLabel: '最低濕度', longLabel: '最低相對濕度', unit: '%' },
    pressure_msl_mean: { shortLabel: '平均氣壓', longLabel: '平均海平面氣壓', unit: 'hPa' },
    pressure_msl_max: { shortLabel: '最高氣壓', longLabel: '最高海平面氣壓', unit: 'hPa' },
    pressure_msl_min: { shortLabel: '最低氣壓', longLabel: '最低海平面氣壓', unit: 'hPa' },

    // Soil variants (Daily)
    soil_temperature_0_to_7cm_mean: { shortLabel: '平均土溫(0-7cm)', longLabel: '平均土壤溫度 (0-7cm)', unit: '°C' },
    soil_temperature_7_to_28cm_mean: { shortLabel: '平均土溫(7-28cm)', longLabel: '平均土壤溫度 (7-28cm)', unit: '°C' },
    soil_temperature_28_to_100cm_mean: { shortLabel: '平均土溫(28-100cm)', longLabel: '平均土壤溫度 (28-100cm)', unit: '°C' },
    soil_temperature_100_to_255cm_mean: { shortLabel: '平均土溫(100-255cm)', longLabel: '平均土壤溫度 (100-255cm)', unit: '°C' },
    soil_temperature_0_to_100cm_mean: { shortLabel: '平均土溫(0-100cm)', longLabel: '平均土壤溫度 (0-100cm)', unit: '°C' },
    soil_moisture_0_to_7cm_mean: { shortLabel: '平均土濕(0-7cm)', longLabel: '平均土壤濕度 (0-7cm)', unit: 'm³/m³' },
    soil_moisture_7_to_28cm_mean: { shortLabel: '平均土濕(7-28cm)', longLabel: '平均土壤濕度 (7-28cm)', unit: 'm³/m³' },
    soil_moisture_28_to_100cm_mean: { shortLabel: '平均土濕(28-100cm)', longLabel: '平均土壤濕度 (28-100cm)', unit: 'm³/m³' },
    soil_moisture_100_to_255cm_mean: { shortLabel: '平均土濕(100-255cm)', longLabel: '平均土壤濕度 (100-255cm)', unit: 'm³/m³' },
    soil_moisture_0_to_100cm_mean: { shortLabel: '平均土濕(0-100cm)', longLabel: '平均土壤濕度 (0-100cm)', unit: 'm³/m³' },
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

/**
 * Color scheme for weather data visualization
 * Each weather type has an actual/forecast color pair
 */
export const weatherColors = {
    // Temperature colors
    tempActual: '#ff7043',
    tempForecast: '#ffab91',
    apparentActual: '#ffcc80',
    apparentForecast: '#ffe0b2',
    dewActual: '#4caf50',
    dewForecast: '#81c784',

    // Humidity colors
    humidityActual: '#42a5f5',
    humidityForecast: '#90caf9',

    // Precipitation colors
    precipActual: '#42a5f5',
    precipForecast: '#90caf9',
    snowActual: '#90caf9',
    snowForecast: '#bbdefb',

    // Wind colors
    windActual: '#66bb6a',
    windForecast: '#a5d6a7',
    gustActual: '#81c784',
    gustForecast: '#c8e6c9',

    // Cloud colors
    cloudActual: '#90a4ae',
    cloudForecast: '#cfd8dc',

    // Radiation colors
    radiationActual: '#ffca28',
    radiationForecast: '#ffe082',
    sunshineActual: '#ffa726',
    sunshineForecast: '#ffb74d',
    daylightActual: '#fb8c00',
    daylightForecast: '#ff9800',

    // Pressure colors
    pressureMslActual: '#ab47bc',
    pressureMslForecast: '#ce93d8',
    pressureSurfaceActual: '#ce93d8',
    pressureSurfaceForecast: '#e1bee7',

    // Soil colors
    soilTempActual: '#8d6e63',
    soilTempForecast: '#bcaaa4',
    soilMoistActual: '#5d4037',
    soilMoistForecast: '#a1887f'
};

/**
 * Build a pair of series (actual + forecast) for a single weather field
 * @param fieldKey - The weather field key (e.g., 'temperature_2m')
 * @param actualData - Array of actual weather data
 * @param forecastData - Array of forecast weather data
 * @param colors - Object with actual and forecast color strings
 * @param unit - Unit string to append to legend (e.g., '°C')
 * @param options - Optional configuration for series type, axis, etc.
 * @returns Array of series objects for ECharts
 */
export function buildWeatherSeriesPair(
    fieldKey: string,
    actualData: any[],
    forecastData: any[],
    colors: { actual: string; forecast: string },
    unit: string,
    options?: {
        type?: 'line' | 'bar';
        yAxisIndex?: number;
        smooth?: boolean;
        areaStyle?: any;
    }
): any[] {
    const { type = 'line', yAxisIndex = 0, smooth = true, areaStyle } = options || {};

    const actualValues = actualData
        .map(d => d[fieldKey] !== null && d[fieldKey] !== undefined ?
            [new Date(d.datetime).getTime(), d[fieldKey]] : null
        )
        .filter(Boolean);

    const forecastValues = forecastData
        .map(d => d[fieldKey] !== null && d[fieldKey] !== undefined ?
            [new Date(d.datetime).getTime(), d[fieldKey]] : null
        )
        .filter(Boolean);

    const series = [];

    if (actualValues.length > 0) {
        series.push({
            name: buildLegendLabel(fieldKey, 'actual') + ` (${unit})`,
            type,
            data: actualValues,
            smooth,
            yAxisIndex,
            itemStyle: { color: colors.actual },
            lineStyle: { type: 'solid', width: 2 },
            ...(areaStyle && { areaStyle })
        });
    }

    if (forecastValues.length > 0) {
        series.push({
            name: buildLegendLabel(fieldKey, 'forecast') + ` (${unit})`,
            type,
            data: forecastValues,
            smooth,
            yAxisIndex,
            itemStyle: { color: colors.forecast },
            lineStyle: { type: 'dashed', width: 2 },
            ...(areaStyle && { areaStyle })
        });
    }

    return series;
}

/**
 * Check if a chart should be rendered based on data availability
 * @param series - Array of series objects
 * @returns true if any series has data
 */
export function hasChartData(series: any[]): boolean {
    return series.length > 0 && series.some(s => s.data && s.data.length > 0);
}

/**
 * Group tooltip parameters by field name for better organization
 * @param params - Array of tooltip parameters from ECharts
 * @returns Record mapping field names to actual and forecast values
 */
export function groupTooltipByField(params: any[]): Record<string, { actual?: any; forecast?: any }> {
    const grouped: Record<string, { actual?: any; forecast?: any }> = {};

    for (const param of params) {
        // Extract field name from series name (remove suffix like " (實際)" or " (預報)")
        const fieldMatch = param.seriesName.match(/^(.+?)\s*\(/);
        const fieldName = fieldMatch ? fieldMatch[1] : param.seriesName;

        if (!grouped[fieldName]) {
            grouped[fieldName] = {};
        }

        if (param.seriesName.includes('實際')) {
            grouped[fieldName].actual = param;
        } else if (param.seriesName.includes('預報')) {
            grouped[fieldName].forecast = param;
        } else {
            // Handle series without actual/forecast suffix
            grouped[fieldName].actual = param;
        }
    }

    return grouped;
}
