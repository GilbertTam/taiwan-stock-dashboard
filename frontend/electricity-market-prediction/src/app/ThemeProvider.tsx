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
          scrollbarColor: '#333 #050505',
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            backgroundColor: 'transparent',
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 8,
            backgroundColor: '#333',
            minHeight: 24,
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
});

// 創建上下文
interface ThemeContextType {
  darkMode: boolean;
  setDarkMode: (darkMode: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  darkMode: true,
  setDarkMode: () => { },
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [darkMode, setDarkMode] = useState(true);

  // Sync theme with body data attribute so using CSS variables works
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.dataset.theme = darkMode ? 'dark' : 'light';
    }
  }, [darkMode]);

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode }}>
      <MuiThemeProvider theme={darkMode ? darkTheme : lightTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
