import React, { useMemo } from "react";
import Svg, { ClipPath, Defs, G, Line, Path, Rect } from "react-native-svg";
import { isoBox } from "@/lib/isoPrimitives";
import {
  clampWallRise,
  edgeCurtainPath,
  edgeMerlonPositions,
  extendEdge,
  getActivePerimeter,
  getGatePosts,
  getWallTierStyle,
  perimeterRingPath,
  toScreen,
} from "@/lib/isoWall";
import { getVistaLandClipPath, VISTA_HORIZON } from "@/lib/townVista";

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

type ScreenPt = { x: number; y: number };

const LAYER_RING = 0;
const LAYER_CURTAIN = 1;
const LAYER_MERLON = 2;
const LAYER_TOWER = 3;
const LAYER_GATE = 3;

function WallMerlon({
  cx,
  cy,
  w,
  h,
  rise,
  colors,
  canvasHeight,
  row = 0,
}: {
  cx: number;
  cy: number;
  w: number;
  h: number;
  rise: number;
  colors: WallColors;
  canvasHeight: number;
  row?: number;
}) {
  const r = clampWallRise(cy, h, rise, canvasHeight);
  const p = isoBox(cx, cy, w, h, r);
  const rowOff = row * 3;
  return (
    <G>
      <Path d={p.shadow} fill={colors.shadow} opacity={0.28} />
      <Path d={p.left} fill={colors.left} stroke={colors.outline} strokeWidth={0.55} />
      <Path d={p.right} fill={colors.right} stroke={colors.outline} strokeWidth={0.55} />
      <Path d={p.top} fill={colors.top} stroke={colors.outline} strokeWidth={0.65} />
      <Rect
        x={cx - 2.5}
        y={cy - h / 2 - r - 4 - rowOff}
        width={5}
        height={3.5}
        fill={row === 0 ? colors.trim : colors.accent}
        rx={0.5}
      />
    </G>
  );
}

function EdgeCurtain({
  a,
  b,
  thickness,
  rise,
  colors,
  canvasWidth,
  canvasHeight,
}: {
  a: ScreenPt;
  b: ScreenPt;
  thickness: number;
  rise: number;
  colors: WallColors;
  canvasWidth: number;
  canvasHeight: number;
}) {
  const d = edgeCurtainPath(a, b, thickness, canvasWidth, canvasHeight);
  if (!d) return null;
  const anchorY = Math.min(a.y, b.y);
  const r = clampWallRise(anchorY, thickness, rise, canvasHeight, 6);
  const horizon = canvasHeight * VISTA_HORIZON;
  const cap = Math.min(8, thickness * 0.35);
  const topY = (pt: ScreenPt) => Math.max(horizon + 6, pt.y - r * 0.35);
  return (
    <G>
      <Path d={d} fill={colors.rampartDark} stroke={colors.outline} strokeWidth={0.9} />
      <Path
        d={edgeCurtainPath(a, b, thickness * 0.62, canvasWidth, canvasHeight)}
        fill={colors.rampart}
        opacity={0.5}
      />
      <Line
        x1={a.x}
        y1={topY(a)}
        x2={b.x}
        y2={topY(b)}
        stroke={colors.top}
        strokeWidth={cap}
        strokeLinecap="round"
        strokeOpacity={0.55}
      />
    </G>
  );
}

function CornerCap({
  cx,
  cy,
  size,
  rise,
  colors,
  canvasHeight,
}: {
  cx: number;
  cy: number;
  size: number;
  rise: number;
  colors: WallColors;
  canvasHeight: number;
}) {
  const fh = size * 0.55;
  const r = clampWallRise(cy, fh, rise * 0.55, canvasHeight);
  const p = isoBox(cx, cy, size, fh, r);
  return (
    <G>
      <Path d={p.left} fill={colors.left} />
      <Path d={p.right} fill={colors.right} />
      <Path d={p.top} fill={colors.top} stroke={colors.outline} strokeWidth={0.5} />
    </G>
  );
}

function CornerTower({
  cx,
  cy,
  w,
  rise,
  colors,
  tier,
  canvasHeight,
  prev,
  next,
}: {
  cx: number;
  cy: number;
  w: number;
  rise: number;
  colors: WallColors;
  tier: number;
  canvasHeight: number;
  prev?: ScreenPt;
  next?: ScreenPt;
}) {
  const h = 12 + tier * 2;
  const r = clampWallRise(cy, h, rise, canvasHeight);
  const p = isoBox(cx, cy, w, h, r);
  const horizon = canvasHeight * VISTA_HORIZON;
  const topY = Math.max(horizon + 4, cy - h / 2 - r);
  const hw = w / 2;
  const crenelleCount = 3 + tier;
  const wingLen = hw + 10;

  const wingAlong = (toward: ScreenPt | undefined) => {
    if (!toward) return null;
    const dx = toward.x - cx;
    const dy = toward.y - cy;
    const len = Math.hypot(dx, dy) || 1;
    const ux = (dx / len) * wingLen;
    const uy = (dy / len) * wingLen;
    return (
      <Path
        d={`M ${cx} ${cy} L ${cx + ux} ${cy + uy} L ${cx + ux * 0.85} ${cy + uy * 0.85 - 6} L ${cx} ${cy - 5} Z`}
        fill={colors.rampartDark}
        opacity={0.9}
      />
    );
  };

  return (
    <G>
      {wingAlong(prev)}
      {wingAlong(next)}
      <Path
        d={`M ${cx - hw - 6} ${cy + 3} L ${cx + hw + 6} ${cy + 3} L ${cx + hw + 4} ${cy - 5} L ${cx - hw - 4} ${cy - 5} Z`}
        fill={colors.rampart}
        stroke={colors.outline}
        strokeWidth={0.6}
      />
      <Path d={p.shadow} fill={colors.shadow} opacity={0.4} />
      <Path d={p.left} fill={colors.left} stroke={colors.outline} strokeWidth={0.75} />
      <Path d={p.right} fill={colors.right} stroke={colors.outline} strokeWidth={0.75} />
      <Path d={p.top} fill={colors.top} stroke={colors.outline} strokeWidth={0.85} />
      {Array.from({ length: crenelleCount }).map((_, i) => {
        const ox = (i - (crenelleCount - 1) / 2) * 5;
        return (
          <Rect
            key={i}
            x={cx + ox - 2}
            y={topY - 6}
            width={4}
            height={5}
            fill={colors.trim}
            stroke={colors.outline}
            strokeWidth={0.35}
            rx={0.5}
          />
        );
      })}
      {tier >= 3 && r > 8 && (
        <Line
          x1={cx}
          y1={topY - 6}
          x2={cx}
          y2={Math.max(horizon + 2, topY - 10)}
          stroke={colors.accent}
          strokeWidth={1.5}
        />
      )}
      {tier >= 4 && r > 10 && (
        <Path
          d={`M ${cx - 4} ${topY - 8} L ${cx} ${Math.max(horizon, topY - 12)} L ${cx + 4} ${topY - 8} Z`}
          fill={colors.accent}
          opacity={0.9}
        />
      )}
    </G>
  );
}

function GatePosts({
  left,
  right,
  rise,
  colors,
  style,
  canvasWidth,
  canvasHeight,
}: {
  left: ScreenPt;
  right: ScreenPt;
  rise: number;
  colors: WallColors;
  style: ReturnType<typeof getWallTierStyle>;
  canvasWidth: number;
  canvasHeight: number;
}) {
  return (
    <G>
      <EdgeCurtain
        a={left}
        b={right}
        thickness={style.curtainThickness + 4}
        rise={rise}
        colors={colors}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
      />
      <WallMerlon
        cx={left.x}
        cy={left.y}
        w={style.merlonW + 4}
        h={style.merlonH + 2}
        rise={rise + 6}
        colors={colors}
        canvasHeight={canvasHeight}
      />
      <WallMerlon
        cx={right.x}
        cy={right.y}
        w={style.merlonW + 4}
        h={style.merlonH + 2}
        rise={rise + 6}
        colors={colors}
        canvasHeight={canvasHeight}
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
      rampart: "#4a4a46",
      rampartDark: "#363634",
      accent: "#8a7a50",
    };
  }
  return {
    left: "#8a8580",
    right: "#b8b4ac",
    top: "#dcd8d0",
    trim: "#6a6660",
    shadow: "#1a1612",
    outline: "#4a4642",
    rampart: "#9a9590",
    rampartDark: "#7a7570",
    accent: "#c4a040",
  };
}

type DrawItem = { y: number; layer: number; el: React.ReactNode };

function pushItem(items: DrawItem[], y: number, layer: number, el: React.ReactNode) {
  items.push({ y, layer, el });
}

export default function IsoWallRing({ width, height, wallLevel, colors, depth = "all" }: Props) {
  const { points, gateOpen } = getActivePerimeter(wallLevel);
  const style = getWallTierStyle(wallLevel);

  const drawItems = useMemo(() => {
    const items: DrawItem[] = [];
    const screenPts = points.map((p) => toScreen(p, width, height));
    const merlonStep = style.merlonW * style.merlonOverlap;

    pushItem(
      items,
      height * 0.5,
      LAYER_RING,
      <Path
        key="ring"
        d={perimeterRingPath(points, width, height, style.ringInset)}
        fill={colors.rampart}
        stroke={colors.outline}
        strokeWidth={1.4}
        fillOpacity={0.95}
      />,
    );

    pushItem(
      items,
      height * 0.51,
      LAYER_RING,
      <Path
        key="lip"
        d={perimeterRingPath(points, width, height, style.ringInset * 0.55)}
        fill="none"
        stroke={colors.top}
        strokeWidth={1}
        strokeOpacity={0.55}
      />,
    );

    const cornerExtend = style.towerW * 0.22;
    const minLandY = height * VISTA_HORIZON + 6;
    const clampLand = (p: ScreenPt): ScreenPt => ({ x: p.x, y: Math.max(p.y, minLandY) });

    for (let i = 0; i < screenPts.length; i++) {
      const a = screenPts[i];
      const b = screenPts[(i + 1) % screenPts.length];
      const seg = extendEdge(a, b, cornerExtend);
      const segLand = { a: clampLand(seg.a), b: clampLand(seg.b) };
      const midY = (segLand.a.y + segLand.b.y) / 2;

      pushItem(
        items,
        midY,
        LAYER_CURTAIN,
        <EdgeCurtain
          key={`curtain-${i}`}
          a={segLand.a}
          b={segLand.b}
          thickness={style.curtainThickness}
          rise={style.rise}
          colors={colors}
          canvasWidth={width}
          canvasHeight={height}
        />,
      );

      if (style.tier >= 2) {
        const merlonStride = style.tier >= 4 ? 1 : style.tier >= 3 ? 2 : 3;
        const positions = edgeMerlonPositions(segLand.a, segLand.b, merlonStep);
        for (let j = 0; j < positions.length; j++) {
          if (j % merlonStride !== 0 && j !== 0 && j !== positions.length - 1) continue;
          const { x, y } = positions[j];
          for (let row = 0; row < style.parapetRows; row++) {
            pushItem(
              items,
              y - row,
              LAYER_MERLON,
              <WallMerlon
                key={`m-${i}-${j}-r${row}`}
                cx={x}
                cy={y}
                w={style.merlonW}
                h={style.merlonH}
                rise={style.rise * (row === 0 ? 0.9 : 0.7)}
                colors={colors}
                canvasHeight={height}
                row={row}
              />,
            );
          }
        }
      }
    }

    for (let i = 0; i < points.length; i++) {
      if (!points[i].corner) continue;
      const s = screenPts[i];
      const prev = screenPts[(i - 1 + screenPts.length) % screenPts.length];
      const next = screenPts[(i + 1) % screenPts.length];

      pushItem(
        items,
        s.y,
        LAYER_CURTAIN,
        <CornerCap
          key={`cap-${i}`}
          cx={s.x}
          cy={s.y}
          size={style.towerW * 0.95}
          rise={style.rise}
          colors={colors}
          canvasHeight={height}
        />,
      );

      pushItem(
        items,
        s.y,
        LAYER_TOWER,
        <CornerTower
          key={`tower-${i}`}
          cx={s.x}
          cy={s.y}
          w={style.towerW}
          rise={style.towerRise}
          colors={colors}
          tier={style.tier}
          canvasHeight={height}
          prev={prev}
          next={next}
        />,
      );
    }

    if (gateOpen) {
      const gate = getGatePosts(width, height);
      if (gate) {
        pushItem(
          items,
          (gate.left.y + gate.right.y) / 2,
          LAYER_GATE,
          <GatePosts
            key="gate"
            left={gate.left}
            right={gate.right}
            rise={style.rise}
            colors={colors}
            style={style}
            canvasWidth={width}
            canvasHeight={height}
          />,
        );
      }
    }

    return items.sort((a, b) => a.y - b.y || a.layer - b.layer);
  }, [points, gateOpen, width, height, wallLevel, colors, style]);

  if (wallLevel <= 0) return null;

  const ySplit = height * 0.57;
  /** Overlap both layers near the split so corners/curtains are not cut in half. */
  const splitOverlap = Math.max(28, height * 0.08);
  const filtered =
    depth === "behind"
      ? drawItems.filter((d) => d.y < ySplit + splitOverlap)
      : depth === "front"
        ? drawItems.filter((d) => d.y >= ySplit - splitOverlap)
        : drawItems;

  if (filtered.length === 0) return null;

  const landClip = getVistaLandClipPath(width, height);
  const clipId = `vistaLandClip-${depth}`;

  return (
    <Svg width={width} height={height} style={{ position: "absolute", left: 0, top: 0 }} pointerEvents="none">
      <Defs>
        <ClipPath id={clipId}>
          <Path d={landClip} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        {filtered.map((item, i) => (
          <G key={i}>{item.el}</G>
        ))}
      </G>
    </Svg>
  );
}
