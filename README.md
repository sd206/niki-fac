# Niki Family OS

AI-powered Family Operating System on the Google stack (GCP + Firebase).

See [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md) for the full roadmap.

## Monorepo layout

```
apps/       web (Next.js), mobile (Expo React Native)
services/   api-gateway, family-service, calendar-service (Cloud Run microservices)
packages/   shared-types, db (Drizzle schema)
infra/      terraform (GCP + Firebase)
```

## Prerequisites

- Node.js >= 20
- pnpm 9 (`npm install -g pnpm@9.15.0`)
- A Firebase project (Auth with Google + Apple) and a GCP project

## Getting started

```bash
pnpm install
pnpm build        # build all packages and services
pnpm dev          # run dev tasks
```

Copy each `.env.example` to `.env` and fill in Firebase + database values.

### Run a backend vertical slice locally

1. Start local infra (Postgres with pgvector + Redis):
   ```bash
   docker compose up -d
   ```
2. Apply the database schema (the migration is generated from `packages/db/src/schema`):
   ```bash
   export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/niki
   pnpm --filter @niki/db migrate
   ```
   To regenerate migrations after editing the schema:
   `pnpm --filter @niki/db build && pnpm --filter @niki/db generate`
   (generate reads the compiled schema from `dist/`).
3. Start the Firebase Auth emulator (no real credentials needed; uses the
   `demo-niki` project). Requires Java 11+:
   ```bash
   pnpm emulator
   ```
4. Start the backend services together (each reads its own `.env`):
   ```bash
   pnpm dev:services
   ```
   Ensure the gateway env has `FIREBASE_AUTH_EMULATOR_HOST=localhost:9099` and
   `FIREBASE_PROJECT_ID=demo-niki`, and each DB-backed service has `DATABASE_URL`.
5. Start the web app: `pnpm --filter @niki/web dev`

Stop local infra with `docker compose down` (add `-v` to also drop the data volume).

### Using a real Firebase project (staging/prod)

- Create a Firebase project and enable the Google and Apple sign-in providers.
- Web/mobile: replace the `demo-*` values in `.env` with your Firebase web config
  and remove the `*_FIREBASE_AUTH_EMULATOR_URL` line.
- Gateway: remove `FIREBASE_AUTH_EMULATOR_HOST`; set `FIREBASE_PROJECT_ID` and
  either `FIREBASE_SERVICE_ACCOUNT` (JSON) or rely on Application Default
  Credentials (automatic on Cloud Run).

## Current status

Modules: auth (sign-in -> create/join family) and calendar (events CRUD + Home
dashboard) across web and mobile. The API gateway verifies Firebase ID tokens
(real project or Auth emulator) and proxies to the family- and calendar-services.
