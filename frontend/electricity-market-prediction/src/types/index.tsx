
export interface Area {
  id: number;
  name: string;
  name_ch: string;
  name_jp: string;
}

export interface PredictionModel {
  id: number;
  name: string;
  version: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface AreaPrice {
  id: number;
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
  id: number;
  model_id: number;
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
