import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { GameState } from "@workspace/api-client-react";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ModalOverlay from "@/components/ui/ModalOverlay";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";
import {
  getActiveModifiers,
  getSeasonProgress,
  MS_PER_WEEK,
  SEASON_META,
  SEASON_MODIFIERS,
  SEASON_ORDER,
  formatSeasonDate,
  type Season,
} from "@/lib/seasonMeta";

type SeasonCalendarModalProps = {
  visible: boolean;
  gameState: GameState;
  onClose: () => void;
};

function SeasonBonusPanel({
  selectedSeason,
  isLiveSeason,
}: {
  selectedSeason: Season;
  isLiveSeason: boolean;
}) {
  const colors = useColors();
  const { withAlpha } = useTheme();
  const meta = SEASON_META[selectedSeason];
  const seasonColor = colors[selectedSeason] as string;
  const mods = SEASON_MODIFIERS[selectedSeason];
  const activeMods = getActiveModifiers(mods);

  return (
    <View
      style={[
        styles.seasonCard,
        {
          backgroundColor: withAlpha(seasonColor, 0.08),
          borderColor: withAlpha(seasonColor, 0.45),
        },
      ]}
    >
      <View style={styles.seasonCardHeader}>
        <View style={[styles.seasonIcon, { backgroundColor: withAlpha(seasonColor, 0.15) }]}>
          <MaterialCommunityIcons name={meta.icon as any} size={20} color={seasonColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.seasonName, { color: seasonColor }]}>{meta.label}</Text>
          <Text style={[styles.seasonTagline, { color: colors.textSecondary }]}>{meta.tagline}</Text>
        </View>
        {isLiveSeason && (
          <View style={[styles.currentPill, { backgroundColor: withAlpha(seasonColor, 0.2) }]}>
            <Text style={[styles.currentPillText, { color: seasonColor }]}>Active</Text>
          </View>
        )}
      </View>
      <View style={styles.modRow}>
        {(["gold", "food", "wood", "stone"] as const).map((key) => {
          const value = mods[key];
          const resColor = colors[key === "gold" ? "gold" : key] as string;
          const isBoost = value > 1;
          const isPenalty = value < 1;
          return (
            <View
              key={key}
              style={[styles.modChip, { backgroundColor: colors.background, borderColor: colors.border }]}
            >
              <MaterialCommunityIcons
                name={
                  key === "gold"
                    ? "gold"
                    : key === "food"
                      ? "barley"
                      : key === "wood"
                        ? "tree"
                        : "cube-outline"
                }
                size={14}
                color={resColor}
              />
              <Text
                style={[
                  styles.modChipText,
                  {
                    color: isBoost ? colors.success : isPenalty ? colors.destructive : colors.textMuted,
                  },
                ]}
              >
                {value === 1
                  ? "—"
                  : `${Math.round((value - 1) * 100) > 0 ? "+" : ""}${Math.round((value - 1) * 100)}%`}
              </Text>
            </View>
          );
        })}
      </View>
      {activeMods.length > 0 ? (
        <Text style={[styles.modSummary, { color: colors.textSecondary }]}>
          {activeMods.map((m) => `${m.label} ${m.text}`).join(" · ")}
        </Text>
      ) : (
        <Text style={[styles.modSummary, { color: colors.textMuted }]}>No production modifiers this season.</Text>
      )}
    </View>
  );
}

export default function SeasonCalendarModal({
  visible,
  gameState,
  onClose,
}: SeasonCalendarModalProps) {
  const colors = useColors();
  const { withAlpha } = useTheme();
  const season = gameState.season as Season;
  const [selectedSeason, setSelectedSeason] = useState<Season>(season);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (visible) setSelectedSeason(season);
  }, [visible, season]);

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, [visible]);

  const { seasonIndex, progress, dayOfSeason, daysRemaining, seasonEnd } =
    getSeasonProgress(gameState.cycleStartedAt, season);

  const nextSeasonLabel =
    seasonIndex < SEASON_ORDER.length - 1
      ? SEASON_META[SEASON_ORDER[seasonIndex + 1]!].label
      : "cycle reset";

  const cycleStart = new Date(gameState.cycleStartedAt).getTime();
  const cycleEnd = new Date(gameState.nextWipeAt).getTime();
  const cycleProgress = Math.min(
    1,
    Math.max(0, (Date.now() - cycleStart) / (cycleEnd - cycleStart)),
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <ModalOverlay onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View
            style={[styles.sheet, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
          >
            <View style={styles.sheetHeader}>
              <View style={[styles.sheetIcon, { backgroundColor: withAlpha(colors.gold, 0.12) }]}>
                <MaterialCommunityIcons name="calendar-month" size={26} color={colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Season Calendar</Text>
                <Text style={[styles.sheetSub, { color: colors.textSecondary }]}>
                  Cycle {gameState.cycleNumber} · {gameState.seasonName}
                </Text>
              </View>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={[styles.currentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>THIS WEEK</Text>
                <Text style={[styles.currentTitle, { color: colors[season] }]}>
                  {SEASON_META[season].label} — Day {dayOfSeason} of 7
                </Text>
                <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.round(progress * 100)}%`, backgroundColor: colors[season] },
                    ]}
                  />
                </View>
                <Text style={[styles.currentMeta, { color: colors.textSecondary }]}>
                  {daysRemaining > 0
                    ? `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} until ${nextSeasonLabel}`
                    : "Season ending soon"}
                  {" · "}
                  Ends {formatSeasonDate(seasonEnd)}
                </Text>
              </View>

              {gameState.realmEventActive && gameState.realmEvent ? (
                <View style={[styles.currentCard, { backgroundColor: withAlpha(colors.raid, 0.08), borderColor: withAlpha(colors.raid, 0.35) }]}>
                  <Text style={[styles.sectionLabel, { color: colors.raid }]}>REALM EVENT</Text>
                  <Text style={[styles.currentTitle, { color: colors.foreground }]}>{gameState.realmEvent.title}</Text>
                  <Text style={[styles.currentMeta, { color: colors.textSecondary }]}>{gameState.realmEvent.flavor}</Text>
                  <Text style={[styles.currentMeta, { color: colors.textMuted }]}>
                    Ends {formatSeasonDate(new Date(gameState.realmEvent.endsAt).getTime())}
                  </Text>
                </View>
              ) : gameState.upcomingRealmEvent ? (
                <View style={[styles.currentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>UPCOMING</Text>
                  <Text style={[styles.currentTitle, { color: colors.foreground }]}>
                    {gameState.upcomingRealmEvent.title}
                  </Text>
                  <Text style={[styles.currentMeta, { color: colors.textSecondary }]}>
                    Starts {formatSeasonDate(new Date(gameState.upcomingRealmEvent.startsAt).getTime())}
                  </Text>
                </View>
              ) : null}

              {(gameState.cycleEventSchedule?.length ?? 0) > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 4 }]}>
                    EVENTS THIS CYCLE
                  </Text>
                  {gameState.cycleEventSchedule.slice(0, 8).map((ev) => {
                    const start = new Date(ev.startsAt).getTime();
                    const end = new Date(ev.endsAt).getTime();
                    const now = Date.now();
                    const live = now >= start && now < end;
                    return (
                      <View
                        key={`${ev.id}-${ev.startsAt}`}
                        style={[styles.eventRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      >
                        <Text style={[styles.eventTitle, { color: live ? colors.gold : colors.foreground }]}>
                          {ev.title}
                          {live ? " · Active" : ""}
                        </Text>
                        <Text style={[styles.eventMeta, { color: colors.textMuted }]} numberOfLines={1}>
                          {formatSeasonDate(start)} – {formatSeasonDate(end)}
                        </Text>
                      </View>
                    );
                  })}
                </>
              )}

              <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 4 }]}>
                CYCLE TIMELINE
              </Text>
              <Text style={[styles.timelineHint, { color: colors.textMuted }]}>
                Tap a week to view its production bonuses.
              </Text>

              <View style={[styles.cycleTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.cycleFill,
                    { width: `${Math.round(cycleProgress * 100)}%`, backgroundColor: withAlpha(colors.gold, 0.5) },
                  ]}
                />
              </View>

              <View style={styles.timelineRow}>
                {SEASON_ORDER.map((s, i) => {
                  const isCurrent = s === season;
                  const isPast = i < seasonIndex;
                  const isSelected = s === selectedSeason;
                  const seasonColor = colors[s] as string;
                  const weekStart = cycleStart + i * MS_PER_WEEK;
                  const meta = SEASON_META[s];

                  return (
                    <Pressable
                      key={s}
                      style={({ pressed }) => [
                        styles.timelineCol,
                        isSelected && {
                          backgroundColor: withAlpha(seasonColor, pressed ? 0.14 : 0.1),
                          borderRadius: 10,
                        },
                      ]}
                      onPress={() => setSelectedSeason(s)}
                      accessibilityRole="button"
                      accessibilityLabel={`${meta.label} week ${i + 1} bonuses`}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <View
                        style={[
                          styles.timelineNode,
                          {
                            backgroundColor: isSelected
                              ? withAlpha(seasonColor, 0.25)
                              : isCurrent
                                ? withAlpha(seasonColor, 0.2)
                                : isPast
                                  ? withAlpha(seasonColor, 0.08)
                                  : colors.surface,
                            borderColor: isSelected || isCurrent ? seasonColor : colors.border,
                            borderWidth: isSelected ? 2 : 1.5,
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={meta.icon as any}
                          size={16}
                          color={isSelected || isCurrent || isPast ? seasonColor : colors.textMuted}
                        />
                      </View>
                      <Text
                        style={[
                          styles.timelineLabel,
                          {
                            color: isSelected || isCurrent ? seasonColor : isPast ? colors.textSecondary : colors.textMuted,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {meta.label}
                      </Text>
                      <Text style={[styles.timelineWeek, { color: colors.textMuted }]}>Wk {i + 1}</Text>
                      {isCurrent && (
                        <View style={[styles.hereDot, { backgroundColor: seasonColor }]}>
                          <Text style={[styles.hereText, { color: colors.background }]}>NOW</Text>
                        </View>
                      )}
                      {isCurrent && (
                        <View style={[styles.weekProgress, { backgroundColor: colors.border }]}>
                          <View
                            style={[
                              styles.weekProgressFill,
                              { width: `${Math.round(progress * 100)}%`, backgroundColor: seasonColor },
                            ]}
                          />
                        </View>
                      )}
                      <Text style={[styles.timelineDates, { color: colors.textMuted }]} numberOfLines={1}>
                        {formatSeasonDate(weekStart)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={[styles.cycleFooter, { borderTopColor: colors.border }]}>
                <Text style={[styles.cycleFooterText, { color: colors.textSecondary }]}>
                  Cycle started {formatSeasonDate(cycleStart)}
                </Text>
                <Text style={[styles.cycleFooterText, { color: colors.gold }]}>
                  Kingdom wipe {formatSeasonDate(cycleEnd)}
                </Text>
              </View>
            </ScrollView>

            <View style={[styles.bonusSection, { borderTopColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SEASON BONUSES</Text>
              <SeasonBonusPanel selectedSeason={selectedSeason} isLiveSeason={selectedSeason === season} />
            </View>
          </View>
        </TouchableOpacity>
      </ModalOverlay>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderWidth: 1,
    maxHeight: "88%",
  },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  sheetIcon: { width: 48, height: 48, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sheetTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  sheetSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  scroll: { flexShrink: 1 },
  scrollContent: { gap: 8, paddingBottom: 4 },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  timelineHint: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16, marginBottom: 4 },
  currentCard: { padding: 12, borderRadius: 12, borderWidth: 1, gap: 8 },
  currentTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  currentMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  eventRow: { padding: 10, borderRadius: 8, borderWidth: 1, gap: 4 },
  eventTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  eventMeta: { fontSize: 10, fontFamily: "Inter_400Regular" },
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  cycleTrack: { height: 4, borderRadius: 2, overflow: "hidden", marginBottom: 10 },
  cycleFill: { height: "100%", borderRadius: 2 },
  timelineRow: { flexDirection: "row", gap: 2 },
  timelineCol: { flex: 1, alignItems: "center", gap: 3, minHeight: 72, paddingVertical: 4, paddingHorizontal: 2 },
  timelineNode: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  timelineWeek: { fontSize: 9, fontFamily: "Inter_400Regular" },
  timelineDates: { fontSize: 8, fontFamily: "Inter_400Regular", textAlign: "center" },
  hereDot: { borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  hereText: { fontSize: 7, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  weekProgress: { width: "100%", height: 3, borderRadius: 2, overflow: "hidden" },
  weekProgressFill: { height: "100%", borderRadius: 2 },
  cycleFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 4,
  },
  cycleFooterText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  bonusSection: { borderTopWidth: 1, paddingTop: 12, marginTop: 8, gap: 8 },
  seasonCard: { padding: 12, borderRadius: 12, borderWidth: 1, gap: 10 },
  seasonCardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  seasonIcon: { width: 40, height: 40, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  seasonName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  seasonTagline: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  currentPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  currentPillText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  modRow: { flexDirection: "row", gap: 6 },
  modChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  modChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  modSummary: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
});
