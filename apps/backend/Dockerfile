# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS pruner
WORKDIR /app
COPY . .
RUN pnpm dlx turbo@2.9.14 prune @andesine/backend --docker

FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ ./
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ ./
RUN pnpm turbo build --filter=@andesine/backend
RUN pnpm --filter @andesine/backend --prod deploy --legacy /app/deploy

FROM node:24-alpine AS runner
ENV NODE_ENV=production
ENV PORT=3333
WORKDIR /app
COPY --from=builder --chown=node:node /app/deploy ./
USER node
EXPOSE 3333
CMD ["node", "./dist/index.js"]