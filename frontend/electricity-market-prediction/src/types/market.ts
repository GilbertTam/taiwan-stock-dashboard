/**
 * @fileoverview Market Data Types
 *
 * Types for JEPX spot market prices, predictions, and time slots.
 */

/**
 * Actual JEPX spot market price data.
 */
export interface AreaPrice {
    /** Unique identifier (may be composite key) */
    id: string | number;
    /** Trading date (YYYY-MM-DD) */
    trade_date: string;
    /** 30-minute interval code (1-48) */
    time_code: number;
    /** System-wide price (yen/kWh) */
    system_price: number;
    /** Area identifier */
    area_id: number;
    /** Area English name */
    name: string;
    /** Area Chinese name */
    name_ch: string;
    /** Area Japanese name */
    name_jp: string;
    /** Area-specific price (yen/kWh) */
    price: number;
    /** Avoidable cost component */
    avoidable_cost: number;
}

/**
 * Price prediction for a specific time slot.
 */
export interface PricePrediction {
    /** Unique identifier */
    id: string | number;
    /** Model that generated this prediction */
    model_id: string | number;
    /** Target delivery date (YYYY-MM-DD) */
    trade_date: string;
    /** 30-minute interval code (1-48) */
    time_code: number;
    /** Area identifier */
    area_id: number;
    /** Date when prediction was calculated */
    calculating_date: string;
    /** 5th percentile price (low estimate) */
    price_5: number;
    /** 50th percentile price (median/expected) */
    price_50: number;
    /** 95th percentile price (high estimate) */
    price_95: number;
    /** Model-specific additional data */
    additional_data: unknown;
}

/**
 * Available calculation date for predictions.
 */
export interface CalculatingDate {
    /** Calculation date in YYYY-MM-DD format */
    calculating_date: string;
}

/**
 * Time slot filter options for data aggregation.
 */
export enum TimeSlot {
    ALL = 'all',
    MORNING = '8-10',
    EVENING = '17-19',
    NIGHT = '22-24'
}

/**
 * Human-readable time slot descriptions (Chinese).
 */
export enum TimeSlotDescription {
    ALL = '全時段',
    MORNING = '8點至10點',
    EVENING = '17點至19點',
    NIGHT = '22點至24點'
}
