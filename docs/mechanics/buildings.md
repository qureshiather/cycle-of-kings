# Buildings

## Slots

Each kingdom has a fixed set of **building slots** (one per type). A slot is either empty (level 0) or built (level ≥ 1). **Town Hall** cannot be demolished; it starts at level 1 on a new kingdom.

**UI categories** (Kingdom map):

1. **Production** — Town Hall, Farm, House, Lumber Mill, Quarry, Mine, Wall, Market, Watch Tower  
2. **Army** — Barracks, Archery Range, Stables, Spy Guild, Shipyard  
3. **Culture** — Tavern, Museum, Monument  

## First-time build requirements

Upgrades only cost resources once the building exists. **First build** also needs Town Hall level and sometimes other buildings:

| Building | Town Hall | Also requires |
|----------|-----------|---------------|
| Farm, House | 1 | — |
| Lumber Mill, Quarry, Mine, Wall | 2 | — |
| Market, Tavern, Barracks | 3 | Barracks needs **Wall 1** |
| Archery Range, Stables, Spy Guild, Shipyard, Museum | 4 | Archery/Stables: **Barracks 1**; Spy Guild: **Market 1**; Shipyard: **Lumber Mill 1**; Museum: **Tavern 1** |
| Monument, Watch Tower | 5 | Monument: **Museum 1**; Tower: **Wall 2** |

## Build and upgrade costs

- Each building has a **base cost** in wood, stone, gold (food cost is always **0**).
- Cost for target level `L` scales by **1.8^(L−1)** on each resource (rounded up).
- **Demolish** refunds **75%** of the cost that was paid to reach the current level (implementation uses current level cost × 0.75).

Example bases (level 1 → 2 uses ×1.8):

| Building | Wood | Stone | Gold |
|----------|------|-------|------|
| Farm | 50 | 20 | 0 |
| House | 30 | 20 | 0 |
| Barracks | 60 | 40 | 30 |
| Town Hall | 80 | 60 | 50 |
| Shipyard | 80 | 30 | 25 |
| Spy Guild | 55 | 25 | 35 |
| Monument | 100 | 120 | 80 |

(Full table in [balance-reference.md](./balance-reference.md).)

## Upgrade duration

- Base minutes per building type (e.g. Farm 5m, Monument 25m).
- Duration doubles per level step: `base × 2^(currentLevel−1)` minutes.
- **Town Hall** speeds all builds: **5% faster per TH level above 1**, down to **55%** of raw time at high TH (multiplier floor 0.55).
- **Construction queue:** at most **1** active build/upgrade (TH1–2), **2** (TH3–4), or **3** (TH5+) at once.

## Town Hall special rules

- **+3 gold/h per TH level** (on top of TH’s own production rate).
- **Mission slots** = min(TH level, **3**) — see [missions-and-operations.md](./missions-and-operations.md).
- Cannot be built/demolished via normal slot APIs.

## What each building does (mechanical)

| Building | Primary effect |
|----------|----------------|
| **Town Hall** | Gold, build speed, mission slots, pop cap component |
| **Farm** | Primary food production |
| **House** | **Population cap** (+15 per level); no troop cap |
| **Lumber Mill / Quarry / Mine** | Wood / stone / gold production |
| **Market** | Gold + imported food; unlocks Spy Guild |
| **Tavern** | Food surplus, morale & population growth |
| **Wall / Tower** | Static defense |
| **Barracks / Archery / Stables** | Infantry / archers / cavalry counts & attack upgrades |
| **Museum / Monument** | Morale & population growth; economy score |
| **Spy Guild** | Spies; espionage board |
| **Shipyard** | Ships, fishing food, naval missions on the board |

### Population cap formula

Requires Town Hall ≥ 1:

```
populationCap = 20 + (House level × 15) + (Town Hall level × 5)
```

No Town Hall → cap 0, population forced to 0 on tick.

### Morale (0–100 cap)

```
morale = min(100, tavern×4 + museum×6 + monument×10)
```

Affects population growth rate and spy success slightly.

### Military caps (recruit-to-fill)

Barracks, Archery Range, and Stables set **troop caps**; you recruit into those caps on the Army tab (gold + food upfront, one training queue). See [combat-forces.md](./combat-forces.md).

| Building | Cap per level |
|----------|---------------|
| Barracks | 5 infantry |
| Archery Range | 5 archers |
| Stables | 3 cavalry |

Attack multipliers: **+15% attack per level above 1** for that building’s unit type.

### Ships and spies

| Building | Per level |
|----------|-----------|
| Shipyard | 2 ships |
| Spy Guild | 3 spies |

Ships/spies are **not** used in PvP raids — missions and spy ops only.

### Defense (static)

```
staticDefense = 10 + wallLevel×20 + towerLevel×30
```

**Total defense** = static + power of troops **not** on mission (see [combat-forces.md](./combat-forces.md)).

### Legacy note: “Army capacity”

The server still computes `10 + houseLevel×10` as `capacity` on the army API. That value is **not** a troop limit and is **not** shown on the Army screen. Kingdom vista walker density uses **population cap** instead.
