# API Service Dockerfile

FROM node:20-alpine AS deps
WORKDIR /app

COPY apps/api/package*.json ./
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY apps/api/package*.json ./
COPY apps/api/tsconfig.json ./
COPY apps/api/tsconfig.base.json ./
COPY apps/api/tsconfig.build.json ./
COPY apps/api/nest-cli.json ./
COPY apps/api/src ./src

RUN npx tsc

FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache chromium

ENV CHROME_BIN=/usr/bin/chromium
ENV CHROMEDRIVER_PATH=/usr/bin/chromedriver
ENV PUPPETEER_SKIP_CHROMIUM_BROWSER_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

RUN mkdir -p /app/download && chown -R nodejs:nodejs /app/download

USER nodejs

EXPOSE 3001
CMD ["node", "dist/main.js"]
