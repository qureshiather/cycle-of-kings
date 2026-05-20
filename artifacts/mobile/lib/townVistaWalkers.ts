/** Lightweight pedestrian simulation for Town Vista. */

export type WalkPoint = { x: number; y: number };

/** Closed paths (normalized 0–1) around the settlement. */
export const WALK_LOOPS: WalkPoint[][] = [
  [
    { x: 0.38, y: 0.54 },
    { x: 0.5, y: 0.5 },
    { x: 0.62, y: 0.54 },
    { x: 0.58, y: 0.62 },
    { x: 0.42, y: 0.62 },
  ],
  [
    { x: 0.28, y: 0.5 },
    { x: 0.36, y: 0.48 },
    { x: 0.44, y: 0.52 },
    { x: 0.4, y: 0.58 },
  ],
  [
    { x: 0.56, y: 0.48 },
    { x: 0.68, y: 0.5 },
    { x: 0.72, y: 0.58 },
    { x: 0.6, y: 0.6 },
  ],
  [
    { x: 0.45, y: 0.56 },
    { x: 0.52, y: 0.58 },
    { x: 0.55, y: 0.66 },
    { x: 0.48, y: 0.64 },
  ],
];

export function pointOnLoop(waypoints: WalkPoint[], t: number): WalkPoint {
  const n = waypoints.length;
  if (n === 0) return { x: 0.5, y: 0.5 };
  const wrapped = ((t % 1) + 1) % 1;
  const seg = wrapped * n;
  const i = Math.floor(seg) % n;
  const f = seg - Math.floor(seg);
  const a = waypoints[i];
  const b = waypoints[(i + 1) % n];
  return {
    x: a.x + (b.x - a.x) * f,
    y: a.y + (b.y - a.y) * f,
  };
}

export function getWalkerCount(input: {
  economyScore: number;
  housingCapacity: number;
  totalTroops: number;
  builtStructures: number;
}): number {
  const { economyScore, housingCapacity, totalTroops, builtStructures } = input;
  const raw =
    2 +
    Math.floor(builtStructures / 2) +
    Math.floor(economyScore / 25) +
    Math.floor(housingCapacity / 20) +
    Math.floor(totalTroops / 30);
  return Math.max(2, Math.min(10, raw));
}

export function getWalkerDurationMs(economyScore: number): number {
  return Math.max(9000, 16000 - economyScore * 40);
}
