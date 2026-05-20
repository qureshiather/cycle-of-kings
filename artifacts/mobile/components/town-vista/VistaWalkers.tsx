import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  getWalkerCount,
  getWalkerDurationMs,
  pointOnLoop,
  WALK_LOOPS,
  type WalkPoint,
} from "@/lib/townVistaWalkers";

const TICK_MS = 250;
const BODY = ["#c4a878", "#8a7060", "#6a8a9a", "#9a7a5a", "#7a8a6a"] as const;

type Props = {
  width: number;
  height: number;
  economyScore: number;
  housingCapacity: number;
  totalTroops: number;
  builtStructures: number;
  isDark: boolean;
};

function WalkerDot({ x, y, color, isDark }: { x: number; y: number; color: string; isDark: boolean }) {
  return (
    <View
      style={[
        styles.walker,
        {
          left: x - 3,
          top: y - 7,
          zIndex: Math.round(y),
        },
      ]}
    >
      <View style={[styles.shadow, { backgroundColor: isDark ? "#00000044" : "#1a161218" }]} />
      <View style={[styles.head, { backgroundColor: color }]} />
      <View style={[styles.body, { backgroundColor: isDark ? "#3a3830" : "#5c5650" }]} />
    </View>
  );
}

export default function VistaWalkers({
  width,
  height,
  economyScore,
  housingCapacity,
  totalTroops,
  builtStructures,
  isDark,
}: Props) {
  const count = getWalkerCount({
    economyScore,
    housingCapacity,
    totalTroops,
    builtStructures,
  });
  const durationMs = getWalkerDurationMs(economyScore);

  const walkers = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        loop: WALK_LOOPS[i % WALK_LOOPS.length],
        phase: i / count,
        color: BODY[i % BODY.length],
      })),
    [count],
  );

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const t = (now % durationMs) / durationMs;

  return (
    <View style={[styles.layer, { width, height }]} pointerEvents="none">
      {walkers.map((w, i) => {
        const phase = (t + w.phase) % 1;
        const p: WalkPoint = pointOnLoop(w.loop, phase);
        return (
          <WalkerDot
            key={i}
            x={width * p.x}
            y={height * p.y}
            color={w.color}
            isDark={isDark}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: "absolute", left: 0, top: 0, zIndex: 180 },
  walker: { position: "absolute", width: 6, height: 10, alignItems: "center" },
  shadow: { position: "absolute", bottom: 0, width: 8, height: 3, borderRadius: 999 },
  head: { width: 5, height: 5, borderRadius: 3, marginBottom: 1 },
  body: { width: 4, height: 5, borderRadius: 1 },
});
