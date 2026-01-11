'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AuthTokens, LoginCredentials } from '@/types';
import axios from 'axios';
import Cookies from 'js-cookie';
import { getApiBaseUrl } from '@/utils/apiConfig';

interface AuthContextType {
  isAuthenticated: boolean;
  user: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  getAccessToken: () => string | null;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  login: async () => {},
  logout: () => {},
  getAccessToken: () => null,
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<string | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const router = useRouter();
  
  // 初始化時檢查本地存儲中是否有token
  useEffect(() => {
    const storedTokens = localStorage.getItem('auth_tokens');
    if (storedTokens) {
      try {
        const parsedTokens = JSON.parse(storedTokens) as AuthTokens;
        setTokens(parsedTokens);
        setUser(parsedTokens.username);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Failed to parse stored tokens', error);
        localStorage.removeItem('auth_tokens');
        Cookies.remove('auth_tokens');
      }
    }
  }, []);
  
  const login = async (credentials: LoginCredentials) => {
    try {
      const API_BASE_URL = getApiBaseUrl();
      const response = await axios.post<AuthTokens>(`${API_BASE_URL}/auth/token`, credentials);
      
      const authTokens = response.data;
      setTokens(authTokens);
      setUser(authTokens.username);
      setIsAuthenticated(true);
      
      // 保存到本地存儲
      localStorage.setItem('auth_tokens', JSON.stringify(authTokens));
      
      // 同時保存到 cookie，以便 middleware 可以訪問
      Cookies.set('auth_tokens', JSON.stringify(authTokens), { 
        expires: 7, // 7天過期
        path: '/' 
      });


      // 設置標記，表示是從登入頁面跳轉過來的
      sessionStorage.setItem('fromLogin', 'true');
      // 導航到主頁
      router.push('/dashboard');
    } catch (error) {
      console.error('Login failed', error);
      throw error;
    }
  };
  
  const logout = () => {
    setTokens(null);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('auth_tokens');
    Cookies.remove('auth_tokens', { path: '/' });
    router.push('/login');
  };
  
  const getAccessToken = () => {
    return tokens?.access_token || null;
  };
  
  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, getAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}
