import React from "react";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from "react-native-svg";
import type { SeasonTheme } from "@/lib/townVista";

type Props = {
  width: number;
  height: number;
  theme: SeasonTheme;
  hasFarm: boolean;
  foodTier: number;
  showSun?: boolean;
};

export default function TownVistaLandscape({
  width,
  height,
  theme,
  hasFarm,
  foodTier,
  showSun = true,
}: Props) {
  const w = width;
  const h = height;
  const horizon = h * 0.4;
  const land = theme.meadow;

  const terrainPath = `
    M 0 ${horizon + 8}
    C ${w * 0.1} ${horizon + h * 0.06} ${w * 0.2} ${horizon + h * 0.14} ${w * 0.35} ${horizon + h * 0.1}
    C ${w * 0.5} ${horizon + h * 0.06} ${w * 0.65} ${horizon + h * 0.12} ${w * 0.8} ${horizon + h * 0.08}
    C ${w * 0.92} ${horizon + h * 0.04} ${w} ${horizon + h * 0.1} ${w} ${h}
    L 0 ${h} Z
  `;

  return (
    <Svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0 }}>
      <Defs>
        <LinearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={theme.skyTop} stopOpacity="1" />
          <Stop offset="0.55" stopColor={theme.skyMid} stopOpacity="1" />
          <Stop offset="1" stopColor={theme.skyBottom} stopOpacity="1" />
        </LinearGradient>
      </Defs>

      <Path d={`M 0 0 H ${w} V ${h} H 0 Z`} fill="url(#skyGrad)" />

      {showSun && (
        <>
          <Circle cx={w * 0.78} cy={h * 0.11} r={20} fill={theme.tree} fillOpacity={0.1} />
          <Circle cx={w * 0.78} cy={h * 0.11} r={12} fill={theme.tree} fillOpacity={0.28} />
        </>
      )}

      {/* Hills + settlement — one land color */}
      <Path
        d={`M 0 ${horizon} C ${w * 0.18} ${horizon - h * 0.1} ${w * 0.38} ${horizon - h * 0.04} ${w * 0.55} ${horizon} S ${w * 0.92} ${horizon - h * 0.06} ${w} ${horizon - h * 0.01} L ${w} ${h} L 0 ${h} Z`}
        fill={land}
      />
      <Path d={terrainPath} fill={land} />

      {/* Farm tint on same land */}
      {hasFarm &&
        [0, 1, 2].map((i) => (
          <Ellipse
            key={`f-${i}`}
            cx={w * (0.16 + i * 0.05)}
            cy={h * (0.52 + i * 0.02)}
            rx={w * 0.04}
            ry={h * 0.025}
            fill={theme.tree}
            fillOpacity={0.1 + foodTier * 0.05}
          />
        ))}

      {/* Trees on outer edges */}
      {[
        { x: 0.05, y: 0.48, s: 0.9 },
        { x: 0.95, y: 0.46, s: 1 },
        { x: 0.06, y: 0.76, s: 0.85 },
        { x: 0.94, y: 0.74, s: 0.95 },
      ].map((t, i) => (
        <G key={`tree-${i}`} transform={`translate(${w * t.x}, ${h * t.y}) scale(${t.s})`}>
          <Ellipse cx={0} cy={10} rx={10} ry={3} fill="#000" opacity={0.08} />
          <Path d="M -3 8 L 3 8 L 2 2 L -2 2 Z" fill={theme.treeDark} />
          <Circle cx={0} cy={-1} r={9} fill={theme.tree} fillOpacity={0.72} />
          <Circle cx={-4} cy={2} r={6} fill={theme.treeDark} fillOpacity={0.8} />
        </G>
      ))}
    </Svg>
  );
}
