# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=bright-corner-api-pnpm,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store \
    && pnpm fetch --frozen-lockfile \
    && pnpm install --frozen-lockfile --offline

FROM deps AS build
COPY . .
RUN pnpm build

FROM base AS prod-deps

COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=bright-corner-api-pnpm,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store \
    && pnpm fetch --frozen-lockfile \
    && pnpm install --prod --frozen-lockfile --offline

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN mkdir -p /app/logs \
    && chown node:node /app/logs

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./

USER node

EXPOSE 3001

CMD ["node", "dist/index.js"]
