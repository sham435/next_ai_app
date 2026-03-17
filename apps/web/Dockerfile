ARG BUILD_DATE
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY tsconfig.base.json ./

RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules

COPY apps/web ./apps/web
COPY packages/shared-types ./packages/shared-types
COPY tsconfig.base.json ./

WORKDIR /app/packages/shared-types
RUN npx tsc

RUN mkdir -p ../node_modules/@scrape-platform/shared-types && \
    cp -r ./dist/* ../node_modules/@scrape-platform/shared-types/ && \
    cp ./package.json ../node_modules/@scrape-platform/shared-types/

WORKDIR /app/apps/web
COPY apps/web/package.json ./
RUN npm ci

COPY apps/web/src ./src
COPY apps/web/public ./public
COPY apps/web/next.config.ts ./
COPY apps/web/tsconfig.json ./
COPY apps/web/tailwind.config.* ./
COPY apps/web/postcss.config.* ./

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app/apps/web

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/package.json ./package.json
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules

USER nodejs

EXPOSE 3000
CMD ["npm", "run", "start"]
