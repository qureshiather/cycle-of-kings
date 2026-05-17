import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useGetTownArmy, useRecruitUnits, useDisbandUnits, getGetTownArmyQueryKey, getGetTownQueryKey } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";

const UNIT_META = {
  infantry:  { icon: "shield-sword",  label: "Infantry",  desc: "Heavy tanks. Protect your archers in formation.", color: "#8a3030", attackPower: 10, defense: 15, cost: "10 Gold, 5 Food" },
  archers:   { icon: "bow-arrow",     label: "Archers",   desc: "Ranged damage. +20% power behind infantry.",      color: "#3d7a35", attackPower: 15, defense: 5,  cost: "15 Gold, 5 Food, 5 Wood" },
  cavalry:   { icon: "horse",         label: "Cavalry",   desc: "Fast strikers. +10% attack initiative bonus.",    color: "#c4a820", attackPower: 12, defense: 8,  cost: "25 Gold, 10 Food" },
  catapults: { icon: "bomb",          label: "Catapults", desc: "Siege engines. Devastating vs fortifications.",   color: "#9a5a20", attackPower: 30, defense: 0,  cost: "50 Gold, 5 Food, 30 Wood, 20 Stone" },
};

type UnitType = keyof typeof UNIT_META;

function UnitCard({ type, total, onMission, onRecruit, onDisband }: { type: UnitType; total: number; onMission: number; onRecruit: (type: UnitType, count: number) => void; onDisband: (type: UnitType, count: number) => void }) {
  const colors = useColors();
  const meta = UNIT_META[type];
  const available = total - onMission;

  return (
    <View style={[styles.unitCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.unitIcon, { backgroundColor: meta.color + "22" }]}>
        <MaterialCommunityIcons name={meta.icon as any} size={28} color={meta.color} />
      </View>
      <View style={styles.unitInfo}>
        <Text style={[styles.unitName, { color: colors.foreground }]}>{meta.label}</Text>
        <Text style={[styles.unitDesc, { color: colors.textSecondary }]}>{meta.desc}</Text>
        <Text style={[styles.unitCost, { color: colors.gold }]}>{meta.cost}</Text>
        <View style={styles.unitStats}>
          <Text style={[styles.stat, { color: colors.foreground }]}>ATK {meta.attackPower}</Text>
          <Text style={[styles.stat, { color: colors.foreground }]}>DEF {meta.defense}</Text>
        </View>
      </View>
      <View style={styles.unitRight}>
        <Text style={[styles.unitCount, { color: colors.foreground }]}>{available}</Text>
        {onMission > 0 && <Text style={[styles.onMission, { color: colors.risky }]}>{onMission} out</Text>}
        <View style={styles.recruitBtns}>
          {[1, 5, 10].map(n => (
            <TouchableOpacity
              key={`r${n}`}
              style={[styles.recruitBtn, { backgroundColor: colors.gold + "22", borderColor: colors.gold + "44" }]}
              onPress={() => onRecruit(type, n)}
            >
              <Text style={[styles.recruitBtnText, { color: colors.gold }]}>+{n}</Text>
            </TouchableOpacity>
          ))}
          {available > 0 && [1, 5, 10].map(n => n <= available && (
            <TouchableOpacity
              key={`d${n}`}
              style={[styles.recruitBtn, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "44" }]}
              onPress={() => onDisband(type, n)}
            >
              <Text style={[styles.recruitBtnText, { color: colors.destructive }]}>−{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

export default function ArmyScreen() {
  const colors = useColors();
  const { townId } = useGame();
  const qc = useQueryClient();

  const { data: army, isLoading, refetch } = useGetTownArmy(townId ?? 0, { query: { enabled: !!townId } });
  const recruitUnits = useRecruitUnits();
  const disbandUnits = useDisbandUnits();
  const [error, setError] = useState<string | null>(null);

  const invalidateArmy = () => {
    if (!townId) return;
    qc.invalidateQueries({ queryKey: getGetTownArmyQueryKey(townId) });
    qc.invalidateQueries({ queryKey: getGetTownQueryKey(townId) });
  };

  const handleRecruit = (type: UnitType, count: number) => {
    if (!townId) return;
    const order: Record<string, number> = { infantry: 0, archers: 0, cavalry: 0, catapults: 0 };
    order[type] = count;
    setError(null);
    recruitUnits.mutate(
      { townId, data: order },
      {
        onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); invalidateArmy(); },
        onError: (e: any) => {
          setError(e?.data?.error ?? "Insufficient resources or capacity");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        },
      }
    );
  };

  const handleDisband = (type: UnitType, count: number) => {
    if (!townId) return;
    const order: Record<string, number> = { infantry: 0, archers: 0, cavalry: 0, catapults: 0 };
    order[type] = count;
    setError(null);
    disbandUnits.mutate(
      { townId, data: order },
      {
        onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); invalidateArmy(); },
        onError: (e: any) => {
          setError(e?.data?.error ?? "Cannot disband");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        },
      }
    );
  };

  const total = army ? army.infantry + army.archers + army.cavalry + army.catapults : 0;
  const onMission = army ? army.onMissionInfantry + army.onMissionArchers + army.onMissionCavalry + army.onMissionCatapults : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <MaterialCommunityIcons name="sword-cross" size={20} color={colors.gold} />
        <Text style={[styles.topTitle, { color: colors.foreground }]}>Command Center</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.gold} />}
        >
          <View style={[styles.summaryCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>TOTAL TROOPS</Text>
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>{total}</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>ON MISSION</Text>
              <Text style={[styles.summaryValue, { color: colors.risky }]}>{onMission}</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>CAPACITY</Text>
              <Text style={[styles.summaryValue, { color: colors.gold }]}>{army?.capacity ?? 20}</Text>
            </View>
          </View>

          {error && (
            <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "22", borderColor: colors.destructive }]}>
              <MaterialCommunityIcons name="alert-circle" size={14} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          )}

          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>UNITS</Text>

          {(["infantry", "archers", "cavalry", "catapults"] as UnitType[]).map(type => (
            <UnitCard
              key={type}
              type={type}
              total={(army as any)?.[type] ?? 0}
              onMission={(army as any)?.[`onMission${type.charAt(0).toUpperCase() + type.slice(1)}`] ?? 0}
              onRecruit={handleRecruit}
              onDisband={handleDisband}
            />
          ))}

          <View style={[styles.tipCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="lightbulb-outline" size={14} color={colors.gold} />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              Infantry + Archers is a powerful combo — infantry shields archers, boosting their attack by 20%.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, borderBottomWidth: 1 },
  topTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  scrollContent: { padding: 12, paddingBottom: 100, gap: 10 },
  summaryCard: { flexDirection: "row", borderRadius: 10, borderWidth: 1, padding: 16, marginBottom: 4 },
  summaryItem: { flex: 1, alignItems: "center", gap: 4 },
  summaryLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  summaryValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  summaryDivider: { width: 1, marginHorizontal: 8 },
  errorBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 8, borderWidth: 1 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginTop: 4 },
  unitCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 10, borderWidth: 1 },
  unitIcon: { width: 52, height: 52, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  unitInfo: { flex: 1, gap: 3 },
  unitName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  unitDesc: { fontSize: 11, fontFamily: "Inter_400Regular" },
  unitCost: { fontSize: 10, fontFamily: "Inter_400Regular" },
  unitStats: { flexDirection: "row", gap: 10 },
  stat: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  unitRight: { alignItems: "center", gap: 4 },
  unitCount: { fontSize: 22, fontFamily: "Inter_700Bold" },
  onMission: { fontSize: 10, fontFamily: "Inter_400Regular" },
  recruitBtns: { gap: 3 },
  recruitBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 5, borderWidth: 1, alignItems: "center" },
  recruitBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  tipCard: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  tipText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
});
