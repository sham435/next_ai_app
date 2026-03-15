FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig.base.json ./

COPY packages ./packages

COPY apps/web ./apps/web

RUN npm install

WORKDIR /app/apps/web
RUN npm run build

WORKDIR /app

EXPOSE 3000

CMD ["node", "apps/web/node_modules/next/dist/bin/next", "start"]
