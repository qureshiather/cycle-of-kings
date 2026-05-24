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
| **Food** | Farm, Market, Tavern, Shipyard, base production, missions, spies, trade, raid defense bounties | **Population upkeep** (ongoing), **troop upkeep** (0.4/h per recruited troop), **army recruiting** (upfront gold+food), builds (none currently) |
| **Wood** | Lumber Mill, base, missions, naval loot | Builds/upgrades |
| **Stone** | Quarry, base, missions | Builds/upgrades |

**Food is not spent to construct buildings** (build costs are wood, stone, gold only). Food matters for **keeping population alive and growing**.

## Production

**Base income** (every town, before buildings): **5/h** of each resource, modified by season.

**Per building level** (only while level ≥ 1):

| Building | Per level |
|----------|-----------|
| Farm | +5 food/h |
| Market | +1 food/h (imports) · +2 gold/h |
| Tavern | +2 food/h (feast surplus) |
| Shipyard | +2 food/h (fishing) |
| Mine | +3 gold/h |
| Quarry | +4 stone/h |
| Lumber Mill | +8 wood/h |
| Market | +2 gold/h |
| Town Hall | +3 gold/h (plus separate TH bonus — see [buildings.md](./buildings.md)) |

Most military buildings do not add hourly production (they affect troops, missions, etc.). **Tavern** and **Shipyard** also provide food (feast surplus and fishing).

**Season multipliers** apply to the whole production stack (base + buildings + TH gold bonus):

| Season | Gold | Food | Wood | Stone |
|--------|------|------|------|-------|
| Spring | 1.0 | 1.3 | 1.2 | 1.0 |
| Summer | 1.2 | 1.1 | 1.0 | 1.0 |
| Autumn | 1.0 | 0.9 | 1.3 | 1.1 |
| Winter | 0.9 | 0.7 | 0.8 | 0.9 |

**Calendar:** One real-world week = one season. Four seasons = one **cycle** (~4 weeks), then a seasonal wipe boundary (`nextWipeAt` on game state).

**Cycle finale (week 4 / Winter):** +5% production on top of season and realm-event modifiers. See [progression-and-endgame.md](./progression-and-endgame.md).

## Gross vs net food (UI)

- **Gross food/h** = production from farms and modifiers (what farms “make”).
- **Upkeep** = `0.4 × population` + `0.4 × recruited troops` food/h.
- **Net food/h** = gross − upkeep (shown on Kingdom header, Army tab, and Kingdom Map).

Positive net food does not guarantee growth forever (stockpile can still hit zero between ticks), but it means farms outpace mouths on average.

## Realm events (cycle calendar)

**~3 events per week** (~12 per 28-day cycle), each lasting **18–36 hours**. Timing is deterministic per cycle (same for all players). **Events are not previewed** — they appear in the season calendar and kingdom header only while active. Between events, only **season** modifiers apply.

Events can be weather, omens, visitors, or calamities — each applies production multipliers (gold/food/wood/stone). See [balance-reference.md](./balance-reference.md) for the catalog.

## Kingdom scores (header)

Shown on the Kingdom tab:

- **Economy score** — Sum of `building level × weight` for economic buildings (farm, mine, quarry, mill, market, tavern, house, museum, monument). See [balance-reference.md](./balance-reference.md).
- **Army score** — Total **army power** from troop composition (not troop count).
- **Defense** — Static walls/towers + **available** garrison power (troops not on mission). See [combat-forces.md](./combat-forces.md).
