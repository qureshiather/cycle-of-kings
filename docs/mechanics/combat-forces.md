# Army, defense, and raids

## Troops are not “trained”

Infantry, archers, and cavalry **exist automatically** from building levels. There is no recruit queue and **no housing cap on troop count** (House affects **population cap**, not army size).

| Unit | From | Per level |
|------|------|-----------|
| Infantry | Barracks | 5 |
| Archers | Archery Range | 5 |
| Cavalry | Stables | 3 |

## Attack power (per unit, before mult)

| Unit | Base power | Notes |
|------|------------|-------|
| Infantry | 10 | Shields archers (+20% archer power when both present) |
| Archers | 15 | |
| Cavalry | 12 | +10% total attack power when any cavalry deployed |

**Building upgrade mult:** +15% attack per level **above 1** for that building’s unit type.

**Army score** (leaderboard / Kingdom header) = sum of powered troops using those rules (`totalPower`).

## Availability

Troops on **active land/naval missions** or committed to a **raid** are not available.

```
available = totalFromBuildings − onMission
```

**Ships** and **spies** have separate pools (Shipyard / Spy Guild); see [missions-and-operations.md](./missions-and-operations.md).

## Defense

**Static:** walls and towers only (see [buildings.md](./buildings.md)).

**Garrison:** attack power of troops **not** on mission, using the same per-unit power as attacks.

```
totalDefense = staticDefense + garrisonPower
```

Raids compare attacker sent troops vs defender **totalDefense** (not static alone).

## PvP raids

- Attacker picks infantry/archers/cavalry (must have at least one troop).
- **Peaceful** kingdoms cannot raid or be raided ([world-meta.md](./world-meta.md)).
- **Ships and spies cannot raid.**

### Combat resolution

1. Compute attacker **attack power** (with infantry/archer synergy and cavalry bonus).
2. `winChance = attackPower / (attackPower + defenderStrength)`.
3. Random roll vs `winChance` → victory or defeat.

### Casualties (attacker)

| Outcome | Casualties |
|---------|------------|
| Victory | ~`(1 − winChance) × 40%` of troops sent |
| Defeat | ~**30%** of troops sent |

(Casualties remove troops from the kingdom’s effective army — implementation ties to composition counts.)

### Loot on victory

Attacker steals **30%** of defender’s current **gold, food, wood, stone** (each resource separately). Defender loses that amount; attacker gains it.

## Mercenaries (missions only)

On **land** mission dispatch (not raids, not naval):

- **10 gold** per mercenary, paid upfront.
- Mercenaries count toward **minimum troop** requirement and **success rate** bonus.
- They are included in mission casualty calculations like normal troops.
