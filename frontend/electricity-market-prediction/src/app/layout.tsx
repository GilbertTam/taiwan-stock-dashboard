
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
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var p=localStorage.getItem('hdjp-theme');var d=p==='dark'||(p!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches);document.body.dataset.theme=d?'dark':'light'}catch(e){}})()` }} />
      </head>
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
