import React from "react";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from "react-native-svg";
import { isoDiamond, lighten } from "@/lib/isoPrimitives";
import type { SeasonTheme } from "@/lib/townVista";

type Props = {
  width: number;
  height: number;
  theme: SeasonTheme;
  hasFarm: boolean;
  foodTier: number;
  showSun?: boolean;
};

/** Tile centers — sit on shared terrain (normalized 0–1). */
const GRASS_TILES: { x: number; y: number; variant: 0 | 1 | 2 }[] = [
  { x: 0.22, y: 0.58, variant: 0 },
  { x: 0.35, y: 0.62, variant: 1 },
  { x: 0.48, y: 0.6, variant: 0 },
  { x: 0.62, y: 0.58, variant: 2 },
  { x: 0.75, y: 0.56, variant: 1 },
  { x: 0.28, y: 0.68, variant: 2 },
  { x: 0.42, y: 0.7, variant: 0 },
  { x: 0.55, y: 0.72, variant: 1 },
  { x: 0.68, y: 0.7, variant: 0 },
  { x: 0.5, y: 0.52, variant: 1 },
  { x: 0.38, y: 0.54, variant: 2 },
  { x: 0.62, y: 0.54, variant: 0 },
  { x: 0.5, y: 0.64, variant: 2 },
  { x: 0.32, y: 0.5, variant: 0 },
  { x: 0.66, y: 0.5, variant: 1 },
];

const ROAD_TILES: { x: number; y: number }[] = [
  { x: 0.5, y: 0.5 },
  { x: 0.5, y: 0.58 },
  { x: 0.5, y: 0.66 },
  { x: 0.42, y: 0.58 },
  { x: 0.58, y: 0.58 },
  { x: 0.35, y: 0.62 },
  { x: 0.65, y: 0.62 },
];

const TILE_W = 42;
const TILE_H = 21;

function tileFill(theme: SeasonTheme, variant: 0 | 1 | 2): string {
  if (variant === 0) return theme.meadow;
  if (variant === 1) return theme.meadowEdge;
  return lighten(theme.meadow, 0.04);
}

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

  /** Organic pad where the city sits — same palette as hills, no light slab. */
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
        <LinearGradient id="hillGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={theme.hill} stopOpacity="0.85" />
          <Stop offset="1" stopColor={theme.terrain} stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="terrainGrad" x1="0.5" y1="0" x2="0.5" y2="1">
          <Stop offset="0" stopColor={theme.hill} stopOpacity="0.5" />
          <Stop offset="0.35" stopColor={theme.terrain} stopOpacity="1" />
          <Stop offset="1" stopColor={theme.meadowEdge} stopOpacity="1" />
        </LinearGradient>
      </Defs>

      <Path d={`M 0 0 H ${w} V ${h} H 0 Z`} fill="url(#skyGrad)" />

      {showSun && (
        <>
          <Circle cx={w * 0.78} cy={h * 0.11} r={20} fill={theme.tree} fillOpacity={0.1} />
          <Circle cx={w * 0.78} cy={h * 0.11} r={12} fill={theme.tree} fillOpacity={0.28} />
        </>
      )}

      {/* Distant hills — blend into sky */}
      <Path
        d={`M 0 ${horizon} C ${w * 0.18} ${horizon - h * 0.1} ${w * 0.38} ${horizon - h * 0.04} ${w * 0.55} ${horizon} S ${w * 0.92} ${horizon - h * 0.06} ${w} ${horizon - h * 0.01} L ${w} ${horizon + 32} L 0 ${horizon + 32} Z`}
        fill="url(#hillGrad)"
      />

      {/* Continuous settlement ground (no contrasting platform) */}
      <Path d={terrainPath} fill="url(#terrainGrad)" />

      {/* Soft texture on terrain */}
      <Path
        d={terrainPath}
        fill={theme.meadow}
        fillOpacity={0.12}
      />

      {/* Worn paths — darker grass/dirt, not beige cobble */}
      {ROAD_TILES.map((t, i) => {
        const cx = w * t.x;
        const cy = h * t.y;
        return (
          <G key={`r-${i}`} opacity={0.85}>
            <Path d={isoDiamond(cx, cy, TILE_W * 0.8, TILE_H * 0.8)} fill={theme.pathEdge} />
            <Path d={isoDiamond(cx, cy, TILE_W * 0.68, TILE_H * 0.68)} fill={theme.path} />
          </G>
        );
      })}

      {/* Land plots — subtle iso tiles on terrain */}
      {GRASS_TILES.map((t, i) => {
        const cx = w * t.x;
        const cy = h * t.y;
        return (
          <Path
            key={`g-${i}`}
            d={isoDiamond(cx, cy, TILE_W, TILE_H)}
            fill={tileFill(theme, t.variant)}
            fillOpacity={0.55}
            stroke={theme.tileStroke}
            strokeWidth={0.35}
            strokeOpacity={0.25}
          />
        );
      })}

      {/* Farm fields merge into north-west terrain */}
      {hasFarm &&
        [0, 1, 2].map((i) => {
          const cx = w * (0.14 + i * 0.05);
          const cy = h * (0.5 + i * 0.02);
          return (
            <Path
              key={`f-${i}`}
              d={isoDiamond(cx, cy, 34, 17)}
              fill={theme.tree}
              fillOpacity={0.12 + foodTier * 0.06}
              stroke={theme.treeDark}
              strokeWidth={0.35}
              strokeOpacity={0.35}
            />
          );
        })}

      {/* Trees on outer terrain only */}
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
