# World systems: trade, PvE opt-out, meta, reset

## World trade (hourly)

- **4 merchant deals** per town per **UTC hour** (shared hour seed + town id).
- Each deal: pay one resource, receive another (different).
- Pay amount ~**20–80**; receive amount ≈ **38–70%** of pay (sometimes better rolls up to ~94%, rare “good” deals).
- Each deal can be completed **once per hour** per town.
- Completing a deal swaps resources immediately and logs activity.

Trade is a **resource conversion sink** (usually unfavorable) with occasional bargains.

## Peaceful mode (permanent PvE)

- Opt-in from **Activity → Settings** with strong confirmation.
- **Cannot be turned off** once enabled.
- **One opt-in per account/kingdom lifetime** (tracked by cycle number when chosen).
- While peaceful:
  - Cannot launch or receive **raids**.
  - **Excluded from leaderboard**.
- Achievements: **Peaceful Realm** on opt-in.

Designed for players who want missions, building, trade — not PvP.

## Leaderboard

- **Score** = economy score + army score (same formulas as Kingdom header).
- Sorted descending; peaceful towns filtered out.
- **Army score** = total military power, not troop headcount.

## Seasons and cycles

See [core-loop-and-resources.md](./core-loop-and-resources.md):

- **1 week** = 1 season (spring/summer/autumn/winter production modifiers).
- **4 weeks** = 1 cycle → **kingdom wipe** at cycle boundary (buildings, troops, resources reset; peaceful mode and trophies preserved).

Trophies/achievements are tracked **per cycle** (historical cycles remain visible).

## Kingdom reset

Player-triggered from Settings:

- All buildings cleared to **0** except Town Hall set to **1**.
- Army row cleared; missions and spy ops deleted.
- Resources set to starter: **200 gold, 200 food, 150 wood, 100 stone**.
- Population set to **10**.
- **Peaceful mode is not cleared.**

Use for “start layout over” without new account.

## Achievements (per cycle)

Re-earned each cycle; trophy records which cycles you cleared them.

| Id | Condition (summary) |
|----|---------------------|
| Master Builder | Every building type built ≥1 in cycle |
| Skyline | Any building level 10 |
| Grand Treasury | Hold ≥1000 of each resource at once |
| Economic Power | Economy score ≥150 |
| Military Might | Army score ≥150 |
| Mission Victor | One mission success |
| Raid Conqueror | One raid win |
| Peaceful Realm | Opt into peaceful |
| Shadow Network | One spy op success |
| Treasure Hoard | One spy loot ≥200 total resources |
| Admiral | One naval mission success |
| Thriving Realm | Population ≥50 |
| Cultural Capital | Museum and Monument both built in cycle |

Full list and points in `lib/achievements` catalog; mirror in [balance-reference.md](./balance-reference.md) if expanded.

## Activity feed

Server writes activities for builds, upgrades, missions, raids, trade, spy, reset, achievements. Mobile **Activity** tab shows feed; mission results can open a detail modal with troop comparison metadata.
