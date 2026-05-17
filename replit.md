# Cycle of Kings

A medieval town-building strategy mobile game with live backend. Build a 9×9 kingdom, command armies, raid rivals, and dominate the seasonal leaderboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at /api)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo SDK 54, React Native 0.81.5, expo-router v6
- API: Express 5, pino logging
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec → React Query hooks)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth for all endpoints)
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/` — generated Zod schemas
- `lib/db/src/schema/` — all Drizzle table definitions (players, towns, gridCells, army, missions, raids, tradeRoutes, fortifications, trophies)
- `artifacts/api-server/src/lib/gameEngine.ts` — core game logic (seasons, production, combat, mission generation)
- `artifacts/api-server/src/routes/` — all API route handlers
- `artifacts/mobile/app/(tabs)/` — 5 game screens (Kingdom, Army, Missions, World, Treasury)
- `artifacts/mobile/context/GameContext.tsx` — player/town state (AsyncStorage persistence)
- `artifacts/mobile/components/` — ResourceBar, TownGrid, SeasonBadge

## Architecture decisions

- Contract-first API: OpenAPI spec written first, then Orval generates type-safe React Query hooks — no manual fetching
- Lazy resource tick: resources are calculated on-demand (when GET /towns/:id is called) rather than via a cron job — simpler and scales naturally
- Seeded mission cards: mission cards for the hour are deterministically generated from a seed (year×month×day×hour), so all players see the same 5 cards per hour without DB storage
- AsyncStorage device ID: no auth/sessions — player identified by a UUID stored in AsyncStorage + localStorage (survives app restart but not reinstall)
- Fortification border bonus: cells at the 9×9 grid edge get a defense bonus when walls are placed there — adds spatial strategy

## Product

- **Kingdom** — 9×9 building grid. Place and upgrade 7 building types (Farm, Mine, Quarry, Barracks, Market, Tavern, House). Tap empty cell → building picker with costs. Tap existing → upgrade or demolish (75% refund).
- **Army** — Recruit Infantry, Archers, Cavalry, Catapults. Formation bonuses (Infantry+Archers). Per-type costs in gold/food/wood/stone.
- **Missions** — 5 hourly mission cards (Explore/Patrol/Raid/Siege × Safe/Moderate/Risky/Deadly). Deploy troops to improve success rate. Loot returned automatically on resolution.
- **World** — Live leaderboard (score = resources + military power + population). Raid any other town — 30% resource loot on victory. View raid history.
- **Treasury** — Current season info (Spring/Summer/Autumn/Winter), season production modifiers, per-building production breakdown, resource stockpile totals.
- **Seasons** — 4-month wipe cycles. Current season drives production modifiers (e.g. Spring: +30% food, +20% wood; Winter: −30% food).

## User preferences

- Dark medieval theme: background `#0e0c08`, gold accent `#d4a520`, forced dark mode
- No auth required for MVP — device ID stored in AsyncStorage

## Gotchas

- `pnpm --filter @workspace/api-spec run codegen` must be run after any OpenAPI spec changes
- `pnpm --filter @workspace/db run push` must be run after schema file changes
- Do not run `pnpm dev` at the workspace root — use `restart_workflow` instead
- The Slider component was removed from React Native core — use manual +/- buttons only

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Season epoch is Jan 1, 2024 — each 30-day month = 1 season
