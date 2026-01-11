
import { AppRouterCacheProvider } from '@mui/material-nextjs/v13-appRouter';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from './ThemeProvider';

export const metadata = {
  title: '電力市場預測比較系統',
  description: '比較不同模型的電力價格預測',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body>
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <AuthProvider>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </AuthProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
