.PHONY: dev build test lint clean docker-up docker-down deploy-worker deploy-api deploy-web deploy-scraper

# ─── Development ───────────────────────────────────────────
dev:
	npm run dev

dev-api:
	npm run dev:api

dev-web:
	npm run dev:web

dev-worker:
	npm run dev:worker

# ─── Build ─────────────────────────────────────────────────
build:
	npm run build

build-scraper:
	cd apps/scraper-service && docker build -t scrape-scraper .

# ─── Test & Lint ───────────────────────────────────────────
test:
	npm test

test:e2e:
	npm run test:e2e

lint:
	npm run lint

typecheck:
	npm run typecheck

# ─── Docker ────────────────────────────────────────────────
docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-dev:
	docker compose -f docker-compose.dev.yml up -d

# ─── Railway Deploy ────────────────────────────────────────
deploy-scraper:
	railway up --service scraper

deploy-api:
	railway up --service api

deploy-worker:
	railway up --service worker

deploy-web:
	railway up --service web

deploy-all: deploy-api deploy-worker deploy-web deploy-scraper

# ─── Database ──────────────────────────────────────────────
db-migrate:
	npm run db:migrate

db-generate:
	npm run db:generate

db-seed:
	npm run db:seed

# ─── Clean ─────────────────────────────────────────────────
clean:
	rm -rf apps/*/dist apps/*/.next apps/*/node_modules node_modules

# ─── Railway Logs ──────────────────────────────────────────
logs-api:
	railway logs --service api

logs-worker:
	railway logs --service worker

logs-web:
	railway logs --service web

logs-scraper:
	railway logs --service scraper

# ─── Info ──────────────────────────────────────────────────
help:
	@echo "Targets:"
	@echo "  dev             Start all services in dev mode"
	@echo "  build           Build all services"
	@echo "  test            Run tests"
	@echo "  lint            Run linters"
	@echo "  docker-up       Start Docker Compose"
	@echo "  docker-down     Stop Docker Compose"
	@echo "  deploy-all      Deploy all services to Railway"
	@echo "  deploy-scraper  Deploy scraper service to Railway"
	@echo "  logs-scraper    View scraper logs"
