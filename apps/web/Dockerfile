FROM node:20-alpine

WORKDIR /app/apps/web

COPY package.json package-lock.json ./
COPY . .

RUN npm ci

RUN npm run build

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

CMD ["node", "server.js"]
