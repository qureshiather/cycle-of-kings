import { useQueryClient } from "@tanstack/react-query";
import React, { useEffect } from "react";
import { getCurrentPlayer, getGetCurrentPlayerQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import { supabase } from "@/lib/supabase";

/** Loads kingdom from API when a Supabase session exists; clears local game state on sign-out. */
export default function SessionSync() {
  const { session, isLoading: authLoading } = useAuth();
  const { setPlayer, clearPlayer, setPlayerLoading } = useGame();
  const qc = useQueryClient();

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    async function sync() {
      setPlayerLoading(true);
      if (!session) {
        await clearPlayer();
        qc.removeQueries({ queryKey: getGetCurrentPlayerQueryKey() });
        if (!cancelled) setPlayerLoading(false);
        return;
      }

      try {
        const player = await getCurrentPlayer();
        if (cancelled) return;
        if (player.townId == null) {
          await clearPlayer();
        } else {
          await setPlayer(player.id, player.townId, player.name);
        }
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status;
        if (status === 404) {
          await clearPlayer();
        }
      } finally {
        if (!cancelled) setPlayerLoading(false);
      }
    }

    void sync();
    return () => {
      cancelled = true;
    };
  }, [session, authLoading, setPlayer, clearPlayer, setPlayerLoading, qc]);

  useEffect(() => {
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!nextSession) {
        await clearPlayer();
        qc.removeQueries({ queryKey: getGetCurrentPlayerQueryKey() });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [clearPlayer, qc]);

  return null;
}
