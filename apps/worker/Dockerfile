# Worker Service Dockerfile
# Uses Root Directory: apps/worker in Railway

FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY tsconfig*.json ./
COPY src ./src

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
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

USER nodejs

CMD ["node", "dist/index.js"]
