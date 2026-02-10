/**
 * 獲取 API Base URL
 * 
 * 優先順序：
 * 1. 環境變量 NEXT_PUBLIC_API_URL（如果設定，優先使用完整 URL）
 * 2. 環境變量 NEXT_PUBLIC_API_PORT（如果設定，使用 http://localhost:PORT/api，適用於分離測試場景）
 * 3. 在瀏覽器環境中，使用當前域名 + '/api'（適用於全 docker 部署，自動適應部署域名）
 * 4. 在 SSR 環境中，使用相對路徑 '/api'
 * 
 * 使用場景：
 * - 全 docker 部署：不設定環境變量，自動使用當前域名
 * - 分離測試（Next.js 不在 docker 中）：設定 NEXT_PUBLIC_API_PORT=6873（對應 PROJECT_PORT）
 */
export function getApiBaseUrl(): string {
  // 優先使用完整 URL 環境變量（如果設定的話）
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.endsWith('/')
      ? process.env.NEXT_PUBLIC_API_URL.slice(0, -1)
      : process.env.NEXT_PUBLIC_API_URL;
  }

  // 瀏覽器環境（依據當前網址判斷）
  if (typeof window !== 'undefined') {
    const { origin, hostname } = window.location;

    // 若前端是跑在本機（localhost），且有設定 PORT，則走 localhost:PORT（方便分離開發）
    if (
      (hostname === 'localhost' || hostname === '127.0.0.1') &&
      process.env.NEXT_PUBLIC_API_PORT
    ) {
      return `http://localhost:${process.env.NEXT_PUBLIC_API_PORT}/api`;
    }

    // 其他情況（例如正式網域）一律使用當前網域 + /api
    return `${origin}/api`;
  }

  // SSR 環境中：
  // - 若有設定 PORT，多半是本機開發，使用 localhost:PORT
  // - 否則使用相對路徑，由前端在瀏覽器解析為當前網域
  if (process.env.NEXT_PUBLIC_API_PORT) {
    return `http://localhost:${process.env.NEXT_PUBLIC_API_PORT}/api`;
  }

  return '/api';
}
