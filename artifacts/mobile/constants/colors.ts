import { radius } from "./tokens";

/** Building / unit accent colors — tuned per theme for contrast on surfaces. */
const slotColorsDark = {
  farm: "#4A9E42",
  mine: "#D4A520",
  quarry: "#8A8A78",
  lumberMill: "#B07038",
  barracks: "#C45050",
  archeryRange: "#4A9E42",
  stables: "#D4B830",
  market: "#C49A30",
  tavern: "#D47A48",
  house: "#5A8AB8",
  townHall: "#D4A520",
  wall: "#7A7A72",
  tower: "#6A6A88",
  spyGuild: "#7A5AAA",
  shipyard: "#4A7A9A",
  museum: "#9A8A5A",
  monument: "#C4A030",
} as const;

const slotColorsLight = {
  farm: "#2D7A28",
  mine: "#9A7208",
  quarry: "#5C5C52",
  lumberMill: "#7A4E20",
  barracks: "#9B3030",
  archeryRange: "#2D7A28",
  stables: "#8A7010",
  market: "#8A6010",
  tavern: "#B85A28",
  house: "#2A5A8A",
  townHall: "#9A7208",
  wall: "#5A5A54",
  tower: "#4A4A62",
  spyGuild: "#5A4080",
  shipyard: "#2A5A7A",
  museum: "#6A5A30",
  monument: "#8A7010",
} as const;

const dark = {
  background: "#0C0A07",
  surface: "#14110D",
  surfaceElevated: "#1C1812",
  foreground: "#F2EBD8",
  text: "#F2EBD8",
  textSecondary: "#8A7D68",
  textMuted: "#5E5648",
  tint: "#D4A520",
  card: "#14110D",
  cardForeground: "#F2EBD8",
  border: "#2E2618",
  borderSubtle: "#221C12",
  input: "#1C1812",
  inputBorder: "#3A3020",
  primary: "#D4A520",
  primaryForeground: "#0C0A07",
  secondary: "#2A2218",
  secondaryForeground: "#F2EBD8",
  muted: "#1C1812",
  mutedForeground: "#8A7D68",
  accent: "#2A2218",
  accentForeground: "#F2EBD8",
  destructive: "#C45040",
  destructiveForeground: "#FFFFFF",
  success: "#4A9E42",
  warning: "#D4A520",
  overlay: "#000000B3",
  gold: "#D4A520",
  goldLight: "#F0C848",
  food: "#4A9E42",
  foodLight: "#6AB85A",
  wood: "#B07038",
  woodLight: "#D09050",
  stone: "#8A8A78",
  stoneLight: "#A8A898",
  military: "#C45050",
  defense: "#6A9AC4",
  peaceful: "#4A9AAA",
  spring: "#4A9E42",
  summer: "#D4A520",
  autumn: "#D47A48",
  winter: "#6A9AC4",
  safe: "#4A9E42",
  moderate: "#D4A520",
  risky: "#D47A48",
  deadly: "#C45040",
  explore: "#6A9AC4",
  patrol: "#4A9E42",
  raid: "#D47A48",
  siege: "#C45040",
  difficultyEasy: "#4A9E42",
  difficultyMedium: "#D4A520",
  difficultyHard: "#C45040",
  onPrimary: "#0C0A07",
  slots: slotColorsDark,
};

const light = {
  background: "#F7F5F0",
  surface: "#FFFFFF",
  surfaceElevated: "#F0EDE6",
  foreground: "#1A1612",
  text: "#1A1612",
  textSecondary: "#5C5650",
  textMuted: "#8A8480",
  tint: "#9A7208",
  card: "#FFFFFF",
  cardForeground: "#1A1612",
  border: "#E4DFD4",
  borderSubtle: "#EDE9E2",
  input: "#FFFFFF",
  inputBorder: "#D8D2C6",
  primary: "#9A7208",
  primaryForeground: "#FFFFFF",
  secondary: "#EDE9E2",
  secondaryForeground: "#1A1612",
  muted: "#F0EDE6",
  mutedForeground: "#5C5650",
  accent: "#EDE9E2",
  accentForeground: "#1A1612",
  destructive: "#B82E1E",
  destructiveForeground: "#FFFFFF",
  success: "#2D7A28",
  warning: "#9A7208",
  overlay: "#1A161280",
  gold: "#9A7208",
  goldLight: "#C49A18",
  food: "#2D7A28",
  foodLight: "#3D9438",
  wood: "#7A4E20",
  woodLight: "#9A6830",
  stone: "#5C5C52",
  stoneLight: "#787870",
  military: "#9B3030",
  defense: "#3D6B9A",
  peaceful: "#2D7A8C",
  spring: "#2D7A28",
  summer: "#9A7208",
  autumn: "#B85A28",
  winter: "#3D6B9A",
  safe: "#2D7A28",
  moderate: "#9A7208",
  risky: "#B85A28",
  deadly: "#B82E1E",
  explore: "#3D6B9A",
  patrol: "#2D7A28",
  raid: "#B85A28",
  siege: "#B82E1E",
  difficultyEasy: "#2D7A28",
  difficultyMedium: "#9A7208",
  difficultyHard: "#B82E1E",
  onPrimary: "#FFFFFF",
  slots: slotColorsLight,
};

export type SlotColorKey = keyof typeof slotColorsDark;

export type ColorPalette = {
  background: string;
  surface: string;
  surfaceElevated: string;
  foreground: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  tint: string;
  card: string;
  cardForeground: string;
  border: string;
  borderSubtle: string;
  input: string;
  inputBorder: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  success: string;
  warning: string;
  overlay: string;
  gold: string;
  goldLight: string;
  food: string;
  foodLight: string;
  wood: string;
  woodLight: string;
  stone: string;
  stoneLight: string;
  military: string;
  defense: string;
  peaceful: string;
  spring: string;
  summer: string;
  autumn: string;
  winter: string;
  safe: string;
  moderate: string;
  risky: string;
  deadly: string;
  explore: string;
  patrol: string;
  raid: string;
  siege: string;
  difficultyEasy: string;
  difficultyMedium: string;
  difficultyHard: string;
  onPrimary: string;
  slots: Record<SlotColorKey, string>;
};

const colors = {
  light,
  dark,
  radius: radius.md,
};

export default colors;
