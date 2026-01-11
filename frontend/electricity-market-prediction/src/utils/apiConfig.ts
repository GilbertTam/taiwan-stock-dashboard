/**
 * 獲取 API Base URL
 * 
 * 優先順序：
 * 1. 環境變量 NEXT_PUBLIC_API_URL（如果設定，優先使用，方便開發環境覆蓋）
 * 2. 在瀏覽器環境中，使用當前域名 + '/api'（自動適應部署域名）
 * 3. 在 SSR 環境中，使用相對路徑 '/api'
 */
export function getApiBaseUrl(): string {
  // 優先使用環境變量（如果設定的話）
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.endsWith('/') 
      ? process.env.NEXT_PUBLIC_API_URL.slice(0, -1)
      : process.env.NEXT_PUBLIC_API_URL;
  }

  // 在瀏覽器環境中，使用當前域名
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    return `${origin}/api`;
  }

  // SSR 環境中，使用相對路徑（會在客戶端自動解析為當前域名）
  return '/api';
}
