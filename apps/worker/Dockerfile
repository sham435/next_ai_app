FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/worker/package.json ./apps/worker/

RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY apps/worker ./apps/worker/

WORKDIR /app/apps/worker
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app/apps/worker

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=builder /app/apps/worker/dist ./dist
COPY --from=builder /app/apps/worker/package.json ./package.json

USER nodejs

CMD ["node", "dist/main.js"]
