# Agent guide — Cycle of Kings (Medieval Empires)

This repo is a **pnpm + Turborepo** monorepo: **Expo mobile app**, **Express API**, **PostgreSQL (Drizzle)**. Read this file first, then the focused docs under [`docs/agents/`](docs/agents/).

## Quick start

```bash
pnpm install
cp .env.example .env
pnpm db:up && pnpm db:push
pnpm dev:api      # terminal 1 — http://localhost:8080
pnpm dev:mobile   # terminal 2 — Expo
```

Health: `GET http://localhost:8080/api/healthz`

## Golden rules

1. **Contract-first API** — Edit `lib/api-spec/openapi.yaml`, then run `pnpm codegen`. Never hand-edit `lib/api-client-react/src/generated/` or `lib/api-zod/src/generated/`.
2. **Schema changes** — Edit `lib/db/src/schema/*`, then `pnpm db:push`. Rebuild DB types: `pnpm --filter @workspace/db run typecheck` before API typecheck if TS complains.
3. **Shared game rules** — Building prerequisites live in `lib/building-progression/`. Enforce on API **and** reflect in mobile UI.
4. **Use pnpm only** — Root `preinstall` rejects npm/yarn.
5. **Small diffs** — Match existing patterns; no drive-by refactors or new markdown unless asked.
6. **No commits** unless the user explicitly asks.

## Where to change what

| Goal | Start here |
|------|------------|
| New/changed endpoint | `lib/api-spec/openapi.yaml` → `artifacts/api-server/src/routes/` → `pnpm codegen` |
| DB column/table | `lib/db/src/schema/` → `pnpm db:push` |
| Building unlock rules | `lib/building-progression/src/index.ts` + `artifacts/api-server/src/routes/slots.ts` |
| Core math (production, combat, seasons) | `artifacts/api-server/src/lib/gameEngine.ts` |
| Kingdom / buildings UI | `artifacts/mobile/components/KingdomMap.tsx`, `artifacts/mobile/lib/buildingMeta.ts` |
| World / raids / peaceful / leaderboard | `artifacts/mobile/app/(tabs)/world.tsx`, `artifacts/api-server/src/routes/towns.ts`, `leaderboard.ts`, `raids.ts` |
| Player session (no auth) | `artifacts/mobile/context/GameContext.tsx`, `artifacts/mobile/lib/deviceId.ts` |
| Android API URL | `artifacts/mobile/lib/resolveApiBaseUrl.ts`, `EXPO_PUBLIC_API_URL` in `.env` |

## Package map

```
artifacts/
  mobile/           @workspace/mobile   — Expo SDK 54, expo-router
  api-server/       @workspace/api-server — Express 5, /api prefix
lib/
  api-spec/         OpenAPI source → Orval
  api-client-react/ Generated React Query hooks (mobile consumes this)
  api-zod/          Generated Zod (API validation if used)
  db/               Drizzle schema + push
  building-progression/ Shared build prerequisites (API + mobile)
```

## Mobile tabs

| Tab | File | Purpose |
|-----|------|---------|
| Kingdom | `app/(tabs)/index.tsx` | Resources, scrollable building list (`KingdomMap`) |
| Army | `app/(tabs)/army.tsx` | Recruit / view troops |
| Missions | `app/(tabs)/missions.tsx` | Hourly mission cards |
| World | `app/(tabs)/world.tsx` | Leaderboard, raids, settings (peaceful mode) |
| Treasury | `app/(tabs)/treasury.tsx` | Season + production breakdown |

Setup flow: `app/setup.tsx` → creates player via API, stores IDs in AsyncStorage.

## Auth model

**No login.** A device UUID (`deviceId`) identifies the player. `GameContext` persists `playerId`, `townId`, `playerName` in AsyncStorage.

## Common commands

| Command | Use |
|---------|-----|
| `pnpm dev` | API + mobile in parallel |
| `pnpm typecheck` | All packages |
| `pnpm codegen` | Regenerate client + zod from OpenAPI |
| `pnpm db:push` | Apply Drizzle schema to Postgres |
| `pnpm --filter @workspace/api-server run dev` | API only |
| `pnpm --filter @workspace/mobile run dev` | Expo only |

## Docs

**Game mechanics (design / balance, no code):** [docs/mechanics/README.md](docs/mechanics/README.md)

**Agents & implementation:**

- [Architecture & data flow](docs/agents/architecture.md)
- [Development workflow](docs/agents/development.md)
- [API & codegen](docs/agents/api.md)
- [Mobile app](docs/agents/mobile.md)
- [Game domain index](docs/agents/game-domain.md) → links to mechanics docs

## Stale / ignore

- `replit.md` — partially outdated (still mentions 9×9 grid); prefer this guide and `docs/agents/`.
- `artifacts/mobile/components/TownGrid.tsx` — legacy grid UI, unused; kingdom uses `KingdomMap.tsx`.
- `artifacts/mockup-sandbox/` — optional web mockup, not required for mobile dev.

## UI theme

Dark medieval: background `#0e0c08`, gold `#d4a520`. Colors via `hooks/useColors.ts` + `constants/colors.ts`. Fonts: Inter (loaded in root layout).
