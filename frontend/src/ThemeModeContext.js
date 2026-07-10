import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const ThemeModeContext = createContext({ mode: 'light', toggleMode: () => {} });

export const useThemeMode = () => useContext(ThemeModeContext);

// Shared brand-navy heading color that stays legible in both modes — the
// hardcoded navy (#0d2144) used everywhere for headings reads fine on a
// light page but fails contrast on a dark one, so it lightens per mode.
export const headingColor = (mode) => (mode === 'dark' ? '#8fb4f0' : '#0d2144');

const getInitialMode = () => {
  const saved = localStorage.getItem('themeMode');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const ThemeModeProvider = ({ children }) => {
  const [mode, setMode] = useState(getInitialMode);

  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  const toggleMode = () => setMode((m) => (m === 'light' ? 'dark' : 'light'));

  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: { main: '#0d2144' },
      background: {
        // Dark values are the dataviz skill's validated chart chrome tokens
        // (page plane / chart surface) so the spending chart's dark-mode
        // palette — validated against this exact surface — stays accurate
        // wherever it's dropped, not just inside its own local wrapper.
        default: mode === 'dark' ? '#0d0d0d' : '#f0f2f5',
        paper: mode === 'dark' ? '#1a1a19' : '#ffffff',
      },
    },
    shape: { borderRadius: 10 },
  }), [mode]);

  return (
    <ThemeModeContext.Provider value={{ mode, toggleMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
};
