import colors from "@/constants/colors";
import { useColorSchemePreference } from "@/context/ColorSchemeContext";

export function useColors() {
  const { resolved } = useColorSchemePreference();
  const palette = resolved === "light" ? colors.light : colors.dark;
  return { ...palette, radius: colors.radius };
}
