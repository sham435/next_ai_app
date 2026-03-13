FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-types/tsconfig.json ./packages/shared-types/
COPY tsconfig.base.json ./

RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY packages/shared-types/tsconfig.json ./packages/shared-types/
COPY packages/shared-types/src ./packages/shared-types/src
COPY apps/worker ./apps/worker/

WORKDIR /app/packages/shared-types
RUN npm run build

WORKDIR /app/apps/worker
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app/apps/worker

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=builder /app/apps/worker/dist ./dist
COPY --from=builder /app/apps/worker/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared-types/dist ./node_modules/@scrape-platform/shared-types

USER nodejs

CMD ["node", "dist/main.js"]
