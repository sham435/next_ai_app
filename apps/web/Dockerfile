FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-types/tsconfig.json ./packages/shared-types/
COPY tsconfig.base.json ./

RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY package.json package-lock.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-types/tsconfig.json ./packages/shared-types/
COPY packages/shared-types/src ./packages/shared-types/src
COPY tsconfig.base.json ./

WORKDIR /app/packages/shared-types
RUN npx tsc

RUN mkdir -p ../node_modules/@scrape-platform/shared-types && \
    cp -r ./dist/* ../node_modules/@scrape-platform/shared-types/ && \
    cp ./package.json ../node_modules/@scrape-platform/shared-types/

WORKDIR /app
COPY apps/web/package.json ./apps/web/
COPY apps/web/package-lock.json ./apps/web/
RUN cd apps/web && npm install

COPY apps/web/src ./apps/web/src
COPY apps/web/public ./apps/web/public
COPY apps/web/next.config.* ./apps/web/
COPY apps/web/tsconfig.json ./apps/web/
COPY apps/web/tailwind.config.* ./apps/web/
COPY apps/web/postcss.config.* ./apps/web/

WORKDIR /app/apps/web
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/package.json ./package.json
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/node_modules ./node_modules

USER nodejs

EXPOSE 3000
CMD ["npm", "run", "start"]
