import React from "react";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from "react-native-svg";
import { isoDiamond } from "@/lib/isoPrimitives";
import type { SeasonTheme } from "@/lib/townVista";

type Props = {
  width: number;
  height: number;
  theme: SeasonTheme;
  wallLevel: number;
  hasFarm: boolean;
  foodTier: number;
  showSun?: boolean;
};

/** Isometric tile centers on the meadow (normalized 0–1). */
const GRASS_TILES: { x: number; y: number }[] = [
  { x: 0.22, y: 0.58 },
  { x: 0.35, y: 0.62 },
  { x: 0.48, y: 0.6 },
  { x: 0.62, y: 0.58 },
  { x: 0.75, y: 0.56 },
  { x: 0.28, y: 0.68 },
  { x: 0.42, y: 0.7 },
  { x: 0.55, y: 0.72 },
  { x: 0.68, y: 0.7 },
  { x: 0.5, y: 0.52 },
  { x: 0.38, y: 0.54 },
  { x: 0.62, y: 0.54 },
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

const TILE_W = 44;
const TILE_H = 22;

export default function TownVistaLandscape({
  width,
  height,
  theme,
  wallLevel,
  hasFarm,
  foodTier,
  showSun = true,
}: Props) {
  const w = width;
  const h = height;
  const horizon = h * 0.42;

  const wallOpacity = wallLevel > 0 ? 0.4 + Math.min(wallLevel, 10) * 0.05 : 0;

  return (
    <Svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0 }}>
      <Defs>
        <LinearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={theme.skyTop} stopOpacity="1" />
          <Stop offset="0.5" stopColor={theme.skyMid} stopOpacity="1" />
          <Stop offset="1" stopColor={theme.skyBottom} stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="hillGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={theme.hill} stopOpacity="0.7" />
          <Stop offset="1" stopColor={theme.meadowEdge} stopOpacity="0.9" />
        </LinearGradient>
      </Defs>

      <Path d={`M 0 0 H ${w} V ${h} H 0 Z`} fill="url(#skyGrad)" />

      {showSun && (
        <>
          <Circle cx={w * 0.78} cy={h * 0.12} r={18} fill={theme.tree} fillOpacity={0.12} />
          <Circle cx={w * 0.78} cy={h * 0.12} r={11} fill={theme.tree} fillOpacity={0.35} />
        </>
      )}

      {/* Distant hills */}
      <Path
        d={`M 0 ${horizon} C ${w * 0.15} ${horizon - h * 0.14} ${w * 0.35} ${horizon - h * 0.06} ${w * 0.5} ${horizon} S ${w * 0.9} ${horizon - h * 0.08} ${w} ${horizon - h * 0.02} L ${w} ${horizon + 24} L 0 ${horizon + 24} Z`}
        fill="url(#hillGrad)"
      />

      {/* Isometric grass tiles */}
      {GRASS_TILES.map((t, i) => {
        const cx = w * t.x;
        const cy = h * t.y;
        const shade = i % 3 === 0 ? theme.meadow : i % 3 === 1 ? theme.meadowEdge : theme.meadow;
        return (
          <Path
            key={`g-${i}`}
            d={isoDiamond(cx, cy, TILE_W, TILE_H)}
            fill={shade}
            stroke={theme.meadowEdge}
            strokeWidth={0.4}
            strokeOpacity={0.5}
          />
        );
      })}

      {/* Cobblestone roads (iso tiles) */}
      {ROAD_TILES.map((t, i) => {
        const cx = w * t.x;
        const cy = h * t.y;
        return (
          <G key={`r-${i}`}>
            <Path d={isoDiamond(cx, cy, TILE_W * 0.85, TILE_H * 0.85)} fill={theme.pathEdge} />
            <Path d={isoDiamond(cx, cy, TILE_W * 0.72, TILE_H * 0.72)} fill={theme.path} />
          </G>
        );
      })}

      {/* Farm extension tiles */}
      {hasFarm &&
        [0, 1, 2].map((i) => {
          const cx = w * (0.14 + i * 0.05);
          const cy = h * (0.5 + i * 0.02);
          return (
            <Path
              key={`f-${i}`}
              d={isoDiamond(cx, cy, 36, 18)}
              fill={theme.tree}
              fillOpacity={0.15 + foodTier * 0.08}
              stroke={theme.treeDark}
              strokeWidth={0.5}
            />
          );
        })}

      {/* Decorative trees (iso style) */}
      {[
        { x: 0.06, y: 0.5 },
        { x: 0.94, y: 0.48 },
        { x: 0.08, y: 0.72 },
        { x: 0.92, y: 0.7 },
      ].map((t, i) => (
        <G key={`tree-${i}`} transform={`translate(${w * t.x}, ${h * t.y})`}>
          <Ellipse cx={0} cy={10} rx={10} ry={3} fill="#000" opacity={0.1} />
          <Path d="M -3 8 L 3 8 L 2 2 L -2 2 Z" fill={theme.treeDark} />
          <Circle cx={0} cy={-1} r={9} fill={theme.tree} fillOpacity={0.75} />
          <Circle cx={-4} cy={2} r={6} fill={theme.treeDark} fillOpacity={0.85} />
        </G>
      ))}

      {/* City wall — iso bastions at corners */}
      {wallLevel > 0 && (
        <G opacity={wallOpacity}>
          {[
            { x: 0.12, y: 0.48 },
            { x: 0.88, y: 0.48 },
            { x: 0.12, y: 0.74 },
            { x: 0.88, y: 0.74 },
          ].map((c, i) => (
            <Path
              key={`wall-${i}`}
              d={isoDiamond(w * c.x, h * c.y, 28, 14)}
              fill={theme.pathEdge}
              stroke={theme.path}
              strokeWidth={1.5}
            />
          ))}
          <Path
            d={`M ${w * 0.12} ${h * 0.48} L ${w * 0.88} ${h * 0.48} M ${w * 0.12} ${h * 0.74} L ${w * 0.88} ${h * 0.74} M ${w * 0.12} ${h * 0.48} L ${w * 0.12} ${h * 0.74} M ${w * 0.88} ${h * 0.48} L ${w * 0.88} ${h * 0.74}`}
            stroke={theme.pathEdge}
            strokeWidth={1 + Math.floor(wallLevel / 5)}
            strokeOpacity={0.6}
            fill="none"
          />
        </G>
      )}
    </Svg>
  );
}
