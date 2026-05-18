# Development workflow

## Prerequisites

- Node 20+ (22/24 recommended)
- pnpm 10+
- Docker (Postgres)

## First-time setup

```bash
pnpm install
cp .env.example .env
pnpm db:up
pnpm db:push
```

Postgres runs on host port **5433** (see `docker-compose.yml`) to avoid clashing with a local Postgres on 5432. `DATABASE_URL` in `.env` must match.

## Environment variables

| Variable | Used by | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | API, `db:push` | Postgres connection |
| `PORT` | API | Default `8080` |
| `EXPO_PUBLIC_API_URL` | Mobile | API base, e.g. `http://localhost:8080` |

Mobile loads root `.env` via `artifacts/mobile/app.config.js`.

### Physical device / Android emulator

- iOS Simulator: `http://localhost:8080` works
- Android emulator: app rewrites `localhost` → `10.0.2.2` in `resolveApiBaseUrl.ts`
- Physical phone: set `EXPO_PUBLIC_API_URL=http://<LAN-IP>:8080`

Restart Expo after `.env` changes. Metro log shows `[api] base URL: ...` when configured.

## Daily commands

```bash
pnpm dev              # API + mobile
pnpm dev:api          # API only
pnpm dev:mobile       # Expo only
pnpm typecheck        # Full workspace
pnpm build            # API production bundle
```

## After you change…

| Change | Required follow-up |
|--------|-------------------|
| `lib/api-spec/openapi.yaml` | `pnpm codegen` |
| `lib/db/src/schema/*` | `pnpm db:push` then `pnpm --filter @workspace/db run typecheck` |
| `lib/building-progression/*` | Typecheck API + mobile (both depend on it) |
| `app.json` (Android cleartext, etc.) | Restart Expo completely |

## Typecheck one package

```bash
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/mobile run typecheck
pnpm --filter @workspace/db run typecheck
```

## API server dev

- Entry: `artifacts/api-server/src/index.ts`
- Dev script builds with esbuild and runs Node
- All routes prefixed with `/api`

## Common issues

**`peacefulOptedInCycle` / schema field missing on Town type**  
Run `pnpm --filter @workspace/db run typecheck` so project references pick up new columns.

**Mobile cannot reach API**  
Check `EXPO_PUBLIC_API_URL`, Android cleartext (`usesCleartextTraffic` in `app.json`), firewall, same Wi‑Fi for physical devices.

**Codegen drift**  
Never edit generated files. Fix OpenAPI, run `pnpm codegen`, fix route handlers to match.

**pnpm install fails with “Use pnpm instead”**  
Use pnpm, not npm/yarn.

## Optional packages

- `artifacts/mockup-sandbox` — Vite web mockup; not part of mobile/API dev loop
- `scripts/` — workspace scripts if present

## Human-oriented docs

- [README.md](../../README.md) — player-facing quick start, building progression table
- [replit.md](../../replit.md) — legacy Replit notes (may be outdated)
