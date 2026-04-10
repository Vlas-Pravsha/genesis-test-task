# Genesis Test Task Starter

Minimal starter on:

- Hono
- TypeScript
- Prisma
- PostgreSQL
- Upstash Redis
- Resend
- Jest
- zod
- Docker / docker-compose

## Versions

- Node.js 24.14.1+
- Hono 4.12.12
- TypeScript 6.0.2
- Prisma / @prisma/client 7.6.0
- @upstash/redis 1.37.0
- Resend 6.10.0
- Jest 30.3.0
- zod 4.3.6

## Quick Start

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL:

```bash
docker compose up -d db
```

The local Docker database uses the credentials from `.env.example`:
`vlas / genesis-secret-password55`.

If you want GitHub API responses to be cached, set `UPSTASH_REDIS_REST_URL`
and `UPSTASH_REDIS_REST_TOKEN` in `.env`. Repository and latest-release
responses are cached for 10 minutes.

3. Apply the existing migrations for local development:

```bash
npm run prisma:migrate:deploy
```

4. Start the app in watch mode:

```bash
npm run dev
```

`npm run start` automatically generates the Prisma client and applies committed migrations before the server starts. This is the path used when the service is started normally, including Docker.

## Scripts

- `npm run dev` - run the Hono server in watch mode
- `npm run start` - generate Prisma client, apply migrations, and run the server once
- `npm run build` - compile the application into `dist`
- `npm run lint` - run Oxlint
- `npm run lint:fix` - run Oxlint with safe autofixes
- `npm run fmt` - format files with Oxfmt
- `npm run fmt:check` - check formatting with Oxfmt
- `npm run typecheck` - TypeScript validation
- `npm run test` - run tests
- `npm run prisma:generate` - generate Prisma client
- `npm run prisma:migrate:deploy` - apply committed migrations to the current database
- `npm run prisma:migrate -- --name <migration-name>` - create and apply a development migration
- `npm run prisma:studio` - open Prisma Studio
- `npm run db:up` - start only PostgreSQL
- `npm run docker:up` - start app + PostgreSQL via Docker

## CI

GitHub Actions uses separate workflows for each check:

- `.github/workflows/lint.yml` - runs `pnpm lint`
- `.github/workflows/typecheck.yml` - runs `pnpm typecheck`
- `.github/workflows/build.yml` - runs `pnpm build`
- `.github/workflows/test.yml` - runs `pnpm test` against a fresh PostgreSQL service

Each workflow reads `DATABASE_URL` from the GitHub Actions secret `DATABASE_URL`.
The test workflow also reads `POSTGRES_USER` and `POSTGRES_PASSWORD` from GitHub Actions secrets.

## HTTP Endpoints

- `GET /` - basic app status
- `GET /health` - liveness check
- `GET /health/db` - database connectivity check
