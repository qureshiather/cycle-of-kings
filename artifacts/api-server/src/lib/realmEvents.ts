import { getCurrentSeasonInfo } from "./gameEngine.js";

const MS_PER_HOUR = 3_600_000;
const MS_PER_WEEK = MS_PER_HOUR * 24 * 7;
const MS_PER_CYCLE = MS_PER_WEEK * 4;

export const EVENTS_PER_WEEK = 3;
const MIN_EVENT_HOURS = 18;
const MAX_EVENT_HOURS = 36;

export type ResourceModifiers = { gold: number; food: number; wood: number; stone: number };

export type RealmEventCatalogEntry = {
  id: string;
  title: string;
  flavor: string;
  modifiers: ResourceModifiers;
};

export const REALM_EVENT_CATALOG: RealmEventCatalogEntry[] = [
  { id: "drought", title: "Drought", flavor: "The wells run low across the realm.", modifiers: { gold: 1, food: 0.75, wood: 1, stone: 1 } },
  { id: "harvest_festival", title: "Harvest Festival", flavor: "Bountiful markets celebrate the season.", modifiers: { gold: 1.15, food: 1.2, wood: 1, stone: 1 } },
  { id: "bandit_raid", title: "Bandit Uprising", flavor: "Trade routes are unsafe.", modifiers: { gold: 0.85, food: 1, wood: 0.9, stone: 1 } },
  { id: "royal_tax", title: "Royal Tax", flavor: "The crown collects its due.", modifiers: { gold: 0.8, food: 1, wood: 1, stone: 1 } },
  { id: "merchant_caravan", title: "Merchant Caravan", flavor: "Rare goods arrive from distant lands.", modifiers: { gold: 1.2, food: 1, wood: 1, stone: 1 } },
  { id: "blight", title: "Blight", flavor: "Crops wither in the fields.", modifiers: { gold: 1, food: 0.85, wood: 0.9, stone: 1 } },
  { id: "wolf_moon", title: "Wolf Moon", flavor: "Livestock are lost to the night.", modifiers: { gold: 1, food: 0.9, wood: 1, stone: 1 } },
  { id: "stone_quarry_boon", title: "Stone Vein", flavor: "Quarrymen uncover a rich vein.", modifiers: { gold: 1, food: 1, wood: 1, stone: 1.25 } },
  { id: "ironwood_grove", title: "Ironwood Grove", flavor: "Enchanted timber is harvested.", modifiers: { gold: 1, food: 1, wood: 1.25, stone: 1 } },
  { id: "dragon_sighted", title: "Dragon Sighted", flavor: "Fear spreads through the countryside.", modifiers: { gold: 0.95, food: 0.9, wood: 0.95, stone: 1 } },
  { id: "pilgrim_blessing", title: "Pilgrim Blessing", flavor: "Shrine offerings bring good fortune.", modifiers: { gold: 1.1, food: 1.05, wood: 1, stone: 1 } },
  { id: "fey_mist", title: "Fey Mist", flavor: "Strange luck drifts over the kingdoms.", modifiers: { gold: 1.05, food: 1, wood: 1.05, stone: 1 } },
];

const NEUTRAL_MODIFIERS: ResourceModifiers = { gold: 1, food: 1, wood: 1, stone: 1 };

const catalogById = new Map(REALM_EVENT_CATALOG.map((e) => [e.id, e]));

function seededRandom(seed: number): () => number {
  let s = seed;
  return function () {
    s = (Math.imul(1664525, s) + 1013904223) | 0;
    return (s >>> 0) / 0xffffffff;
  };
}

export type ScheduledRealmEvent = {
  id: string;
  title: string;
  flavor: string;
  startsAt: string;
  endsAt: string;
};

type EventWindow = ScheduledRealmEvent & { modifiers: ResourceModifiers };

function buildCycleSchedule(cycleNumber: number, cycleStartedAt: string): EventWindow[] {
  const cycleStartMs = new Date(cycleStartedAt).getTime();
  const seed = cycleNumber * 10_000 + Math.floor(cycleStartMs / 86_400_000);
  const rng = seededRandom(seed);
  const windows: EventWindow[] = [];

  for (let week = 0; week < 4; week++) {
    const weekStart = cycleStartMs + week * MS_PER_WEEK;
    const weekEnd = weekStart + MS_PER_WEEK;
    const placed: { start: number; end: number }[] = [];

    for (let i = 0; i < EVENTS_PER_WEEK; i++) {
      const durationMs = (MIN_EVENT_HOURS + Math.floor(rng() * (MAX_EVENT_HOURS - MIN_EVENT_HOURS + 1))) * MS_PER_HOUR;
      let start = 0;
      let attempts = 0;
      while (attempts < 40) {
        const maxStart = weekEnd - durationMs - MS_PER_HOUR;
        if (maxStart <= weekStart) break;
        start = weekStart + Math.floor(rng() * (maxStart - weekStart));
        const end = start + durationMs;
        const overlaps = placed.some((p) => start < p.end && end > p.start);
        if (!overlaps) {
          placed.push({ start, end });
          const entry = REALM_EVENT_CATALOG[Math.floor(rng() * REALM_EVENT_CATALOG.length)]!;
          windows.push({
            id: entry.id,
            title: entry.title,
            flavor: entry.flavor,
            startsAt: new Date(start).toISOString(),
            endsAt: new Date(end).toISOString(),
            modifiers: entry.modifiers,
          });
          break;
        }
        attempts++;
      }
    }
  }

  windows.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return windows;
}

let scheduleCache: { key: string; windows: EventWindow[] } | null = null;

function getSchedule(): EventWindow[] {
  const { cycleNumber, cycleStartedAt } = getCurrentSeasonInfo();
  const key = `${cycleNumber}:${cycleStartedAt}`;
  if (scheduleCache?.key === key) return scheduleCache.windows;
  const windows = buildCycleSchedule(cycleNumber, cycleStartedAt);
  scheduleCache = { key, windows };
  return windows;
}

export function getCycleEventSchedule(): ScheduledRealmEvent[] {
  return getSchedule().map(({ id, title, flavor, startsAt, endsAt }) => ({
    id,
    title,
    flavor,
    startsAt,
    endsAt,
  }));
}

export function getActiveRealmEvent(now = Date.now()): (EventWindow & { modifiers: ResourceModifiers }) | null {
  const t = now;
  for (const w of getSchedule()) {
    const start = new Date(w.startsAt).getTime();
    const end = new Date(w.endsAt).getTime();
    if (t >= start && t < end) return w;
  }
  return null;
}

export function getUpcomingRealmEvent(now = Date.now()): ScheduledRealmEvent | null {
  for (const w of getSchedule()) {
    if (new Date(w.startsAt).getTime() > now) return w;
  }
  return null;
}

export function getRealmEventModifiers(now = Date.now()): ResourceModifiers {
  const active = getActiveRealmEvent(now);
  return active?.modifiers ?? NEUTRAL_MODIFIERS;
}

export function getRealmEventById(id: string): RealmEventCatalogEntry | undefined {
  return catalogById.get(id);
}
