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
- **4 weeks** = 1 cycle → **full kingdom wipe** at cycle boundary (see [progression-and-endgame.md](./progression-and-endgame.md)).
- **Wiped:** buildings (TH→1), army, missions, spy ops, raids, resources, population.
- **Preserved:** player account, peaceful mode, trophy history + lifetime trophy points (cosmetic only — no mechanical advantage next cycle).

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

Points per achievement: see [balance-reference.md](./balance-reference.md#achievement-points-per-cycle).

## Activity feed

Server writes activities for the events below. Mobile **Activity** tab shows the feed; mission and raid results can open detail modals.

| Type | Meaning |
|------|---------|
| `upgrade_started` / `upgrade_complete` | Building construction |
| `building_demolished` | Demolish refund |
| `mission_dispatched` / `mission_success` / `mission_fail` | Land/naval missions |
| `spy_dispatched` / `spy_success` / `spy_fail` | Espionage |
| `raid_outgoing_march` / `raid_outgoing_win` / `raid_outgoing_loss` | Outgoing raids |
| `raid_incoming_win` / `raid_incoming_loss` | Defending raids |
| `trade_complete` | Hourly merchant deal |
| `achievement_unlocked` | Trophy earned this cycle |
| `season_objective_claimed` | Season path reward claimed |
| `cycle_reset` / `kingdom_reset` | Cycle boundary or manual reset |
