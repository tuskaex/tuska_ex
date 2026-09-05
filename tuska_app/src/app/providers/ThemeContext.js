import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import AppLoader from '../../components/vantage/AppLoader';
import { showToast } from '../../components/vantage';
import { vantage } from '../../theme/vantageTheme';
import { setThemeAndReload } from '../bootstrap/themeRuntime';

/** Dark — SpeedTrade ink surfaces, brand blue accent. Mirrors vantageTheme. */
const darkTheme = {
  name: 'Dark',
  isDark: true,
  colors: {
    primary: '#1B4DFF',
    primaryHover: '#0B2ECC',
    secondary: '#1B4DFF',
    accent: '#1B4DFF',
    bgPrimary: '#0A0E17',
    bgSecondary: '#121826',
    bgCard: '#121826',
    bgHover: '#1A2233',
    textPrimary: '#FFFFFF',
    textSecondary: '#9AA6BF',
    textMuted: '#6B7794',
    border: '#1E2739',
    borderLight: '#2C3850',
    success: '#00D18F',
    error: '#FF5647',
    warning: '#F59E0B',
    info: '#1B4DFF',
    buyColor: '#00D18F',
    sellColor: '#FF5647',
    profitColor: '#00D18F',
    lossColor: '#FF5647',
    tabBarBg: '#0A0E17',
    cardBg: '#121826',
    purple: '#8B5CF6',
    cyan: '#22D3EE',
    orange: '#F97316',
    pink: '#EC4899',
    yellow: '#EAB308',
    lime: '#84CC16',
  },
};

/** Light — clean Exness-style white UI. Cards are pure white separated by
 *  visible borders, secondary panels are a subtle off-white. Text contrast
 *  is strong against white so labels stay readable. */
const lightTheme = {
  name: 'Light',
  isDark: false,
  colors: {
    primary: '#1B4DFF',
    primaryHover: '#0B2ECC',
    secondary: '#1B4DFF',
    accent: '#1B4DFF',
    bgPrimary: '#FFFFFF',
    bgSecondary: '#F6F8FB',
    bgCard: '#FFFFFF',
    bgHover: '#EDF1F7',
    textPrimary: '#0A0E17',
    textSecondary: '#5A6376',
    textMuted: '#8B93A5',
    border: '#E4E8EF',
    borderLight: '#EDF1F7',
    success: '#00734C',
    error: '#B02318',
    warning: '#D97706',
    info: '#1B4DFF',
    buyColor: '#00734C',
    sellColor: '#B02318',
    profitColor: '#00734C',
    lossColor: '#B02318',
    tabBarBg: '#FFFFFF',
    cardBg: '#FFFFFF',
    purple: '#7C3AED',
    cyan: '#0891B2',
    orange: '#EA580C',
    pink: '#DB2777',
    yellow: '#CA8A04',
    lime: '#65A30D',
  },
};

const LOADING_BG = '#FFFFFF';
const LOADING_ACCENT = '#1B4DFF';

const ThemeContext = createContext({
  theme: darkTheme,
  colors: darkTheme.colors,
  isDark: true,
  toggleTheme: () => {},
  setTheme: () => {},
  loading: true,
});

export const ThemeProvider = ({ children }) => {
  // The active theme is decided at startup (index.js) and baked into the
  // `vantage` tokens before any screen loads. Mirror it here so legacy screens
  // that read `colors` from this context match the rest of the app.
  const [isDark] = useState(vantage.isDark !== false);
  const [loading] = useState(false);

  // Switching theme repaints the whole app, so persist the choice and reload
  // the JS bundle — this keeps the static `vantage` tokens and these `colors`
  // perfectly in sync.
  const setTheme = useCallback(async (name) => {
    const reloaded = await setThemeAndReload(name);
    if (!reloaded) {
      showToast({ kind: 'info', message: 'Theme saved — reopen the app to apply' });
    }
  }, []);
  const toggleTheme = useCallback(() => setTheme(isDark ? 'light' : 'dark'), [setTheme, isDark]);

  const theme = isDark ? darkTheme : lightTheme;

  // Memoized: theme only changes via a full JS reload, so this is effectively
  // constant — consumers never re-render because of this provider.
  const value = useMemo(
    () => ({ theme, colors: theme.colors, isDark, toggleTheme, setTheme, loading }),
    [theme, isDark, toggleTheme, setTheme, loading],
  );

  if (loading) {
    return <AppLoader />;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: darkTheme,
      colors: darkTheme.colors,
      isDark: true,
      toggleTheme: () => {},
      setTheme: () => {},
      loading: false,
    };
  }
  return context;
};

export default ThemeContext;
