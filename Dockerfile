FROM node:20-alpine AS deps
ARG SERVICE=web
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/${SERVICE}/package.json ./apps/${SERVICE}/

RUN npm ci

FROM node:20-alpine AS builder
ARG SERVICE=web
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY apps/${SERVICE} ./apps/${SERVICE}/

WORKDIR /app/apps/${SERVICE}
RUN npm run build

FROM node:20-alpine AS runner
ARG SERVICE=web
WORKDIR /app/apps/${SERVICE}

ENV NODE_ENV=production

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
