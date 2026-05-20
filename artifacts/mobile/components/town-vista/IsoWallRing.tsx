import React from "react";
import Svg, { G, Path, Rect } from "react-native-svg";
import { isoBox, isoDiamond } from "@/lib/isoPrimitives";

export type WallColors = {
  left: string;
  right: string;
  top: string;
  trim: string;
  shadow: string;
  outline: string;
};

/** Perimeter anchors (normalized); gate at south. */
const WALL_RING: { x: number; y: number; gate?: boolean }[] = [
  { x: 0.14, y: 0.44 },
  { x: 0.26, y: 0.38 },
  { x: 0.38, y: 0.35 },
  { x: 0.5, y: 0.33 },
  { x: 0.62, y: 0.35 },
  { x: 0.74, y: 0.38 },
  { x: 0.86, y: 0.44 },
  { x: 0.92, y: 0.52 },
  { x: 0.9, y: 0.62 },
  { x: 0.8, y: 0.72 },
  { x: 0.66, y: 0.78 },
  { x: 0.5, y: 0.8, gate: true },
  { x: 0.34, y: 0.78 },
  { x: 0.2, y: 0.72 },
  { x: 0.1, y: 0.62 },
  { x: 0.08, y: 0.52 },
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
  const crenelleW = corner ? 5 : 4;
  const crenelleCount = corner ? 4 : 3;

  return (
    <G>
      <Path d={p.shadow} fill={colors.shadow} opacity={0.35} />
      <Path d={p.left} fill={colors.left} stroke={colors.outline} strokeWidth={0.8} />
      <Path d={p.right} fill={colors.right} stroke={colors.outline} strokeWidth={0.8} />
      <Path d={p.top} fill={colors.top} stroke={colors.outline} strokeWidth={0.9} />
      {Array.from({ length: crenelleCount }).map((_, i) => {
        const ox = (i - (crenelleCount - 1) / 2) * (crenelleW + 2);
        return (
          <Rect
            key={i}
            x={cx + ox - crenelleW / 2}
            y={cy - h / 2 - rise - 4}
            width={crenelleW}
            height={5}
            fill={colors.trim}
            stroke={colors.outline}
            strokeWidth={0.4}
            rx={0.5}
          />
        );
      })}
      {corner && (
        <Path
          d={`M ${cx} ${cy - h / 2 - rise - 8} L ${cx + hw * 0.55} ${cy - rise - h / 2 - 2} L ${cx} ${cy - rise - h / 2 + 2} L ${cx - hw * 0.55} ${cy - rise - h / 2 - 2} Z`}
          fill={colors.trim}
          stroke={colors.outline}
          strokeWidth={0.5}
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
  landColor: string;
};

export function getWallColors(landColor: string, isDark: boolean): WallColors {
  if (isDark) {
    return {
      left: "#6a6a66",
      right: "#888884",
      top: "#9a9a96",
      trim: "#5a5a56",
      shadow: "#000000",
      outline: "#3a3a38",
    };
  }
  return {
    left: "#9a9690",
    right: "#c8c4bc",
    top: "#e8e4dc",
    trim: "#7a7670",
    shadow: "#1a1612",
    outline: "#5a5652",
  };
}

export default function IsoWallRing({ width, height, wallLevel, colors, landColor }: Props) {
  if (wallLevel <= 0) return null;

  const rise = 10 + Math.min(wallLevel, 10) * 2;
  const w = 26 + Math.floor(wallLevel / 3) * 3;
  const h = 12 + Math.floor(wallLevel / 5) * 2;

  const cornerIdx = [0, 6, 10, 14];
  const eligible = WALL_RING.map((_, i) => i).filter(
    (i) => !(WALL_RING[i].gate && wallLevel < 6),
  );

  let indices: number[];
  if (wallLevel <= 2) {
    indices = cornerIdx.filter((i) => i < WALL_RING.length);
  } else if (wallLevel <= 5) {
    indices = eligible.filter((i) => i % 2 === 0);
  } else {
    indices = eligible;
  }

  const sorted = [...indices].sort((a, b) => WALL_RING[a].y - WALL_RING[b].y);

  return (
    <Svg width={width} height={height} style={{ position: "absolute", left: 0, top: 0 }} pointerEvents="none">
      {sorted.map((idx) => {
        const seg = WALL_RING[idx];
        const cx = width * seg.x;
        const cy = height * seg.y;
        return (
          <Path
            key={`pad-${idx}`}
            d={isoDiamond(cx, cy, w + 10, h + 8)}
            fill={colors.top}
            fillOpacity={0.35}
            stroke={colors.outline}
            strokeWidth={0.5}
            strokeOpacity={0.5}
          />
        );
      })}

      {sorted.map((idx) => {
        const seg = WALL_RING[idx];
        const cx = width * seg.x;
        const cy = height * seg.y;
        const isCorner =
          idx === 0 || idx === 6 || idx === 10 || idx === 13 || idx === WALL_RING.length - 1;
        return (
          <WallBlock
            key={idx}
            cx={cx}
            cy={cy}
            w={isCorner ? w + 6 : w}
            h={h}
            rise={isCorner ? rise + 6 : rise}
            colors={colors}
            corner={isCorner}
          />
        );
      })}
    </Svg>
  );
}
