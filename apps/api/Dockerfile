FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-types/tsconfig.json packages/shared-types/
COPY tsconfig.base.json ./

RUN npm install

COPY apps/api ./apps/api/
COPY packages/shared-types ./packages/shared-types/

WORKDIR /app/apps/api

RUN npm run build

ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "dist/main.js"]
