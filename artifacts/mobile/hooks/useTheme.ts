import colors, { type ColorPalette } from "@/constants/colors";
import { tokens } from "@/constants/tokens";
import { useColorSchemePreference } from "@/context/ColorSchemeContext";
import { withAlpha } from "@/lib/theme";

export type Theme = {
  colors: ColorPalette;
  space: typeof tokens.space;
  radius: typeof tokens.radius;
  typography: typeof tokens.typography;
  isDark: boolean;
  withAlpha: typeof withAlpha;
};

export function useTheme(): Theme {
  const { resolved } = useColorSchemePreference();
  const isDark = resolved !== "light";
  const palette = isDark ? colors.dark : colors.light;

  return {
    colors: palette,
    space: tokens.space,
    radius: tokens.radius,
    typography: tokens.typography,
    isDark,
    withAlpha,
  };
}
