import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  useClaimSeasonObjective,
  useGetSeasonObjectives,
  getGetTownQueryKey,
  getGetSeasonObjectivesQueryKey,
  type SeasonObjectiveProgress,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";

type Props = {
  townId: number;
  seasonColor: string;
};

function ObjectiveRow({
  objective,
  seasonColor,
  claiming,
  onClaim,
}: {
  objective: SeasonObjectiveProgress;
  seasonColor: string;
  claiming: boolean;
  onClaim: () => void;
}) {
  const colors = useColors();
  const { withAlpha } = useTheme();
  const canClaim = objective.complete && !objective.claimed;

  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[styles.title, { color: colors.foreground }]}>{objective.title}</Text>
        <Text style={[styles.desc, { color: colors.textSecondary }]}>{objective.description}</Text>
        <View style={[styles.track, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.fill,
              {
                width: `${objective.percent}%`,
                backgroundColor: objective.claimed ? colors.success : seasonColor,
              },
            ]}
          />
        </View>
        <Text style={[styles.progress, { color: colors.textMuted }]}>
          {Math.min(objective.current, objective.target)} / {objective.target}
          {objective.claimed ? " · Claimed" : objective.complete ? " · Ready!" : ""}
        </Text>
      </View>
      {canClaim ? (
        <Pressable
          onPress={onClaim}
          disabled={claiming}
          style={({ pressed }) => [
            styles.claimBtn,
            { backgroundColor: withAlpha(seasonColor, pressed ? 0.35 : 0.22), borderColor: seasonColor },
          ]}
        >
          {claiming ? (
            <ActivityIndicator size="small" color={seasonColor} />
          ) : (
            <Text style={[styles.claimText, { color: seasonColor }]}>Claim</Text>
          )}
        </Pressable>
      ) : objective.claimed ? (
        <MaterialCommunityIcons name="check-circle" size={22} color={colors.success} />
      ) : null}
    </View>
  );
}

export default function SeasonObjectivesPanel({ townId, seasonColor }: Props) {
  const colors = useColors();
  const qc = useQueryClient();
  const { data, isLoading } = useGetSeasonObjectives(townId, {
    query: { enabled: townId > 0, staleTime: 15_000 } as any,
  });
  const claimMutation = useClaimSeasonObjective();
  const [claimingId, setClaimingId] = React.useState<string | null>(null);

  const handleClaim = async (objectiveId: string) => {
    setClaimingId(objectiveId);
    try {
      await claimMutation.mutateAsync({ townId, objectiveId });
      qc.invalidateQueries({ queryKey: getGetTownQueryKey(townId) });
      qc.invalidateQueries({ queryKey: getGetSeasonObjectivesQueryKey(townId) });
    } finally {
      setClaimingId(null);
    }
  };

  if (isLoading) {
    return <ActivityIndicator color={seasonColor} style={{ marginVertical: 8 }} />;
  }

  const objectives = data?.objectives ?? [];
  if (objectives.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {objectives.map((obj) => (
        <ObjectiveRow
          key={obj.id}
          objective={obj}
          seasonColor={seasonColor}
          claiming={claimingId === obj.id}
          onClaim={() => void handleClaim(obj.id)}
        />
      ))}
      <Text style={[styles.note, { color: colors.textMuted }]}>
        Rewards are within this cycle only — claim before the kingdom wipe.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  title: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  desc: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },
  track: { height: 4, borderRadius: 2, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 2 },
  progress: { fontSize: 10, fontFamily: "Inter_500Medium" },
  claimBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 64,
    alignItems: "center",
  },
  claimText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  note: { fontSize: 10, fontFamily: "Inter_400Regular", lineHeight: 14, marginTop: 2 },
});
