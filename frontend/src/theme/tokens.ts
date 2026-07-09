// Central design tokens - every screen/component should pull colors, spacing, radius, shadows,
// and typography from here rather than inlining hex values or magic numbers directly in a
// StyleSheet.create call. See docs/ui-design-system.md for the reasoning and component inventory
// this underpins.

export const colors = {
  // Page/surface
  background: '#F5F6F8',
  surface: '#FFFFFF',
  border: '#EAEAEA',

  // Text
  textPrimary: '#111111',
  textSecondary: '#666666',
  textMuted: '#999999',
  textOnDark: '#FFFFFF',

  // Brand + semantic states
  brand: '#1F9D74',
  brandSubtle: '#E3F3EC',
  success: '#1F9D74',
  warning: '#E8A23C',
  danger: '#D0483A',
  info: '#0066CC',

  // Per-macro accents, used by StatBadgeIcon
  calories: '#F2542D',
  protein: '#E0527A',
  carbs: '#E8A23C',
  fat: '#3E8EDE',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

// Single card elevation preset - covers both platforms (Android uses `elevation`, iOS uses the
// `shadow*` properties; React Native ignores whichever set doesn't apply to the current platform).
export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;

export const typography = {
  title: { fontSize: 22, fontWeight: '600' as const },
  subtitle: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  bodyBold: { fontSize: 14, fontWeight: '600' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  label: { fontSize: 12, fontWeight: '600' as const },
  statValue: { fontSize: 28, fontWeight: '700' as const },
} as const;

export const theme = { colors, spacing, radius, shadows, typography } as const;
