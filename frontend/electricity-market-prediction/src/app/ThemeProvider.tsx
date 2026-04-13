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

// We are prioritizing Dark Mode layout, but keeping light mode just in case fallback is needed (though it might look off with the new global CSS)
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#008f5d',
    },
    secondary: {
      main: '#007bb5',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
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

const SUPPORTED_LOCALES: Locale[] = ['zh-TW', 'en', 'ja'];

function getSavedLocale(): Locale {
  if (typeof window === 'undefined') return 'zh-TW';
  const saved = localStorage.getItem('hdjp-language');
  return SUPPORTED_LOCALES.includes(saved as Locale) ? (saved as Locale) : 'zh-TW';
}

function getSavedDarkMode(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('hdjp-theme') !== 'light';
}

// 創建上下文
interface ThemeContextType {
  darkMode: boolean;
  setDarkMode: (darkMode: boolean) => void;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  darkMode: true,
  setDarkMode: () => { },
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
  const [darkMode, setDarkModeState] = useState<boolean>(getSavedDarkMode);
  const [locale, setLocaleState] = useState<Locale>(getSavedLocale);
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  const setDarkMode = (value: boolean) => {
    setDarkModeState(value);
    localStorage.setItem('hdjp-theme', value ? 'dark' : 'light');
    document.body.dataset.theme = value ? 'dark' : 'light';
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
    <ThemeContext.Provider value={{ darkMode, setDarkMode, locale, setLocale, settingsOpen, setSettingsOpen }}>
      <MuiThemeProvider theme={darkMode ? darkTheme : lightTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
