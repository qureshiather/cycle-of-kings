import React from "react";
import Svg, { G, Path, Rect } from "react-native-svg";
import { isoBox } from "@/lib/isoPrimitives";

export type WallColors = {
  left: string;
  right: string;
  top: string;
  trim: string;
  shadow: string;
};

/** Perimeter anchors (normalized); gate stays open at south center. */
const WALL_RING: { x: number; y: number; gate?: boolean }[] = [
  { x: 0.16, y: 0.46 },
  { x: 0.28, y: 0.4 },
  { x: 0.4, y: 0.38 },
  { x: 0.5, y: 0.36 },
  { x: 0.6, y: 0.38 },
  { x: 0.72, y: 0.4 },
  { x: 0.84, y: 0.46 },
  { x: 0.9, y: 0.54 },
  { x: 0.88, y: 0.64 },
  { x: 0.76, y: 0.72 },
  { x: 0.5, y: 0.76, gate: true },
  { x: 0.24, y: 0.72 },
  { x: 0.12, y: 0.64 },
  { x: 0.1, y: 0.54 },
];

function WallBlock({
  cx,
  cy,
  w,
  h,
  rise,
  colors,
  corner,
}: {
  cx: number;
  cy: number;
  w: number;
  h: number;
  rise: number;
  colors: WallColors;
  corner?: boolean;
}) {
  const p = isoBox(cx, cy, w, h, rise);
  const hw = w / 2;
  const crenelleW = corner ? 4 : 3;
  const crenelleCount = corner ? 3 : 2;

  return (
    <G>
      <Path d={p.shadow} fill={colors.shadow} opacity={0.2} />
      <Path d={p.left} fill={colors.left} stroke={colors.trim} strokeWidth={0.35} />
      <Path d={p.right} fill={colors.right} stroke={colors.trim} strokeWidth={0.35} />
      <Path d={p.top} fill={colors.top} stroke={colors.trim} strokeWidth={0.4} />
      {Array.from({ length: crenelleCount }).map((_, i) => {
        const ox = (i - (crenelleCount - 1) / 2) * (crenelleW + 2);
        return (
          <Rect
            key={i}
            x={cx + ox - crenelleW / 2}
            y={cy - h / 2 - rise - 3}
            width={crenelleW}
            height={4}
            fill={colors.trim}
            rx={0.5}
          />
        );
      })}
      {corner && (
        <Path
          d={`M ${cx} ${cy - h / 2 - rise - 6} L ${cx + hw * 0.5} ${cy - rise - h / 2 - 2} L ${cx} ${cy - rise - h / 2 + 2} L ${cx - hw * 0.5} ${cy - rise - h / 2 - 2} Z`}
          fill={colors.trim}
          opacity={0.9}
        />
      )}
    </G>
  );
}

type Props = {
  width: number;
  height: number;
  wallLevel: number;
  colors: WallColors;
};

export function getWallColors(_hill: string, _meadow: string, isDark: boolean): WallColors {
  return {
    left: isDark ? "#5a5a56" : "#8a8880",
    right: isDark ? "#70706c" : "#b0aea6",
    top: isDark ? "#7a7a76" : "#c8c6be",
    trim: isDark ? "#4a4a48" : "#6a6862",
    shadow: isDark ? "#000000" : "#1a1612",
  };
}

export default function IsoWallRing({ width, height, wallLevel, colors }: Props) {
  if (wallLevel <= 0) return null;

  const segmentCount = Math.min(
    WALL_RING.length,
    wallLevel <= 2 ? 4 : wallLevel <= 5 ? 8 : wallLevel <= 8 ? 12 : WALL_RING.length,
  );
  const rise = 5 + Math.min(wallLevel, 10) * 1.2;
  const w = 20 + Math.floor(wallLevel / 4) * 2;
  const h = 10 + Math.floor(wallLevel / 6);

  const indices: number[] = [];
  if (segmentCount >= WALL_RING.length) {
    for (let i = 0; i < WALL_RING.length; i++) indices.push(i);
  } else if (segmentCount <= 4) {
    indices.push(0, 6, 9, 12);
  } else {
    const step = WALL_RING.length / segmentCount;
    for (let i = 0; i < segmentCount; i++) indices.push(Math.floor(i * step));
  }

  const sorted = [...indices].sort((a, b) => WALL_RING[a].y - WALL_RING[b].y);

  return (
    <Svg width={width} height={height} style={{ position: "absolute", left: 0, top: 0 }} pointerEvents="none">
      {sorted.map((idx) => {
        const seg = WALL_RING[idx];
        if (seg.gate && wallLevel < 8) return null;
        const cx = width * seg.x;
        const cy = height * seg.y;
        const isCorner = idx === 0 || idx === 6 || idx === 9 || idx === 12;
        return (
          <WallBlock
            key={idx}
            cx={cx}
            cy={cy}
            w={isCorner ? w + 4 : w}
            h={h}
            rise={isCorner ? rise + 4 : rise}
            colors={colors}
            corner={isCorner && wallLevel >= 3}
          />
        );
      })}
    </Svg>
  );
}
