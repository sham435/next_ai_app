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

CMD ["sh", "-c", "cd apps/web && npm run start"]
