import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useGetActivities } from "@workspace/api-client-react";
import TabBadge from "@/components/TabBadge";
import ScreenHeader from "@/components/ScreenHeader";
import SettingsPanel from "@/components/SettingsPanel";
import { useColors } from "@/hooks/useColors";
import { useActivityUnread } from "@/hooks/useActivityUnread";
import { useGame } from "@/context/GameContext";

type ActivityItem = {
  id: number;
  type: string;
  title: string;
  body: string;
  icon: string;
  iconColor: string;
  createdAt: string;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const TYPE_GROUPS: Record<string, string> = {
  raid_incoming_loss: "danger",
  raid_outgoing_loss: "danger",
  mission_fail: "danger",
  raid_incoming_win: "success",
  raid_outgoing_win: "success",
  mission_success: "success",
  trade_complete: "success",
  upgrade_complete: "info",
  upgrade_started: "muted",
  mission_dispatched: "muted",
  building_placed: "muted",
  kingdom_reset: "danger",
};

export default function ActivityScreen() {
  const colors = useColors();
  const { townId } = useGame();
  const [activeTab, setActiveTab] = useState<"activity" | "settings">("activity");
  const { unreadCount, markAllRead } = useActivityUnread(townId);

  const { data: activities = [], isLoading, refetch } = useGetActivities(townId ?? 0, {
    query: { enabled: !!townId, refetchInterval: 15_000 } as any,
  });

  useFocusEffect(
    useCallback(() => {
      if (activeTab === "activity") markAllRead();
    }, [activeTab, markAllRead]),
  );

  const onRefresh = useCallback(() => refetch(), [refetch]);

  const groupColor = (type: string) => {
    const g = TYPE_GROUPS[type] ?? "muted";
    if (g === "danger") return colors.destructive;
    if (g === "success") return colors.success;
    if (g === "info") return colors.gold;
    return colors.textSecondary;
  };

  const groupBg = (type: string) => {
    const g = TYPE_GROUPS[type] ?? "muted";
    if (g === "danger") return colors.destructive + "18";
    if (g === "success") return colors.success + "18";
    if (g === "info") return colors.gold + "18";
    return colors.surface;
  };

  if (isLoading && activeTab === "activity") {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        icon="bell-outline"
        title="Activity"
        subtitle={activeTab === "activity" ? "Your kingdom's recent events" : "Appearance, peaceful mode, reset"}
        trailing={unreadCount > 0 && activeTab !== "activity" ? <TabBadge count={unreadCount} inline /> : undefined}
      />

      <View style={[styles.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(["activity", "settings"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: colors.gold, borderBottomWidth: 2 }]}
            onPress={() => {
              setActiveTab(tab);
              if (tab === "activity") markAllRead();
            }}
          >
            <View style={styles.tabLabelRow}>
              <Text style={[styles.tabText, { color: activeTab === tab ? colors.gold : colors.textSecondary }]}>
                {tab === "activity" ? "Feed" : "Settings"}
              </Text>
              {tab === "activity" && activeTab !== "activity" && unreadCount > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: colors.destructive }]}>
                  <Text style={[styles.tabBadgeText, { color: colors.destructiveForeground }]}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "activity" ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={colors.gold} />}
          showsVerticalScrollIndicator={false}
        >
          {(activities as ActivityItem[]).length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="bell-sleep-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No activity yet</Text>
              <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                Build, send missions, trade, raid — events will appear here.
              </Text>
            </View>
          ) : (
            (activities as ActivityItem[]).map((item, i) => {
              const prev = i > 0 ? (activities as ActivityItem[])[i - 1] : null;
              const showDate =
                !prev || new Date(prev.createdAt).toDateString() !== new Date(item.createdAt).toDateString();
              const color = groupColor(item.type);
              const bg = groupBg(item.type);

              return (
                <React.Fragment key={item.id}>
                  {showDate && (
                    <View style={styles.dateRow}>
                      <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
                      <Text
                        style={[styles.dateLabel, { color: colors.textSecondary, backgroundColor: colors.background }]}
                      >
                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </Text>
                      <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
                    </View>
                  )}
                  <View style={[styles.card, { backgroundColor: bg, borderColor: color + "40" }]}>
                    <View style={[styles.iconBox, { backgroundColor: color + "22" }]}>
                      <MaterialCommunityIcons name={item.icon as any} size={20} color={color} />
                    </View>
                    <View style={styles.cardBody}>
                      <View style={styles.cardTop}>
                        <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.title}</Text>
                        <Text style={[styles.cardTime, { color: colors.textSecondary }]}>{timeAgo(item.createdAt)}</Text>
                      </View>
                      <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{item.body}</Text>
                    </View>
                  </View>
                </React.Fragment>
              );
            })
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <SettingsPanel />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabs: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  tabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  tabBadge: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, alignItems: "center", justifyContent: "center" },
  tabBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  scrollContent: { padding: 12, paddingBottom: 110, gap: 8 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 40, lineHeight: 20 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 4 },
  dateLine: { flex: 1, height: 1 },
  dateLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, paddingHorizontal: 4 },
  card: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  cardTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  cardTime: { fontSize: 11, fontFamily: "Inter_400Regular", flexShrink: 0 },
  cardDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 3, lineHeight: 18 },
});
