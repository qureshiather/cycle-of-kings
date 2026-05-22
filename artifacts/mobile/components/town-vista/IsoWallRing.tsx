import React, { useMemo } from "react";
import Svg, { ClipPath, Defs, G, Path } from "react-native-svg";
import { isoBox } from "@/lib/isoPrimitives";
import {
  clampWallRise,
  getActivePerimeter,
  getWallTierStyle,
  perimeterPolylinePaths,
  perimeterRingPath,
  toScreen,
} from "@/lib/isoWall";
import { getVistaLandClipPath } from "@/lib/townVista";

export type WallColors = {
  left: string;
  right: string;
  top: string;
  trim: string;
  shadow: string;
  outline: string;
  rampart: string;
  rampartDark: string;
  accent: string;
};

function CornerTower({
  cx,
  cy,
  w,
  rise,
  colors,
  tier,
  canvasHeight,
}: {
  cx: number;
  cy: number;
  w: number;
  rise: number;
  colors: WallColors;
  tier: number;
  canvasHeight: number;
}) {
  const h = 9 + tier * 1.5;
  const r = clampWallRise(cy, h, rise, canvasHeight);
  const p = isoBox(cx, cy, w, h, r);
  const hw = w / 2;
  return (
    <G>
      <Path
        d={`M ${cx - hw - 4} ${cy + 2} L ${cx + hw + 4} ${cy + 2} L ${cx + hw + 2} ${cy - 3} L ${cx - hw - 2} ${cy - 3} Z`}
        fill={colors.rampartDark}
        stroke={colors.outline}
        strokeWidth={0.45}
      />
      <Path d={p.shadow} fill={colors.shadow} opacity={0.3} />
      <Path d={p.left} fill={colors.left} stroke={colors.outline} strokeWidth={0.55} />
      <Path d={p.right} fill={colors.right} stroke={colors.outline} strokeWidth={0.55} />
      <Path d={p.top} fill={colors.top} stroke={colors.outline} strokeWidth={0.65} />
    </G>
  );
}

function RampartStroke({
  d,
  strokeOuter,
  strokeInner,
  colors,
}: {
  d: string;
  strokeOuter: number;
  strokeInner: number;
  colors: WallColors;
}) {
  const common = {
    fill: "none" as const,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <G>
      <Path
        d={d}
        {...common}
        stroke={colors.shadow}
        strokeWidth={strokeOuter + 3}
        opacity={0.28}
      />
      <Path d={d} {...common} stroke={colors.rampartDark} strokeWidth={strokeOuter} />
      <Path d={d} {...common} stroke={colors.rampart} strokeWidth={strokeInner} />
      <Path
        d={d}
        {...common}
        stroke={colors.top}
        strokeWidth={2}
        opacity={0.55}
      />
    </G>
  );
}

type Props = {
  width: number;
  height: number;
  wallLevel: number;
  colors: WallColors;
  depth?: "all" | "behind" | "front";
};

export function getWallColors(_landColor: string, isDark: boolean): WallColors {
  if (isDark) {
    return {
      left: "#5e5e5a",
      right: "#7e7e7a",
      top: "#9e9e98",
      trim: "#4a4a48",
      shadow: "#000000",
      outline: "#2e2e2c",
      rampart: "#5a5a56",
      rampartDark: "#3a3a38",
      accent: "#8a7a50",
    };
  }
  return {
    left: "#8a8580",
    right: "#b8b4ac",
    top: "#e8e4dc",
    trim: "#6a6660",
    shadow: "#1a1612",
    outline: "#5a5652",
    rampart: "#a8a39c",
    rampartDark: "#7a7570",
    accent: "#c4a040",
  };
}

export default function IsoWallRing({ width, height, wallLevel, colors, depth = "all" }: Props) {
  if (wallLevel <= 0) return null;
  if (depth === "front") return null;

  const { points, gateOpen, gapAfter } = getActivePerimeter(wallLevel);
  const style = getWallTierStyle(wallLevel);

  const content = useMemo(() => {
    const strokeOuter = 9 + style.tier * 2.5;
    const strokeInner = 5 + style.tier * 1.2;
    const polylines = perimeterPolylinePaths(points, width, height, gapAfter);
    const ringInset = style.ringInset * 2.4;
    const ringPath = gateOpen ? null : perimeterRingPath(points, width, height, ringInset);

    return (
      <>
        {ringPath ? (
          <G>
            <Path d={ringPath} fill={colors.rampartDark} opacity={0.22} stroke="none" />
            <Path
              d={ringPath}
              fill={colors.rampart}
              stroke={colors.outline}
              strokeWidth={1}
              fillOpacity={0.92}
            />
          </G>
        ) : null}
        {polylines.map((d, i) => (
          <RampartStroke
            key={`stroke-${i}`}
            d={d}
            strokeOuter={strokeOuter}
            strokeInner={strokeInner}
            colors={colors}
          />
        ))}
        {points.map((p, i) => {
          if (!p.corner) return null;
          const s = toScreen(p, width, height);
          return (
            <CornerTower
              key={`tower-${i}`}
              cx={s.x}
              cy={s.y}
              w={style.towerW * 0.88}
              rise={style.towerRise}
              colors={colors}
              tier={style.tier}
              canvasHeight={height}
            />
          );
        })}
      </>
    );
  }, [points, gateOpen, gapAfter, width, height, wallLevel, colors, style]);

  const wallClip = getVistaLandClipPath(width, height);
  const clipId = `vistaWallClip-${depth}`;

  return (
    <Svg width={width} height={height} style={{ position: "absolute", left: 0, top: 0 }} pointerEvents="none">
      <Defs>
        <ClipPath id={clipId}>
          <Path d={wallClip} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>{content}</G>
    </Svg>
  );
}
