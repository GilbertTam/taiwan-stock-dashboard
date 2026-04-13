export const HOURLY_CATEGORIES = [
    {
        id: 'hourly_temperature',
        labelKey: 'weatherCategories.hourlyTemperature',
        fields: ['temperature_2m', 'apparent_temperature', 'dew_point_2m']
    },
    {
        id: 'hourly_humidity',
        labelKey: 'weatherCategories.hourlyHumidity',
        fields: ['relative_humidity_2m']
    },
    {
        id: 'hourly_precipitation',
        labelKey: 'weatherCategories.hourlyPrecipitation',
        fields: ['precipitation', 'rain', 'snowfall', 'snow_depth']
    },
    {
        id: 'hourly_wind',
        labelKey: 'weatherCategories.hourlyWind',
        fields: ['wind_speed_10m', 'wind_speed_100m', 'wind_gusts_10m', 'wind_direction_10m', 'wind_direction_100m']
    },
    {
        id: 'hourly_cloud_radiation',
        labelKey: 'weatherCategories.hourlyCloudRadiation',
        fields: ['cloud_cover', 'shortwave_radiation', 'sunshine_duration']
    },
    {
        id: 'hourly_pressure',
        labelKey: 'weatherCategories.hourlyPressure',
        fields: ['pressure_msl', 'surface_pressure']
    },
    {
        id: 'hourly_soil',
        labelKey: 'weatherCategories.hourlySoil',
        fields: ['soil_temperature_0_to_7cm', 'soil_moisture_0_to_7cm']
    }
];

export const DAILY_CATEGORIES = [
    {
        id: 'daily_temperature',
        labelKey: 'weatherCategories.dailyTemperature',
        fields: ['temperature_2m_max', 'temperature_2m_min', 'temperature_2m_mean']
    },
    {
        id: 'daily_precipitation_radiation',
        labelKey: 'weatherCategories.dailyPrecipRadiation',
        fields: ['precipitation_sum', 'shortwave_radiation_sum', 'rain_sum', 'snowfall_sum']
    },
    {
        id: 'daily_sunshine',
        labelKey: 'weatherCategories.dailySunshine',
        fields: ['sunshine_duration', 'daylight_duration', 'sunrise', 'sunset']
    },
    {
        id: 'daily_wind',
        labelKey: 'weatherCategories.dailyWind',
        fields: ['wind_speed_10m_max', 'wind_speed_10m_mean', 'wind_gusts_10m_max']
    },
    {
        id: 'daily_humidity',
        labelKey: 'weatherCategories.dailyHumidity',
        fields: ['relative_humidity_2m_mean', 'relative_humidity_2m_max', 'relative_humidity_2m_min']
    },
    {
        id: 'daily_pressure',
        labelKey: 'weatherCategories.dailyPressure',
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

export const WEATHER_FIELD_DISPLAY: Record<string, { shortLabelKey: string; longLabelKey: string; unit?: string }> = {
    temperature_2m: { shortLabelKey: 'weatherDisplay.temperature_2m.short', longLabelKey: 'weatherDisplay.temperature_2m.long', unit: '°C' },
    apparent_temperature: { shortLabelKey: 'weatherDisplay.apparent_temperature.short', longLabelKey: 'weatherDisplay.apparent_temperature.long', unit: '°C' },
    dew_point_2m: { shortLabelKey: 'weatherDisplay.dew_point_2m.short', longLabelKey: 'weatherDisplay.dew_point_2m.long', unit: '°C' },
    precipitation: { shortLabelKey: 'weatherDisplay.precipitation.short', longLabelKey: 'weatherDisplay.precipitation.long', unit: 'mm' },
    rain: { shortLabelKey: 'weatherDisplay.rain.short', longLabelKey: 'weatherDisplay.rain.long', unit: 'mm' },
    snowfall: { shortLabelKey: 'weatherDisplay.snowfall.short', longLabelKey: 'weatherDisplay.snowfall.long', unit: 'mm' },
    snow_depth: { shortLabelKey: 'weatherDisplay.snow_depth.short', longLabelKey: 'weatherDisplay.snow_depth.long', unit: 'm' },
    relative_humidity_2m: { shortLabelKey: 'weatherDisplay.relative_humidity_2m.short', longLabelKey: 'weatherDisplay.relative_humidity_2m.long', unit: '%' },
    wind_speed_10m: { shortLabelKey: 'weatherDisplay.wind_speed_10m.short', longLabelKey: 'weatherDisplay.wind_speed_10m.long', unit: 'm/s' },
    wind_speed_100m: { shortLabelKey: 'weatherDisplay.wind_speed_100m.short', longLabelKey: 'weatherDisplay.wind_speed_100m.long', unit: 'm/s' },
    wind_gusts_10m: { shortLabelKey: 'weatherDisplay.wind_gusts_10m.short', longLabelKey: 'weatherDisplay.wind_gusts_10m.long', unit: 'm/s' },
    wind_direction_10m: { shortLabelKey: 'weatherDisplay.wind_direction_10m.short', longLabelKey: 'weatherDisplay.wind_direction_10m.long', unit: '°' },
    wind_direction_100m: { shortLabelKey: 'weatherDisplay.wind_direction_100m.short', longLabelKey: 'weatherDisplay.wind_direction_100m.long', unit: '°' },
    cloud_cover: { shortLabelKey: 'weatherDisplay.cloud_cover.short', longLabelKey: 'weatherDisplay.cloud_cover.long', unit: '%' },
    shortwave_radiation: { shortLabelKey: 'weatherDisplay.shortwave_radiation.short', longLabelKey: 'weatherDisplay.shortwave_radiation.long', unit: 'W/m²' },
    sunshine_duration: { shortLabelKey: 'weatherDisplay.sunshine_duration.short', longLabelKey: 'weatherDisplay.sunshine_duration.long', unit: 's' },
    pressure_msl: { shortLabelKey: 'weatherDisplay.pressure_msl.short', longLabelKey: 'weatherDisplay.pressure_msl.long', unit: 'hPa' },
    surface_pressure: { shortLabelKey: 'weatherDisplay.surface_pressure.short', longLabelKey: 'weatherDisplay.surface_pressure.long', unit: 'hPa' },
    vapour_pressure_deficit: { shortLabelKey: 'weatherDisplay.vapour_pressure_deficit.short', longLabelKey: 'weatherDisplay.vapour_pressure_deficit.long', unit: 'kPa' },

    // Soil variants (Hourly)
    soil_temperature_0_to_7cm: { shortLabelKey: 'weatherDisplay.soil_temperature_0_to_7cm.short', longLabelKey: 'weatherDisplay.soil_temperature_0_to_7cm.long', unit: '°C' },
    soil_temperature_7_to_28cm: { shortLabelKey: 'weatherDisplay.soil_temperature_7_to_28cm.short', longLabelKey: 'weatherDisplay.soil_temperature_7_to_28cm.long', unit: '°C' },
    soil_temperature_28_to_100cm: { shortLabelKey: 'weatherDisplay.soil_temperature_28_to_100cm.short', longLabelKey: 'weatherDisplay.soil_temperature_28_to_100cm.long', unit: '°C' },
    soil_temperature_100_to_255cm: { shortLabelKey: 'weatherDisplay.soil_temperature_100_to_255cm.short', longLabelKey: 'weatherDisplay.soil_temperature_100_to_255cm.long', unit: '°C' },
    soil_moisture_0_to_7cm: { shortLabelKey: 'weatherDisplay.soil_moisture_0_to_7cm.short', longLabelKey: 'weatherDisplay.soil_moisture_0_to_7cm.long', unit: 'm³/m³' },
    soil_moisture_7_to_28cm: { shortLabelKey: 'weatherDisplay.soil_moisture_7_to_28cm.short', longLabelKey: 'weatherDisplay.soil_moisture_7_to_28cm.long', unit: 'm³/m³' },
    soil_moisture_28_to_100cm: { shortLabelKey: 'weatherDisplay.soil_moisture_28_to_100cm.short', longLabelKey: 'weatherDisplay.soil_moisture_28_to_100cm.long', unit: 'm³/m³' },
    soil_moisture_100_to_255cm: { shortLabelKey: 'weatherDisplay.soil_moisture_100_to_255cm.short', longLabelKey: 'weatherDisplay.soil_moisture_100_to_255cm.long', unit: 'm³/m³' },

    // Daily specific prefixes
    temperature_2m_max: { shortLabelKey: 'weatherDisplay.temperature_2m_max.short', longLabelKey: 'weatherDisplay.temperature_2m_max.long', unit: '°C' },
    temperature_2m_min: { shortLabelKey: 'weatherDisplay.temperature_2m_min.short', longLabelKey: 'weatherDisplay.temperature_2m_min.long', unit: '°C' },
    temperature_2m_mean: { shortLabelKey: 'weatherDisplay.temperature_2m_mean.short', longLabelKey: 'weatherDisplay.temperature_2m_mean.long', unit: '°C' },
    precipitation_sum: { shortLabelKey: 'weatherDisplay.precipitation_sum.short', longLabelKey: 'weatherDisplay.precipitation_sum.long', unit: 'mm' },
    rain_sum: { shortLabelKey: 'weatherDisplay.rain_sum.short', longLabelKey: 'weatherDisplay.rain_sum.long', unit: 'mm' },
    snowfall_sum: { shortLabelKey: 'weatherDisplay.snowfall_sum.short', longLabelKey: 'weatherDisplay.snowfall_sum.long', unit: 'cm' },
    shortwave_radiation_sum: { shortLabelKey: 'weatherDisplay.shortwave_radiation_sum.short', longLabelKey: 'weatherDisplay.shortwave_radiation_sum.long', unit: 'MJ/m²' },
    sunshine_duration_sum: { shortLabelKey: 'weatherDisplay.sunshine_duration_sum.short', longLabelKey: 'weatherDisplay.sunshine_duration_sum.long', unit: 'h' },
    daylight_duration: { shortLabelKey: 'weatherDisplay.daylight_duration.short', longLabelKey: 'weatherDisplay.daylight_duration.long', unit: 'h' },
    wind_speed_10m_max: { shortLabelKey: 'weatherDisplay.wind_speed_10m_max.short', longLabelKey: 'weatherDisplay.wind_speed_10m_max.long', unit: 'm/s' },
    wind_speed_10m_mean: { shortLabelKey: 'weatherDisplay.wind_speed_10m_mean.short', longLabelKey: 'weatherDisplay.wind_speed_10m_mean.long', unit: 'm/s' },
    wind_speed_10m_min: { shortLabelKey: 'weatherDisplay.wind_speed_10m_min.short', longLabelKey: 'weatherDisplay.wind_speed_10m_min.long', unit: 'm/s' },
    wind_gusts_10m_max: { shortLabelKey: 'weatherDisplay.wind_gusts_10m_max.short', longLabelKey: 'weatherDisplay.wind_gusts_10m_max.long', unit: 'm/s' },
    wind_gusts_10m_mean: { shortLabelKey: 'weatherDisplay.wind_gusts_10m_mean.short', longLabelKey: 'weatherDisplay.wind_gusts_10m_mean.long', unit: 'm/s' },
    wind_gusts_10m_min: { shortLabelKey: 'weatherDisplay.wind_gusts_10m_min.short', longLabelKey: 'weatherDisplay.wind_gusts_10m_min.long', unit: 'm/s' },
    relative_humidity_2m_mean: { shortLabelKey: 'weatherDisplay.relative_humidity_2m_mean.short', longLabelKey: 'weatherDisplay.relative_humidity_2m_mean.long', unit: '%' },
    relative_humidity_2m_max: { shortLabelKey: 'weatherDisplay.relative_humidity_2m_max.short', longLabelKey: 'weatherDisplay.relative_humidity_2m_max.long', unit: '%' },
    relative_humidity_2m_min: { shortLabelKey: 'weatherDisplay.relative_humidity_2m_min.short', longLabelKey: 'weatherDisplay.relative_humidity_2m_min.long', unit: '%' },
    pressure_msl_mean: { shortLabelKey: 'weatherDisplay.pressure_msl_mean.short', longLabelKey: 'weatherDisplay.pressure_msl_mean.long', unit: 'hPa' },
    pressure_msl_max: { shortLabelKey: 'weatherDisplay.pressure_msl_max.short', longLabelKey: 'weatherDisplay.pressure_msl_max.long', unit: 'hPa' },
    pressure_msl_min: { shortLabelKey: 'weatherDisplay.pressure_msl_min.short', longLabelKey: 'weatherDisplay.pressure_msl_min.long', unit: 'hPa' },

    // Soil variants (Daily)
    soil_temperature_0_to_7cm_mean: { shortLabelKey: 'weatherDisplay.soil_temperature_0_to_7cm_mean.short', longLabelKey: 'weatherDisplay.soil_temperature_0_to_7cm_mean.long', unit: '°C' },
    soil_temperature_7_to_28cm_mean: { shortLabelKey: 'weatherDisplay.soil_temperature_7_to_28cm_mean.short', longLabelKey: 'weatherDisplay.soil_temperature_7_to_28cm_mean.long', unit: '°C' },
    soil_temperature_28_to_100cm_mean: { shortLabelKey: 'weatherDisplay.soil_temperature_28_to_100cm_mean.short', longLabelKey: 'weatherDisplay.soil_temperature_28_to_100cm_mean.long', unit: '°C' },
    soil_temperature_100_to_255cm_mean: { shortLabelKey: 'weatherDisplay.soil_temperature_100_to_255cm_mean.short', longLabelKey: 'weatherDisplay.soil_temperature_100_to_255cm_mean.long', unit: '°C' },
    soil_temperature_0_to_100cm_mean: { shortLabelKey: 'weatherDisplay.soil_temperature_0_to_100cm_mean.short', longLabelKey: 'weatherDisplay.soil_temperature_0_to_100cm_mean.long', unit: '°C' },
    soil_moisture_0_to_7cm_mean: { shortLabelKey: 'weatherDisplay.soil_moisture_0_to_7cm_mean.short', longLabelKey: 'weatherDisplay.soil_moisture_0_to_7cm_mean.long', unit: 'm³/m³' },
    soil_moisture_7_to_28cm_mean: { shortLabelKey: 'weatherDisplay.soil_moisture_7_to_28cm_mean.short', longLabelKey: 'weatherDisplay.soil_moisture_7_to_28cm_mean.long', unit: 'm³/m³' },
    soil_moisture_28_to_100cm_mean: { shortLabelKey: 'weatherDisplay.soil_moisture_28_to_100cm_mean.short', longLabelKey: 'weatherDisplay.soil_moisture_28_to_100cm_mean.long', unit: 'm³/m³' },
    soil_moisture_100_to_255cm_mean: { shortLabelKey: 'weatherDisplay.soil_moisture_100_to_255cm_mean.short', longLabelKey: 'weatherDisplay.soil_moisture_100_to_255cm_mean.long', unit: 'm³/m³' },
    soil_moisture_0_to_100cm_mean: { shortLabelKey: 'weatherDisplay.soil_moisture_0_to_100cm_mean.short', longLabelKey: 'weatherDisplay.soil_moisture_0_to_100cm_mean.long', unit: 'm³/m³' },
};

export type DataSourceType = 'actual' | 'forecast' | 'daily_mean' | 'daily_max' | 'daily_min' | 'none';

export function buildLegendLabel(fieldKey: string, source: DataSourceType = 'none', t?: (key: string) => string): string {
    const base = t && WEATHER_FIELD_DISPLAY[fieldKey]?.shortLabelKey
        ? t(WEATHER_FIELD_DISPLAY[fieldKey].shortLabelKey)
        : fieldKey;
    if (source === 'actual') return `${base} (${t ? t('weatherCategories.actual') : 'Actual'})`;
    if (source === 'forecast') return `${base} (${t ? t('weatherCategories.forecast') : 'Forecast'})`;
    if (source === 'daily_mean') return `${base} (${t ? t('weatherCategories.dailyMean') : 'Daily Avg'})`;
    if (source === 'daily_max') return `${base} (${t ? t('weatherCategories.dailyMax') : 'Daily Max'})`;
    if (source === 'daily_min') return `${base} (${t ? t('weatherCategories.dailyMin') : 'Daily Min'})`;
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
 * @param t - Optional translation function
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
    },
    t?: (key: string) => string
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
            name: buildLegendLabel(fieldKey, 'actual', t) + ` (${unit})`,
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
            name: buildLegendLabel(fieldKey, 'forecast', t) + ` (${unit})`,
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
 * @param t - Optional translation function
 * @returns Record mapping field names to actual and forecast values
 */
export function groupTooltipByField(params: any[], t?: (key: string) => string): Record<string, { actual?: any; forecast?: any }> {
    const grouped: Record<string, { actual?: any; forecast?: any }> = {};

    const actualText = t ? t('weatherCategories.actual') : 'Actual';
    const forecastText = t ? t('weatherCategories.forecast') : 'Forecast';

    for (const param of params) {
        // Extract field name from series name (remove suffix like " (實際)" or " (預報)")
        const fieldMatch = param.seriesName.match(/^(.+?)\s*\(/);
        const fieldName = fieldMatch ? fieldMatch[1] : param.seriesName;

        if (!grouped[fieldName]) {
            grouped[fieldName] = {};
        }

        if (param.seriesName.includes(actualText)) {
            grouped[fieldName].actual = param;
        } else if (param.seriesName.includes(forecastText)) {
            grouped[fieldName].forecast = param;
        } else {
            // Handle series without actual/forecast suffix
            grouped[fieldName].actual = param;
        }
    }

    return grouped;
}
