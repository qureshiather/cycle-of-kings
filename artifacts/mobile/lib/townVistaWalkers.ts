/** Lightweight pedestrian simulation for Town Vista. */

export type WalkPoint = { x: number; y: number };

/** Paths on the settlement plateau (normalized 0–1). */
export const WALK_LOOPS: WalkPoint[][] = [
  [
    { x: 0.4, y: 0.66 },
    { x: 0.5, y: 0.62 },
    { x: 0.6, y: 0.66 },
    { x: 0.58, y: 0.72 },
    { x: 0.42, y: 0.72 },
  ],
  [
    { x: 0.32, y: 0.64 },
    { x: 0.4, y: 0.6 },
    { x: 0.46, y: 0.64 },
    { x: 0.44, y: 0.7 },
  ],
  [
    { x: 0.54, y: 0.6 },
    { x: 0.64, y: 0.64 },
    { x: 0.66, y: 0.72 },
    { x: 0.56, y: 0.74 },
  ],
  [
    { x: 0.46, y: 0.68 },
    { x: 0.52, y: 0.74 },
    { x: 0.5, y: 0.78 },
    { x: 0.44, y: 0.76 },
  ],
];

export function pointOnLoop(waypoints: WalkPoint[], t: number): WalkPoint {
  const n = waypoints.length;
  if (n === 0) return { x: 0.5, y: 0.66 };
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
  populationCap: number;
  totalTroops: number;
  builtStructures: number;
}): number {
  const { economyScore, populationCap, totalTroops, builtStructures } = input;
  const raw =
    2 +
    Math.floor(builtStructures / 2) +
    Math.floor(economyScore / 25) +
    Math.floor(populationCap / 20) +
    Math.floor(totalTroops / 30);
  return Math.max(2, Math.min(10, raw));
}

export function getWalkerDurationMs(economyScore: number): number {
  return Math.max(9000, 16000 - economyScore * 40);
}
