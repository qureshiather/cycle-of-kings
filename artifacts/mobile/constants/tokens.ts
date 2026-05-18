/** Shared layout and typography scales — theme-agnostic. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

export const typography = {
  caption: { fontSize: 9, fontFamily: "Inter_500Medium" as const, letterSpacing: 0.4 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold" as const },
  body: { fontSize: 14, fontFamily: "Inter_400Regular" as const },
  bodyMedium: { fontSize: 14, fontFamily: "Inter_500Medium" as const },
  title: { fontSize: 16, fontFamily: "Inter_700Bold" as const },
  headline: { fontSize: 20, fontFamily: "Inter_700Bold" as const },
  display: { fontSize: 34, fontFamily: "Inter_700Bold" as const },
} as const;

export const tokens = { space, radius, typography };
