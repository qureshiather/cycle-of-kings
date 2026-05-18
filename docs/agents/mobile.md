# Mobile app (Expo)

Package: **`artifacts/mobile`** (`@workspace/mobile`)

## Stack

- Expo SDK 54, React Native 0.81, React 19
- **expo-router** — file-based routing under `app/`
- **TanStack React Query** — via generated hooks from `@workspace/api-client-react`
- **AsyncStorage** — player session + device ID

## Routing

```
app/
  _layout.tsx          Root layout, fonts, providers
  setup.tsx            First-run name + create player
  (tabs)/
    _layout.tsx        Tab bar (5 tabs)
    index.tsx          Kingdom
    army.tsx
    missions.tsx
    world.tsx
    treasury.tsx
```

If `GameContext` has no `townId`, user is sent to setup.

## Providers (typical order in `_layout.tsx`)

- `QueryClientProvider`
- `GameProvider` — `playerId`, `townId`, `playerName`
- `ColorSchemeProvider` — light/dark/system (game defaults dark)

## API client

Import hooks only from `@workspace/api-client-react`:

```tsx
import { useGetTown, useBuildSlot, getGetTownQueryKey } from "@workspace/api-client-react";
```

Base URL: `EXPO_PUBLIC_API_URL` + `lib/resolveApiBaseUrl.ts` (Android localhost fix).

After mutations, invalidate related queries:

```tsx
qc.invalidateQueries({ queryKey: getGetTownQueryKey(townId) });
qc.invalidateQueries({ queryKey: getGetBuildingSlotsQueryKey(townId) });
```

## Key screens & components

| Area | Files |
|------|--------|
| Kingdom list | `components/KingdomMap.tsx`, `lib/buildingMeta.ts` |
| Resources header | `components/ResourceBar.tsx`, `(tabs)/index.tsx` |
| Season chip | `components/SeasonBadge.tsx` |
| World / PvP | `(tabs)/world.tsx` |
| Safe area (iOS tabs) | `hooks/useTopInset.ts` |

### KingdomMap behavior

- Scrollable building cards (`BUILDING_GRID_ORDER` from `@workspace/building-progression`)
- Locked buildings show `getBuildBlockReason`
- Bottom sheet modal for build / upgrade / demolish
- Pull-to-refresh via props from parent

### buildingMeta.ts

Display names, icons, colors, `BASE_COSTS`, `formatCost`, `formatTimeRemaining`. Keep in sync with server costs in `gameEngine.ts` when changing balance.

## Device identity

- `lib/deviceId.ts` — UUID in AsyncStorage (used when creating player)
- **Do not use `localStorage`** on native — use AsyncStorage

## Config

- `app.json` — Expo config, Android cleartext
- `app.config.js` — loads `../../.env` for `EXPO_PUBLIC_*`

## Styling conventions

- `useColors()` for theme tokens
- Inter font family names: `Inter_400Regular`, `Inter_600SemiBold`, `Inter_700Bold`
- Haptics on important actions (`expo-haptics`)

## Platform notes

- No `Slider` from RN core — use +/- buttons
- Tab header overlap on iOS: `useTopInset` + padding on screen headers
- Error boundary: `components/ErrorBoundary.tsx`

## Adding a feature (checklist)

1. Ensure API exists in OpenAPI → `pnpm codegen`
2. Add UI in the right tab or component
3. Use generated mutation hook + invalidate queries
4. Mirror server rules in UI when possible (locks, messages) — server remains source of truth
5. `pnpm --filter @workspace/mobile run typecheck`

## Legacy / unused

- `components/TownGrid.tsx` — old 9×9 grid; do not extend for new work
