# Missions, naval ops, and espionage

## Shared: mission board clock

- Board **refreshes every 30 minutes** (two rotations per UTC hour).
- Same clock drives **land/naval mission cards** and **spy cards** (different generators).
- Cards are **deterministic per rotation** for a given town state (seed from time + town stats).

**Missions UI tabs:** Active · Land · Naval · Spies.

---

## Concurrent slots

| Activity | Limit |
|----------|-------|
| Land + naval missions | `min(Town Hall level, 3)` |
| Spy operations | `min(Spy Guild level, 2)` (0 if no guild) |

---

## Land missions (explore, patrol, raid)

### Board

- **5 cards** per rotation.
- Types: **explore**, **patrol**, **raid** (random mix unless naval slots reserved).
- Difficulties: **easy / medium / hard** with different base success, loot multiplier, duration.

### Requirements

- **Troops** (infantry/archers/cavalry + optional mercenaries) ≥ card minimum.
- Minimum scales with your **total army size** (fraction of troops: easy ~20%, medium ~50%, hard ~80%).

### Success rate at dispatch

```
success = min(95%, baseSuccess + (troopsSent − minTroops) × 1%)
```

Naval uses **ships** instead of troops for minimum and +2% per ship above minimum.

### Duration

Roughly **20–105 minutes** depending on type/difficulty roll (naval ~20% longer).

### Resolution

When timer ends:

- Roll vs stored success rate → victory or defeat.
- **Victory:** loot each resource independently: card base × random **35%–165%**.
- **Defeat:** no loot.
- **Casualties:** 5% of own troops on success, **20%** on failure (land troops; mercenaries included).
- Troops/ships return from “on mission” pool.

Enemy troop counts shown in activity feed are generated for flavor (scaled to your deployment and difficulty).

---

## Naval missions

### Unlock

- Requires **Shipyard level ≥ 1**.
- Without shipyard, Naval tab shows empty-state guidance.

### Board presence

- With shipyard, **1–2** of the 5 mission slots are reserved for **naval** cards:
  - At least **1** naval card when shipyard exists.
  - **2** naval cards when `floor(shipyardLevel / 2)` ≥ 2 (e.g. shipyard 4+).

### Requirements

- **Ships only** (no troop minimum).
- Ship minimum scales with total ships (fractions like land troops).
- Base success gets **+2% per shipyard level** (naval only, capped).

### Loot skew

Naval cards bias **wood/stone**; gold/food bases on card are lower than land equivalents.

### Ships

`ships = shipyardLevel × 2`. Ships on mission are unavailable until return.

**Navy does not participate in PvP raids.**

---

## Espionage (spy operations)

### Unlock

- **Spy Guild level ≥ 1**.
- Without guild, Spies tab explains build requirement (tab is still clickable).

### Board

- **4 spy cards** per rotation.
- Types: **infiltrate**, **steal**, **sabotage**.
- ~**8%** chance of a high “jackpot” loot multiplier on card generation.

### Spies

`spies = spyGuildLevel × 3`. Spies on active ops are unavailable.

### Success at dispatch

```
success = min(92%, baseSuccess + (spies − minSpies) × 2% + morale × 0.2%)
```

At resolution, morale adds up to **+0.1%** extra again (small).

### Resolution

| Outcome | Loot | Spy losses |
|---------|------|------------|
| Success | Rolled loot (35%–165% of card bases) | **10%** of deployed spies |
| Failure | None | **40%** of deployed spies |

**Treasure Hoard** achievement: one successful op with **200+** total resources looted.

---

## Loot display vs actual

Cards show **reward tier** and possible resource icons. **Exact amounts roll on success** within the 35%–165% band (missions and spies).

---

## Design questions for balance review

1. Does **30m** refresh feel right vs play session length?
2. Are **5 land + 4 spy** cards enough variety, or should counts scale with TH?
3. Is **naval slot count** (`floor(shipyard/2)`) too stingy early?
4. Mercenary **10g** — bypass for troop-poor players or gold sink?
