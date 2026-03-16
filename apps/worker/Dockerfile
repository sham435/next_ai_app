# Worker Service Dockerfile
# Build from monorepo root

FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-types/tsconfig.json ./packages/shared-types/
COPY tsconfig.base.json ./
COPY apps/worker/package.json ./apps/worker/

RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY packages/shared-types/tsconfig.json ./packages/shared-types/
COPY packages/shared-types/src ./packages/shared-types/src
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/worker/package.json ./apps/worker/

WORKDIR /app/packages/shared-types
RUN npx tsc

RUN mkdir -p ../node_modules/@scrape-platform/shared-types && \
    cp -r ./dist/* ../node_modules/@scrape-platform/shared-types/ && \
    cp ./package.json ../node_modules/@scrape-platform/shared-types/

WORKDIR /app/apps/worker
RUN npx tsc

FROM node:20-alpine AS runner
WORKDIR /app/apps/worker

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=builder /app/apps/worker/dist ./dist
COPY --from=builder /app/apps/worker/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

USER nodejs

CMD ["node", "dist/index.js"]
