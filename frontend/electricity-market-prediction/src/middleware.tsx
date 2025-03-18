import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 從 cookie 中獲取 token
  const authTokensCookie = request.cookies.get('auth_tokens')?.value;
  const isAuthenticated = !!authTokensCookie;
  
  // 獲取當前路徑
  const path = request.nextUrl.pathname;
  
  // 如果用戶訪問登入頁面但已經認證，重定向到儀表板
  if (path === '/login' && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // 如果用戶訪問受保護的路由但未認證，重定向到登入頁面
  if (!path.startsWith('/login') && !isAuthenticated && 
      !path.startsWith('/_next') && !path.startsWith('/api') && 
      !path.includes('favicon.ico')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

// 配置匹配的路徑
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
