
import './globals.css';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v13-appRouter';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from './ThemeProvider';
import { I18nProvider } from './I18nProvider';

export const metadata = {
  title: 'HDJP Electricity Market Dashboard',
  description: 'Insight of Japan Electricity Market',
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
            <I18nProvider>
              <ThemeProvider>
                {children}
              </ThemeProvider>
            </I18nProvider>
          </AuthProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
