/** Append 2-digit hex alpha to a #RRGGBB color (React Native friendly). */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  if (hex.length === 4) {
    const r = hex[1];
    const g = hex[2];
    const b = hex[3];
    return `#${r}${r}${g}${g}${b}${b}${a}`;
  }
  const base = hex.replace("#", "").slice(0, 6);
  return `#${base}${a}`;
}
