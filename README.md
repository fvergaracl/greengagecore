# GreenCrowd V2

**GreenCrowd V2** is a geospatial citizen science platform designed to support large-scale environmental data collection through participatory sensing and adaptive gamification.

The system integrates **spatial crowdsourcing infrastructure** with the **GAME (Goals And Motivation Engine)** to dynamically incentivize contributions, improve spatial coverage, and support research on gamified citizen science systems.

The platform is designed for **research deployments, urban pilots, and experimental citizen observatories**, supporting real-time geospatial tasking, participant mobility tracking, and reward allocation.

---

# System Overview

GreenCrowd V2 consists of three primary components:

1. **Backend + Web Panel**
   - Geospatial APIs
   - campaign and task management
   - contribution ingestion
   - reward orchestration

2. **Mobile Client**
   - location-aware task discovery
   - offline-first contribution submission
   - telemetry and mobility tracking

3. **GAME Gamification Engine Integration**
   - adaptive incentive calculation
   - wallet and reward logic
   - redistributive gamification strategies

---

# Architecture

```
Mobile App (Flutter)
        │
        ▼
Next.js API Layer (App Router)
        │
        ├── Auth: Keycloak + NextAuth
        ├── Domain Services
        │       ├─ Campaigns
        │       ├─ Tasks
        │       ├─ Contributions
        │       └─ Telemetry
        │
        ├── GAME Client
        │       └─ reward computation
        │
        ▼
PostgreSQL + PostGIS
        │
        ├─ spatial queries
        ├─ RLS (multi-tenant research campaigns)
        └─ materialized analytics views

Async Processing
        │
        └── Redis + BullMQ workers
              ├ rewards
              ├ push notifications
              ├ exports
              └ analytics refresh
```

Object storage and identity services:

```
MinIO (S3 compatible)
Keycloak (Identity Provider)
```

---

# Core Capabilities

GreenCrowd V2 supports the following capabilities:

### Geospatial tasking

The system exposes APIs for location-aware task discovery using **PostGIS spatial queries**, enabling contributors to find tasks near their current location.

### Offline-first contributions

Mobile clients can queue contributions locally and synchronize them once connectivity is available.

### Adaptive gamification

Through integration with the **GAME engine**, the platform supports:

- reward allocation
- dynamic incentives
- participant wallet tracking
- incentive simulations

### Multi-campaign research deployments

Researchers can configure multiple campaigns simultaneously, each with:

- distinct tasks
- spatial regions
- reward policies
- participant roles

### Spatial analytics

The database layer includes:

- `GEOGRAPHY` columns
- spatial indexes (GIST)
- materialized views for analytics
- telemetry ingestion pipelines

---

# Technology Stack

| Layer          | Technology                |
| -------------- | ------------------------- |
| Backend        | Next.js 16 (App Router)   |
| Language       | TypeScript                |
| ORM            | Prisma 6                  |
| Database       | PostgreSQL 16             |
| Spatial        | PostGIS 3.4               |
| Cache / Queue  | Redis 7 + BullMQ          |
| Object Storage | MinIO                     |
| Authentication | Keycloak 26 + NextAuth v5 |
| Mobile         | Flutter                   |
| Styling        | Tailwind 4                |
| Infrastructure | Docker Compose            |

---

# Repository Layout

```
.
├── app/api/                    # API routes (Next.js App Router)
├── src/
│   ├── domains/                # domain logic
│   │   ├── auth
│   │   ├── geo
│   │   └── game
│   │
│   ├── lib/                    # infrastructure clients
│   │   ├── db
│   │   ├── redis
│   │   ├── minio
│   │   └── auth
│   │
│   ├── middleware/             # authentication + RLS
│   └── workers/                # BullMQ processors
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── docker/
│   ├── keycloak/
│   │   └── realm-export.json
│   ├── postgres/
│   │   └── init.sql
│   └── nginx/
│       └── nginx.conf
│
├── mobile/                     # Flutter mobile application
│
├── docker-compose.dev.yml
├── docker-compose.yml
├── Makefile
└── gc                          # development bootstrap script
```

---

# Development Environment

## Requirements

- Node.js **20+**
- npm **10+**
- Docker **24+**
- Docker Compose **v2**
- Python3
- curl
- perl

Optional:

- Flutter **3.22+** for mobile development.

---

# Quick Start

The repository includes a **bootstrap script (`gc`)** that automates the development environment setup.

First run:

```
./gc dev
```

The script performs the following steps automatically:

1. Verifies required dependencies
2. Generates `.env.local` from `.env.example`
3. Creates secure `AUTH_SECRET` and `VAPID` keys
4. Installs Node dependencies (if needed)
5. Starts local infrastructure
6. Waits for services to become ready
7. Configures Keycloak via Admin API
8. Applies Prisma and PostGIS migrations
9. Starts the development server and workers

Subsequent runs are **idempotent** and skip completed steps.

---

# Infrastructure Services

Local development runs the following services:

| Service    | Purpose                     |
| ---------- | --------------------------- |
| PostgreSQL | primary relational database |
| PostGIS    | spatial extension           |
| Redis      | caching and queue backend   |
| MinIO      | object storage              |
| Keycloak   | identity provider           |

---

# Development Commands

The `gc` script exposes several commands:

```
./gc dev                 # bootstrap environment
./gc status              # health check
./gc stop                # stop infrastructure

./gc reset               # reset infrastructure volumes
./gc reset --hard        # reset including env files

./gc db migrate          # run Prisma migrations
./gc db studio           # open Prisma Studio

./gc kc add-user USER PASS ROLE
./gc kc list-users

./gc logs SERVICE
```

Examples:

```
./gc logs keycloak
./gc kc add-user alice pass123 researcher
```

---

# Implemented API

## Authentication

```
GET /api/auth/[...nextauth]
POST /api/auth/[...nextauth]
```

---

## Campaigns

```
GET /api/campaigns
POST /api/campaigns
GET /api/campaigns/:id
PATCH /api/campaigns/:id
```

Permissions:

- researcher
- superadmin

---

## Geospatial Tasks

```
GET /api/tasks/nearby?lat=&lng=&radius=
POST /api/location/update
```

These endpoints power the **mobile spatial task discovery system**.

---

## Contributions

```
POST /api/contributions
```

Characteristics:

- idempotent
- supports offline submission
- deduplicated using `localId`

---

## GAME Integration

```
GET /api/game/wallet?campaignId=
```

Provides:

- wallet balance
- reward history
- incentive simulation results

---

# Mobile Application

The Flutter mobile client is under development.

Location:

```
mobile/
```

Current capabilities:

- Keycloak PKCE authentication
- map interface
- task discovery
- location telemetry
- offline contribution queue
- basic synchronization

See:

```
mobile/README.md
```

---

# Keycloak Configuration

Development realm:

```
Realm: greencrowd
```

Clients:

```
greencrowd-web
greencrowd-mobile
```

Roles:

```
superadmin
researcher
contributor
```

---

# GAME Engine Integration

The system integrates with the **GAME (Goals And Motivation Engine)**.

Implementation location:

```
src/domains/game/client.ts
```

Features:

- timeout-controlled requests
- circuit breaker (`opossum`)
- Redis caching
- graceful fallback when GAME is unavailable

---

# Security

The platform implements several security mechanisms:

- JWT verification using JWKS
- role-based authorization
- database row-level security (RLS)
- idempotent contribution ingestion
- isolation between campaigns

---

# Research Context

GreenCrowd V2 is designed as an experimental infrastructure for research in:

- citizen science
- spatial crowdsourcing
- adaptive gamification
- participatory sensing
- environmental monitoring

The platform is used in field deployments to study **behavioral responses to adaptive incentive mechanisms**.

---

# License

License will be defined in a future release.

---

# Contributing

Contributions are welcome.

Before submitting a pull request:

1. ensure the development environment runs correctly
2. run migrations
3. verify API changes with the mobile client

---

# Roadmap

Planned developments include:

- full web administration UI
- expanded analytics pipelines
- evidence/media ingestion pipeline
- notification infrastructure
- campaign experimentation tools
- deeper GAME integration
