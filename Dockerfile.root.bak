# ---------- BASE ----------
FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared-types/package.json ./packages/shared-types/

RUN npm install

# ---------- BUILDER ----------
FROM base AS builder

COPY . .

RUN npm run build --workspace=@scrape-platform/shared-types

RUN npm run build --workspace=web

# ---------- RUNNER ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app ./

CMD ["npm", "run", "start"]
