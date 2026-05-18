# API & codegen

## Contract-first workflow

1. Edit **`lib/api-spec/openapi.yaml`** (paths, schemas, `operationId`)
2. Run **`pnpm codegen`** (Orval → React Query + Zod)
3. Implement handler in **`artifacts/api-server/src/routes/*.ts`**
4. Use generated hook in mobile: `useGetTown`, `useBuildSlot`, etc. from `@workspace/api-client-react`

Generated outputs (do not edit):

- `lib/api-client-react/src/generated/api.ts` — hooks + fetch functions
- `lib/api-zod/src/generated/` — Zod schemas

Orval config: `lib/api-spec/orval.config.ts`

## URL shape

All routes: **`/api/...`**

Examples:

```
GET  /api/healthz
POST /api/players
GET  /api/towns/:townId
GET  /api/towns/:townId/slots
POST /api/towns/:townId/slots/:slotType/build
POST /api/towns/:townId/slots/:slotType/upgrade
PATCH /api/towns/:townId/peaceful
GET  /api/leaderboard
POST /api/raids
GET  /api/game/state
```

## Error responses

Handlers typically return:

```json
{ "error": "Human-readable message" }
```

Optional extra fields (e.g. `{ "error": "...", "cost": { ... } }`).

Mobile mutations often read `e?.data?.error` or `e?.message` from the custom fetch wrapper.

## Implementing a new endpoint

1. Add path + schemas to `openapi.yaml` with a unique `operationId`
2. `pnpm codegen`
3. Add Express route in the appropriate `routes/*.ts` file
4. Register router in `routes/index.ts` if new file
5. Wire mobile with the new `useXxx` hook

## Slots route patterns

`artifacts/api-server/src/routes/slots.ts`:

- `initSlotsForTown(townId)` — ensures all `SLOT_TYPES` rows exist (Town Hall at level 1)
- `getTickedTown` — used internally for tick + scores
- Build checks `getBuildBlockReason` from `@workspace/building-progression`
- Costs/durations from `gameEngine.ts` (`calculateBuildingCost`, `getUpgradeDurationMs`)

## Towns route patterns

`artifacts/api-server/src/routes/towns.ts`:

- `getAndTickTown` — lighter tick for town GET (no full slot export)
- **Peaceful mode** — `PATCH` with `{ "peaceful": true }` only; permanent opt-in; see [game-domain.md](./game-domain.md)
- **Reset** — demolishes slots, resets resources; does not clear peaceful mode

## Leaderboard

`artifacts/api-server/src/routes/leaderboard.ts`:

- Excludes `peacefulMode === true` towns before ranking
- Sort by `economyScore + armyScore`

## Raids

`artifacts/api-server/src/routes/raids.ts`:

- Blocks attackers/defenders in peaceful mode
- Uses `gameEngine` combat helpers

## Validation

Express handlers often validate with manual checks + `SLOT_TYPES.includes(...)`. Zod generated from OpenAPI exists in `@workspace/api-zod` for tooling/tests; routes may not use every schema yet.

## Building the API for production

```bash
pnpm build   # turbo → api-server esbuild → dist/
```

Env at runtime: `DATABASE_URL`, `PORT`.
