import { useTheme } from "@/hooks/useTheme";

/** Semantic palette for the active color scheme (light or dark). */
export function useColors() {
  const { colors, radius } = useTheme();
  return { ...colors, radius };
}
