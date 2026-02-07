
export interface ModelPrediction {
    modelId: string | number;
    modelName: string;
    predictedPrice: number;
    predictedPrice5?: number; // P5
    predictedPrice95?: number; // P95
}

export interface ChartDataPoint {
    dateTime: string;       // YYYY-MM-DD HH:mm
    timestamp: number;      // Unix timestamp (ms)
    actualPrice: number | null;
    modelPredictions: {
        modelId: string | number;
        modelName: string;
        predictedPrice: number;
        predictedPrice5?: number; // P5
        predictedPrice95?: number; // P95
    }[];
    isPrediction?: boolean;
    actualDelta?: number | null;
    modelDifferences?: { [key: string]: number | null };
    modelAreaTops?: { [key: string]: number | null };
    modelAreaBottoms?: { [key: string]: number | null };
    // Intraday
    intraday_average?: number | null;
    intraday_open?: number | null;
    intraday_close?: number | null;
    intraday_high?: number | null;
    intraday_low?: number | null;
    intraday_bar_trigger?: number | null;
    candlestickPayload?: {
        high: number;
        low: number;
        open: number;
        close: number;
    } | null;
    // Imbalance
    imbalance?: number | null;
    // Interconnection
    interconnection_flow_diff?: number | null;
    interconnection_forward?: number | null;
    interconnection_reverse?: number | null;
    // Occto
    occto_data?: any | null;
    occto_value?: number | null;
    occto_values?: Record<string, number | null>;
    // Z-Score
    zScore?: number | null;
    // Model Z-Scores
    modelZScores?: Record<string, number | null>;
    // Markers
    markerInfo?: {
        actualType?: 'top' | 'bottom';
        models: Record<string, 'top' | 'bottom'>;
    } | null;
    uniqueKey?: string;
    // Weather data
    weather_data?: {
        temperature?: number | null;
        rainfall?: number | null;
        snowfall?: number | null;
        wind_speed?: number | null;
        relative_humidity?: number | null;
        clouds_all?: number | null;
    };
    weather_data_actual?: {
        temperature?: number | null;
        rainfall?: number | null;
        snowfall?: number | null;
        wind_speed?: number | null;
        relative_humidity?: number | null;
        clouds_all?: number | null;
    };
    weather_data_forecast?: {
        temperature?: number | null;
        rainfall?: number | null;
        snowfall?: number | null;
        wind_speed?: number | null;
        relative_humidity?: number | null;
        clouds_all?: number | null;
    };
    // Legacy fields (optional but kept for compatibility during refactor)
    date?: string;
    time?: string;
}

// Type for processed chart data point (from PriceChartContext)
export interface ProcessedDataPoint {
    timestamp: number;
    actualPrice: number | null;
    modelPredictions: ModelPrediction[];
    modelDifferences?: Record<string, number | null>;
    actualDelta?: number | null;
    imbalance?: number | null;
    intraday_average?: number | null;
    intraday_open?: number | null;
    intraday_close?: number | null;
    intraday_high?: number | null;
    intraday_low?: number | null;
    interconnection_flow_diff?: number | null;
    occto_data?: Record<string, number | null> | null;
    occto_values?: Record<string, number | null>;
    weather_data_actual?: Record<string, number | null>;
    weather_data_forecast?: Record<string, number | null>;
    [key: string]: any;
}
