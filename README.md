# 🕷️ Scrape Platform

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

# Or start individually
npm run dev          # All services (Turborepo)
npm run dev:web      # Frontend: http://localhost:3000
npm run dev:api      # API: http://localhost:4000
npm run dev:worker   # Worker process
```

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

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API port | `4000` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_PASSWORD` | Redis password | - |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:3000` |
| `BULL_BOARD_PASSWORD` | Bull Board dashboard password | - |
| `WORKER_CONCURRENCY` | Parallel worker jobs | `5` |
| `REQUEST_TIMEOUT` | HTTP request timeout (ms) | `10000` |

### Railway Variables

```bash
# Use Railway's auto-injected variables
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_HOST=${{Redis.REDIS_HOST}}
REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
```

## 📡 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/metrics` | Prometheus metrics |
| POST | `/scrape` | Submit scrape job |
| WS | `/scrape` | WebSocket for real-time progress |
| GET | `/admin/queues` | Bull Board dashboard |

### POST /scrape

```bash
curl -X POST http://localhost:4000/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

Response:
```json
{
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

Private — All rights reserved.
