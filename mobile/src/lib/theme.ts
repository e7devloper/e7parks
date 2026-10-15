import { useMemo } from 'react';
import { useColorScheme, type TextStyle } from 'react-native';

// Brand values come from e7entertainments.com: navy ink, gold, pale blue-grey ground.
const light = {
  ground: '#F4F7FB',
  surface: '#FFFFFF',
  surfaceAlt: '#E8EEF7',
  line: '#E1E8F0',
  inputBorder: '#7F8EA5',
  heading: '#1F3864',
  text: '#3D4C5E',
  muted: '#5A6A80',
  placeholder: '#5F6E85',
  // Gold is a fill, never text on light: it only reaches 1.9:1 on white.
  action: '#F0A821',
  onAction: '#1F3864',
  link: '#1F3864',
  select: '#1F3864',
  onSelect: '#FFFFFF',
  header: '#1F3864',
  onHeader: '#FFFFFF',
  danger: '#A8201A',
  onDanger: '#FFFFFF',
  dangerSoft: '#FCEBEA',
  success: '#1B7F4B',
  shadow: '#1F3864',
  status: {
    open: { bg: '#FDF1D7', fg: '#6B4A00' },
    in_review: { bg: '#E3ECFB', fg: '#1F3864' },
    quoted: { bg: '#DDF3E6', fg: '#14613A' },
    closed: { bg: '#E8EEF7', fg: '#5A6A80' },
  },
};

export type Palette = typeof light;

const dark: Palette = {
  ground: '#0E1830',
  surface: '#17244A',
  surfaceAlt: '#1F3060',
  line: '#2C3D6B',
  inputBorder: '#6F82A8',
  heading: '#F4F7FB',
  text: '#D5DDEA',
  muted: '#9FB0C8',
  placeholder: '#93A3BF',
  action: '#F0A821',
  onAction: '#14213F',
  link: '#FFC14D',
  select: '#E8EEF7',
  onSelect: '#14213F',
  header: '#0B1326',
  onHeader: '#FFFFFF',
  danger: '#FFB4AB',
  onDanger: '#3A1512',
  dangerSoft: '#3A1512',
  success: '#7FD9A8',
  shadow: '#000000',
  status: {
    open: { bg: '#4A3708', fg: '#FFD98A' },
    in_review: { bg: '#22366B', fg: '#C9DAFF' },
    quoted: { bg: '#123F2A', fg: '#9FE3BF' },
    closed: { bg: '#1F3060', fg: '#9FB0C8' },
  },
};

export const fonts = { display: 'Montserrat_700Bold', displayMedium: 'Montserrat_600SemiBold' };

/** Type roles. Montserrat is the brand's display face; body text stays on the platform font. */
export const type = {
  display: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34 },
  title: { fontFamily: fonts.display, fontSize: 20, lineHeight: 26 },
  heading: { fontFamily: fonts.display, fontSize: 17, lineHeight: 22 },
  button: { fontFamily: fonts.display, fontSize: 16, lineHeight: 20 },
  body: { fontSize: 16, lineHeight: 23 },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18 },
} satisfies Record<string, TextStyle>;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, section: 40 };
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };
/** Forms and lists stop growing here so tablets don't get a stretched phone layout. */
export const CONTENT_MAX_WIDTH = 560;
/** Smallest touch target that satisfies both iOS (44pt) and Android (48dp). */
export const TOUCH = 48;

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

/** Builds a stylesheet from the active palette; recomputed only when the appearance changes. */
export function useStyles<T>(factory: (c: Palette) => T): T {
  const c = usePalette();
  return useMemo(() => factory(c), [c, factory]);
}
