
export interface Area {
  id: number;
  name: string;
  name_ch: string;
  name_jp: string;
}

export interface PredictionModel {
  id: string | number; // Updated to support string IDs from ES
  name: string;
  version: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface AreaPrice {
  id: string | number; // Updated
  trade_date: string;
  time_code: number;
  system_price: number;
  area_id: number;
  name: string;
  name_ch: string;
  name_jp: string;
  price: number;
  avoidable_cost: number;
}

export interface PricePrediction {
  id: string | number; // Updated
  model_id: string | number; // Updated
  trade_date: string;
  time_code: number;
  area_id: number;
  calculating_date: string;
  price_5: number;
  price_50: number;
  price_95: number;
  additional_data: any;
}

export interface ApiResponse<T> {
  result: Array<{
    Message: string;
  }>;
  code: number;
  data: T;
}

export interface CalculatingDate {
  calculating_date: string;
}

// 認證相關的類型
export interface AuthTokens {
  refresh_token: string;
  access_token: string;
  username: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export enum TimeSlot {
  ALL = 'all',
  MORNING = '8-10',
  EVENING = '17-19',
  NIGHT = '22-24'
}

export enum TimeSlotDescription {
  ALL = '全時段',
  MORNING = '8點至10點',
  EVENING = '17點至19點',
  NIGHT = '22點至24點'
}

export interface ImbalanceData {
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

export interface HjksOutage {
  id: number;
  area: string;
  company: string;
  plantcd: string;
  name: string;
  format: string;
  unitcd: string;
  unit_name: string;
  max_capacity: number;
  stop_category: string;
  stop_type: string;
  start_datetime: string;
  outlook: string;
  end_datetime: string;
  factor: string;
  upddt: string;
  down_capacity: number | null;
}

export interface InterconnectionFlow {
  datetime: string;
  interconnection_name: string;
  forward_operating_capacity: number;
  reverse_operating_capacity: number;
  forward_margin: number;
  reverse_margin: number;
  forward_planned_flow: number;
  reverse_planned_flow: number;
  forward_available_capacity: number;
  reverse_available_capacity: number;
  moving_supply_capacity: number;
  forward_available_capacity_after_movement: number;
  reverse_available_capacity_after_movement: number;
  forward_disconnection_information: string;
  reverse_disconnection_information: string;
}

export interface IntradayData {
  date: string;
  time_code: number;
  opening_price: number;
  high_price: number;
  low_price: number;
  closing_price: number;
  average_price: number;
  total_contracted_volume: number;
  contract_count: number;
  datetime: string;
}

export interface Earthquake {
  get_datetime: string;
  event_datetime: string;
  magnitude: number;
  max_intensity: number;
  depth: string;
  location_name: string;
  closest_region: string;
  latitude: number;
  longitude: number;
}

export interface OcctoAreaData {
  datetime: string;
  area: string;
  area_demand: number;
  nuclear_power: number;
  thermal: number;
  hydropower: number;
  geothermal_power: number;
  biomass: number;
  solar_power_generation_actual: number;
  solar_power_output_control: number;
  wind_power_generation_actual: number;
  wind_power_output_control: number;
  pumped_storage: number;
  battery_storage: number;
  interconnection_line: number;
  others: number;
  total: number;
}

export interface OcctoInterconnection {
  datetime: string;
  interconnection_name: string;
  forward_operating_capacity: number;
  reverse_operating_capacity: number;
  forward_planned_flow: number;
  reverse_planned_flow: number;
  actual_flow: number;
  forward_wide_area_adjustment_capacity: number;
  reverse_wide_area_adjustment_capacity: number;
  forward_margin: number;
  reverse_margin: number;
  forward_available_capacity: number;
  reverse_available_capacity: number;
}

export interface OcctoEvent {
  datetime: string;
  area: string;
  description: string;
  value: number;
}

export interface TdgcData {
  datetime: string;
  Area: string;
  CorrectedUnitPriceAve: number;
  CorrectedUnitPriceMax: number;
  CorrectedUnitPriceMin: number;
  InAreaQuantity: number;
  OfferCount: number;
  OfferCountQuantityInTotal: number;
  OfferIdCount: number;
  OfferIdCountQuantityInTotal: number;
  ReserveRequirement: number;
  TotalContractQuantity: number;
  TsoPriceAve: number;
  TsoPriceMax: number;
  TsoPriceMin: number;
  CommodityCategory: string;
}

export interface WeatherData {
  weather_datetime: string;
  region: string;
  area: string;
  city: string;
  temperature: number | null;
  rainfall: number | null;
  snowfall: number | null;
  wind_speed: number | null;
  wind_direction: string;
  relative_humidity: number | null;
  weather_id: number;
  clouds_all: number | null;
}
