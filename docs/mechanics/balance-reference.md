# Balance reference (quick lookup)

All values reflect current server rules (`gameEngine.ts`, `building-progression`). Use this page when tuning; update chapter docs if behavior changes.

## Global knobs

| Knob | Value |
|------|-------|
| Upgrade cost multiplier | **1.8×** per level |
| Demolish refund | **75%** of level cost |
| Base production (each resource) | **5/h** |
| Food per citizen | **0.4/h** |
| Pop growth base | **1.5/h** |
| Pop starvation rate | **8%/h** of current pop (min 1 per tick) |
| Pop floor (with TH) | **5** |
| Starting / reset population | **10** |
| Mission board refresh | **30 minutes** |
| Mission loot roll | **35%–165%** of card base |
| Mercenary cost | **10 gold** each |
| Raid loot | **30%** defender resources |
| Max concurrent missions | **min(TH level, 3)** |
| Max concurrent spy ops | **min(Spy Guild level, 2)** |

## Season modifiers

| Season | Gold | Food | Wood | Stone |
|--------|------|------|------|-------|
| Spring | 1.0 | 1.3 | 1.2 | 1.0 |
| Summer | 1.2 | 1.1 | 1.0 | 1.0 |
| Autumn | 1.0 | 0.9 | 1.3 | 1.1 |
| Winter | 0.9 | 0.7 | 0.8 | 0.9 |

## Production per building level

| Building | Food | Gold | Wood | Stone |
|----------|------|------|------|-------|
| Farm | 5 | — | — | — |
| Mine | — | 3 | — | — |
| Quarry | — | — | — | 4 |
| Lumber Mill | — | — | 8 | — |
| Market | — | 2 | — | — |
| Town Hall | — | 3 | — | — |

Town Hall also grants **+3 gold/h per TH level** (bonus stack).

## Economy score weights (per level)

| Building | Weight |
|----------|--------|
| Farm | 8 |
| Mine | 6 |
| Quarry | 7 |
| Lumber Mill | 10 |
| Market | 12 |
| Tavern | 8 |
| House | 8 |
| Museum | 15 |
| Monument | 25 |

## Population

```
cap = 20 + houseLevel×15 + townHallLevel×5     (TH ≥ 1 else cap 0)

upkeep/h = population × 0.4

growth/h = 1.5 + tavern×0.5 + museum×1 + monument×2 + morale×0.02
  (only if fed: stockpile > 0 OR production > upkeep)
```

## Morale

```
morale = min(100, tavern×4 + museum×6 + monument×10)
```

## Army

| Source | Formula |
|--------|---------|
| Infantry | barracksLevel × 5 |
| Archers | archeryLevel × 5 |
| Cavalry | stablesLevel × 3 |
| Ships | shipyardLevel × 2 |
| Spies | spyGuildLevel × 3 |
| Attack mult | 1 + (buildingLevel − 1) × 0.15 per military building |

**Unit power:** inf 10, arch 15, cav 12; infantry+archers synergy; cavalry +10% total when cav > 0.

## Defense

```
static = 10 + wall×20 + tower×30
totalDefense = static + power(available troops)
```

## Town Hall build speed

```
multiplier = max(0.55, 1 − (THlevel − 1) × 0.05)
```

## Upgrade base minutes

| Building | Base min |
|----------|----------|
| Farm | 5 |
| Mine | 8 |
| Quarry | 6 |
| Lumber Mill | 6 |
| Barracks / Archery | 10 |
| Stables | 12 |
| Market | 10 |
| Tavern | 12 |
| House | 7 |
| Town Hall | 15 |
| Wall | 8 |
| Tower | 12 |
| Spy Guild | 14 |
| Shipyard | 16 |
| Museum | 18 |
| Monument | 25 |

Effective: `base × 2^(level−1) × 60s × TH build multiplier`.

## Level 1 build costs (wood / stone / gold)

| Building | W | S | G |
|----------|---|---|---|
| farm | 50 | 20 | 0 |
| house | 30 | 20 | 0 |
| mine | 30 | 50 | 0 |
| quarry | 20 | 30 | 0 |
| lumberMill | 0 | 30 | 0 |
| market | 40 | 0 | 20 |
| tavern | 50 | 20 | 10 |
| barracks | 60 | 40 | 30 |
| archeryRange | 50 | 30 | 20 |
| stables | 70 | 20 | 40 |
| wall | 0 | 40 | 0 |
| townHall | 80 | 60 | 50 |
| spyGuild | 55 | 25 | 35 |
| shipyard | 80 | 30 | 25 |
| museum | 60 | 50 | 40 |
| monument | 100 | 120 | 80 |
| tower | 20 | 60 | 20 |

## Mission card generation (summary)

| Parameter | Land | Naval |
|-----------|------|-------|
| Cards on board | 5 total | 1–2 slots if shipyard |
| Base success (diff) | easy 85%, med 65%, hard 45% | +2% per shipyard level |
| Min troops/ships | fraction of army/ship pool | ships only |
| Loot mult (diff) | 0.8 / 1.6 / 2.8 | wood/stone ×1.35 |

## Spy card generation (summary)

| Parameter | Value |
|-----------|-------|
| Cards | 4 |
| Base success | easy 70%, med 50%, hard 32% |
| Jackpot chance | ~8% (6–10× loot mult) |
| Spy loss | 10% success, 40% fail |

## Mission combat casualties

| Result | Own troops |
|--------|------------|
| Success | 5% |
| Fail | 20% |

## Raid combat

```
winChance = attackPower / (attackPower + defenderStrength)
```

Casualties: victory ~(1−winChance)×40% sent; defeat ~30% sent.

## Reset starter pack

200 gold, 200 food, 150 wood, 100 stone, population 10, TH level 1.

## Implementation sync checklist

When changing a number:

1. Edit `artifacts/api-server/src/lib/gameEngine.ts` (and `building-progression` if unlocks).
2. Edit `artifacts/mobile/lib/buildingMeta.ts` for displayed costs/bonuses.
3. Update the matching `docs/mechanics/*.md` section and this page.
4. Run `pnpm typecheck`.
