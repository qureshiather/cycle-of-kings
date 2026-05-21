# Population and food

## Role in the game

**Population** is a town-wide stat (not per-building). It:

- Drives **food upkeep** (pressure on farms).
- Gates **growth** when food is healthy.
- Contributes to achievements (**Thriving Realm** at 50 pop).
- Appears on Kingdom Map and vista (**Population X / cap**).

Population is **not** spent as soldiers. Troops come from military buildings ([combat-forces.md](./combat-forces.md)).

## Starting and floor values

| Constant | Value | Meaning |
|----------|-------|---------|
| Starting population | **10** | New towns and reset; bootstrap when pop is below floor |
| Population floor | **5** | Minimum while Town Hall exists and cap > 0 |
| Thriving achievement | **50** | Achievement threshold |

If population is below the floor but cap > 0, the next tick bumps toward starting (capped by `populationCap`).

## Population cap

See [buildings.md](./buildings.md):

```
cap = 20 + House×15 + TownHall×5   (TH must be ≥ 1)
```

Growth never pushes population above **cap**. If cap **drops** (e.g. lose Town Hall), population is clamped down on the next tick.

## Food upkeep

```
upkeep per hour = population × 0.4 food
```

Applied during the resource tick **after** adding production for elapsed time. This is why the UI shows **net food** = gross production − upkeep.

## Growth

**Can grow** when either:

- Food stockpile **> 0** after the tick step, **or**
- Gross food production **>** upkeep at current population.

**Growth rate** (when allowed), in population per hour:

```
1.5
+ tavern×0.5 + museum×1 + monument×2
+ morale × 0.02
```

Then for elapsed hours `h` (max 24 per tick):

```
population += growthRate × h
population = min(population, cap)
```

If conditions fail, growth rate for display is **0** (paused / starving messaging in UI).

## Losing population

### Starvation (only ongoing loss)

After production and upkeep, if **food ≤ 0**:

```
loss = max(1, floor(population × 8% × hours))
population -= loss
```

Then, if cap > 0: `population = max(population, floor)` with floor **5**.

So starvation **shrinks** the realm (e.g. 45 → 20 → 10 → 5) but does not permanently zero you while Town Hall stands.

### Cap clamp

If population exceeds new cap, excess is removed on tick (not “death,” just housing limit).

### No Town Hall

Cap = 0 → population set to **0**.

## What does **not** reduce population

- Land or naval **missions** (troop casualties only).
- **Raids** (loot and troop losses only).
- **Spy operations** (spy losses only).
- **Demolishing House** (lowers cap; may clamp pop down on next tick, not a separate death mechanic).
- **Kingdom reset** — sets population to **10**, not a penalty.

## Design levers (balance)

| Knob | Effect |
|------|--------|
| `FOOD_PER_CAPITA` (0.4) | How fast large realms tax farms |
| `POP_GROWTH_BASE` (1.5) | Baseline growth when fed |
| Culture buildings | Growth and morale |
| `POP_DEPOP_RATE` (8%/h) | Starvation severity |
| Farm levels & seasons | Counterpressure via gross food |

When tuning “how punishing is over-expansion,” adjust upkeep vs farm output vs growth base together.
