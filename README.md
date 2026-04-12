# Genesis Test Task Starter

Backend starter for tracking GitHub releases and managing email subscriptions.

Built with:

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

- Node.js 24+
- pnpm 10.30.3+
- Hono 4.12.12
- TypeScript 6.0.2
- Prisma / @prisma/client 7.6.0
- @upstash/redis 1.37.0
- Resend 6.10.0
- Jest 30.3.0
- zod 4.3.6

## Requirements

- Node.js 24+
- pnpm 10.30.3+
- Docker / Docker Compose

## Local Development

1. Install dependencies:

```bash
pnpm install
```

2. Copy `.env.example` to `.env`.

3. Review `.env` for local development:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/genesis_test_task?schema=public
```

4. Start PostgreSQL:

```bash
pnpm db:up
```
If you change `POSTGRES_DB`, `POSTGRES_USER`, or `POSTGRES_PASSWORD` after the
database volume has already been initialized, recreate the volume before
expecting those new values to apply:

```bash
docker compose down -v
pnpm db:up
```

To enable GitHub API response caching, set `UPSTASH_REDIS_REST_URL` and
`UPSTASH_REDIS_REST_TOKEN` in `.env`. Repository and latest-release responses
are cached for 10 minutes.

To enable email delivery, set a valid `RESEND_API_KEY` and `RESEND_FROM_EMAIL`
in `.env`.

5. Apply the committed migrations:

```bash
pnpm prisma:migrate:deploy
```

6. Start the app in watch mode:

```bash
pnpm dev
```

7. Open `http://localhost:3000/` in a browser.

`APP_URL` is optional for local development. If it is not set, the app uses
`http://localhost:<PORT>`.

## Production

Production is deployed on Railway:

- App URL: `https://genesis-test-task-production.up.railway.app/`
- Database: Railway PostgreSQL

Production is deployed on Railway. The application uses Railway PostgreSQL and applies committed Prisma migrations during startup.

## Scripts

- `pnpm dev` - run the Hono server in watch mode
- `pnpm start` - generate Prisma client, apply migrations, and run the server once
- `pnpm build` - compile the application into `dist`
- `pnpm lint` - run Oxlint
- `pnpm lint:fix` - run Oxlint with safe autofixes
- `pnpm lint:staged` - run lint-staged for staged files
- `pnpm fmt` - format files with Oxfmt
- `pnpm fmt:check` - check formatting with Oxfmt
- `pnpm typecheck` - TypeScript validation
- `pnpm test` - run tests
- `pnpm test:watch` - run tests in watch mode
- `pnpm prisma:generate` - generate Prisma client
- `pnpm prisma:migrate:deploy` - apply committed migrations to the current database
- `pnpm prisma:migrate -- --name <migration-name>` - create and apply a development migration
- `pnpm prisma:studio` - open Prisma Studio
- `pnpm db:up` - start only PostgreSQL
- `pnpm db:down` - stop Docker services started for the database
- `pnpm docker:up` - start app + PostgreSQL via Docker
- `pnpm docker:down` - stop Docker services started for the app stack
- `pnpm swagger` - run Swagger UI watcher for `swagger/swagger.yml`

## CI

GitHub Actions uses separate workflows for each check:

- `.github/workflows/lint.yml` - runs `pnpm lint`
- `.github/workflows/typecheck.yml` - runs `pnpm typecheck`
- `.github/workflows/build.yml` - runs `pnpm build`
- `.github/workflows/test.yml` - runs `pnpm test` against a fresh PostgreSQL service

The `lint`, `typecheck`, and `build` workflows read `DATABASE_URL` from the
GitHub Actions secret `DATABASE_URL`.

The `test` workflow builds its database URL from the GitHub Actions secrets
`POSTGRES_USER` and `POSTGRES_PASSWORD` and connects to the PostgreSQL service
through `127.0.0.1:5432`.

## HTTP Endpoints

- `GET /` - browser UI for HTML requests, JSON app status for non-HTML clients
- `GET /health` - liveness check
- `GET /health/db` - database connectivity check
- `GET /metrics` - Prometheus metrics in text exposition format
- `POST /api/subscribe` - create a subscription and send a confirmation email
- `GET /api/subscriptions?email=<email>` - list active subscriptions for an email
- `GET /api/confirm/:token` - confirm a pending subscription
- `GET /api/unsubscribe/:token` - unsubscribe via token

Open `http://localhost:3000/` in a browser to use the new UI.
