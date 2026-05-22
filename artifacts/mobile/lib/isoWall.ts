/** Perimeter wall geometry for Town Vista. */

import { VISTA_HORIZON } from "@/lib/townVista";

export type NormPoint = { x: number; y: number; gate?: boolean; corner?: boolean };

/** Wall ring on the settlement plateau — wraps VISTA_LAYOUT cluster. */
export const WALL_PERIMETER: NormPoint[] = [
  { x: 0.14, y: 0.58, corner: true },
  { x: 0.32, y: 0.52 },
  { x: 0.5, y: 0.5 },
  { x: 0.68, y: 0.52 },
  { x: 0.86, y: 0.58, corner: true },
  { x: 0.9, y: 0.68 },
  { x: 0.78, y: 0.82 },
  { x: 0.58, y: 0.86 },
  { x: 0.5, y: 0.87, gate: true },
  { x: 0.42, y: 0.86 },
  { x: 0.22, y: 0.82 },
  { x: 0.1, y: 0.68, corner: true },
];

export type WallTier = 1 | 2 | 3 | 4;

export type WallTierStyle = {
  tier: WallTier;
  rise: number;
  merlonW: number;
  merlonH: number;
  towerW: number;
  towerRise: number;
  ringInset: number;
  merlonSpacing: number;
  merlonOverlap: number;
  curtainThickness: number;
  parapetRows: number;
};

export function getWallTier(wallLevel: number): WallTier {
  if (wallLevel <= 2) return 1;
  if (wallLevel <= 5) return 2;
  if (wallLevel <= 8) return 3;
  return 4;
}

export function getWallTierStyle(wallLevel: number): WallTierStyle {
  const tier = getWallTier(wallLevel);
  const bump = Math.min(wallLevel, 10) * 0.15;
  switch (tier) {
    case 1:
      return {
        tier: 1,
        rise: 7 + bump,
        merlonW: 14,
        merlonH: 7,
        towerW: 28,
        towerRise: 14 + bump,
        ringInset: 0.052,
        merlonSpacing: 11,
        merlonOverlap: 0.42,
        curtainThickness: 18,
        parapetRows: 1,
      };
    case 2:
      return {
        tier: 2,
        rise: 10 + bump,
        merlonW: 16,
        merlonH: 8,
        towerW: 32,
        towerRise: 18 + bump,
        ringInset: 0.058,
        merlonSpacing: 10,
        merlonOverlap: 0.4,
        curtainThickness: 20,
        parapetRows: 1,
      };
    case 3:
      return {
        tier: 3,
        rise: 13 + bump,
        merlonW: 18,
        merlonH: 9,
        towerW: 36,
        towerRise: 22 + bump,
        ringInset: 0.064,
        merlonSpacing: 9,
        merlonOverlap: 0.38,
        curtainThickness: 22,
        parapetRows: 2,
      };
    case 4:
      return {
        tier: 4,
        rise: 16 + bump,
        merlonW: 20,
        merlonH: 10,
        towerW: 40,
        towerRise: 26 + bump,
        ringInset: 0.07,
        merlonSpacing: 8,
        merlonOverlap: 0.36,
        curtainThickness: 24,
        parapetRows: 2,
      };
  }
}

export type ActivePerimeter = {
  points: NormPoint[];
  gateOpen: boolean;
  /** Index in `points` after which the stroke must break (open gateway). */
  gapAfter: number;
};

export function getActivePerimeter(wallLevel: number): ActivePerimeter {
  const gateOpen = wallLevel < 7;
  const gateIdx = WALL_PERIMETER.findIndex((p) => p.gate);
  if (!gateOpen || gateIdx < 0) {
    return { points: [...WALL_PERIMETER], gateOpen: false, gapAfter: -1 };
  }
  const points = WALL_PERIMETER.filter((p) => !p.gate);
  return { points, gateOpen: true, gapAfter: gateIdx - 1 };
}

/** One or two open polylines; splits at gateway so we never draw across the gate. */
export function perimeterPolylinePaths(
  points: NormPoint[],
  width: number,
  height: number,
  gapAfter: number,
): string[] {
  const chain = (subset: NormPoint[]) => {
    if (subset.length < 2) return "";
    const coords = subset.map((p) => {
      const s = toScreen(p, width, height);
      return `${s.x} ${s.y}`;
    });
    return `M ${coords.join(" L ")}`;
  };

  if (gapAfter < 0 || gapAfter >= points.length - 1) {
    const d = chain(points);
    return d ? [`${d} Z`] : [];
  }

  const left = chain(points.slice(0, gapAfter + 1));
  const right = chain([...points.slice(gapAfter + 1), points[0]]);
  return [left, right].filter(Boolean);
}

export function toScreen(p: NormPoint, width: number, height: number) {
  return { x: width * p.x, y: height * p.y };
}

/** Keep isometric extrusion below the sky/land horizon. */
export function clampWallRise(
  anchorY: number,
  footprintH: number,
  rise: number,
  canvasHeight: number,
  pad = 4,
): number {
  const horizon = canvasHeight * VISTA_HORIZON;
  const hh = footprintH / 2;
  const maxRise = anchorY - hh - horizon - pad;
  if (maxRise < 3) return Math.min(rise, 3);
  return Math.min(rise, maxRise);
}

export function insetPoint(
  p: NormPoint,
  width: number,
  height: number,
  inset: number,
  center = { x: 0.5, y: 0.55 },
): { x: number; y: number } {
  const sx = width * p.x;
  const sy = height * p.y;
  const cx = width * center.x;
  const cy = height * center.y;
  return {
    x: sx + (cx - sx) * inset,
    y: sy + (cy - sy) * inset,
  };
}

export function perimeterRingPath(
  points: NormPoint[],
  width: number,
  height: number,
  inset: number,
): string {
  if (points.length < 3) return "";
  const outer = points.map((p) => {
    const s = toScreen(p, width, height);
    return `${s.x} ${s.y}`;
  });
  const inner = [...points]
    .reverse()
    .map((p) => {
      const innerPt = insetPoint(p, width, height, inset);
      return `${innerPt.x} ${innerPt.y}`;
    });
  return `M ${outer.join(" L ")} L ${inner.join(" L ")} Z`;
}

/** Open path along the outer wall edge (for rim highlight). */
export function perimeterOuterOpenPath(
  points: NormPoint[],
  width: number,
  height: number,
): string {
  if (points.length < 2) return "";
  const outer = points.map((p) => {
    const s = toScreen(p, width, height);
    return `${s.x} ${s.y}`;
  });
  return `M ${outer.join(" L ")} Z`;
}

const WALL_INTERIOR = { x: 0.5, y: 0.55 };

/** Outward normal from perimeter toward exterior (away from town). */
export function outwardNormal(
  a: { x: number; y: number },
  b: { x: number; y: number },
  width: number,
  height: number,
): { nx: number; ny: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return { nx: 0, ny: -1 };
  let px = -dy / len;
  let py = dx / len;
  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;
  const interior = { x: width * WALL_INTERIOR.x, y: height * WALL_INTERIOR.y };
  const towardInX = interior.x - midX;
  const towardInY = interior.y - midY;
  if (px * towardInX + py * towardInY > 0) {
    px = -px;
    py = -py;
  }
  return { nx: px, ny: py };
}

/** Sample points on the outer perimeter for crenellation ticks. */
export function sampleOuterPerimeter(
  points: NormPoint[],
  width: number,
  height: number,
  spacing: number,
): { x: number; y: number; nx: number; ny: number }[] {
  const screenPts = points.map((p) => toScreen(p, width, height));
  const out: { x: number; y: number; nx: number; ny: number }[] = [];
  for (let i = 0; i < screenPts.length; i++) {
    const a = screenPts[i];
    const b = screenPts[(i + 1) % screenPts.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) continue;
    const steps = Math.max(1, Math.floor(len / spacing));
    const { nx, ny } = outwardNormal(a, b, width, height);
    for (let j = 0; j < steps; j++) {
      const t = (j + 0.5) / steps;
      out.push({ x: a.x + dx * t, y: a.y + dy * t, nx, ny });
    }
  }
  return out;
}

/** Dense samples along edge including both endpoints (overlapping merlon spacing). */
export function edgeMerlonPositions(
  a: { x: number; y: number },
  b: { x: number; y: number },
  spacing: number,
): { x: number; y: number }[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return [{ x: a.x, y: a.y }];
  const steps = Math.max(1, Math.ceil(len / spacing));
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    out.push({ x: a.x + dx * t, y: a.y + dy * t });
  }
  return out;
}

/** Extend segment past endpoints so curtains overlap at corners. */
export function extendEdge(
  a: { x: number; y: number },
  b: { x: number; y: number },
  extend: number,
): { a: { x: number; y: number }; b: { x: number; y: number } } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return { a, b };
  const ux = dx / len;
  const uy = dy / len;
  return {
    a: { x: a.x - ux * extend, y: a.y - uy * extend },
    b: { x: b.x + ux * extend, y: b.y + uy * extend },
  };
}

function edgeOffsetDir(
  a: { x: number; y: number },
  b: { x: number; y: number },
  width: number,
  height: number,
): { px: number; py: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return { px: 0, py: 1 };
  let px = -dy / len;
  let py = dx / len;
  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;
  const interior = { x: width * WALL_INTERIOR.x, y: height * WALL_INTERIOR.y };
  const towardInX = interior.x - midX;
  const towardInY = interior.y - midY;
  if (px * towardInX + py * towardInY < 0) {
    px = -px;
    py = -py;
  }
  return { px, py };
}

/** Outer lip point on a wall edge vertex (exterior face). */
export function edgeOuterLip(
  a: { x: number; y: number },
  b: { x: number; y: number },
  at: "a" | "b",
  thickness: number,
  width: number,
  height: number,
): { x: number; y: number } {
  const { px, py } = edgeOffsetDir(a, b, width, height);
  const lip = thickness * 0.22;
  const p = at === "a" ? a : b;
  return { x: p.x - px * lip, y: p.y - py * lip };
}

/** Filled band along wall edge, offset toward town interior (avoids sky on north side). */
export function edgeCurtainPath(
  a: { x: number; y: number },
  b: { x: number; y: number },
  thickness: number,
  width: number,
  height: number,
): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return "";
  const { px, py } = edgeOffsetDir(a, b, width, height);
  const lip = thickness * 0.22;
  return [
    `M ${a.x - px * lip} ${a.y - py * lip}`,
    `L ${b.x - px * lip} ${b.y - py * lip}`,
    `L ${b.x + px * thickness} ${b.y + py * thickness}`,
    `L ${a.x + px * thickness} ${a.y + py * thickness}`,
    "Z",
  ].join(" ");
}

/** Gate gap endpoints when south gate is open. */
export function getGatePosts(
  width: number,
  height: number,
): { left: { x: number; y: number }; right: { x: number; y: number } } | null {
  const gateIdx = WALL_PERIMETER.findIndex((p) => p.gate);
  if (gateIdx < 0) return null;
  const before = WALL_PERIMETER[(gateIdx - 1 + WALL_PERIMETER.length) % WALL_PERIMETER.length];
  const after = WALL_PERIMETER[(gateIdx + 1) % WALL_PERIMETER.length];
  return {
    left: toScreen(before, width, height),
    right: toScreen(after, width, height),
  };
}
