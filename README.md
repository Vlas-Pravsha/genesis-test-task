# Genesis Test Task Starter

Minimal starter on:

- Hono
- TypeScript
- Prisma
- PostgreSQL
- Resend
- node-cron
- Jest
- zod
- Docker / docker-compose

## Versions

- Node.js 24.14.1+
- Hono 4.12.12
- TypeScript 6.0.2
- Prisma / @prisma/client 7.6.0
- Resend 6.10.0
- node-cron 4.2.1
- Jest 30.3.0
- zod 4.3.6

## Quick Start

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL:

```bash
docker compose up -d db
```

3. Apply the existing migrations:

```bash
npm run prisma:migrate:deploy
```

4. Start the app:

```bash
npm run dev
```

## Scripts

- `npm run dev` - run the Hono server in watch mode
- `npm run start` - run the server once
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

## HTTP Endpoints

- `GET /` - basic app status
- `GET /health` - liveness check
- `GET /health/db` - database connectivity check
