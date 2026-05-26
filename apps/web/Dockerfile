# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS pruner
WORKDIR /app
COPY . .
RUN pnpm dlx turbo@2.9.14 prune @andesine/web --docker

FROM base AS prod-deps
WORKDIR /app
COPY --from=pruner /app/out/json/ ./
RUN pnpm install --frozen-lockfile --prod

FROM base AS builder
WORKDIR /app
ARG PUBLIC_API_HOST
ARG PUBLIC_APP_HOST
ARG PUBLIC_COOKIE_DOMAIN
ARG PUBLIC_SECURE
ENV PUBLIC_API_HOST="$PUBLIC_API_HOST"
ENV PUBLIC_APP_HOST="$PUBLIC_APP_HOST"
ENV PUBLIC_COOKIE_DOMAIN="$PUBLIC_COOKIE_DOMAIN"
ENV PUBLIC_SECURE="$PUBLIC_SECURE"
COPY --from=pruner /app/out/json/ ./
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ ./
RUN pnpm turbo build --filter=@andesine/web

FROM prod-deps AS packager
WORKDIR /app
COPY --from=pruner /app/out/full/ ./
COPY --from=builder /app/apps/web/dist ./apps/web/dist

FROM node:24-alpine AS runner
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ARG PUBLIC_API_HOST
ARG PUBLIC_APP_HOST
ARG PUBLIC_COOKIE_DOMAIN
ARG PUBLIC_SECURE
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV PUBLIC_API_HOST="$PUBLIC_API_HOST"
ENV PUBLIC_APP_HOST="$PUBLIC_APP_HOST"
ENV PUBLIC_COOKIE_DOMAIN="$PUBLIC_COOKIE_DOMAIN"
ENV PUBLIC_SECURE="$PUBLIC_SECURE"
RUN corepack enable
WORKDIR /app
COPY --from=packager --chown=node:node /app ./
USER node
EXPOSE 3000
CMD ["pnpm", "--filter", "@andesine/web", "start"]