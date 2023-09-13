FROM node:18-alpine as base

FROM base AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat && npm install -g turbo

COPY . .

RUN turbo prune --scope=@vrite/assets --docker


FROM base as installer
WORKDIR /app

RUN npm install -g pnpm@8.6.0
RUN npm install -g turbo

COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm i --frozen-lockfile

COPY --from=builder /app/out/full/ .

RUN pnpm rebuild -r
RUN turbo run build --filter=@vrite/assets

FROM base AS runner
WORKDIR /app

# Install extra dependencies
RUN npm install saslprep sharp
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 app

USER app
COPY --from=installer --chown=app:nodejs /app/apps/backend/assets/dist .
CMD node index.js
