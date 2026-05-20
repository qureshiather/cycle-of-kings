import { useGetActivities } from "@workspace/api-client-react";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "@/context/GameContext";
import {
  countUnreadActivities,
  getLastSeenActivityId,
  setLastSeenActivityId,
} from "@/lib/activityRead";

type ActivityUnreadContextValue = {
  unreadCount: number;
  markAllRead: () => Promise<void>;
};

const ActivityUnreadContext = createContext<ActivityUnreadContextValue>({
  unreadCount: 0,
  markAllRead: async () => {},
});

export function ActivityUnreadProvider({ children }: { children: React.ReactNode }) {
  const { townId } = useGame();
  const [lastSeenId, setLastSeenId] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);
  const seededRef = useRef(false);

  const { data: activities = [] } = useGetActivities(townId ?? 0, {
    query: { enabled: !!townId, refetchInterval: 15_000 } as any,
  });

  useEffect(() => {
    if (!townId) {
      setLastSeenId(null);
      setInitialized(false);
      seededRef.current = false;
      return;
    }

    seededRef.current = false;
    setInitialized(false);

    getLastSeenActivityId(townId).then((stored) => {
      if (stored !== null) {
        setLastSeenId(stored);
        seededRef.current = true;
        setInitialized(true);
      }
    });
  }, [townId]);

  useEffect(() => {
    if (!townId || seededRef.current) return;

    (async () => {
      const stored = await getLastSeenActivityId(townId);
      if (stored !== null) {
        setLastSeenId(stored);
        seededRef.current = true;
        setInitialized(true);
        return;
      }

      const maxId = activities.length > 0 ? Math.max(...activities.map((a) => a.id)) : 0;
      if (maxId > 0) await setLastSeenActivityId(townId, maxId);
      setLastSeenId(maxId);
      seededRef.current = true;
      setInitialized(true);
    })();
  }, [townId, activities]);

  const unreadCount = useMemo(() => {
    if (!initialized || lastSeenId === null) return 0;
    return countUnreadActivities(activities, lastSeenId);
  }, [activities, lastSeenId, initialized]);

  const markAllRead = useCallback(async () => {
    if (!townId) return;
    const maxId = activities.length > 0 ? Math.max(...activities.map((a) => a.id)) : lastSeenId ?? 0;
    await setLastSeenActivityId(townId, maxId);
    setLastSeenId(maxId);
  }, [townId, activities, lastSeenId]);

  const value = useMemo(() => ({ unreadCount, markAllRead }), [unreadCount, markAllRead]);

  return <ActivityUnreadContext.Provider value={value}>{children}</ActivityUnreadContext.Provider>;
}

export function useActivityUnread() {
  return useContext(ActivityUnreadContext);
}
