/** 2:1 isometric helpers for town vista art (original art, Ikariam-inspired layout). */

export type IsoBoxPaths = {
  ground: string;
  left: string;
  right: string;
  top: string;
  shadow: string;
};

/** Footprint diamond + extruded walls. `by` = center of ground tile. */
export function isoBox(cx: number, by: number, w: number, h: number, rise: number): IsoBoxPaths {
  const hw = w / 2;
  const hh = h / 2;
  return {
    ground: `M ${cx} ${by + hh} L ${cx + hw} ${by} L ${cx} ${by - hh} L ${cx - hw} ${by} Z`,
    left: `M ${cx - hw} ${by} L ${cx} ${by + hh} L ${cx} ${by + hh - rise} L ${cx - hw} ${by - rise} Z`,
    right: `M ${cx + hw} ${by} L ${cx} ${by + hh} L ${cx} ${by + hh - rise} L ${cx + hw} ${by - rise} Z`,
    top: `M ${cx} ${by - hh - rise} L ${cx + hw} ${by - rise} L ${cx} ${by + hh - rise} L ${cx - hw} ${by - rise} Z`,
    shadow: `M ${cx} ${by + hh + 3} L ${cx + hw * 0.9} ${by + 2} L ${cx} ${by + hh * 0.4} L ${cx - hw * 0.9} ${by + 2} Z`,
  };
}

export function isoDiamond(cx: number, cy: number, w: number, h: number): string {
  const hw = w / 2;
  const hh = h / 2;
  return `M ${cx} ${cy - hh} L ${cx + hw} ${cy} L ${cx} ${cy + hh} L ${cx - hw} ${cy} Z`;
}

export type IsoPalette = {
  ground: string;
  left: string;
  right: string;
  top: string;
  trim: string;
  detail: string;
};

export function darken(hex: string, pct: number): string {
  const n = hex.replace("#", "").slice(0, 6);
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  const f = 1 - pct;
  const to = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `#${to(r).toString(16).padStart(2, "0")}${to(g).toString(16).padStart(2, "0")}${to(b).toString(16).padStart(2, "0")}`;
}

export function lighten(hex: string, pct: number): string {
  const n = hex.replace("#", "").slice(0, 6);
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  const f = pct;
  const to = (v: number) => Math.max(0, Math.min(255, Math.round(v + (255 - v) * f)));
  return `#${to(r).toString(16).padStart(2, "0")}${to(g).toString(16).padStart(2, "0")}${to(b).toString(16).padStart(2, "0")}`;
}

export function paletteFromAccent(accent: string, isDark: boolean): IsoPalette {
  if (isDark) {
    return {
      ground: darken(accent, 0.55),
      left: darken(accent, 0.35),
      right: darken(accent, 0.2),
      top: lighten(accent, 0.15),
      trim: lighten(accent, 0.35),
      detail: lighten(accent, 0.5),
    };
  }
  return {
    ground: darken(accent, 0.15),
    left: darken(accent, 0.08),
    right: lighten(accent, 0.05),
    top: lighten(accent, 0.25),
    trim: darken(accent, 0.25),
    detail: darken(accent, 0.4),
  };
}
