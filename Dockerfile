FROM node:20-alpine

ARG SERVICE=web
ARG NODE_VERSION=20

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/${SERVICE}/package.json ./apps/${SERVICE}/

RUN npm ci

COPY apps/${SERVICE} ./apps/${SERVICE}/

WORKDIR /app/apps/${SERVICE}
RUN npm run build

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/main.js"]
