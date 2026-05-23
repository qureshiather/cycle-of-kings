import type { Player } from "@workspace/db";

export function toPlayerJson(player: Player, townId: number | null) {
  return {
    id: player.id,
    authUserId: player.authUserId,
    name: player.name,
    townId,
    trophyPoints: player.trophyPoints,
    createdAt: player.createdAt.toISOString(),
  };
}
