import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  ACHIEVEMENT_DEFINITIONS,
  getAchievementProgress,
  type TownAchievementSnapshot,
} from "@workspace/achievements";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";

type Props = {
  snapshot: TownAchievementSnapshot;
  unlockedThisCycle: Set<string>;
};

export default function CycleGoalsPanel({ snapshot, unlockedThisCycle }: Props) {
  const colors = useColors();
  const { withAlpha } = useTheme();

  const topGoals = useMemo(() => {
    const progress = getAchievementProgress(snapshot, unlockedThisCycle);
    const progressMap = new Map(progress.map((p) => [p.id, p]));

    return ACHIEVEMENT_DEFINITIONS.filter((a) => !unlockedThisCycle.has(a.id))
      .map((a) => ({
        def: a,
        progress: progressMap.get(a.id),
      }))
      .sort((a, b) => {
        const pa = a.progress?.percent ?? 0;
        const pb = b.progress?.percent ?? 0;
        return pb - pa;
      })
      .slice(0, 3);
  }, [snapshot, unlockedThisCycle]);

  if (topGoals.length === 0) {
    return (
      <View style={[styles.card, { backgroundColor: withAlpha(colors.gold, 0.08), borderColor: withAlpha(colors.gold, 0.3) }]}>
        <Text style={[styles.doneText, { color: colors.gold }]}>All cycle trophies earned — great work!</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {topGoals.map(({ def, progress }) => {
        const pct = progress?.percent ?? 0;
        return (
          <View key={def.id} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialCommunityIcons name={def.icon as any} size={18} color={colors.gold} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.title, { color: colors.foreground }]}>{def.title}</Text>
              {progress?.hint ? (
                <Text style={[styles.hint, { color: colors.textSecondary }]}>{progress.hint}</Text>
              ) : (
                <Text style={[styles.hint, { color: colors.textSecondary }]} numberOfLines={2}>
                  {def.description}
                </Text>
              )}
              <View style={[styles.track, { backgroundColor: colors.border }]}>
                <View style={[styles.fill, { width: `${pct}%`, backgroundColor: colors.gold }]} />
              </View>
            </View>
            <Text style={[styles.pct, { color: colors.textMuted }]}>{pct}%</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  card: { padding: 12, borderRadius: 10, borderWidth: 1 },
  doneText: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  title: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  hint: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },
  track: { height: 4, borderRadius: 2, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 2 },
  pct: { fontSize: 11, fontFamily: "Inter_600SemiBold", minWidth: 32, textAlign: "right" },
});
