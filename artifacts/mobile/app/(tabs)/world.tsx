import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetLeaderboard,
  useListTowns,
  useLaunchRaid,
  useGetTownArmy,
  useGetTownRaids,
  useGetTown,
  useGetTownTrades,
  useExecuteTradeDeal,
  getGetTownRaidsQueryKey,
  getGetTownArmyQueryKey,
  getGetTownQueryKey,
  getGetTownTradesQueryKey,
} from "@workspace/api-client-react";
import RaidActivitySummaryModal from "@/components/RaidActivitySummaryModal";
import ModalOverlay from "@/components/ui/ModalOverlay";
import {
  buildRaidSummaryFromRecord,
  estimateAttackPower,
  estimateRaidWinChance,
  type RaidActivityMetadata,
} from "@/lib/raidMeta";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";
import { useGame } from "@/context/GameContext";
import { scheduleRaidBattle } from "@/lib/notifications";
import ScreenHeader from "@/components/ScreenHeader";
import ResourceCostRow from "@/components/ResourceCostRow";
import {
  formatResourceAmount,
  normalizeResources,
  RESOURCE_META,
  singleResourceAmount,
  type ResourceKey,
} from "@/lib/resourceMeta";

function refreshTimeLeft(refreshesAt: string): string {
  const ms = new Date(refreshesAt).getTime() - Date.now();
  if (ms <= 0) return "Refreshing soon…";
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m until new deals`;
  return `${mins}m until new deals`;
}

function marchTimeLeft(arrivesAt: string): string {
  const ms = new Date(arrivesAt).getTime() - Date.now();
  if (ms <= 0) return "Battle imminent…";
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m until battle`;
  return `${mins}m until battle`;
}

export default function WorldScreen() {
  const colors = useColors();
  const { withAlpha } = useTheme();
  const { townId } = useGame();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<"leaderboard" | "raids" | "trade">("leaderboard");
  const [selectedTarget, setSelectedTarget] = useState<any | null>(null);
  const [infantry, setInfantry] = useState(0);
  const [archers, setArchers] = useState(0);
  const [cavalry, setCavalry] = useState(0);
  const [raidError, setRaidError] = useState<string | null>(null);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [raidSummary, setRaidSummary] = useState<RaidActivityMetadata | null>(null);

  const { data: leaderboard, isLoading: lbLoading } = useGetLeaderboard({ query: { refetchInterval: 120_000 } as any });
  const { data: towns } = useListTowns({ query: { staleTime: 60_000 } as any });
  const { data: raids, isLoading: raidsLoading } = useGetTownRaids(townId ?? 0, {
    query: {
      enabled: !!townId,
      refetchInterval: activeTab === "raids" ? 30_000 : false,
    } as any,
  });
  const { data: army } = useGetTownArmy(townId ?? 0, { query: { enabled: !!townId } as any });
  const { data: myTown } = useGetTown(townId ?? 0, { query: { enabled: !!townId } as any });
  const { data: tradeData, isLoading: tradesLoading } = useGetTownTrades(townId ?? 0, {
    query: { enabled: !!townId, refetchInterval: 60_000 } as any,
  });
  const launchRaid = useLaunchRaid();
  const executeTrade = useExecuteTradeDeal();

  const isPeaceful = myTown?.peacefulMode ?? false;

  const raidTarget = selectedTarget
    ? (towns ?? []).find((t: { id: number }) => t.id === selectedTarget.id)
    : null;
  const projectedAttack = estimateAttackPower(infantry, archers, cavalry);
  const projectedDefense = raidTarget?.totalDefense ?? 0;
  const projectedWinChance = estimateRaidWinChance(projectedAttack, projectedDefense);

  const availableInfantry = army?.availableInfantry ?? 0;
  const availableArchers = army?.availableArchers ?? 0;
  const availableCavalry = army?.availableCavalry ?? 0;

  const handleRaid = () => {
    if (!townId || !selectedTarget) return;
    setRaidError(null);
    launchRaid.mutate(
      { data: { attackerTownId: townId, defenderTownId: selectedTarget.id, infantry, archers, cavalry, catapults: 0 } },
      {
        onSuccess: (raid) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if (raid?.id && raid?.arrivesAt) {
            void scheduleRaidBattle(raid.id, selectedTarget?.name ?? "enemy kingdom", raid.arrivesAt);
          }
          setSelectedTarget(null);
          setInfantry(0);
          setArchers(0);
          setCavalry(0);
          setActiveTab("raids");
          qc.invalidateQueries({ queryKey: getGetTownRaidsQueryKey(townId) });
          qc.invalidateQueries({ queryKey: getGetTownArmyQueryKey(townId) });
          qc.invalidateQueries({ queryKey: getGetTownQueryKey(townId) });
        },
        onError: (e: any) => {
          setRaidError(e?.data?.error ?? "Raid failed");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        },
      },
    );
  };

  const handleTrade = (dealId: string) => {
    if (!townId) return;
    setTradeError(null);
    executeTrade.mutate(
      { townId, data: { dealId } },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          qc.invalidateQueries({ queryKey: getGetTownTradesQueryKey(townId) });
          qc.invalidateQueries({ queryKey: getGetTownQueryKey(townId) });
        },
        onError: (e: any) => {
          const msg = e?.data?.error ?? e?.message ?? "Trade failed";
          setTradeError(msg);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert("Trade Failed", msg);
        },
      },
    );
  };

  const townBalance = (res: ResourceKey) => {
    if (!myTown) return 0;
    return myTown[res] ?? 0;
  };

  const townResources = myTown
    ? normalizeResources({
        gold: myTown.gold ?? 0,
        food: myTown.food ?? 0,
        wood: myTown.wood ?? 0,
        stone: myTown.stone ?? 0,
      })
    : undefined;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader icon="earth" title="World" />

      <View style={[styles.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(["leaderboard", "raids", "trade"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: colors.gold, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? colors.gold : colors.textSecondary }]}>
              {tab === "leaderboard" ? "Leaderboard" : tab === "raids" ? "Raids" : "Trade"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "leaderboard" && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {isPeaceful && (
            <View
              style={[
                styles.peacefulBanner,
                { backgroundColor: withAlpha(colors.peaceful, 0.1), borderColor: withAlpha(colors.peaceful, 0.28) },
              ]}
            >
              <MaterialCommunityIcons name="shield-check" size={16} color={colors.peaceful} />
              <Text style={[styles.peacefulBannerText, { color: colors.textSecondary }]}>
                Peaceful kingdoms are hidden from the leaderboard.
              </Text>
            </View>
          )}
          {lbLoading ? (
            <ActivityIndicator color={colors.gold} style={{ marginTop: 20 }} />
          ) : (
            (leaderboard ?? []).map((entry: any) => (
              <View
                key={entry.townId}
                style={[
                  styles.rankRow,
                  {
                    backgroundColor: entry.townId === townId ? colors.gold + "11" : colors.surface,
                    borderColor: entry.townId === townId ? colors.gold + "44" : colors.border,
                  },
                ]}
              >
                <Text style={[styles.rank, { color: entry.rank <= 3 ? colors.gold : colors.textSecondary }]}>
                  {entry.rank <= 3 ? ["👑", "🥈", "🥉"][entry.rank - 1] : `#${entry.rank}`}
                </Text>
                <View style={styles.rankInfo}>
                  <Text style={[styles.rankName, { color: colors.foreground }]}>{entry.townName}</Text>
                  <Text style={[styles.rankPlayer, { color: colors.textSecondary }]}>{entry.playerName}</Text>
                </View>
                <View style={styles.rankStats}>
                  <Text style={[styles.rankScore, { color: colors.gold }]}>{(entry.score ?? 0).toLocaleString()}</Text>
                  <Text style={[styles.rankMil, { color: colors.textSecondary }]}>
                    📈 {entry.economyScore ?? 0} · ⚔ {entry.armyScore ?? 0}
                  </Text>
                </View>
                {entry.townId !== townId &&
                  (() => {
                    const targetTown = (towns ?? []).find((t: any) => t.id === entry.townId);
                    const targetPeaceful = targetTown?.peacefulMode ?? false;
                    if (targetPeaceful) {
                      return (
                        <View style={[styles.raidBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                          <MaterialCommunityIcons name="shield-check" size={14} color={colors.textSecondary} />
                        </View>
                      );
                    }
                    if (isPeaceful) return null;
                    return (
                      <TouchableOpacity
                        style={[styles.raidBtn, { backgroundColor: colors.destructive + "22", borderColor: colors.destructive + "44" }]}
                        onPress={() => {
                          setSelectedTarget({ id: entry.townId, name: entry.townName });
                          setInfantry(0);
                          setArchers(0);
                          setCavalry(0);
                        }}
                      >
                        <MaterialCommunityIcons name="sword" size={14} color={colors.destructive} />
                      </TouchableOpacity>
                    );
                  })()}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {activeTab === "raids" && (
        <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<View />}>
          {raidsLoading ? (
            <ActivityIndicator color={colors.gold} style={{ marginTop: 20 }} />
          ) : (raids ?? []).length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="sword-cross" size={40} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No raids yet</Text>
              <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>Attack kingdoms from the Leaderboard tab</Text>
            </View>
          ) : (
            (raids ?? []).map((raid: any) => {
              const isAttacker = raid.attackerTownId === townId;
              const marching = raid.status === "marching";
              const victory = raid.result === "victory";
              const resultColor = marching ? colors.gold : victory ? colors.food : colors.destructive;
              const summary = !marching && townId ? buildRaidSummaryFromRecord(raid, townId) : null;
              const cardBody = (
                <>
                  <View style={styles.raidHeader}>
                    <MaterialCommunityIcons
                      name={marching ? "map-marker-path" : victory ? "sword" : "shield-off"}
                      size={16}
                      color={resultColor}
                    />
                    <Text style={[styles.raidTitle, { color: colors.foreground }]}>
                      {isAttacker
                        ? marching
                          ? `Marching on ${raid.defenderTownName}`
                          : `Attacked ${raid.defenderTownName}`
                        : marching
                          ? `Incoming raid from ${raid.attackerTownName}`
                          : `Defended vs ${raid.attackerTownName}`}
                    </Text>
                    <Text style={[styles.raidResult, { color: resultColor }]}>
                      {marching ? "MARCHING" : (raid.result ?? "").toUpperCase()}
                    </Text>
                  </View>
                  {marching && raid.arrivesAt && (
                    <Text style={[styles.raidLoot, { color: colors.gold }]}>{marchTimeLeft(raid.arrivesAt)}</Text>
                  )}
                  {marching && (
                    <Text style={[styles.raidCombat, { color: colors.textSecondary }]}>
                      {estimateAttackPower(raid.attackerInfantry, raid.attackerArchers, raid.attackerCavalry)} attack vs{" "}
                      {Math.round(raid.defenderStrength)} defense
                    </Text>
                  )}
                  {!marching && victory && isAttacker && (
                    <Text style={[styles.raidLoot, { color: colors.gold }]}>
                      Looted: {Math.round(raid.lootGold)}g {Math.round(raid.lootFood)}f {Math.round(raid.lootWood)}w{" "}
                      {Math.round(raid.lootStone)}s
                    </Text>
                  )}
                  {!marching && !isAttacker && raid.result === "defeat" && (raid.defenderRewardGold ?? 0) + (raid.defenderRewardFood ?? 0) > 0 && (
                    <Text style={[styles.raidLoot, { color: colors.success }]}>
                      Bounty: {Math.round(raid.defenderRewardGold)}g {Math.round(raid.defenderRewardFood)}f
                    </Text>
                  )}
                  {!marching && raid.attackerCasualties > 0 && isAttacker && (
                    <Text style={[styles.raidCas, { color: colors.destructive }]}>{raid.attackerCasualties} casualties</Text>
                  )}
                  <Text style={[styles.raidDate, { color: colors.textSecondary }]}>
                    {marching && raid.arrivesAt
                      ? `Dispatched ${new Date(raid.createdAt).toLocaleDateString()}`
                      : new Date(raid.createdAt).toLocaleDateString()}
                  </Text>
                  {summary && (
                    <Text style={[styles.raidTapHint, { color: resultColor }]}>Tap for raid summary</Text>
                  )}
                </>
              );
              return summary ? (
                <TouchableOpacity
                  key={raid.id}
                  style={[
                    styles.raidCard,
                    { backgroundColor: colors.surface, borderColor: resultColor + "33", borderLeftColor: resultColor, borderLeftWidth: 3 },
                  ]}
                  onPress={() => setRaidSummary(summary)}
                  activeOpacity={0.75}
                >
                  {cardBody}
                </TouchableOpacity>
              ) : (
                <View
                  key={raid.id}
                  style={[
                    styles.raidCard,
                    { backgroundColor: colors.surface, borderColor: resultColor + "33", borderLeftColor: resultColor, borderLeftWidth: 3 },
                  ]}
                >
                  {cardBody}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {activeTab === "trade" && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {tradeData?.refreshesAt && (
            <View style={[styles.tradeBanner, { backgroundColor: colors.gold + "14", borderColor: colors.gold + "44" }]}>
              <MaterialCommunityIcons name="clock-outline" size={16} color={colors.gold} />
              <Text style={[styles.tradeBannerText, { color: colors.textSecondary }]}>
                {refreshTimeLeft(tradeData.refreshesAt)} · New merchant deals each hour
              </Text>
            </View>
          )}
          {tradesLoading ? (
            <ActivityIndicator color={colors.gold} style={{ marginTop: 20 }} />
          ) : (tradeData?.deals ?? []).length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="swap-horizontal" size={40} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No deals available</Text>
            </View>
          ) : (
            (tradeData?.deals ?? []).map((deal) => {
              const payRes = deal.payResource as ResourceKey;
              const recvRes = deal.receiveResource as ResourceKey;
              const canAfford = townBalance(payRes) >= deal.payAmount;
              const done = deal.completed;

              return (
                <View
                  key={deal.id}
                  style={[
                    styles.tradeCard,
                    {
                      backgroundColor: done ? colors.surface : colors.surface,
                      borderColor: done ? colors.border : colors.gold + "55",
                      opacity: done ? 0.65 : 1,
                    },
                  ]}
                >
                  <View style={styles.tradeHeader}>
                    <MaterialCommunityIcons name="storefront-outline" size={16} color={colors.gold} />
                    <Text style={[styles.tradeTitle, { color: colors.foreground }]}>{deal.title}</Text>
                    <View style={styles.doneBadgeSlot}>
                      {done ? (
                        <View style={[styles.doneBadge, { backgroundColor: colors.textSecondary + "22" }]}>
                          <Text style={[styles.doneBadgeText, { color: colors.textSecondary }]}>DONE</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.tradeExchange}>
                    <ResourceCostRow
                      cost={singleResourceAmount(payRes, deal.payAmount)}
                      owned={townResources}
                    />
                    <MaterialCommunityIcons name="arrow-right" size={18} color={colors.textSecondary} />
                    <ResourceCostRow
                      cost={singleResourceAmount(recvRes, deal.receiveAmount)}
                      variant="reward"
                    />
                  </View>
                  <View style={styles.tradeBtnSlot}>
                    <TouchableOpacity
                      style={[
                        styles.tradeBtn,
                        {
                          backgroundColor: done
                            ? colors.muted
                            : canAfford
                              ? colors.gold + "22"
                              : colors.muted,
                          borderColor: done ? colors.border : canAfford ? colors.gold : colors.border,
                        },
                      ]}
                      onPress={() => handleTrade(deal.id)}
                      disabled={done || !canAfford || executeTrade.isPending}
                      activeOpacity={done ? 1 : 0.7}
                    >
                      {executeTrade.isPending && !done ? (
                        <ActivityIndicator size="small" color={colors.gold} />
                      ) : (
                        <Text
                          style={[
                            styles.tradeBtnText,
                            {
                              color: done
                                ? colors.textSecondary
                                : canAfford
                                  ? colors.gold
                                  : colors.textSecondary,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {done
                            ? "Trade completed"
                            : canAfford
                              ? "Accept Trade"
                              : `Need ${formatResourceAmount(Math.ceil(deal.payAmount - townBalance(payRes)))} more ${RESOURCE_META[payRes].label.toLowerCase()}`}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
          <View style={styles.tradeErrorSlot}>
            {tradeError ? (
              <Text style={[styles.tradeError, { color: colors.destructive }]}>{tradeError}</Text>
            ) : null}
          </View>
        </ScrollView>
      )}

      <RaidActivitySummaryModal
        visible={!!raidSummary}
        metadata={raidSummary}
        onClose={() => setRaidSummary(null)}
      />

      <Modal visible={!!selectedTarget} transparent animationType="slide" onRequestClose={() => setSelectedTarget(null)}>
        <ModalOverlay onPress={() => setSelectedTarget(null)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.raidSheet, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <Text style={[styles.raidSheetTitle, { color: colors.foreground }]}>Raid {selectedTarget?.name}</Text>
              <Text style={[styles.raidSheetDesc, { color: colors.textSecondary }]}>
                Troops march for 2 hours before battle. Deployed troops can't defend. Victory grants 30% of their resources.
              </Text>

              <View style={[styles.combatPreview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.combatPreviewRow}>
                  <View style={styles.combatPreviewCol}>
                    <Text style={[styles.combatPreviewLabel, { color: colors.textSecondary }]}>Your attack</Text>
                    <Text style={[styles.combatPreviewValue, { color: colors.gold }]}>{projectedAttack}</Text>
                  </View>
                  <Text style={[styles.combatPreviewVs, { color: colors.textSecondary }]}>vs</Text>
                  <View style={styles.combatPreviewCol}>
                    <Text style={[styles.combatPreviewLabel, { color: colors.textSecondary }]}>Their defense</Text>
                    <Text style={[styles.combatPreviewValue, { color: colors.destructive }]}>
                      {Math.round(projectedDefense)}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.combatPreviewHint, { color: colors.textSecondary }]}>
                  {infantry + archers + cavalry === 0
                    ? "Send troops to estimate battle odds."
                    : `~${Math.round(projectedWinChance * 100)}% win chance (attack ÷ attack + defense)`}
                </Text>
              </View>

              {(
                [
                  { key: "infantry", label: "Infantry", available: availableInfantry, val: infantry, set: setInfantry },
                  { key: "archers", label: "Archers", available: availableArchers, val: archers, set: setArchers },
                  { key: "cavalry", label: "Cavalry", available: availableCavalry, val: cavalry, set: setCavalry },
                ] as const
              ).map(({ key, label, available, val, set }) => (
                <View key={key} style={styles.raidSlider}>
                  <Text style={[styles.raidSliderLabel, { color: colors.foreground }]}>
                    {label}: {val} / {available}
                  </Text>
                  <View style={styles.sliderBtns}>
                    <TouchableOpacity
                      style={[styles.sliderBtn, { backgroundColor: colors.surface }]}
                      onPress={() => (set as any)(Math.max(0, val - 1))}
                    >
                      <Text style={{ color: colors.foreground }}>−</Text>
                    </TouchableOpacity>
                    <View style={[styles.sliderTrack, { backgroundColor: colors.border }]}>
                      <View
                        style={[
                          styles.sliderFill,
                          { width: `${available > 0 ? (val / available) * 100 : 0}%`, backgroundColor: colors.destructive },
                        ]}
                      />
                    </View>
                    <TouchableOpacity
                      style={[styles.sliderBtn, { backgroundColor: colors.surface }]}
                      onPress={() => (set as any)(Math.min(available, val + 1))}
                    >
                      <Text style={{ color: colors.foreground }}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {raidError && <Text style={[styles.raidError, { color: colors.destructive }]}>{raidError}</Text>}

              <TouchableOpacity
                style={[styles.launchBtn, { backgroundColor: infantry + archers + cavalry > 0 ? colors.destructive : colors.muted }]}
                onPress={handleRaid}
                disabled={infantry + archers + cavalry === 0 || launchRaid.isPending}
              >
                <MaterialCommunityIcons name="sword" size={16} color={colors.destructiveForeground} />
                <Text style={[styles.launchText, { color: colors.destructiveForeground }]}>
                  {launchRaid.isPending ? "Dispatching..." : "Send Raid (2h march)"}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </ModalOverlay>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  scrollContent: { padding: 12, paddingBottom: 100, gap: 8 },
  peacefulBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 4,
  },
  peacefulBannerText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
  rankRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  rank: { width: 28, fontSize: 14, fontFamily: "Inter_700Bold", textAlign: "center" },
  rankInfo: { flex: 1 },
  rankName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  rankPlayer: { fontSize: 11, fontFamily: "Inter_400Regular" },
  rankStats: { alignItems: "flex-end" },
  rankScore: { fontSize: 14, fontFamily: "Inter_700Bold" },
  rankMil: { fontSize: 11, fontFamily: "Inter_400Regular" },
  raidBtn: { width: 32, height: 32, borderRadius: 6, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  raidCard: { padding: 12, borderRadius: 10, borderWidth: 1, gap: 4 },
  raidHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  raidTitle: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  raidResult: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  raidLoot: { fontSize: 12, fontFamily: "Inter_400Regular" },
  raidCombat: { fontSize: 11, fontFamily: "Inter_500Medium" },
  combatPreview: { padding: 12, borderRadius: 10, borderWidth: 1, gap: 8 },
  combatPreviewRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 },
  combatPreviewCol: { alignItems: "center", gap: 2, minWidth: 88 },
  combatPreviewLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.4 },
  combatPreviewValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  combatPreviewVs: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  combatPreviewHint: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 16 },
  raidCas: { fontSize: 11, fontFamily: "Inter_400Regular" },
  raidDate: { fontSize: 10, fontFamily: "Inter_400Regular" },
  raidTapHint: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  tradeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 4,
  },
  tradeBannerText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
  tradeCard: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 10 },
  tradeHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  tradeTitle: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  doneBadgeSlot: { minWidth: 44, alignItems: "flex-end" },
  doneBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  doneBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  tradeExchange: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" },
  tradeBtnSlot: { minHeight: 44, justifyContent: "center" },
  tradeBtn: { borderRadius: 8, borderWidth: 1, paddingVertical: 11, alignItems: "center", width: "100%" },
  tradeBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  tradeErrorSlot: { minHeight: 18, justifyContent: "center", marginTop: 4 },
  tradeError: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  raidSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderWidth: 1, gap: 12, paddingBottom: 40 },
  raidSheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  raidSheetDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  raidSlider: { gap: 6 },
  raidSliderLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sliderBtns: { flexDirection: "row", alignItems: "center", gap: 8 },
  sliderBtn: { width: 32, height: 32, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  sliderTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  sliderFill: { height: "100%", borderRadius: 3 },
  raidError: { fontSize: 12, fontFamily: "Inter_400Regular" },
  launchBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 10 },
  launchText: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
