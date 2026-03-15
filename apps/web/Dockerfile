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
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY packages ./packages/
COPY apps/web ./apps/web/

WORKDIR /app/packages/shared-types
RUN npx tsc || echo "No emit needed"

WORKDIR /app/apps/web
RUN mkdir -p public
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/.next/standalone ./ 
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/packages/shared-types/src ./node_modules/@scrape-platform/shared-types

RUN echo '#!/bin/sh\n\
echo "Files in /app:"\n\
ls -la /app\n\
echo ""\n\
echo "Files in /app/apps:"\n\
ls -la /app/apps 2>/dev/null || echo "No /app/apps"\n\
echo ""\n\
echo "Looking for server.js:"\n\
find /app -name server.js -type f\n\
if [ -f "/app/server.js" ]; then\n\
  echo "Found at /app/server.js"\n\
  exec node /app/server.js\n\
elif [ -f "/app/apps/web/server.js" ]; then\n\
  echo "Found at /app/apps/web/server.js"\n\
  cd /app/apps/web && exec node server.js\n\
else\n\
  echo "ERROR: server.js not found!"\n\
  exit 1\n\
fi' > /entrypoint.sh && chmod +x /entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/entrypoint.sh"]
