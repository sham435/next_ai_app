FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/web/next.config.ts ./apps/web/
COPY apps/web/tsconfig.json ./apps/web/
COPY apps/web/postcss.config.mjs ./apps/web/
COPY apps/web/tailwind.config.ts ./apps/web/
COPY apps/web/public ./apps/web/public
COPY apps/web/src ./apps/web/src
COPY apps/web/app ./apps/web/app
COPY packages/shared-types/src ./packages/shared-types/src

RUN npm install

RUN cd apps/web && npm run build

EXPOSE 3000

CMD ["npm","run","start","--prefix","apps/web"]
