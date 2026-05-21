import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  ACHIEVEMENT_DEFINITIONS,
  ACHIEVEMENT_BY_ID,
  type AchievementId,
} from "@workspace/achievements";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useGetGameState, useGetPlayer, useGetPlayerTrophies } from "@workspace/api-client-react";
import type { Trophy } from "@workspace/api-client-react";
import ModalOverlay from "@/components/ui/ModalOverlay";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";
import { useGame } from "@/context/GameContext";

const SHEET_MAX_HEIGHT = Dimensions.get("window").height * 0.88;

type Props = {
  visible: boolean;
  onClose: () => void;
};

function cyclePoints(trophies: Trophy[]): number {
  return trophies.reduce((sum, t) => {
    const def = ACHIEVEMENT_BY_ID[t.type as AchievementId];
    return sum + (def?.points ?? 0);
  }, 0);
}

export default function AchievementsModal({ visible, onClose }: Props) {
  const colors = useColors();
  const { withAlpha } = useTheme();
  const { playerId } = useGame();

  const { data: gameState } = useGetGameState({
    query: { enabled: visible, staleTime: 300_000 } as any,
  });
  const currentCycle = gameState?.cycleNumber ?? 0;

  const { data: player } = useGetPlayer(playerId ?? 0, {
    query: { enabled: visible && !!playerId, staleTime: 30_000 } as any,
  });
  const { data: trophies = [], isLoading } = useGetPlayerTrophies(playerId ?? 0, {
    query: { enabled: visible && !!playerId, staleTime: 0, refetchOnMount: true } as any,
  });

  const currentCycleTrophies = useMemo(
    () => trophies.filter((t) => t.cycleNumber === currentCycle),
    [trophies, currentCycle],
  );
  const currentUnlocked = useMemo(
    () => new Set(currentCycleTrophies.map((t) => t.type)),
    [currentCycleTrophies],
  );
  const currentCount = ACHIEVEMENT_DEFINITIONS.filter((a) => currentUnlocked.has(a.id)).length;
  const currentCyclePoints = cyclePoints(currentCycleTrophies);

  const pastCycles = useMemo(() => {
    const byCycle = new Map<number, Trophy[]>();
    for (const t of trophies) {
      if (t.cycleNumber === currentCycle) continue;
      const list = byCycle.get(t.cycleNumber) ?? [];
      list.push(t);
      byCycle.set(t.cycleNumber, list);
    }
    return [...byCycle.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([cycle, list]) => ({
        cycle,
        trophies: list,
        count: list.length,
        points: cyclePoints(list),
      }));
  }, [trophies, currentCycle]);

  const lifetimePoints = player?.trophyPoints ?? trophies.reduce((s, t) => {
    const def = ACHIEVEMENT_BY_ID[t.type as AchievementId];
    return s + (def?.points ?? 0);
  }, 0);

  if (!playerId) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <ModalOverlay onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: withAlpha(colors.gold, 0.12) }]}>
              <MaterialCommunityIcons name="trophy" size={22} color={colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.foreground }]}>Achievements</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Cycle {currentCycle}: {currentCount}/{ACHIEVEMENT_DEFINITIONS.length} · {lifetimePoints} lifetime pts
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close achievements">
              <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <Text style={[styles.note, { color: colors.textSecondary, borderColor: colors.border }]}>
            Progress resets each cycle — earn them again after a wipe. Past cycles stay in your hall of fame below.
          </Text>

          {isLoading ? (
            <ActivityIndicator color={colors.gold} style={styles.loader} />
          ) : (
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <Text style={[styles.sectionLabel, { color: colors.gold }]}>
                THIS CYCLE ({currentCyclePoints} pts)
              </Text>
              {ACHIEVEMENT_DEFINITIONS.map((def) => {
                const unlocked = currentUnlocked.has(def.id);
                const trophy = currentCycleTrophies.find((t) => t.type === def.id);
                return (
                  <AchievementRow
                    key={def.id}
                    def={def}
                    unlocked={unlocked}
                    trophy={trophy}
                    colors={colors}
                    withAlpha={withAlpha}
                  />
                );
              })}

              {pastCycles.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 12 }]}>
                    PAST CYCLES
                  </Text>
                  {pastCycles.map(({ cycle, trophies: past, count, points }) => (
                    <View
                      key={cycle}
                      style={[styles.pastCycleCard, { backgroundColor: colors.background, borderColor: colors.border }]}
                    >
                      <View style={styles.pastCycleHeader}>
                        <Text style={[styles.pastCycleTitle, { color: colors.foreground }]}>Cycle {cycle}</Text>
                        <Text style={[styles.pastCycleMeta, { color: colors.textSecondary }]}>
                          {count}/{ACHIEVEMENT_DEFINITIONS.length} · {points} pts
                        </Text>
                      </View>
                      <View style={styles.pastChipRow}>
                        {past.map((t) => {
                          const def = ACHIEVEMENT_BY_ID[t.type as AchievementId];
                          if (!def) return null;
                          return (
                            <View
                              key={t.id}
                              style={[styles.pastChip, { backgroundColor: withAlpha(colors.gold, 0.12), borderColor: withAlpha(colors.gold, 0.3) }]}
                            >
                              <MaterialCommunityIcons name={def.icon as any} size={12} color={colors.gold} />
                              <Text style={[styles.pastChipText, { color: colors.foreground }]} numberOfLines={1}>
                                {def.title}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          )}
        </View>
      </ModalOverlay>
    </Modal>
  );
}

function AchievementRow({
  def,
  unlocked,
  trophy,
  colors,
  withAlpha,
}: {
  def: (typeof ACHIEVEMENT_DEFINITIONS)[number];
  unlocked: boolean;
  trophy?: Trophy;
  colors: ReturnType<typeof useColors>;
  withAlpha: (color: string, alpha: number) => string;
}) {
  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: unlocked ? withAlpha(colors.gold, 0.08) : colors.background,
          borderColor: unlocked ? withAlpha(colors.gold, 0.35) : colors.border,
          opacity: unlocked ? 1 : 0.75,
        },
      ]}
    >
      <View
        style={[
          styles.iconBox,
          { backgroundColor: unlocked ? withAlpha(colors.gold, 0.2) : withAlpha(colors.textMuted, 0.12) },
        ]}
      >
        <MaterialCommunityIcons
          name={(unlocked ? def.icon : "lock") as any}
          size={20}
          color={unlocked ? colors.gold : colors.textMuted}
        />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: colors.foreground }]}>{def.title}</Text>
        <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>{def.description}</Text>
        {unlocked && trophy?.earnedAt && (
          <Text style={[styles.rowMeta, { color: colors.gold }]}>
            Unlocked {new Date(trophy.earnedAt).toLocaleDateString()}
          </Text>
        )}
      </View>
      <Text style={[styles.rowPoints, { color: unlocked ? colors.gold : colors.textMuted }]}>+{def.points}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    maxHeight: SHEET_MAX_HEIGHT,
    paddingBottom: 28,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, paddingBottom: 8 },
  headerIcon: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  note: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
    marginHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  loader: { paddingVertical: 32 },
  scroll: { flexGrow: 0 },
  scrollContent: { padding: 16, paddingTop: 12, gap: 8, paddingBottom: 24 },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.8, marginBottom: 2 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowBody: { flex: 1, gap: 3 },
  rowTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  rowDesc: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },
  rowMeta: { fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 2 },
  rowPoints: { fontSize: 12, fontFamily: "Inter_700Bold" },
  pastCycleCard: { borderRadius: 10, borderWidth: 1, padding: 12, gap: 8 },
  pastCycleHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  pastCycleTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  pastCycleMeta: { fontSize: 11, fontFamily: "Inter_500Medium" },
  pastChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pastChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    maxWidth: "100%",
  },
  pastChipText: { fontSize: 10, fontFamily: "Inter_600SemiBold", flexShrink: 1 },
});
