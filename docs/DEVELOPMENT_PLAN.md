# Niki Family OS - Development Plan

Version 1.0 - derived from the PRD, Solution Architecture, and UX/Screen Design Specification.

This plan turns the three approved documents into an executable, phased delivery roadmap on the
Google stack (GCP + Firebase), with a React Native mobile app and a Next.js web app.

---

## 1. Confirmed Technology Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Mobile app | React Native + Expo + TypeScript | Zustand, React Query, React Navigation |
| Web app | Next.js + TypeScript | TailwindCSS, ShadCN, React Query, Zustand |
| Auth | Firebase Authentication | Google Sign-In + Apple Sign-In, JWT to backend |
| Push / messaging app-side | Firebase Cloud Messaging | + Analytics, Crashlytics, Remote Config, App Check |
| Backend | Cloud Run microservices (Node.js + TypeScript) | Behind an API Gateway service |
| Async events | Google Pub/Sub | Event-driven processing |
| Primary DB | Cloud SQL for PostgreSQL | Multi-tenant via `family_id` |
| Vector search | pgvector (in Postgres) | No separate vector DB |
| Cache / sessions | Memorystore (Redis) | Rate limiting, hot data |
| Documents | Google Drive (user-owned) + iCloud (P1) | Niki stores metadata only |
| OCR / extraction | Google Document AI | Receipts, medical, insurance, tax forms |
| AI | Gemini (primary), OpenAI/Anthropic (secondary) | RAG over pgvector, model router later |
| Secrets | Google Secret Manager | |
| Observability | Cloud Logging + Cloud Monitoring + audit logs | Every write audited |
| Source / CI/CD | GitHub + GitHub Actions | Build -> test -> Docker -> Cloud Run |
| IaC | Terraform | Reproducible per-environment infra |

Backend language recommendation: **Node.js + TypeScript** across all services so types are shared
end to end with the frontend (`packages/shared-types`). This maximizes velocity for an MVP team.

---

## 2. Repository Structure (Monorepo)

Use a **pnpm + Turborepo** monorepo so web, mobile, services, and shared packages live together
with shared types and one CI pipeline.

```
niki/
├── apps/
│   ├── mobile/                 # Expo React Native app
│   └── web/                    # Next.js web app
├── services/
│   ├── api-gateway/            # Auth verification, routing, rate limiting
│   ├── family-service/         # Families, members, roles, invitations
│   ├── task-service/           # Tasks, chores, recurring, gamification
│   ├── calendar-service/       # Events, reminders, calendar sync
│   ├── finance-service/        # Budgets, expenses, savings, receipts
│   ├── document-service/       # Drive integration, metadata, OCR, indexing
│   ├── notification-service/   # Push, email, in-app
│   ├── ai-service/             # Prompt orchestration, RAG, memory, agents
│   └── knowledge-graph-service/# Entities + relationships
├── packages/
│   ├── shared-types/           # Domain types shared across all apps/services
│   ├── ui/                     # Shared design-system primitives
│   ├── api-client/             # Typed client for the API gateway
│   ├── db/                     # Drizzle/Prisma schema + migrations
│   └── config/                 # Lint, tsconfig, env schema
├── infra/
│   ├── terraform/              # GCP project, Cloud Run, Cloud SQL, Pub/Sub, IAM
│   └── docker/                 # Base images, Cloud Run service Dockerfiles
└── .github/workflows/          # CI/CD pipelines
```

---

## 3. Core Data Model (multi-tenant, every row carries `family_id`)

Foundational tables (PostgreSQL):

- `families` (id, name, owner_id, subscription_tier, created_at)
- `users` (id, firebase_uid, email, display_name, photo_url)
- `family_members` (family_id, user_id, role[owner|parent|adult|child|guest], points, status)
- `invitations` (family_id, email/phone, role, token, status, expires_at)
- `events` (family_id, title, start, end, recurrence_rule, owner_id, source, color)
- `tasks` (family_id, title, assignee_id, type[personal|family|chore], due_at, priority, recurrence_rule, points, status)
- `task_rewards` / `achievements` / `streaks` (gamification)
- `budgets` (family_id, name, period, category, limit_amount)
- `expenses` (family_id, amount, merchant, category, date, source[manual|voice|ocr], receipt_doc_id, approval_status)
- `savings_goals` (family_id, name, target_amount, current_amount, target_date)
- `documents` (family_id, drive_file_id, folder_id, owner_id, path, category, tags[], permissions, ocr_status)
- `document_chunks` (document_id, chunk_text, embedding vector(768))
- `meals` (family_id, date, recipe_id, meal_type)
- `recipes` / `shopping_list_items`
- `trips` (family_id, name, start, end, budget) + `reservations`, `packing_items`
- `memories` (family_id, type, content, embedding vector) - Family Memory System
- `entities` + `relationships` - Knowledge Graph
- `notifications` (family_id, user_id, channel, type, payload, read_at)
- `audit_log` (family_id, actor_id, action, entity, before, after, at)

Cross-cutting: every service enforces `family_id` scoping at the query layer (row-level isolation),
validated against the caller's role from the verified Firebase JWT.

---

## 4. Event-Driven Topics (Pub/Sub)

`document.uploaded`, `expense.created`, `task.completed`, `event.created`, `trip.created`,
`meal.planned`, `memory.created`. Consumers: document pipeline (OCR -> chunk -> embed -> index),
notification fan-out, knowledge-graph updates, AI memory ingestion.

Document processing pipeline:
`Drive webhook -> metadata sync -> Document AI OCR -> text extract -> chunk -> embed -> pgvector -> KG update -> search ready`.

---

## 5. Phased Delivery Roadmap

Each phase ends with a deployable increment to `dev` -> `test` -> `stage` -> `prod`.

### Phase 0 - Foundations (Weeks 1-3)
- GCP project + Terraform: Cloud SQL, Memorystore, Pub/Sub, Artifact Registry, Secret Manager, IAM.
- Firebase project: Auth (Google + Apple), FCM, App Check, Crashlytics, Analytics, Remote Config.
- Monorepo scaffold (Turborepo + pnpm), shared-types, db package with migration tooling.
- API Gateway service with Firebase JWT verification + RBAC middleware.
- CI/CD: GitHub Actions (build, test, Docker, Cloud Run deploy, smoke test).
- Web + mobile app shells with auth login flow (Welcome screen + sign-in).
- **Exit criteria:** a user can sign in on web and mobile; gateway authorizes a `whoami` call.

### Phase 1 - Family Core MVP (Weeks 4-8)
- **family-service:** create family, invite members (email/SMS/link), roles, permissions.
- **calendar-service:** events, recurring events, reminders; Day/Week/Month/Agenda views.
- **task-service:** tasks, chores, assignment, recurring, basic points/badges for children.
- **Home Dashboard** (Screen 4): today summary, upcoming events, family activity feed.
- **Family Timeline** (Screen 5) + **Family Directory** (Screen 13).
- Notifications: push (FCM) + in-app for event reminders and task due.
- **Exit criteria:** a family can fully coordinate schedules + tasks across mobile and web.

### Phase 2 - Money + Family Vault (Weeks 9-14)
- **finance-service:** budgets, categories, expenses, savings goals, charts, basic insights.
- Expense capture: manual + receipt photo + voice; approval workflow.
- **document-service:** Google Drive OAuth onboarding, `Niki/` folder structure creation,
  metadata sync, permissions (Family/Parents/Private/Custom), folder browsing + search.
- Document AI OCR + pgvector indexing pipeline (Pub/Sub driven).
- **Exit criteria:** receipts OCR into expenses; documents are searchable from the Vault.

### Phase 3 - AI Assistant, Memory, Knowledge Graph (Weeks 15-20)
- **ai-service:** natural-language assistant (persistent floating button / right panel),
  RAG over documents/events/tasks/expenses, Gemini primary with provider abstraction.
- **knowledge-graph-service:** entities + relationships, populated from documents and memories.
- Family Memory System: preferences, goals, habits, financial/travel patterns.
- AI capabilities: create events/tasks/budgets, document search, expense analysis, insights.
- **Exit criteria:** assistant answers the spec's example queries with cited family data.

### Phase 4 - Meals + Travel (Weeks 21-25)
- **Meals:** weekly planner, recipes, AI suggestions, auto grocery/shopping lists.
- **Travel:** trip dashboard (flights/hotels/activities/budget/packing), document storage links,
  AI travel assistant.
- **Exit criteria:** end-to-end meal week and a planned trip with linked documents.

### Phase 5 - Hardening & Scale (Weeks 26-30)
- Analytics dashboards (DAU/MAU, tasks, events, documents indexed, AI queries, retention).
- Audit logging coverage, security review, load testing to MVP targets
  (10k families / 100k users / 1M docs / 100k AI queries/month).
- App store submission (iOS/Android), performance tuning (60 FPS, <2s API, <5s AI).
- **Exit criteria:** meets non-functional targets; production launch ready.

---

## 6. Environments

`dev.niki.ai` -> `test.niki.ai` -> `stage.niki.ai` -> `app.niki.ai`, each with isolated Cloud SQL,
Firebase project (or environment), and secrets. Promotion via GitHub Actions on protected branches.

---

## 7. Cross-Cutting Standards

- **Security:** Firebase Auth, RBAC enforced in gateway + per service, TLS 1.3, AES-256 at rest,
  Secret Manager, audit log on every write, App Check on clients.
- **Design system:** Inter, primary `#4F46E5`, success `#10B981`, warning `#F59E0B`,
  danger `#EF4444`, 16px radius, 8px spacing grid, card-based UI; shared in `packages/ui`.
- **Quality gates:** typecheck + lint + unit tests + service contract tests in CI; smoke tests post-deploy.
- **Observability:** structured logs, traces, and per-service dashboards in Cloud Monitoring.

---

## 8. Recommended First Sprint (actionable now)

1. Initialize the Turborepo monorepo with `apps/web`, `apps/mobile`, `packages/shared-types`, `packages/db`.
2. Stand up the GCP project + Firebase project via Terraform (skeleton).
3. Build the API Gateway with Firebase JWT verification + a `family-service` create/join flow.
4. Implement Welcome + Sign-in + Create/Join Family screens on web and mobile.
5. Wire CI/CD to deploy the gateway and family-service to Cloud Run `dev`.

This delivers a vertical slice (auth -> create family -> invite member) proving the full stack.
