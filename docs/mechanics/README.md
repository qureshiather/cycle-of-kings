# Game mechanics reference

Design documentation for **Cycle of Kings** (Medieval Empires). You can read these pages to understand how the game works and tune balance **without reading source code**.

When implementation changes, update these docs in the same PR (or immediately after) so design and code stay aligned.

## How to use this

1. **Onboarding** — Read in order below for the full picture.
2. **Balance passes** — Skim [balance-reference.md](./balance-reference.md) for every knob in one table, then edit the relevant chapter.
3. **Fun review** — Ask: “Does the population ↔ food loop create interesting pressure?” “Do mission boards feel fair at TH2 vs TH5?” Use the chapters, not the repo.

## Chapters

| Doc | Topics |
|-----|--------|
| [core-loop-and-resources.md](./core-loop-and-resources.md) | Time ticks, four resources, gross vs net food, seasons |
| [buildings.md](./buildings.md) | Unlock tree, costs, production, upgrades, demolish |
| [population.md](./population.md) | Cap, growth, starvation, morale, what does *not* kill pop |
| [combat-forces.md](./combat-forces.md) | Troops, power, defense, raids, availability |
| [missions-and-operations.md](./missions-and-operations.md) | Land/naval missions, espionage, boards, slots, loot |
| [world-meta.md](./world-meta.md) | Trade, peaceful mode, leaderboard, cycles, reset, achievements |
| [progression-and-endgame.md](./progression-and-endgame.md) | Season objectives, cycle tiers, full wipe policy |
| [balance-reference.md](./balance-reference.md) | Single-page constants and formulas |

## Implementation map (for devs only)

| Mechanic | Primary code |
|----------|----------------|
| Balance constants | `artifacts/api-server/src/lib/gameEngine.ts` |
| Build unlocks | `lib/building-progression/src/index.ts` |
| Achievements | `lib/achievements/src/index.ts` |
| Season objectives | `lib/season-objectives/src/index.ts` |
| Routes | `artifacts/api-server/src/routes/*.ts` |

Mobile display costs/copy: `artifacts/mobile/lib/buildingMeta.ts` (must match server).
