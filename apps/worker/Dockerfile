FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/worker/package.json apps/worker/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-types/tsconfig.json packages/shared-types/
COPY tsconfig.base.json ./

RUN npm install

COPY apps/worker ./apps/worker/
COPY packages/shared-types ./packages/shared-types/

WORKDIR /app/apps/worker

RUN npm run build

ENV NODE_ENV=production

EXPOSE 3002

CMD ["node", "dist/main.js"]
