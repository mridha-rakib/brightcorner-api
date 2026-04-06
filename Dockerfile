FROM node:22-alpine AS base

RUN corepack enable
WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS prod-deps

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

EXPOSE 3001

CMD ["node", "dist/index.js"]
