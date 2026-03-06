# GreenCrowd V2 — Makefile
# Usage: make <target>

.PHONY: dev infra-up infra-down db-migrate db-deploy db-seed \
        db-studio generate-vapid generate-auth-secret provision-game-key \
        worker build start logs clean help

# ─────────────────────────────────────────────────────────────
# Development
# ─────────────────────────────────────────────────────────────

## Setup and start development environment (first-time wizard)
setup:
	@./gc dev

## Start infrastructure (postgres, redis, minio, keycloak) and Next.js in dev mode
dev: infra-up
	@echo "⏳ Waiting for services to be ready..."
	@sleep 5
	npm run dev

## Start infrastructure only (without the Next.js app)
infra-up:
	docker compose --env-file .env.local -f docker-compose.dev.yml up -d
	@echo "✅ Infrastructure started"
	@echo "   PostgreSQL: localhost:5432"
	@echo "   Redis:      localhost:6379"
	@echo "   MinIO:      http://localhost:9000 (console: http://localhost:9001)"
	@echo "   Keycloak:   http://localhost:8080"

## Stop infrastructure
infra-down:
	docker compose --env-file .env.local -f docker-compose.dev.yml down

## Start infrastructure + App in production
prod-up:
	docker compose up -d --build

## Stop production
prod-down:
	docker compose down

# ─────────────────────────────────────────────────────────────
# Database
# ─────────────────────────────────────────────────────────────

## Generate Prisma client
generate:
	npx prisma generate

## Create and apply migrations in development
db-migrate:
	npx prisma migrate dev

## Apply pending migrations (production)
db-deploy:
	npx prisma migrate deploy
	@echo "📦 Applying PostGIS migration..."
	psql $(DATABASE_URL) -f prisma/migrations/0001_initial_postgis/migration.sql || true

## Apply PostGIS migration manually
db-postgis:
	psql $(DATABASE_URL) -f prisma/migrations/0001_initial_postgis/migration.sql

## Open Prisma Studio
db-studio:
	npx prisma studio

## Initial data seed
db-seed:
	npx tsx prisma/seed.ts

# ─────────────────────────────────────────────────────────────
# Workers
# ─────────────────────────────────────────────────────────────

## Start BullMQ worker in development mode
worker:
	npx tsx watch src/workers/index.ts

# ─────────────────────────────────────────────────────────────
# Secret generators
# ─────────────────────────────────────────────────────────────

## Provision GAME API key: gets a Keycloak token (game-backend client) and writes API_GAME_APIKEY to .env.local
provision-game-key:
	@echo "🔑 Provisioning GAME API key..."
	npx tsx scripts/provision-game-apikey.ts

## Generate VAPID keys for WebPush
generate-vapid:
	npx web-push generate-vapid-keys

## Generate a secure AUTH_SECRET for NextAuth
generate-auth-secret:
	openssl rand -base64 32

# ─────────────────────────────────────────────────────────────
# Build and production
# ─────────────────────────────────────────────────────────────

## Production build
build:
	npm run build

## Start in production mode (requires build)
start:
	npm run start

# ─────────────────────────────────────────────────────────────
# Logs
# ─────────────────────────────────────────────────────────────

## View app logs
logs:
	docker compose logs -f app worker

## View infrastructure logs
logs-infra:
	docker compose --env-file .env.local -f docker-compose.dev.yml logs -f

# ─────────────────────────────────────────────────────────────
# Tests
# ─────────────────────────────────────────────────────────────

## Run unit tests
test:
	npm test

## Run E2E tests (Playwright)
test-e2e:
	npm run test:e2e

# ─────────────────────────────────────────────────────────────
# Cleanup
# ─────────────────────────────────────────────────────────────

## Clean node_modules and build cache
clean:
	rm -rf .next node_modules
	docker compose --env-file .env.local -f docker-compose.dev.yml down -v

## Help
help:
	@grep -E '^##' Makefile | sed 's/## //'
