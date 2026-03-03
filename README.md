# GreenCrowd V2

Geospatial citizen science platform integrated with the GAME gamification engine.

This repository includes:

- backend + web panel (Next.js 16, App Router)
- geospatial domain powered by PostGIS
- authentication with Keycloak + NextAuth
- asynchronous worker layer (BullMQ)
- Flutter mobile bootstrap (Sprint 2)

## Current status

Implemented:

- Local infrastructure with Docker Compose: PostgreSQL/PostGIS, Redis, MinIO, Keycloak.
- Full V2 Prisma domain model (campaign, geo, tasking, contribution, rewards, telemetry, audit).
- Manual SQL migration with `GEOGRAPHY` columns, GIST indexes, RLS, and materialized views.
- JWT authentication middleware (JWKS) + per-request RLS context.
- GAME client with circuit breaker + Redis cache fallback.
- Worker queues for rewards, push notifications, exports, and analytics refresh.
- Initial API surface available (`campaigns`, `tasks/nearby`, `contributions`, `location/update`, `game/wallet`).
- Mobile Sprint 2 bootstrap: PKCE login, map, offline contribution queue, basic sync.

Main gaps:

- Functional web UI (frontend is still mostly in scaffold state).
- Full evidence pipeline (deferred upload to MinIO from mobile).
- Additional admin/endpoints planned in roadmap.

## Tech stack

- Backend/Web: Next.js 16 + TypeScript + Tailwind 4
- ORM: Prisma 6
- Database: PostgreSQL 16 + PostGIS 3.4
- Cache/Queue: Redis 7 + BullMQ 5
- Object storage: MinIO (S3 compatible)
- Auth: Keycloak 26 + NextAuth v5
- Mobile: Flutter (Sprint 2 in progress)

## Repository layout

```text
.
├── app/api/                    # API routes (Next.js App Router)
├── src/
│   ├── domains/                # auth, geo, game
│   ├── lib/                    # db, auth, redis, minio
│   ├── middleware/             # auth + rls
│   └── workers/                # BullMQ processors
├── prisma/
│   ├── schema.prisma
│   └── migrations/0001_initial_postgis/
├── docker/
│   ├── keycloak/realm-export.json
│   ├── postgres/init.sql
│   └── nginx/nginx.conf
├── mobile/                     # Flutter Sprint 2 bootstrap
├── docker-compose.dev.yml      # local infrastructure
├── docker-compose.yml          # full stack (prod-like)
└── Makefile
```

## Local requirements

- Node.js 20+
- npm 10+
- Docker + Docker Compose v2
- (Optional) Flutter 3.22+ for mobile app work

## Quick start (backend/web)

1. Copy environment file:

```bash
cp .env.example .env
```

2. Start local infrastructure:

```bash
make infra-up
```

3. Run Prisma migrations:

```bash
make db-migrate
```

4. Apply manual PostGIS/RLS/views migration:

```bash
make db-postgis
```

5. Start web app in development:

```bash
make dev
```

6. (Optional) Start worker:

```bash
make worker
```

Notes:

- `npm run dev` uses `next dev --webpack` for compatibility with the current `webpack` config in Next.js 16.
- `make dev` starts infra first, then the web app.

## Useful commands

```bash
make infra-up
make infra-down
make dev
make worker
make db-migrate
make db-postgis
make db-studio
make logs-infra
```

## Implemented API

Auth:

- `GET/POST /api/auth/[...nextauth]`

Campaigns:

- `GET /api/campaigns` (authenticated)
- `POST /api/campaigns` (researcher/superadmin)
- `GET /api/campaigns/:id` (authenticated)
- `PATCH /api/campaigns/:id` (researcher/superadmin)

Tasks/Geo:

- `GET /api/tasks/nearby?lat&lng&radius` (authenticated)
- `POST /api/location/update` (authenticated)

Contributions:

- `POST /api/contributions` (authenticated, idempotent via `localId`)

GAME:

- `GET /api/game/wallet?campaignId=...` (authenticated)

## Mobile (Sprint 2)

The mobile app is in progress under `mobile/`, including:

- Keycloak PKCE login
- map powered by `GET /api/tasks/nearby`
- foreground location updates via `POST /api/location/update`
- offline contribution queue
- basic sync to `POST /api/contributions`

Mobile docs:

- [mobile/README.md](./mobile/README.md)

## Keycloak (dev)

- Realm: `greencrowd`
- Clients:
  - `greencrowd-web` (confidential)
  - `greencrowd-mobile` (public + PKCE)
- Roles:
  - `superadmin`
  - `researcher`
  - `contributor`

## GAME integration

Implemented in `src/domains/game/client.ts` with:

- timeout-based API calls
- circuit breaker (`opossum`)
- Redis caching for simulation/wallet
- fallback behavior when GAME is unavailable

## License

TBD.
