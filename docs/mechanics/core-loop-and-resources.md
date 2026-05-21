# Core loop and resources

## Player fantasy

You grow a medieval town: place buildings, accumulate **gold, food, wood, stone**, support **population**, field an **army**, and send forces on **missions**, **espionage**, and optional **PvP raids**. Progress is gated by **Town Hall** level, building prerequisites, and resource income.

## Time and ticking

- Each town has a **last tick** timestamp.
- On many API reads (town fetch, slot changes), the server applies up to **24 hours** of elapsed time since that timestamp.
- **Resources** (gold, food, wood, stone) increase by hourly production × elapsed hours.
- **Population** is updated in the same pass (production, upkeep, growth, starvation) — see [population.md](./population.md).

There is no separate “offline calculator” on the client; the server state is authoritative.

## The four resources

| Resource | Main sources | Main sinks |
|----------|--------------|------------|
| **Gold** | Mine, Market, Town Hall, missions, spies, raids, trade (receive) | Builds/upgrades, mercenaries, trade (pay) |
| **Food** | Farm, base production, missions, spies | **Population upkeep** (ongoing), builds (none currently) |
| **Wood** | Lumber Mill, base, missions, naval loot | Builds/upgrades |
| **Stone** | Quarry, base, missions | Builds/upgrades |

**Food is not spent to construct buildings** (build costs are wood, stone, gold only). Food matters for **keeping population alive and growing**.

## Production

**Base income** (every town, before buildings): **5/h** of each resource, modified by season.

**Per building level** (only while level ≥ 1):

| Building | Per level |
|----------|-----------|
| Farm | +5 food/h |
| Mine | +3 gold/h |
| Quarry | +4 stone/h |
| Lumber Mill | +8 wood/h |
| Market | +2 gold/h |
| Town Hall | +3 gold/h (plus separate TH bonus — see [buildings.md](./buildings.md)) |

Military and culture buildings do not add hourly production (they affect troops, population, morale, missions, etc.).

**Season multipliers** apply to the whole production stack (base + buildings + TH gold bonus):

| Season | Gold | Food | Wood | Stone |
|--------|------|------|------|-------|
| Spring | 1.0 | 1.3 | 1.2 | 1.0 |
| Summer | 1.2 | 1.1 | 1.0 | 1.0 |
| Autumn | 1.0 | 0.9 | 1.3 | 1.1 |
| Winter | 0.9 | 0.7 | 0.8 | 0.9 |

**Calendar:** One real-world week = one season. Four seasons = one **cycle** (~4 weeks), then a seasonal wipe boundary (`nextWipeAt` on game state).

## Gross vs net food (UI)

- **Gross food/h** = production from farms and modifiers (what farms “make”).
- **Upkeep** = `0.4 × population` food/h.
- **Net food/h** = gross − upkeep (shown on Kingdom header and Kingdom Map).

Positive net food does not guarantee growth forever (stockpile can still hit zero between ticks), but it means farms outpace mouths on average.

## Random world events

Roughly **15%** chance per hour of a cosmetic/event label (Drought, Storm, etc.). These are atmospheric seeds today — confirm in code if they later affect production.

## Kingdom scores (header)

Shown on the Kingdom tab:

- **Economy score** — Sum of `building level × weight` for economic buildings (farm, mine, quarry, mill, market, tavern, house, museum, monument). See [balance-reference.md](./balance-reference.md).
- **Army score** — Total **army power** from troop composition (not troop count).
- **Defense** — Static walls/towers + **available** garrison power (troops not on mission). See [combat-forces.md](./combat-forces.md).
