# Game domain rules

Source of truth for mechanics agents must not contradict.

## Buildings & progression

**Package:** `lib/building-progression/src/index.ts`

First-time **build** requirements (upgrades only need resources once built):

| Town Hall | Unlocks | Also requires |
|-----------|---------|---------------|
| 1 | Farm, House (TH starts Lv 1) | — |
| 2 | Lumber Mill, Quarry, Mine, Wall | — |
| 3 | Market, Tavern, Barracks | Wall Lv 1 |
| 4 | Archery Range, Stables | Barracks Lv 1 |
| 5 | Watch Tower | Wall Lv 2 |

Exports used by API and mobile:

- `BUILD_REQUIREMENTS`, `BUILDING_GRID_ORDER`
- `getBuildBlockReason(slotType, slots)` → string or null
- `getTownHallLevel(slots)`
- `formatRequirementHint(slotType)`

**Enforcement:** `artifacts/api-server/src/routes/slots.ts` on `POST .../build`.

**Town Hall:** Cannot build or demolish via slot APIs. Upgrade like other buildings. Bonuses in `gameEngine.ts` (gold/h, build speed).

## Costs & production

**File:** `artifacts/api-server/src/lib/gameEngine.ts`

- `BUILDING_COSTS`, `UPGRADE_COST_MULTIPLIER` (1.8 per level)
- `calculateBuildingCost(slotType, level)`
- `calculateProduction(slots, season)` — season modifiers from `getSeasonModifiers`
- `REFUND_RATIO` = 0.75 on demolish
- Upgrade timers: `getUpgradeDurationMs` (Town Hall level speeds builds)

When changing balance, update **both** `gameEngine.ts` and `artifacts/mobile/lib/buildingMeta.ts` (display costs).

## Seasons & cycles

- `getCurrentSeasonInfo()` → `season`, `cycleNumber`, `cycleStartedAt`, `nextWipeAt`
- Four seasons per cycle; production modifiers vary by season
- Mission cards: hourly seed (see `missions.ts` route) — deterministic per hour

## Army & raids

- Troop types: infantry, archers, cavalry (catapults in API schema where applicable)
- `calculateArmyComposition`, `calculateStaticDefense`, `calculateTotalDefense`
- Raids: `POST /api/raids` with attacker/defender town IDs + troop counts
- Victory loot ~30% of defender resources (see raids route / gameEngine)

## Peaceful mode (permanent PvE opt-out)

**DB:** `towns.peaceful_mode`, `towns.peaceful_opted_in_cycle`

**Rules:**

1. Player may only send `PATCH /towns/:id/peaceful` with `{ "peaceful": true }`
2. **Cannot disable** once opted in (`peacefulOptedInCycle` set)
3. One opt-in per kingdom lifetime (tracked by `peacefulOptedInCycle` = cycle number when enabled)
4. While peaceful: cannot raid or be raided (`raids.ts`)
5. **Excluded from leaderboard** (`leaderboard.ts` filters `peacefulMode`)

**Mobile:** World → Settings — enable only, strong confirmation, banner on leaderboard when peaceful.

## Leaderboard

- Score = `economyScore + armyScore` from building slots
- Peaceful towns not listed
- Mobile: `useGetLeaderboard` on World tab

## Kingdom reset

`POST /towns/:townId/reset`:

- Clears buildings (except TH behavior via init), army, missions
- Restores starter resources
- Does **not** clear peaceful mode

## Activities

Server inserts rows into `activities` for upgrades, builds, raids, reset, etc. Mobile may show feed via activities API.

## Missions

Card types/difficulties generated in `missions.ts` using `gameEngine` helpers. Active missions stored per town.

## Trade routes

`trade.ts` — list/create/delete routes per town.

## Trophies

`players/:id/trophies` — persistent across cycles (`cycleNumber` on trophy rows).

## When changing game rules

1. Update shared package or `gameEngine.ts`
2. Enforce in the relevant **route** (never UI-only for exploits)
3. Update mobile copy/locks if player-visible
4. Update [README.md](../../README.md) progression section if build tree changes
5. `pnpm typecheck`
