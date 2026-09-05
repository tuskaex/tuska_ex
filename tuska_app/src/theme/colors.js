// SpeedTrade palette — kept in step with theme/vantageTheme.js, which is the
// primary token set. This module is the older `useTheme()` hook that a handful
// of screens still read; the values below mirror the vantage tokens so the two
// cannot drift into two different-looking apps.
import { useColorScheme } from 'react-native';

export const darkTheme = {
  background: '#0A0E17',
  card: '#121826',
  cardAlt: '#1A2233',
  surface: '#1A2233',

  text: '#FFFFFF',
  textSecondary: '#9AA6BF',
  textMuted: '#6B7794',

  border: '#1E2739',
  borderLight: '#2C3850',

  primary: '#1b4dff',
  primaryLight: '#1b4dff28',

  success: '#00D18F',
  successLight: '#00D18F20',
  danger: '#FF5647',
  dangerLight: '#FF564720',
  warning: '#FBBF24',
  warningLight: '#FBBF2420',
  info: '#1b4dff',
  infoLight: '#1b4dff20',
  purple: '#8B5CF6',
  purpleLight: '#8B5CF620',
};

export const lightTheme = {
  background: '#FFFFFF',
  card: '#F6F8FB',
  cardAlt: '#EDF1F7',
  surface: '#F6F8FB',

  text: '#0A0E17',
  textSecondary: '#5A6376',
  textMuted: '#8B93A5',

  border: '#E4E8EF',
  borderLight: '#EDF1F7',

  primary: '#1b4dff',
  primaryLight: '#1b4dff20',

  success: '#00734C',
  successLight: '#00A76F20',
  danger: '#B02318',
  dangerLight: '#E5372A20',
  warning: '#FBBF24',
  warningLight: '#FBBF2420',
  info: '#1b4dff',
  infoLight: '#1b4dff20',
  purple: '#8B5CF6',
  purpleLight: '#8B5CF620',
};

export const useTheme = () => {
  const colorScheme = useColorScheme();
  return colorScheme === 'dark' ? darkTheme : lightTheme;
};

export default { darkTheme, lightTheme, useTheme };
