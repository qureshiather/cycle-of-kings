# Game domain rules (agents)

**Human-readable design reference:** [../mechanics/README.md](../mechanics/README.md) — use that for balance and fun review without code.

This file is a **short index** for implementation. Do not contradict `docs/mechanics/`.

## Where to change what

| Topic | Design doc | Code |
|-------|------------|------|
| Buildings, unlocks, mission slots | [buildings.md](../mechanics/buildings.md) | `lib/building-progression/`, `slots.ts` |
| Resources, seasons, ticks | [core-loop-and-resources.md](../mechanics/core-loop-and-resources.md) | `gameEngine.ts`, `towns.ts` |
| Population / food | [population.md](../mechanics/population.md) | `gameEngine.ts` `applyFullTick` |
| Army, raids | [combat-forces.md](../mechanics/combat-forces.md) | `gameEngine.ts`, `raids.ts`, `army.ts` |
| Missions, navy, spies | [missions-and-operations.md](../mechanics/missions-and-operations.md) | `missions.ts`, `spy.ts` |
| Trade, peaceful, meta | [world-meta.md](../mechanics/world-meta.md) | `trade.ts`, `towns.ts`, `leaderboard.ts` |
| Progression / endgame | [progression-and-endgame.md](../mechanics/progression-and-endgame.md) | `season-objectives`, `kingdomReset.ts` |
| All constants | [balance-reference.md](../mechanics/balance-reference.md) | `gameEngine.ts` |

## Agent rules (unchanged)

1. **Contract-first API** — `lib/api-spec/openapi.yaml` → `pnpm codegen`
2. **Enforce on server** — never UI-only locks for exploits
3. **Sync mobile display** — `buildingMeta.ts` when costs/production strings change
4. **Update mechanics docs** when changing player-visible rules
5. `pnpm typecheck` after schema/balance changes

## Quick facts (easy to get wrong)

- **Food is not a build cost** — only population upkeep and economy pressure.
- **House → population cap**, not troop cap. Troop **caps** = Barracks×5 + Archery×5 + Stables×3 per level; troops are **recruited** into those caps.
- **Net food** = gross production − `0.4 × population` − `0.4 × recruited troops`.
- **Naval / spies** = missions only, not raids.
- **Peaceful** is permanent; excludes leaderboard and raids.
- Mission + spy boards refresh every **30m**, not hourly.

## Stale / ignore

- `replit.md` — outdated grid references
- `TownGrid.tsx` — legacy UI; use `KingdomMap.tsx`
