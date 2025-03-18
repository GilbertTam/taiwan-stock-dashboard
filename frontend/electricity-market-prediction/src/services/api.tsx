import axios from 'axios';
import { 
  Area, 
  PredictionModel, 
  AreaPrice, 
  PricePrediction, 
  ApiResponse, 
  CalculatingDate,
  LoginCredentials,
  AuthTokens
} from '@/types';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787/api/';

// 創建一個API實例
const createApiInstance = (token?: string) => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
  });
  
  if (token) {
    instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
  
  return instance;
};

// 獲取訪問令牌
const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  // 首先嘗試從 cookie 獲取
  const cookieTokens = Cookies.get('auth_tokens');
  if (cookieTokens) {
    try {
      const tokens = JSON.parse(cookieTokens) as AuthTokens;
      return tokens.access_token;
    } catch (error) {
      console.error('Failed to parse access token from cookie', error);
    }
  }
  
  // 如果 cookie 中沒有，嘗試從 localStorage 獲取
  const storedTokens = localStorage.getItem('auth_tokens');
  if (storedTokens) {
    try {
      const tokens = JSON.parse(storedTokens) as AuthTokens;
      return tokens.access_token;
    } catch (error) {
      console.error('Failed to parse access token from localStorage', error);
    }
  }
  
  return null;
};

// 認證相關API
export const login = async (credentials: LoginCredentials): Promise<AuthTokens> => {
  const api = createApiInstance();
  const response = await api.post<AuthTokens>('/auth/token', credentials);
  return response.data;
};

// 數據API
export const fetchAreas = async (): Promise<Area[]> => {
  const token = getAccessToken();
  if (!token) throw new Error('No access token available');
  
  const api = createApiInstance(token);
  const response = await api.get<{result: Area[]}>('/area');
  return response.data.result;
};

export const fetchPredictionModels = async (): Promise<PredictionModel[]> => {
  const token = getAccessToken();
  if (!token) throw new Error('No access token available');
  
  const api = createApiInstance(token);
  const response = await api.get<ApiResponse<PredictionModel[]>>('/custom-predict/available-models');
  return response.data.data;
};

export interface PredictionsParams {
  start_date: string;
  end_date: string;
  area_name: string;
  model_name: string;
  model_version: string;
  latest_only?: boolean;
  calculating_date?: string;
}

export const fetchPredictions = async (params: PredictionsParams): Promise<PricePrediction[]> => {
  const token = getAccessToken();
  if (!token) throw new Error('No access token available');
  
  const api = createApiInstance(token);
  const response = await api.get<ApiResponse<PricePrediction[]>>('/custom-predict/predictions', { params });
  return response.data.data;
};

export interface ActualPricesParams {
  start_date: string;
  end_date: string;
  name: string;
}

export const fetchActualPrices = async (params: ActualPricesParams): Promise<AreaPrice[]> => {
  const token = getAccessToken();
  if (!token) throw new Error('No access token available');
  
  const api = createApiInstance(token);
  const response = await api.get<ApiResponse<AreaPrice[]>>('/spot-market/area-prices', { params });
  return response.data.data;
};

export interface CalculatingDatesParams {
  start_date: string;
  end_date: string;
  area_name: string;
  model_name: string;
  model_version: string;
}

export const fetchAvailableCalculatingDates = async (params: CalculatingDatesParams): Promise<CalculatingDate[]> => {
  const token = getAccessToken();
  if (!token) throw new Error('No access token available');
  
  const api = createApiInstance(token);
  const response = await api.get<ApiResponse<CalculatingDate[]>>('/custom-predict/available-calculating-dates', { params });
  return response.data.data;
};
