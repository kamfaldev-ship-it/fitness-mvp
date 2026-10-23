import { useColorScheme } from 'react-native';

// Palette taken from competition bumper plates: blue 20kg, green 10kg, yellow 15kg
export const light = {
  bg: '#EDEFF2',
  surface: '#FFFFFF',
  sunken: '#E2E6EB',
  ink: '#16202B',
  muted: '#5B6673',
  line: '#D3D9E0',
  primary: '#1F5FBF',
  onPrimary: '#FFFFFF',
  success: '#1B8A4E',
  onSuccess: '#FFFFFF',
  record: '#F2B705',
  onRecord: '#16202B',
  danger: '#C0392B',
  isDark: false,
};

export const dark: typeof light = {
  bg: '#141A22',
  surface: '#1D2530',
  sunken: '#101519',
  ink: '#EEF1F5',
  muted: '#A3AEBB',
  line: '#2B3644',
  primary: '#7AA7FF',
  onPrimary: '#0B1B36',
  success: '#4CC38A',
  onSuccess: '#06210F',
  record: '#F2B705',
  onRecord: '#16202B',
  danger: '#FF8A80',
  isDark: true,
};

export type Colors = typeof light;
export const useTheme = (): Colors => (useColorScheme() === 'dark' ? dark : light);

export const font = {
  display: 'BarlowCondensed_700Bold',
  displaySemi: 'BarlowCondensed_600SemiBold',
  body: 'Barlow_400Regular',
  medium: 'Barlow_500Medium',
  semibold: 'Barlow_600SemiBold',
};

export const tabular = ['tabular-nums' as const];
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
