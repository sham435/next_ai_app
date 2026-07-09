# 🕷️ Scrape Platform

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=fff)
![Next.js](https://img.shields.io/badge/Next.js-000?logo=next.js&logoColor=fff)
![Node](https://img.shields.io/badge/Node-20-339933?logo=node.js&logoColor=fff)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=fff)
[![MIT License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![CI](https://github.com/sham435/next_ai_app/actions/workflows/ci.yml/badge.svg)](https://github.com/sham435/next_ai_app/actions/workflows/ci.yml)

Enterprise-grade web scraping platform built with **Next.js 15**, **NestJS 11**, **BullMQ**, **Redis**, and **PostgreSQL**.

## ✨ Features

- **Web Scraping**: Extract files from any HTTPS website
- **Real-time Progress**: WebSocket updates as scraping progresses
- **Job Queue**: BullMQ with Redis for reliable job processing
- **Rate Limiting**: Built-in throttling to prevent abuse
- **SSRF Protection**: Blocks requests to private IP ranges
- **Multi-Worker**: Scale workers horizontally for parallel processing
- **PostgreSQL**: Persistent storage for jobs and downloaded files
- **Production-Ready**: Docker, K8s, Railway deployment support

## 🏗️ Architecture

```
┌─────────────┐     WebSocket     ┌─────────────┐
│   Frontend  │◄────────────────►│    API      │
│  (Next.js)  │                   │  (NestJS)   │
└─────────────┘                   └──────┬──────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
              ┌──────────┐         ┌──────────┐         ┌──────────┐
              │  Redis   │         │PostgreSQL│         │  Worker  │
              │  (Queue) │         │  (Data)  │         │ (BullMQ) │
              └──────────┘         └──────────┘         └──────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL (or use Docker)
- Redis (or use Docker)
- npm (not pnpm)

### Local Development

```bash
# Clone repository
git clone https://github.com/sham435/next_ai_app
cd next_ai_app

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start all services with Docker
docker compose up -d

# Run database migrations
npm run db:migrate

# Or start individually
npm run dev          # All services (Turborepo)
npm run dev:web      # Frontend: http://localhost:3000
npm run dev:api      # API: http://localhost:4000
npm run dev:worker   # Worker process
```

### Available npm Scripts

| Script                | Description                            |
| --------------------- | -------------------------------------- |
| `npm run dev`         | Start all services in development mode |
| `npm run build`       | Build all services                     |
| `npm run lint`        | Run ESLint on all services             |
| `npm run lint:fix`    | Fix linting issues                     |
| `npm run typecheck`   | Run TypeScript type checking           |
| `npm run test`        | Run tests                              |
| `npm run db:migrate`  | Run database migrations                |
| `npm run db:generate` | Generate new migration                 |

## 📦 Project Structure

```
next_ai_app/
├── apps/
│   ├── api/              # NestJS backend (port 4000)
│   │   ├── src/
│   │   │   ├── scrape/        # Scrape module
│   │   │   ├── health/        # Health checks
│   │   │   ├── metrics/       # Prometheus metrics
│   │   │   └── common/        # Shared filters, utils
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── web/              # Next.js frontend (port 3000)
│   │   ├── src/
│   │   │   └── app/            # Next.js app router
│   │   ├── Dockerfile
│   │   └── package.json
│   └── worker/           # BullMQ worker
│       ├── src/
│       ├── Dockerfile
│       └── package.json
├── packages/
│   ├── database/         # TypeORM entities & migrations
│   │   └── src/
│   │       ├── entities/
│   │       └── migrations/
│   └── shared-types/    # Shared TypeScript types
├── tests/
│   ├── e2e/             # Playwright E2E tests
│   └── load/            # K6 load tests
├── infra/               # Infrastructure (K8s, Helm, ArgoCD)
├── docker-compose.yml   # Production compose
├── docker-compose.dev.yml # Dev compose
├── turbo.json          # Turborepo config
└── railway.json        # Railway config
```

## 🔧 Configuration

### Environment Variables

| Variable              | Description                   | Default                 |
| --------------------- | ----------------------------- | ----------------------- |
| `PORT`                | API port                      | `4000`                  |
| `REDIS_HOST`          | Redis host                    | `localhost`             |
| `REDIS_PORT`          | Redis port                    | `6379`                  |
| `REDIS_PASSWORD`      | Redis password                | -                       |
| `DATABASE_URL`        | PostgreSQL connection string  | -                       |
| `FRONTEND_URL`        | Allowed CORS origin           | `http://localhost:3000` |
| `BULL_BOARD_PASSWORD` | Bull Board dashboard password | -                       |
| `WORKER_CONCURRENCY`  | Parallel worker jobs          | `5`                     |
| `REQUEST_TIMEOUT`     | HTTP request timeout (ms)     | `10000`                 |

### Railway Variables

```bash
# Use Railway's auto-injected variables
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_HOST=${{Redis.REDIS_HOST}}
REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
```

## 🔄 CI/CD Pipeline

This project uses GitHub Actions for CI/CD with automatic Railway deployments.

### Pipeline Flow

```
Local Commit → GitHub Push → CI Checks → Railway Deploy
```

### CI Checks (GitHub Actions)

On every push/PR to `main` or `develop`:

1. **Lint & Typecheck** - ESLint + TypeScript validation
2. **Tests** - Unit tests with Redis service
3. **Build** - Build all Node.js services
4. **Security Scan** - npm audit + Trivy vulnerability scan

### Railway Deployment

- **Automatic**: Pushes to `main` trigger Railway deployments
- **Wait for CI**: Each service waits for CI to pass before deploying
- **Root Directory**: Each service is built from its respective `apps/*` folder
- **Pre-deploy**: Database migrations run automatically before API deployment

### Environment Variables

Railway automatically injects:

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_HOST=${{Redis.REDIS_HOST}}
REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
```

### Rollback

Railway supports instant rollbacks via the dashboard or CLI:

```bash
railway rollback
```

## 📡 API Endpoints

| Method | Path               | Description                      | Auth     |
| ------ | ------------------ | -------------------------------- | -------- |
| GET    | `/health`          | Health check                     | Public   |
| GET    | `/metrics`         | Prometheus metrics               | Public   |
| POST   | `/auth/login`      | Get JWT token (via API key)      | Public   |
| POST   | `/scrape`          | Submit scrape job                | JWT      |
| GET    | `/scrape/jobs`     | List recent scrape jobs          | JWT      |
| GET    | `/scrape/jobs/:id` | Get job details                  | JWT      |
| POST   | `/scrape/download` | Download scraped resources as ZIP| JWT      |
| WS     | `/scrape`          | WebSocket for real-time progress | JWT      |
| GET    | `/admin/queues`    | Bull Board dashboard             | Basic    |

### Authentication

```bash
# Generate an API key
node scripts/generate-api-key.mjs myname admin

# Set API_KEYS in Railway env or .env
# API_KEYS=skp_abc123:myname:admin

# Get a JWT token
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "skp_abc123"}'

# Use the token for protected endpoints
curl -X POST http://localhost:4000/scrape \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"url": "https://example.com"}'
```
  "success": true,
  "jobId": "abc-123"
}
```

## 🧪 Testing

```bash
# Install dependencies
npm install

# Run unit tests
npm test

# Run E2E tests
npx playwright test

# Run load tests
k6 run tests/load/api-stress.js
```

## 🚢 Deployment

### Railway (Recommended)

1. Connect GitHub repository to Railway
2. Add services:
   - **scrape-api**: Root `apps/api`, Dockerfile
   - **scrape-web**: Root `apps/web`, Dockerfile
   - **scrape-worker**: Root `apps/worker`, Dockerfile
3. Add PostgreSQL and Redis plugins
4. Configure environment variables
5. Deploy!

```bash
# Railway CLI
npm install -g @railway/cli
railway login
railway init
railway up
```

### Docker Compose

```bash
# Production
docker compose up --build

# Development
docker compose -f docker-compose.dev.yml up
```

### Kubernetes

```bash
# Apply manifests
kubectl apply -k infra/k8s/overlays/production
```

## 🔒 Security

- ✅ Helmet.js security headers
- ✅ Rate limiting (10 req/min per IP)
- ✅ CORS restricted to frontend
- ✅ SSRF protection (blocks private IPs)
- ✅ Input validation with class-validator
- ✅ Global exception handling with localized messages

## 📊 Monitoring

- **Health**: `GET /health`
- **Metrics**: `GET /metrics` (Prometheus format)
- **Bull Board**: `/admin/queues` (password protected)

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## 📝 License

MIT — see [LICENSE](LICENSE) for details.
