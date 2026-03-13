FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY apps/worker ./apps/worker/
COPY packages/shared-types ./packages/shared-types/

WORKDIR /app/apps/worker

RUN npm install

WORKDIR /app/packages/shared-types
RUN npx tsc

WORKDIR /app/apps/worker

RUN mkdir -p node_modules/@scrape-platform && \
    cp -r ../packages/shared-types/dist node_modules/@scrape-platform/shared-types && \
    cp ../packages/shared-types/package.json node_modules/@scrape-platform/shared-types/

RUN npx tsc --skipLibCheck

FROM node:20-alpine AS runner
WORKDIR /app/apps/worker

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=builder /app/apps/worker/dist ./dist
COPY --from=builder /app/apps/worker/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

USER nodejs

CMD ["node", "dist/main.js"]
