FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-types/tsconfig.json ./packages/shared-types/
COPY tsconfig.base.json ./

RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY packages/shared-types/tsconfig.json ./packages/shared-types/
COPY packages/shared-types/src ./packages/shared-types/src
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/api ./apps/api/

WORKDIR /app/packages/shared-types
RUN npx tsc

RUN mkdir -p ../node_modules/@scrape-platform/shared-types && \
    cp -r ./dist/* ../node_modules/@scrape-platform/shared-types/ && \
    cp ./package.json ../node_modules/@scrape-platform/shared-types/

WORKDIR /app/apps/api
RUN npx tsc

FROM node:20-alpine AS runner
WORKDIR /app/apps/api

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

USER nodejs

EXPOSE 3001
CMD ["node", "dist/main.js"]
