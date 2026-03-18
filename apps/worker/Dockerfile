FROM node:20-alpine AS builder
WORKDIR /app

COPY apps/worker/package*.json ./
RUN npm install

COPY apps/worker/tsconfig*.json ./
COPY apps/worker/src ./src

RUN npx tsc

FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache chromium

ENV CHROME_BIN=/usr/bin/chromium
ENV CHROMEDRIVER_PATH=/usr/bin/chromedriver
ENV PUPPETEER_SKIP_CHROMIUM_BROWSER_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

USER nodejs

CMD ["node", "dist/main.js"]
