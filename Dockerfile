FROM oven/bun:1
WORKDIR /app

COPY package.json bun.lock ./
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY core/package.json ./core/

RUN bun install --frozen-lockfile --network-concurrency=4 --no-cache && rm -rf /root/.bun/install/cache

COPY . .

RUN cd server && bunx prisma generate
ARG VITE_SENTRY_DSN
ARG VITE_SENTRY_ENVIRONMENT
ARG SENTRY_AUTH_TOKEN
ARG SENTRY_ORG
ARG SENTRY_PROJECT
RUN cd client && bunx vite build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh", "-c", "cd server && bunx prisma migrate deploy && cd .. && bun run server/src/index.ts"]
