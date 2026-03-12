# Contributing to Scrape Platform

## Development Setup

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16+
- Redis 7+

### Quick Start

```bash
# Clone repository
git clone https://github.com/sham435/next_ai_app
cd next_ai_app

# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Start development services
docker compose -f docker-compose.dev.yml up -d

# Run all apps in development
npm run dev

# Or run individually
npm run dev:web      # http://localhost:3000
npm run dev:api      # http://localhost:4000
npm run dev:worker   # Worker process
```

## Project Architecture

### Monorepo Structure

This is a Turborepo monorepo with three main applications:

```
apps/
├── api/       # NestJS REST API + WebSocket
├── web/       # Next.js frontend
└── worker/    # BullMQ job processor

packages/
├── database/  # TypeORM entities & migrations
└── shared-types/  # Shared TypeScript types
```

### Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 15, React 19, Tailwind CSS |
| Backend | NestJS 11, TypeScript |
| Database | PostgreSQL 16, TypeORM |
| Queue | BullMQ, Redis 7 |
| Testing | Playwright, Jest, k6 |

## Adding New Features

### 1. Add New API Endpoint

```bash
# Generate NestJS resource
cd apps/api
nest g resource modules/new-feature
```

### 2. Add New Database Entity

```typescript
// packages/database/src/entities/new-entity.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('new_entities')
export class NewEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;
}
```

### 3. Create Migration

```bash
cd packages/database
npm run migration:generate -- CreateNewEntity
npm run migration:run
```

### 4. Add Tests

```typescript
// tests/e2e/new-feature.spec.ts
import { test, expect } from '@playwright/test';

test('new feature works', async ({ request }) => {
  const response = await request.get('/api/new-feature');
  expect(response.ok()).toBeTruthy();
});
```

## Code Style

- Use TypeScript strict mode
- Follow ESLint rules (configured in packages/eslint-config)
- Use meaningful variable names
- Add JSDoc comments for complex functions
- Write unit tests for utilities

## Commit Messages

Follow Conventional Commits:

```
feat: add new scraping method
fix: resolve rate limiting issue
docs: update API documentation
refactor: simplify queue processing
test: add E2E tests for scrape endpoint
chore: update dependencies
```

## Pull Request Process

1. **Create feature branch**
   ```bash
   git checkout -b feature/my-new-feature
   ```

2. **Make changes** and add tests

3. **Run checks**
   ```bash
   npm run lint
   npm run typecheck
   npm test
   ```

4. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: description"
   git push origin feature/my-new-feature
   ```

5. **Create Pull Request** on GitHub

6. **Wait for CI/CD checks** to pass

7. **Get review** from maintainers

8. **Merge** after approval

## Testing Requirements

- Unit tests for all utility functions
- E2E tests for all API endpoints
- Load tests for critical paths
- Minimum 80% code coverage

## Deployment

### Railway Deployment

1. Push to `main` branch
2. GitHub Actions triggers deployment
3. Railway automatically builds and deploys

### Manual Railway Deploy

```bash
railway up --service api
railway up --service web
railway up --service worker
```

## Questions?

- Open an issue on GitHub
- Check existing documentation
- Contact maintainers
