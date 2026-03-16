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
COPY tsconfig.base.json ./
COPY packages/shared-types/tsconfig.json ./packages/shared-types/
COPY packages/shared-types/src ./packages/shared-types/src
COPY packages/shared-types/package.json ./packages/shared-types/

WORKDIR /app/packages/shared-types
RUN npx tsc

RUN mkdir -p ../node_modules/@scrape-platform/shared-types && \
    cp -r ./dist/* ../node_modules/@scrape-platform/shared-types/ && \
    cp ./package.json ../node_modules/@scrape-platform/shared-types/

WORKDIR /app
COPY package.json ./
COPY src ./src
COPY nest-cli.json ./
COPY tsconfig.json ./

RUN npx tsc

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

RUN mkdir -p /app/download && chown -R nodejs:nodejs /app/download

USER nodejs

EXPOSE 3001
CMD ["node", "dist/main.js"]
