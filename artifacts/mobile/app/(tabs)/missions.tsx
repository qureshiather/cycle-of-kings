import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { getMaxActiveMissionsFromSlots } from "@workspace/building-progression";
import {
  useGetMissions, useGetTownMissions, useDispatchMission, useGetTownArmy, useGetTown,
  useGetBuildingSlots,
  useGetSpyBoard, useGetSpyOperations, useDispatchSpyOperation,
  getGetTownMissionsQueryKey, getGetTownArmyQueryKey, getGetTownQueryKey,
  getGetSpyOperationsQueryKey,
} from "@workspace/api-client-react";
import ModalOverlay from "@/components/ui/ModalOverlay";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";
import { useGame } from "@/context/GameContext";
import ScreenHeader from "@/components/ScreenHeader";
import ResourceCostRow from "@/components/ResourceCostRow";
import type { ResourceAmounts } from "@/lib/buildingMeta";
import {
  formatTroopLine,
  missionPossibleLootResources,
  missionRewardTierLabel,
} from "@/lib/missionMeta";
import { RESOURCE_META } from "@/lib/resourceMeta";

type MissionTab = "active" | "land" | "naval" | "spies";

type MissionCard = {
  id: string;
  type: string;
  difficulty: string;
  title: string;
  description: string;
  minTroops: number;
  minShips: number;
  baseSuccessRate: number;
  durationMinutes: number;
  lootGold: number;
  lootFood: number;
  lootWood: number;
  lootStone: number;
};

type SpyCard = {
  id: string;
  title: string;
  type: string;
  difficulty: string;
  description: string;
  minSpies: number;
  baseSuccessRate: number;
  durationMinutes: number;
  lootGold: number;
  lootFood: number;
};

const MISSION_TABS: { id: MissionTab; label: string; icon: string }[] = [
  { id: "active", label: "Active", icon: "clock-outline" },
  { id: "land", label: "Land", icon: "sword" },
  { id: "naval", label: "Naval", icon: "ferry" },
  { id: "spies", label: "Spies", icon: "incognito" },
];

function missionLoot(card: {
  lootGold: number;
  lootFood: number;
  lootWood: number;
  lootStone: number;
}): ResourceAmounts {
  return {
    gold: card.lootGold ?? 0,
    food: card.lootFood ?? 0,
    wood: card.lootWood ?? 0,
    stone: card.lootStone ?? 0,
  };
}

function diffColor(difficulty: string, colors: ReturnType<typeof useColors>): string {
  if (difficulty === "easy") return colors.difficultyEasy;
  if (difficulty === "medium") return colors.difficultyMedium;
  if (difficulty === "hard") return colors.difficultyHard;
  return colors.textSecondary;
}

const DIFF_LABELS: Record<string, string> = { easy: "EASY", medium: "MEDIUM", hard: "HARD" };
const TYPE_ICONS: Record<string, string> = {
  explore: "compass", patrol: "shield-half-full", raid: "sword", naval: "ferry",
};
const SPY_TYPE_ICONS: Record<string, string> = {
  infiltrate: "incognito", steal: "gold", sabotage: "bomb",
};
const SPY_ACCENT = "#7a5aaa";
const MERC_COST = 10;

function timeLeft(returnsAt: string): string {
  const ms = new Date(returnsAt).getTime() - Date.now();
  if (ms <= 0) return "Returning...";
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  return `${mins}m`;
}

function MissionRewardHint({
  card,
  colors,
}: {
  card: { difficulty: string; lootGold: number; lootFood: number; lootWood: number; lootStone: number };
  colors: ReturnType<typeof useColors>;
}) {
  const resources = missionPossibleLootResources(card);
  return (
    <View style={styles.rewardRow}>
      <Text style={[styles.rewardTier, { color: colors.gold }]}>
        Reward: {missionRewardTierLabel(card.difficulty)}
      </Text>
      {resources.map((key) => {
        const meta = RESOURCE_META[key];
        const resColor = colors[meta.colorKey] as string;
        return (
          <View
            key={key}
            style={[styles.rewardIcon, { backgroundColor: resColor + "18", borderColor: resColor + "44" }]}
          >
            <MaterialCommunityIcons name={meta.icon as any} size={12} color={resColor} />
          </View>
        );
      })}
    </View>
  );
}

function EmptyTabPanel({
  icon,
  title,
  body,
  colors,
}: {
  icon: string;
  title: string;
  body: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.emptyPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <MaterialCommunityIcons name={icon as any} size={32} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>{body}</Text>
    </View>
  );
}

export default function MissionsScreen() {
  const colors = useColors();
  const { withAlpha } = useTheme();
  const { townId } = useGame();
  const qc = useQueryClient();

  const { data: missionCards, isLoading: cardsLoading } = useGetMissions(
    { townId: townId ?? 0 },
    { query: { enabled: !!townId, refetchInterval: 30_000 } as any },
  );
  const { data: activeMissions } = useGetTownMissions(townId ?? 0, { query: { enabled: !!townId } as any });
  const { data: army } = useGetTownArmy(townId ?? 0, { query: { enabled: !!townId } as any });
  const { data: town } = useGetTown(townId ?? 0, { query: { enabled: !!townId } as any });
  const { data: slots = [] } = useGetBuildingSlots(townId ?? 0, { query: { enabled: !!townId } as any });
  const dispatchMission = useDispatchMission();
  const { data: spyCards, isLoading: spyCardsLoading } = useGetSpyBoard(townId ?? 0, {
    query: { enabled: !!townId, refetchInterval: 30_000 } as any,
  });
  const { data: spyOps, refetch: refetchSpy } = useGetSpyOperations(townId ?? 0, { query: { enabled: !!townId } as any });
  const dispatchSpy = useDispatchSpyOperation();

  const maxActiveMissions = getMaxActiveMissionsFromSlots(slots);
  const spyGuildLevel = slots.find((s: { slotType: string }) => s.slotType === "spyGuild")?.level ?? 0;
  const shipyardLevel = slots.find((s: { slotType: string }) => s.slotType === "shipyard")?.level ?? 0;
  const maxSpyOps = Math.min(spyGuildLevel, 2);

  const [activeTab, setActiveTab] = useState<MissionTab>("land");
  const [selected, setSelected] = useState<MissionCard | null>(null);
  const [selectedSpy, setSelectedSpy] = useState<SpyCard | null>(null);
  const [infantry, setInfantry] = useState(0);
  const [archers, setArchers] = useState(0);
  const [cavalry, setCavalry] = useState(0);
  const [mercenaries, setMercenaries] = useState(0);
  const [ships, setShips] = useState(0);
  const [spies, setSpies] = useState(0);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [spyError, setSpyError] = useState<string | null>(null);

  const landCards = useMemo(
    () => (missionCards ?? []).filter((c) => c.type !== "naval") as MissionCard[],
    [missionCards],
  );
  const navalCards = useMemo(
    () => (missionCards ?? []).filter((c) => c.type === "naval") as MissionCard[],
    [missionCards],
  );

  const availableInfantry = army?.availableInfantry ?? 0;
  const availableArchers = army?.availableArchers ?? 0;
  const availableCavalry = army?.availableCavalry ?? 0;
  const availableShips = army?.availableShips ?? 0;
  const availableSpies = army?.availableSpies ?? 0;
  const gold = town?.gold ?? 0;
  const maxAffordableMercs = Math.floor(gold / MERC_COST);

  const isNaval = selected?.type === "naval";
  const totalDeployed = infantry + archers + cavalry + mercenaries;
  const mercCost = mercenaries * MERC_COST;
  const canAffordMercs = mercCost <= gold;
  const meetsMin = isNaval ? ships >= (selected?.minShips ?? 1) : totalDeployed >= (selected?.minTroops ?? 1);
  const successRate = selected
    ? Math.min(
        0.95,
        selected.baseSuccessRate +
          (isNaval
            ? Math.max(0, ships - selected.minShips) * 0.02
            : Math.max(0, totalDeployed - selected.minTroops) * 0.01),
      )
    : 0;
  const spySuccessRate = selectedSpy
    ? Math.min(0.92, selectedSpy.baseSuccessRate + Math.max(0, spies - selectedSpy.minSpies) * 0.02)
    : 0;

  const activeSpyOps = (spyOps ?? []).filter((o: { status: string }) => o.status === "active");
  const activeMissionsList = (activeMissions ?? []).filter((m: any) => m.status === "active");
  const completedMissions = (activeMissions ?? []).filter((m: any) => m.status !== "active").slice(0, 8);
  const atMissionLimit = activeMissionsList.length >= maxActiveMissions;
  const atSpyLimit = activeSpyOps.length >= maxSpyOps;
  const canUnlockMoreMissionSlots = maxActiveMissions < 3;
  const tabCounts: Record<MissionTab, number> = {
    active: activeMissionsList.length + activeSpyOps.length,
    land: landCards.length,
    naval: navalCards.length,
    spies: spyGuildLevel > 0 ? (spyCards ?? []).length : 0,
  };

  const openMission = (card: MissionCard) => {
    if (atMissionLimit) return;
    setSelected(card);
    setInfantry(0);
    setArchers(0);
    setCavalry(0);
    setMercenaries(0);
    setShips(card.type === "naval" ? card.minShips : 0);
    setDispatchError(null);
  };

  const handleDispatch = () => {
    if (!townId || !selected) return;
    setDispatchError(null);
    dispatchMission.mutate(
      { townId, data: { missionCardId: selected.id, infantry, archers, cavalry, mercenaries, ships } },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setSelected(null);
          setActiveTab("active");
          qc.invalidateQueries({ queryKey: getGetTownMissionsQueryKey(townId) });
          qc.invalidateQueries({ queryKey: getGetTownArmyQueryKey(townId) });
          qc.invalidateQueries({ queryKey: getGetTownQueryKey(townId) });
        },
        onError: (e: any) => {
          setDispatchError(e?.data?.error ?? "Failed to dispatch");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        },
      },
    );
  };

  const handleSpyDispatch = () => {
    if (!townId || !selectedSpy) return;
    setSpyError(null);
    dispatchSpy.mutate(
      { townId, data: { cardId: selectedSpy.id, spies } },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setSelectedSpy(null);
          setSpies(0);
          setActiveTab("active");
          qc.invalidateQueries({ queryKey: getGetSpyOperationsQueryKey(townId) });
          qc.invalidateQueries({ queryKey: getGetTownArmyQueryKey(townId) });
          refetchSpy();
        },
        onError: (e: any) => {
          setSpyError(e?.data?.error ?? "Failed to dispatch spies");
        },
      },
    );
  };

  const renderMissionCard = (card: MissionCard) => {
    const diff = diffColor(card.difficulty, colors);
    const accent = card.type === "naval" ? colors.slots.shipyard : diff;
    return (
      <TouchableOpacity
        key={card.id}
        style={[
          styles.missionCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderLeftColor: accent,
            borderLeftWidth: 3,
            opacity: atMissionLimit ? 0.5 : 1,
          },
        ]}
        onPress={() => openMission(card)}
        disabled={atMissionLimit}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <View style={[styles.typeIcon, { backgroundColor: withAlpha(accent, 0.12) }]}>
              <MaterialCommunityIcons name={TYPE_ICONS[card.type] as any ?? "map"} size={16} color={accent} />
            </View>
            <View style={styles.cardTitleBlock}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>{card.title}</Text>
              <Text style={[styles.cardType, { color: accent }]}>
                {card.type.toUpperCase()} · {DIFF_LABELS[card.difficulty] ?? card.difficulty.toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.cardRight}>
            <Text style={[styles.cardSuccessRate, { color: diff }]}>{Math.round(card.baseSuccessRate * 100)}%</Text>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>base</Text>
          </View>
        </View>
        <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{card.description}</Text>
        <View style={styles.cardFooter}>
          <MissionRewardHint card={card} colors={colors} />
          <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
            Rolls on return ·{" "}
            {card.type === "naval" ? `${card.minShips} ships min` : `${card.minTroops} troops min`} · {card.durationMinutes}m
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSpyCard = (card: SpyCard) => {
    const diff = diffColor(card.difficulty, colors);
    return (
      <TouchableOpacity
        key={card.id}
        style={[
          styles.missionCard,
          { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: SPY_ACCENT, borderLeftWidth: 3 },
        ]}
        onPress={() => {
          setSelectedSpy(card);
          setSpies(card.minSpies);
          setSpyError(null);
        }}
        disabled={atSpyLimit}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <View style={[styles.typeIcon, { backgroundColor: withAlpha(SPY_ACCENT, 0.12) }]}>
              <MaterialCommunityIcons name={SPY_TYPE_ICONS[card.type] as any ?? "incognito"} size={16} color={SPY_ACCENT} />
            </View>
            <View style={styles.cardTitleBlock}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>{card.title}</Text>
              <Text style={[styles.cardType, { color: SPY_ACCENT }]}>
                {card.type.toUpperCase()} · {card.difficulty.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={[styles.cardSuccessRate, { color: diff }]}>{Math.round(card.baseSuccessRate * 100)}%</Text>
        </View>
        <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{card.description}</Text>
        <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
          High-risk loot · {card.minSpies} spies min · {card.durationMinutes}m
        </Text>
      </TouchableOpacity>
    );
  };

  const renderCardList = (cards: MissionCard[], emptyIcon: string, emptyTitle: string, emptyBody: string) => {
    if (cardsLoading) {
      return <ActivityIndicator color={colors.gold} style={{ marginTop: 24 }} />;
    }
    if (cards.length === 0) {
      return <EmptyTabPanel icon={emptyIcon} title={emptyTitle} body={emptyBody} colors={colors} />;
    }
    return cards.map(renderMissionCard);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        icon="map-legend"
        title="Missions"
        subtitle="Board refreshes every 30m"
        gold={townId ? (town?.gold ?? 0) : undefined}
      />

      <View style={[styles.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {MISSION_TABS.map((tab) => {
          const count = tabCounts[tab.id];
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && { borderBottomColor: colors.gold, borderBottomWidth: 2 }]}
              onPress={() => setActiveTab(tab.id)}
            >
              <MaterialCommunityIcons
                name={tab.icon as any}
                size={14}
                color={activeTab === tab.id ? colors.gold : colors.textSecondary}
              />
              <Text
                style={[styles.tabText, { color: activeTab === tab.id ? colors.gold : colors.textSecondary }]}
                numberOfLines={1}
              >
                {tab.label}
                {count > 0 ? ` (${count})` : ""}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === "active" && (
          <>
            {(activeMissionsList.length > 0 || activeSpyOps.length > 0) && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>IN PROGRESS</Text>
                  {canUnlockMoreMissionSlots && (
                    <TouchableOpacity
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() =>
                        Alert.alert(
                          "Mission slots",
                          `Upgrade Town Hall to run up to 3 missions at once. You currently have ${maxActiveMissions} active slot${maxActiveMissions === 1 ? "" : "s"}.`,
                        )
                      }
                    >
                      <MaterialCommunityIcons name="information-outline" size={14} color={colors.gold} />
                    </TouchableOpacity>
                  )}
                </View>
                {activeMissionsList.map((m: any) => (
                  <View
                    key={`m-${m.id}`}
                    style={[styles.activeCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                  >
                    <MaterialCommunityIcons
                      name={TYPE_ICONS[m.missionType] as any ?? "map"}
                      size={20}
                      color={m.missionType === "naval" ? colors.slots.shipyard : colors.gold}
                    />
                    <View style={styles.activeInfo}>
                      <Text style={[styles.activeName, { color: colors.foreground }]}>{m.missionTitle}</Text>
                      <Text style={[styles.activeTime, { color: colors.textSecondary }]}>
                        {m.missionType === "naval"
                          ? `${m.ships ?? 0} ships`
                          : `${m.infantry + m.archers + m.cavalry + (m.mercenaries ?? 0)} troops`}{" "}
                        — returns in {timeLeft(m.returnsAt)}
                      </Text>
                    </View>
                    <View style={[styles.activeDot, { backgroundColor: colors.success }]} />
                  </View>
                ))}
                {activeSpyOps.map((o: { id: number; title: string; spiesDeployed: number; returnsAt: string }) => (
                  <View
                    key={`s-${o.id}`}
                    style={[styles.activeCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                  >
                    <MaterialCommunityIcons name="incognito" size={20} color={SPY_ACCENT} />
                    <View style={styles.activeInfo}>
                      <Text style={[styles.activeName, { color: colors.foreground }]}>{o.title}</Text>
                      <Text style={[styles.activeTime, { color: colors.textSecondary }]}>
                        {o.spiesDeployed} spies — returns in {timeLeft(o.returnsAt)}
                      </Text>
                    </View>
                    <View style={[styles.activeDot, { backgroundColor: SPY_ACCENT }]} />
                  </View>
                ))}
              </>
            )}

            {activeMissionsList.length === 0 && activeSpyOps.length === 0 && (
              <EmptyTabPanel
                icon="clock-outline"
                title="Nothing in the field"
                body="Dispatch troops, ships, or spies from the Land, Naval, or Spies tabs."
                colors={colors}
              />
            )}

            {completedMissions.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 4 }]}>RECENT</Text>
                {completedMissions.map((m: any) => (
                  <View
                    key={m.id}
                    style={[
                      styles.completedCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: m.result === "victory" ? colors.food + "44" : colors.destructive + "44",
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={m.result === "victory" ? "check-circle" : "close-circle"}
                      size={16}
                      color={m.result === "victory" ? colors.food : colors.destructive}
                    />
                    <View style={styles.completedInfo}>
                      <Text style={[styles.completedName, { color: colors.foreground }]}>{m.missionTitle}</Text>
                      {(m.enemyInfantry != null || m.enemyArchers != null) && (
                        <Text style={[styles.completedVs, { color: colors.textSecondary }]}>
                          {formatTroopLine({
                            infantry: m.infantry ?? 0,
                            archers: m.archers ?? 0,
                            cavalry: m.cavalry ?? 0,
                            mercenaries: m.mercenaries ?? 0,
                            total: (m.infantry ?? 0) + (m.archers ?? 0) + (m.cavalry ?? 0) + (m.mercenaries ?? 0),
                          })}{" "}
                          vs{" "}
                          {formatTroopLine({
                            infantry: m.enemyInfantry ?? 0,
                            archers: m.enemyArchers ?? 0,
                            cavalry: m.enemyCavalry ?? 0,
                            total: (m.enemyInfantry ?? 0) + (m.enemyArchers ?? 0) + (m.enemyCavalry ?? 0),
                          })}
                        </Text>
                      )}
                      {m.result === "victory" && (
                        <ResourceCostRow
                          cost={missionLoot({
                            lootGold: Math.round(m.lootGold ?? 0),
                            lootFood: Math.round(m.lootFood ?? 0),
                            lootWood: Math.round(m.lootWood ?? 0),
                            lootStone: Math.round(m.lootStone ?? 0),
                          })}
                          variant="reward"
                          compact
                        />
                      )}
                      {(m.casualties ?? 0) > 0 && (
                        <Text style={[styles.completedCas, { color: colors.destructive }]}>{m.casualties} casualties</Text>
                      )}
                    </View>
                  </View>
                ))}
              </>
            )}
          </>
        )}

        {activeTab === "land" && (
          <>
            {atMissionLimit && (
              <Text style={[styles.limitHint, { color: colors.textSecondary }]}>
                Mission slots full — check Active or upgrade Town Hall.
              </Text>
            )}
            {renderCardList(
              landCards,
              "sword",
              "No land missions",
              "This rotation has no explore, patrol, or raid cards. The board refreshes every 30 minutes.",
            )}
          </>
        )}

        {activeTab === "naval" && (
          <>
            {shipyardLevel < 1 ? (
              <EmptyTabPanel
                icon="ferry"
                title="No shipyard"
                body="Build a Shipyard in your Kingdom (Army section, Town Hall 4) to unlock naval missions."
                colors={colors}
              />
            ) : (
              <>
                {atMissionLimit && (
                  <Text style={[styles.limitHint, { color: colors.textSecondary }]}>
                    Mission slots full — finish an active mission first.
                  </Text>
                )}
                {renderCardList(
                  navalCards,
                  "ferry",
                  "No naval missions",
                  "None this rotation. Upgrade your Shipyard for more sea lanes on future boards.",
                )}
              </>
            )}
          </>
        )}

        {activeTab === "spies" && (
          <>
            {spyGuildLevel < 1 ? (
              <EmptyTabPanel
                icon="incognito"
                title="No spies"
                body="Build a Spy Guild in your Kingdom (Army section, Town Hall 4 + Market) to unlock espionage missions."
                colors={colors}
              />
            ) : spyCardsLoading ? (
              <ActivityIndicator color={SPY_ACCENT} style={{ marginTop: 24 }} />
            ) : (
              <>
                {atSpyLimit && (
                  <Text style={[styles.limitHint, { color: colors.textSecondary }]}>
                    Spy op limit reached ({maxSpyOps} at once) — see Active tab.
                  </Text>
                )}
                {(spyCards ?? []).length === 0 ? (
                  <EmptyTabPanel
                    icon="incognito"
                    title="No spy jobs"
                    body="Espionage cards refresh every 30 minutes with the mission board."
                    colors={colors}
                  />
                ) : (
                  (spyCards as SpyCard[]).map(renderSpyCard)
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <ModalOverlay onPress={() => setSelected(null)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.deploySheet, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              {selected && (
                <>
                  <Text style={[styles.deployTitle, { color: colors.foreground }]}>Deploy Forces</Text>
                  <Text style={[styles.deployMission, { color: diffColor(selected.difficulty, colors) }]}>
                    {selected.title}
                  </Text>
                  <Text style={[styles.deployDesc, { color: colors.textSecondary }]}>
                    {isNaval
                      ? `Min ${selected.minShips} ships · ${selected.durationMinutes}min`
                      : `Min ${selected.minTroops} troops · ${selected.durationMinutes}min`}
                  </Text>
                  <MissionRewardHint card={selected} colors={colors} />
                  <Text style={[styles.deployLoot, { color: colors.textSecondary }]}>Amount rolls on return if you win</Text>

                  {!isNaval &&
                    (
                      [
                        { key: "infantry", label: "Infantry", available: availableInfantry, val: infantry, set: setInfantry },
                        { key: "archers", label: "Archers", available: availableArchers, val: archers, set: setArchers },
                        { key: "cavalry", label: "Cavalry", available: availableCavalry, val: cavalry, set: setCavalry },
                      ] as const
                    ).map(({ key, label, available, val, set }) =>
                      available > 0 ? (
                        <View key={key} style={styles.troopRow}>
                          <Text style={[styles.troopLabel, { color: colors.foreground }]}>{label}</Text>
                          <View style={styles.troopControls}>
                            <TouchableOpacity
                              style={[styles.stepBtn, { backgroundColor: colors.surface }]}
                              onPress={() => (set as (n: number) => void)(Math.max(0, val - 1))}
                            >
                              <Text style={{ color: colors.foreground }}>−</Text>
                            </TouchableOpacity>
                            <Text style={[styles.troopVal, { color: colors.gold }]}>
                              {val}/{available}
                            </Text>
                            <TouchableOpacity
                              style={[styles.stepBtn, { backgroundColor: colors.surface }]}
                              onPress={() => (set as (n: number) => void)(Math.min(available, val + 1))}
                            >
                              <Text style={{ color: colors.foreground }}>+</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : null,
                    )}

                  {isNaval && availableShips > 0 && (
                    <View style={styles.troopRow}>
                      <Text style={[styles.troopLabel, { color: colors.foreground }]}>Ships</Text>
                      <View style={styles.troopControls}>
                        <TouchableOpacity
                          style={[styles.stepBtn, { backgroundColor: colors.surface }]}
                          onPress={() => setShips(Math.max(0, ships - 1))}
                        >
                          <Text style={{ color: colors.foreground }}>−</Text>
                        </TouchableOpacity>
                        <Text style={[styles.troopVal, { color: colors.gold }]}>
                          {ships}/{availableShips}
                        </Text>
                        <TouchableOpacity
                          style={[styles.stepBtn, { backgroundColor: colors.surface }]}
                          onPress={() => setShips(Math.min(availableShips, ships + 1))}
                        >
                          <Text style={{ color: colors.foreground }}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {!isNaval && (
                    <View style={[styles.mercRow, { borderColor: colors.gold + "44", backgroundColor: colors.gold + "0d" }]}>
                      <View style={styles.mercLeft}>
                        <MaterialCommunityIcons name="account-multiple-plus" size={16} color={colors.gold} />
                        <View>
                          <Text style={[styles.mercLabel, { color: colors.foreground }]}>Mercenaries</Text>
                          <Text style={[styles.mercCostText, { color: colors.gold }]}>
                            {MERC_COST} gold each · {mercCost} total
                          </Text>
                        </View>
                      </View>
                      <View style={styles.troopControls}>
                        <TouchableOpacity
                          style={[styles.stepBtn, { backgroundColor: colors.surface }]}
                          onPress={() => setMercenaries(Math.max(0, mercenaries - 1))}
                        >
                          <Text style={{ color: colors.foreground }}>−</Text>
                        </TouchableOpacity>
                        <Text style={[styles.troopVal, { color: colors.gold }]}>
                          {mercenaries}/{maxAffordableMercs}
                        </Text>
                        <TouchableOpacity
                          style={[styles.stepBtn, { backgroundColor: colors.surface, opacity: mercenaries >= maxAffordableMercs ? 0.4 : 1 }]}
                          onPress={() => setMercenaries(Math.min(maxAffordableMercs, mercenaries + 1))}
                          disabled={mercenaries >= maxAffordableMercs}
                        >
                          <Text style={{ color: colors.foreground }}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  <View style={[styles.successPreview, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.successLabel, { color: colors.textSecondary }]}>
                      {isNaval ? `${ships} ships deployed` : `${totalDeployed} troops deployed`}
                    </Text>
                    <Text style={[styles.successRate, { color: meetsMin ? colors.success : colors.destructive }]}>
                      {Math.round(successRate * 100)}% success
                    </Text>
                  </View>

                  {dispatchError && (
                    <Text style={[styles.deployError, { color: colors.destructive }]}>{dispatchError}</Text>
                  )}

                  <TouchableOpacity
                    style={[styles.dispatchBtn, { backgroundColor: meetsMin && canAffordMercs ? colors.gold : colors.muted }]}
                    onPress={handleDispatch}
                    disabled={!meetsMin || !canAffordMercs || dispatchMission.isPending}
                  >
                    <MaterialCommunityIcons
                      name="send"
                      size={16}
                      color={meetsMin && canAffordMercs ? colors.onPrimary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.dispatchText,
                        { color: meetsMin && canAffordMercs ? colors.onPrimary : colors.textSecondary },
                      ]}
                    >
                      {dispatchMission.isPending ? "Dispatching..." : "Dispatch"}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </TouchableOpacity>
        </ModalOverlay>
      </Modal>

      <Modal visible={!!selectedSpy} transparent animationType="slide" onRequestClose={() => setSelectedSpy(null)}>
        <ModalOverlay onPress={() => setSelectedSpy(null)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.deploySheet, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              {selectedSpy && (
                <>
                  <Text style={[styles.deployTitle, { color: colors.foreground }]}>Deploy Spies</Text>
                  <Text style={[styles.deployMission, { color: SPY_ACCENT }]}>{selectedSpy.title}</Text>
                  <Text style={[styles.deployDesc, { color: colors.textSecondary }]}>
                    Min {selectedSpy.minSpies} spies · {selectedSpy.durationMinutes}min · jackpot possible
                  </Text>
                  <View style={styles.troopRow}>
                    <Text style={[styles.troopLabel, { color: colors.foreground }]}>Spies</Text>
                    <View style={styles.troopControls}>
                      <TouchableOpacity
                        style={[styles.stepBtn, { backgroundColor: colors.surface }]}
                        onPress={() => setSpies(Math.max(1, spies - 1))}
                      >
                        <Text style={{ color: colors.foreground }}>−</Text>
                      </TouchableOpacity>
                      <Text style={[styles.troopVal, { color: colors.gold }]}>
                        {spies}/{availableSpies}
                      </Text>
                      <TouchableOpacity
                        style={[styles.stepBtn, { backgroundColor: colors.surface }]}
                        onPress={() => setSpies(Math.min(availableSpies, spies + 1))}
                      >
                        <Text style={{ color: colors.foreground }}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={[styles.successPreview, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.successRate, { color: spies >= selectedSpy.minSpies ? colors.success : colors.destructive }]}>
                      {Math.round(spySuccessRate * 100)}% success
                    </Text>
                  </View>
                  {spyError && <Text style={[styles.deployError, { color: colors.destructive }]}>{spyError}</Text>}
                  <TouchableOpacity
                    style={[styles.dispatchBtn, { backgroundColor: spies >= selectedSpy.minSpies ? SPY_ACCENT : colors.muted }]}
                    onPress={handleSpyDispatch}
                    disabled={spies < selectedSpy.minSpies || dispatchSpy.isPending}
                  >
                    <Text style={[styles.dispatchText, { color: colors.onPrimary }]}>
                      {dispatchSpy.isPending ? "Sending..." : "Send Spies"}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
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
  tab: { flex: 1, alignItems: "center", paddingVertical: 10, gap: 2 },
  tabText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  scrollContent: { padding: 12, paddingBottom: 100, gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  limitHint: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16, marginBottom: 4 },
  emptyPanel: {
    alignItems: "center",
    padding: 24,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    marginTop: 8,
  },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptyBody: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
  activeCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  activeInfo: { flex: 1 },
  activeName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  activeTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  missionCard: { padding: 12, borderRadius: 10, borderWidth: 1, gap: 8 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  cardTitleBlock: { flex: 1, flexShrink: 1 },
  typeIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  cardRight: { alignItems: "flex-end" },
  cardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  cardType: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  cardSuccessRate: { fontSize: 18, fontFamily: "Inter_700Bold" },
  cardLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  cardDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  cardFooter: { gap: 4, marginTop: 2 },
  rewardRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  rewardTier: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  rewardIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  completedCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 8, borderWidth: 1 },
  completedInfo: { flex: 1, gap: 2 },
  completedName: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  completedVs: { fontSize: 10, fontFamily: "Inter_400Regular", lineHeight: 14 },
  completedCas: { fontSize: 11, fontFamily: "Inter_400Regular" },
  deploySheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderWidth: 1, gap: 12, paddingBottom: 40 },
  deployTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  deployMission: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  deployDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  deployLoot: { fontSize: 11, fontFamily: "Inter_500Medium", lineHeight: 16 },
  troopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  troopLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  troopControls: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  troopVal: { fontSize: 14, fontFamily: "Inter_700Bold", minWidth: 48, textAlign: "center" },
  mercRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 10, borderRadius: 8, borderWidth: 1 },
  mercLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  mercLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  mercCostText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  successPreview: { flexDirection: "row", justifyContent: "space-between", padding: 12, borderRadius: 8 },
  successLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  successRate: { fontSize: 14, fontFamily: "Inter_700Bold" },
  deployError: { fontSize: 12, fontFamily: "Inter_400Regular" },
  dispatchBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 10 },
  dispatchText: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
