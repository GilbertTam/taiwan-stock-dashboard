'use client';

import { useState, useEffect, ReactNode, createContext, useContext } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { createTheme, responsiveFontSizes } from '@mui/material/styles';

// ── Shared typography scale ──────────────────────────────────────────────
// Establishes a single, slightly-larger type system across the whole app.
// Base `fontSize` is bumped from MUI's default 14 → 15 (≈+7%), which scales
// every variant (h1-h6, body, caption, button…) proportionally. A CJK-aware
// system font stack keeps Japanese / Traditional-Chinese glyphs consistent
// with the surrounding Latin text instead of falling back per-glyph.
const sharedTypography = {
  fontFamily: [
    'system-ui',
    '-apple-system',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    '"Hiragino Sans"',
    '"Noto Sans JP"',
    '"Noto Sans TC"',
    '"Microsoft JhengHei"',
    '"Microsoft YaHei"',
    'sans-serif',
  ].join(','),
  fontSize: 15,
};

// 創建主題
const darkThemeBase = createTheme({
  typography: sharedTypography,
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

const lightThemeBase = createTheme({
  typography: sharedTypography,
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
      // Darkened from #666666 → #4b5563 (≈6.5:1 on the #f0f2f5 background)
      // so secondary/explanatory text is clearly legible in the light theme.
      primary: '#1a1a1a',
      secondary: '#4b5563',
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

// Scale heading sizes down on smaller breakpoints so the larger base type
// never overflows narrow screens. Restricted to headings to keep body / table
// text stable across breakpoints.
const RESPONSIVE_HEADINGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;
const darkTheme = responsiveFontSizes(darkThemeBase, { variants: [...RESPONSIVE_HEADINGS] });
const lightTheme = responsiveFontSizes(lightThemeBase, { variants: [...RESPONSIVE_HEADINGS] });

export type Locale = 'zh-TW' | 'en';
export type LocalePreference = Locale | 'system';
export type ThemePreference = 'dark' | 'light' | 'system';

const SUPPORTED_LOCALES: Locale[] = ['zh-TW', 'en'];
const VALID_LOCALE_PREFS: LocalePreference[] = ['zh-TW', 'en', 'system'];
const VALID_THEME_PREFS: ThemePreference[] = ['dark', 'light', 'system'];

function getSystemLocale(): Locale {
  if (typeof window === 'undefined') return 'zh-TW';
  const lang = navigator.language;
  if (lang.startsWith('en')) return 'en';
  if (lang.startsWith('zh')) return 'zh-TW';
  return 'zh-TW';
}

function getSavedLocalePreference(): LocalePreference {
  if (typeof window === 'undefined') return 'system';
  const saved = localStorage.getItem('hdjp-language');
  return VALID_LOCALE_PREFS.includes(saved as LocalePreference) ? (saved as LocalePreference) : 'zh-TW';
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

function useSystemLocale(): Locale {
  const [systemLocale, setSystemLocale] = useState(getSystemLocale);

  useEffect(() => {
    const handler = () => setSystemLocale(getSystemLocale());
    window.addEventListener('languagechange', handler);
    return () => window.removeEventListener('languagechange', handler);
  }, []);

  return systemLocale;
}

// Tabs supported by the SettingsModal. Adding a new tab here also requires
// rendering it inside SettingsModal — the union keeps both in sync.
export type SettingsTab = 'preferences' | 'account';

// 創建上下文
interface ThemeContextType {
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
  darkMode: boolean; // resolved actual mode — backward compatible for 36+ consuming files
  localePreference: LocalePreference;
  locale: Locale; // resolved actual locale (never 'system') — backward compatible
  setLocale: (locale: LocalePreference) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  /** Tab to display when the modal opens; reset to 'preferences' on close. */
  settingsInitialTab: SettingsTab;
  /** Convenience: open the modal on a specific tab in one call. */
  openSettings: (tab?: SettingsTab) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themePreference: 'system',
  setThemePreference: () => { },
  darkMode: true,
  localePreference: 'system',
  locale: 'zh-TW',
  setLocale: () => { },
  settingsOpen: false,
  setSettingsOpen: () => { },
  settingsInitialTab: 'preferences',
  openSettings: () => { },
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themePreference, setThemePrefState] = useState<ThemePreference>(getSavedThemePreference);
  const [localePreference, setLocalePrefState] = useState<LocalePreference>(getSavedLocalePreference);
  const [settingsOpen, setSettingsOpenState] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTab>('preferences');

  // Wrapper that also resets the requested tab on close so the next opener
  // (e.g. the gear icon) doesn't inherit "account" from a previous call.
  const setSettingsOpen = (open: boolean) => {
    setSettingsOpenState(open);
    if (!open) setSettingsInitialTab('preferences');
  };

  const openSettings = (tab: SettingsTab = 'preferences') => {
    setSettingsInitialTab(tab);
    setSettingsOpenState(true);
  };

  const systemDark = useSystemDarkMode();
  const darkMode = themePreference === 'system' ? systemDark : themePreference === 'dark';

  const systemLocale = useSystemLocale();
  const locale: Locale = localePreference === 'system' ? systemLocale : localePreference;

  // Sync theme with body data attribute so CSS variables work
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.dataset.theme = darkMode ? 'dark' : 'light';
    }
  }, [darkMode]);

  // Sync html lang attribute and i18n with resolved locale
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
      import('@/i18n/config').then(({ default: i18n }) => {
        if (i18n.language !== locale) i18n.changeLanguage(locale);
      });
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

  const setLocale = (value: LocalePreference) => {
    setLocalePrefState(value);
    localStorage.setItem('hdjp-language', value);
    const resolved = value === 'system' ? getSystemLocale() : value;
    document.documentElement.lang = resolved;
    import('@/i18n/config').then(({ default: i18n }) => {
      i18n.changeLanguage(resolved);
    });
  };

  return (
    <ThemeContext.Provider value={{ themePreference, setThemePreference, darkMode, localePreference, locale, setLocale, settingsOpen, setSettingsOpen, settingsInitialTab, openSettings }}>
      <MuiThemeProvider theme={darkMode ? darkTheme : lightTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
