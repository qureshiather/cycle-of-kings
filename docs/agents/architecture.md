# Architecture

## High-level flow

```
Mobile (Expo)
  → @workspace/api-client-react (React Query hooks from OpenAPI)
  → HTTP /api/*
  → Express (artifacts/api-server)
  → Drizzle ORM (lib/db)
  → PostgreSQL
```

Shared logic that must stay in sync:

- `lib/building-progression` — first-build requirements (Town Hall gates, prereq buildings)
- `artifacts/api-server/src/lib/gameEngine.ts` — production, costs, combat, seasons, scores

## Resource ticking

Resources are **not** updated by a cron job. When `GET /api/towns/:townId` runs, the server:

1. Completes any finished building upgrades
2. Computes hourly production from slots + current season modifiers
3. Applies elapsed time since `lastTickAt`
4. Persists gold/food/wood/stone and returns updated town

Any screen that needs fresh resources should use `useGetTown` or invalidate `getGetTownQueryKey(townId)` after mutations.

## Building model (current)

Towns have **fixed slots** (one row per `slotType` in `building_slots`), not a free-placement grid.

- Slot types: `lib/db/src/schema/buildingSlots.ts` → `SLOT_TYPES`
- Town Hall starts at level 1; cannot build/demolish via normal build API
- Build: `POST /towns/:townId/slots/:slotType/build` (level 0 → 1)
- Upgrade: `POST .../upgrade` (timed, `upgrading` + `upgradeEndsAt`)
- Demolish: `DELETE ...` (75% refund, `REFUND_RATIO` in gameEngine)

Mobile UI: scrollable list in `KingdomMap.tsx`, not `TownGrid.tsx`.

## Seasons & cycles

Defined in `gameEngine.ts`:

- Epoch: `2024-01-01`
- ~30 days per “month”; 4 months = **one cycle** (`cycleNumber`)
- Season within cycle: spring → summer → autumn → winter (production modifiers)

`GET /api/game/state` exposes `cycleNumber`, `season`, `nextWipeAt`, weather, etc.

## Scores

- **Economy score** — weighted sum of economic building levels
- **Army score** — military building composition power
- **Leaderboard score** — economy + army (peaceful towns excluded server-side)

## Database tables (Drizzle)

| Schema file | Table / purpose |
|-------------|-----------------|
| `players.ts` | Players (linked by `deviceId`) |
| `towns.ts` | Resources, `peacefulMode`, `peacefulOptedInCycle` |
| `buildingSlots.ts` | Per-town building slots |
| `army.ts` | Troop counts + on-mission |
| `missions.ts` | Active missions |
| `raids.ts` | Raid history |
| `tradeRoutes.ts` | Trade routes |
| `trophies.ts` | Cross-cycle trophies |
| `activities.ts` | Activity feed |

No `gridCells` table in current schema — grid was replaced by slots.

## API route modules

Mounted under `/api` in `artifacts/api-server/src/routes/index.ts`:

| Router | Prefix / notes |
|--------|----------------|
| `health.ts` | `/healthz` |
| `players.ts` | `/players` |
| `towns.ts` | `/towns`, peaceful, reset |
| `slots.ts` | `/towns/:townId/slots` |
| `army.ts` | `/towns/:townId/army` |
| `missions.ts` | `/missions`, town missions |
| `raids.ts` | `/raids`, town raid history |
| `trade.ts` | Trade routes |
| `leaderboard.ts` | `/leaderboard` |
| `game.ts` | `/game/state` |
| `activities.ts` | Activity feed |

## Turborepo

`turbo.json` defines `build`, `typecheck`, `dev`, `codegen`, `push`. Package `typecheck` depends on `^typecheck` (upstream libs first).

`api-server` uses TypeScript project references to `lib/db` — run db typecheck after schema edits if API types look stale.
