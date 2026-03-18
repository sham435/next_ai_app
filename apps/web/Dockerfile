FROM node:20-alpine AS builder
WORKDIR /app

COPY apps/web/package.json ./package.json
COPY packages/shared-types/package.json ./shared-types/package.json
COPY packages/shared-types/src ./shared-types/src

RUN sed -i 's|"@scrape-platform/shared-types": "\*"|"@scrape-platform/shared-types": "file:./shared-types"|g' package.json

RUN npm install

COPY apps/web/src ./src
COPY apps/web/public ./public
COPY apps/web/next.config.ts ./
COPY apps/web/tsconfig.json ./
COPY apps/web/postcss.config.mjs ./

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nodejs

EXPOSE 3000
CMD ["node", "server.js"]
