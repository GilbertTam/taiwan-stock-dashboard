'use client';

import { useState, useEffect, ReactNode, createContext, useContext } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { createTheme } from '@mui/material/styles';

// 創建主題
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00ff9d', // Neon Green matching global.css
      contrastText: '#000000',
    },
    secondary: {
      main: '#00d2ff', // Cyber Blue matching global.css
      contrastText: '#000000',
    },
    background: {
      default: '#050505', // Deep black
      paper: '#141414', // Slightly lighter for cards
    },
    text: {
      primary: '#e5e5e5',
      secondary: '#a3a3a3',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#050505',
          scrollbarColor: 'var(--scrollbar-thumb) var(--scrollbar-track)',
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            backgroundColor: 'var(--scrollbar-track)',
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 8,
            backgroundColor: 'var(--scrollbar-thumb)',
            minHeight: 24,
          },
          '&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
            backgroundColor: 'var(--scrollbar-thumb-hover)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(20, 20, 20, 0.6)', // Glass-like background for MUI papers
          border: '1px solid rgba(255, 255, 255, 0.08)',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-thumb': { backgroundColor: 'var(--scrollbar-thumb)', borderRadius: 3 },
          '&::-webkit-scrollbar-track': { backgroundColor: 'var(--scrollbar-track)' },
        },
      },
    },
  },
});

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#00a86b', // Match CSS --primary for light
    },
    secondary: {
      main: '#007bb5', // Match CSS --secondary for light
    },
    background: {
      default: '#f0f2f5',
      paper: 'rgba(255, 255, 255, 0.8)',
    },
    text: {
      primary: '#1a1a1a',
      secondary: '#666666',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f0f2f5',
          scrollbarColor: 'var(--scrollbar-thumb) var(--scrollbar-track)',
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            backgroundColor: 'var(--scrollbar-track)',
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 8,
            backgroundColor: 'var(--scrollbar-thumb)',
            minHeight: 24,
          },
          '&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
            backgroundColor: 'var(--scrollbar-thumb-hover)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          border: '1px solid rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-thumb': { backgroundColor: 'var(--scrollbar-thumb)', borderRadius: 3 },
          '&::-webkit-scrollbar-track': { backgroundColor: 'var(--scrollbar-track)' },
        },
      },
    },
  },
});

export type Locale = 'zh-TW' | 'en' | 'ja';
export type ThemePreference = 'dark' | 'light' | 'system';

const SUPPORTED_LOCALES: Locale[] = ['zh-TW', 'en', 'ja'];
const VALID_THEME_PREFS: ThemePreference[] = ['dark', 'light', 'system'];

function getSavedLocale(): Locale {
  if (typeof window === 'undefined') return 'zh-TW';
  const saved = localStorage.getItem('hdjp-language');
  return SUPPORTED_LOCALES.includes(saved as Locale) ? (saved as Locale) : 'zh-TW';
}

function getSavedThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const saved = localStorage.getItem('hdjp-theme');
  if (VALID_THEME_PREFS.includes(saved as ThemePreference)) return saved as ThemePreference;
  return 'system'; // new users default to system
}

function getSystemDarkMode(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function useSystemDarkMode(): boolean {
  const [systemDark, setSystemDark] = useState(getSystemDarkMode);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return systemDark;
}

// 創建上下文
interface ThemeContextType {
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
  darkMode: boolean; // resolved actual mode — backward compatible for 36+ consuming files
  locale: Locale;
  setLocale: (locale: Locale) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themePreference: 'system',
  setThemePreference: () => { },
  darkMode: true,
  locale: 'zh-TW',
  setLocale: () => { },
  settingsOpen: false,
  setSettingsOpen: () => { },
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themePreference, setThemePrefState] = useState<ThemePreference>(getSavedThemePreference);
  const [locale, setLocaleState] = useState<Locale>(getSavedLocale);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const systemDark = useSystemDarkMode();
  const darkMode = themePreference === 'system' ? systemDark : themePreference === 'dark';

  // Sync theme with body data attribute so CSS variables work
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.dataset.theme = darkMode ? 'dark' : 'light';
    }
  }, [darkMode]);

  // Sync html lang attribute with locale
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setThemePreference = (value: ThemePreference) => {
    setThemePrefState(value);
    localStorage.setItem('hdjp-theme', value);
    const resolved = value === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : value;
    document.body.dataset.theme = resolved;
  };

  const setLocale = (value: Locale) => {
    setLocaleState(value);
    localStorage.setItem('hdjp-language', value);
    document.documentElement.lang = value;
    // Dynamically import i18n to avoid circular deps at module load time
    import('@/i18n/config').then(({ default: i18n }) => {
      i18n.changeLanguage(value);
    });
  };

  return (
    <ThemeContext.Provider value={{ themePreference, setThemePreference, darkMode, locale, setLocale, settingsOpen, setSettingsOpen }}>
      <MuiThemeProvider theme={darkMode ? darkTheme : lightTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
