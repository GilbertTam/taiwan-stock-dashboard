/**
 * @fileoverview Type Definitions
 *
 * TypeScript interfaces and enums for the electricity market dashboard.
 * Organized by domain for maintainability.
 *
 * Domains:
 * - Core: Area, PredictionModel, API response wrapper
 * - Authentication: Tokens, credentials
 * - Market Data: Prices, predictions, trading
 * - Grid Operations: Imbalance, interconnection, OCCTO
 * - External Data: Weather, earthquakes
 */

// =============================================================================
// Core Domain Types
// =============================================================================

/**
 * Electricity grid area (region).
 *
 * Japan's electricity grid is divided into 9 major areas,
 * each operated by a different utility company.
 *
 * @example
 * const tokyo: Area = {
 *   id: 1,
 *   name: 'tokyo',
 *   name_ch: '東京',
 *   name_jp: '東京'
 * };
 */
export interface Area {
  /** Unique identifier */
  id: number;
  /** English name (used as key) */
  name: string;
  /** Chinese display name */
  name_ch: string;
  /** Japanese display name */
  name_jp: string;
}

/**
 * Price prediction model metadata.
 *
 * Represents a machine learning model that generates
 * electricity price predictions.
 */
export interface PredictionModel {
  /** Unique identifier (may be string for ES-sourced IDs) */
  id: string | number;
  /** Model name/source identifier */
  name: string;
  /** Model version string */
  version: string;
  /** Human-readable description */
  description: string;
  /** ISO timestamp when model was created */
  created_at: string;
  /** ISO timestamp when model was last updated */
  updated_at: string;
}

/**
 * Generic API response wrapper.
 *
 * Standard response format from the backend API.
 *
 * @typeParam T - Type of the data payload
 */
export interface ApiResponse<T> {
  /** Result messages (usually success/error info) */
  result: Array<{
    Message: string;
  }>;
  /** Status code (0 = success, non-zero = error) */
  code: number;
  /** Response data payload */
  data: T;
}

// =============================================================================
// Authentication Types
// =============================================================================

/**
 * Authentication tokens returned after login.
 */
export interface AuthTokens {
  /** JWT refresh token for obtaining new access tokens */
  refresh_token: string;
  /** JWT access token for API authentication */
  access_token: string;
  /** Authenticated username */
  username: string;
}

/**
 * Login request credentials.
 */
export interface LoginCredentials {
  /** User's username */
  username: string;
  /** User's password */
  password: string;
}

// =============================================================================
// Market Data Types
// =============================================================================

/**
 * Actual JEPX spot market price data.
 *
 * Represents a single trading period's price for a specific area.
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
 *
 * Contains percentile-based predictions (P5, P50, P95) for
 * probabilistic price forecasting.
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

// =============================================================================
// Grid Operations Types
// =============================================================================

/**
 * Grid imbalance data (supply vs demand gap).
 *
 * Shows the imbalance value for each area at a given timestamp.
 */
export interface ImbalanceData {
  /** Timestamp (ISO format) */
  datetime: string;
  hokkaido: number;
  tohoku: number;
  tokyo: number;
  chubu: number;
  hokuriku: number;
  kansai: number;
  chugoku: number;
  shikoku: number;
  kyushu: number;
}

/**
 * HJKS power plant outage information.
 *
 * Contains details about planned or unplanned power plant
 * outages that may affect electricity supply.
 */
export interface HjksOutage {
  /** Unique identifier */
  id: number;
  /** Area where plant is located */
  area: string;
  /** Operating company name */
  company: string;
  /** Plant code */
  plantcd: string;
  /** Plant name */
  name: string;
  /** Generation format/type */
  format: string;
  /** Unit code within plant */
  unitcd: string;
  /** Unit name */
  unit_name: string;
  /** Maximum generation capacity (MW) */
  max_capacity: number;
  /** Stop category (planned/unplanned) */
  stop_category: string;
  /** Stop type */
  stop_type: string;
  /** Outage start time (ISO) */
  start_datetime: string;
  /** Expected end outlook */
  outlook: string;
  /** Expected end time (ISO) */
  end_datetime: string;
  /** Outage reason/factor */
  factor: string;
  /** Last update time (ISO) */
  upddt: string;
  /** Capacity reduction (MW), null if unknown */
  down_capacity: number | null;
}

/**
 * Interconnection line flow data.
 *
 * Shows power flow between grid areas through
 * transmission interconnection lines.
 */
export interface InterconnectionFlow {
  /** Timestamp (ISO format) */
  datetime: string;
  /** Name of interconnection line */
  interconnection_name: string;
  /** Forward direction operating capacity (MW) */
  forward_operating_capacity: number;
  /** Reverse direction operating capacity (MW) */
  reverse_operating_capacity: number;
  /** Forward direction margin (MW) */
  forward_margin: number;
  /** Reverse direction margin (MW) */
  reverse_margin: number;
  /** Forward planned flow (MW) */
  forward_planned_flow: number;
  /** Reverse planned flow (MW) */
  reverse_planned_flow: number;
  /** Forward available capacity (MW) */
  forward_available_capacity: number;
  /** Reverse available capacity (MW) */
  reverse_available_capacity: number;
  /** Moving supply capacity (MW) */
  moving_supply_capacity: number;
  /** Forward capacity after movement (MW) */
  forward_available_capacity_after_movement: number;
  /** Reverse capacity after movement (MW) */
  reverse_available_capacity_after_movement: number;
  /** Forward disconnection info */
  forward_disconnection_information: string;
  /** Reverse disconnection info */
  reverse_disconnection_information: string;
}

/**
 * JEPX intraday market trading data.
 *
 * Contains OHLC (Open/High/Low/Close) price data for
 * same-day electricity trading.
 */
export interface IntradayData {
  /** Trading date */
  date: string;
  /** 30-minute interval code (1-48) */
  time_code: number;
  /** Opening price (yen/kWh) */
  opening_price: number;
  /** Highest price (yen/kWh) */
  high_price: number;
  /** Lowest price (yen/kWh) */
  low_price: number;
  /** Closing price (yen/kWh) */
  closing_price: number;
  /** Volume-weighted average price (yen/kWh) */
  average_price: number;
  /** Total contracted volume (kWh) */
  total_contracted_volume: number;
  /** Number of contracts executed */
  contract_count: number;
  /** Full datetime (ISO format) */
  datetime: string;
}

// =============================================================================
// OCCTO Data Types
// =============================================================================

/**
 * OCCTO area supply/demand data.
 *
 * Contains power generation breakdown by source type for a grid area,
 * provided by OCCTO (Organization for Cross-regional Coordination
 * of Transmission Operators).
 */
export interface OcctoAreaData {
  /** Timestamp (ISO format) */
  datetime: string;
  /** Area name */
  area: string;
  /** Total area demand (MW) */
  area_demand: number;
  /** Nuclear generation (MW) */
  nuclear_power: number;
  /** Thermal generation (MW) */
  thermal: number;
  /** Hydropower generation (MW) */
  hydropower: number;
  /** Geothermal generation (MW) */
  geothermal_power: number;
  /** Biomass generation (MW) */
  biomass: number;
  /** Solar actual generation (MW) */
  solar_power_generation_actual: number;
  /** Solar output control/curtailment (MW) */
  solar_power_output_control: number;
  /** Wind actual generation (MW) */
  wind_power_generation_actual: number;
  /** Wind output control/curtailment (MW) */
  wind_power_output_control: number;
  /** Pumped storage (MW, negative = pumping) */
  pumped_storage: number;
  /** Battery storage (MW) */
  battery_storage: number;
  /** Net interconnection flow (MW) */
  interconnection_line: number;
  /** Other generation sources (MW) */
  others: number;
  /** Total generation (MW) */
  total: number;
}

/**
 * OCCTO interconnection line data.
 */
export interface OcctoInterconnection {
  /** Timestamp (ISO format) */
  datetime: string;
  /** Interconnection line name */
  interconnection_name: string;
  /** Forward operating capacity (MW) */
  forward_operating_capacity: number;
  /** Reverse operating capacity (MW) */
  reverse_operating_capacity: number;
  /** Forward planned flow (MW) */
  forward_planned_flow: number;
  /** Reverse planned flow (MW) */
  reverse_planned_flow: number;
  /** Actual measured flow (MW) */
  actual_flow: number;
  /** Forward wide-area adjustment capacity (MW) */
  forward_wide_area_adjustment_capacity: number;
  /** Reverse wide-area adjustment capacity (MW) */
  reverse_wide_area_adjustment_capacity: number;
  /** Forward margin (MW) */
  forward_margin: number;
  /** Reverse margin (MW) */
  reverse_margin: number;
  /** Forward available capacity (MW) */
  forward_available_capacity: number;
  /** Reverse available capacity (MW) */
  reverse_available_capacity: number;
}

/**
 * OCCTO system event data.
 */
export interface OcctoEvent {
  /** Event timestamp (ISO format) */
  datetime: string;
  /** Affected area */
  area: string;
  /** Event description */
  description: string;
  /** Associated value (context-dependent) */
  value: number;
}

/**
 * TDGC (Tertiary Demand/Generation Control) balancing market data.
 */
export interface TdgcData {
  /** Timestamp (ISO format) */
  datetime: string;
  /** Area name */
  Area: string;
  /** Corrected unit price average (yen/kWh) */
  CorrectedUnitPriceAve: number;
  /** Corrected unit price maximum (yen/kWh) */
  CorrectedUnitPriceMax: number;
  /** Corrected unit price minimum (yen/kWh) */
  CorrectedUnitPriceMin: number;
  /** In-area quantity (kWh) */
  InAreaQuantity: number;
  /** Number of offers */
  OfferCount: number;
  /** Total offer quantity (kWh) */
  OfferCountQuantityInTotal: number;
  /** Number of unique offer IDs */
  OfferIdCount: number;
  /** Total quantity by offer ID (kWh) */
  OfferIdCountQuantityInTotal: number;
  /** Reserve requirement (kWh) */
  ReserveRequirement: number;
  /** Total contracted quantity (kWh) */
  TotalContractQuantity: number;
  /** TSO price average (yen/kWh) */
  TsoPriceAve: number;
  /** TSO price maximum (yen/kWh) */
  TsoPriceMax: number;
  /** TSO price minimum (yen/kWh) */
  TsoPriceMin: number;
  /** Commodity category identifier */
  CommodityCategory: string;
}

// =============================================================================
// External Data Types
// =============================================================================

/**
 * Earthquake event data from JMA.
 */
export interface Earthquake {
  /** Data retrieval time (ISO) */
  get_datetime: string;
  /** Event occurrence time (ISO) */
  event_datetime: string;
  /** Richter magnitude */
  magnitude: number;
  /** Maximum intensity on JMA scale */
  max_intensity: number;
  /** Depth description (e.g., "10km") */
  depth: string;
  /** Location name in Japanese */
  location_name: string;
  /** Closest power grid region */
  closest_region: string;
  /** Latitude of epicenter */
  latitude: number;
  /** Longitude of epicenter */
  longitude: number;
}

/**
 * Weather observation or forecast data.
 */
export interface WeatherData {
  /** Weather data timestamp (ISO format) */
  weather_datetime: string;
  /** Region name (matches grid area) */
  region: string;
  /** Area name */
  area: string;
  /** City name */
  city: string;
  /** Temperature in Celsius, null if unavailable */
  temperature: number | null;
  /** Rainfall in mm, null if unavailable */
  rainfall: number | null;
  /** Snowfall in cm, null if unavailable */
  snowfall: number | null;
  /** Wind speed in m/s, null if unavailable */
  wind_speed: number | null;
  /** Wind direction (e.g., "N", "NE") */
  wind_direction: string;
  /** Relative humidity percentage, null if unavailable */
  relative_humidity: number | null;
  /** Weather condition ID (OpenWeatherMap code) */
  weather_id: number;
  /** Cloud coverage percentage, null if unavailable */
  clouds_all: number | null;
}
