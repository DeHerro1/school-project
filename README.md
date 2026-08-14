# School Management System

A school management platform with a **parent-engagement portal** — the feature most school
systems lack. Teachers photograph young/first-time students and share the moments with parents;
parents track attendance and get **absence alerts they respond to with a reason**; terminal
reports and **progress/talent guidance** (where the child excels, what's needed, how parents can
help) are delivered digitally, in real time.

Final-year project built with **Nuxt 4, Tailwind v4, shadcn-style UI (reka-ui), Node.js + Express,
PostgreSQL + Prisma, and Socket.IO**.

---

## Monorepo layout

```
final-project/
├─ apps/
│  ├─ api/                Express + Prisma + Socket.IO (TypeScript)               → http://localhost:3001
│  ├─ school/              Nuxt 4 — admin + teacher portal                        → http://localhost:3000
│  ├─ parent/              Nuxt 4 — parent portal                                 → http://localhost:3002
│  └─ schools-backoffice/  Nuxt 4 — platform admin portal (add/edit/suspend schools) → http://localhost:3003
├─ packages/
│  ├─ shared/    Zod schemas, enums, socket events (shared by API + apps)
│  └─ ui/        Shared shadcn-style Vue components + Tailwind v4 theme
└─ docker-compose.yml   (optional Postgres if you use Docker)
```

The frontends import `@repo/ui` (components) and `@repo/shared` (typed request schemas), so the
client and server never drift.

---

## Prerequisites

- **Node ≥ 20** and **pnpm ≥ 10**
- **PostgreSQL 16** running locally (either the native install below, or `docker compose up -d`)

---

## Getting started

```bash
# 1. Install dependencies
pnpm install

# 2. Environment — copy the example and adjust if needed
cp .env.example .env
#    apps/api/.env is symlinked to the root .env so the Prisma CLI finds DATABASE_URL

# 3. Start PostgreSQL
#    Option A — Docker:
docker compose up -d
#    Option B — native (macOS/Homebrew):
brew services start postgresql@16
#    then create the role + database once:
#    psql -d postgres -c "CREATE ROLE school LOGIN PASSWORD 'school' CREATEDB;"
#    psql -d postgres -c "CREATE DATABASE school OWNER school;"

# 4. Create the schema and load demo data
pnpm db:migrate      # applies Prisma migrations
pnpm db:seed         # seeds demo users, classes, students, an absence alert, etc.

# 5. Run everything (API + both portals in parallel)
pnpm dev
```

Then open:

| App | URL | Who |
|-----|-----|-----|
| School portal | http://localhost:3000 | Admins & teachers |
| Parent portal | http://localhost:3002 | Parents |
| Schools backoffice | http://localhost:3003 | Platform admins (add/edit/suspend schools) |
| API | http://localhost:3001/api | — |

### Run apps individually

```bash
pnpm dev:api                  # just the API
pnpm dev:school                # just the school portal
pnpm dev:parent                # just the parent portal
pnpm dev:schools-backoffice    # just the schools backoffice
```

---

## Demo accounts

Password for **all** accounts: `password123`

| Role | Email | Notes |
|------|-------|-------|
| Admin | `admin@school.test` | Full management (people, classes, subjects, timetable, fees) |
| Teacher | `sarah@school.test` | Homeroom of Nursery A |
| Parent | `john@parent.test` | Children: **Tunde** (first-time) & **Ada** |
| Parent | `mary@parent.test` | Child: **Zainab** — starts with a **pending absence alert** |
| Platform admin | `owner@backoffice.test` | Schools backoffice — add/edit/suspend schools |

---

## Try the standout features (end-to-end)

1. **Absence alert → parent reason**
   - As **teacher** (school portal) → *Attendance* → pick *Nursery A* → mark **Tunde absent** → **Alert parents**.
   - As **John** (parent portal) → a notification appears; open *Absence alerts* → submit a reason.
   - Back as the teacher, the reason shows on the alert (also on the dashboard).

2. **Photo to parents**
   - Teacher → open a student → *Photos* tab → **Share a photo** (upload + caption).
   - Parent → *Photos* → the picture appears instantly.

3. **Terminal report + progress/talent guidance**
   - Teacher → student → *Reports* (add marks / attach PDF) and *Progress & Talent* (strengths,
     talents, what's needed, how parents can help).
   - Parent → *Reports* (download) and *Progress & Talent* (read the guidance).

4. **Fees, timetable, messaging** round out the platform, all scoped per child.

5. **Onboard a new school (multi-tenant)**
   - As **Platform Owner** (schools backoffice, `owner@backoffice.test`) → *Schools* → **Add school** →
     fill in the school's details and its first admin account.
   - The new school appears with its own (initially empty) student/staff/class counts, completely
     separate from Sunrise International School's — every tenant-scoped mock route filters by
     `schoolId`. Suspend it from the detail page and note its status update live.
   - **Known limitation of the mock layer**: each portal (school/parent/schools-backoffice) is a
     separate Nuxt app with its own in-memory mock database, so a school (and admin account) created
     in the backoffice only exists in *that browser tab* — signing in to the school portal as the new
     admin won't find it there. This is a mock-only artifact, not a tenant-isolation bug; wiring a
     portal to the real `apps/api` (one shared Postgres database) removes it.

Notifications and photo/alert events are pushed in real time over **Socket.IO** (the bell badge
updates live).

---

## Useful scripts

```bash
pnpm db:studio     # Prisma Studio (browse the DB)
pnpm db:reset      # drop, re-migrate, re-seed
pnpm build         # build all packages/apps
pnpm --filter api typecheck
```

---

## Architecture notes

- **Frontends run on a mock data layer.** `school`, `parent` and `schools-backoffice` all route
  `useApi()` through an in-browser mock (`@repo/shared` → `mock.ts`) instead of calling `apps/api`
  over HTTP — the whole demo runs with `pnpm dev`, no Postgres required. `apps/api` (Prisma +
  Express) mirrors the same routes and is the intended production backend; reconnect a portal to it
  by swapping `useApi()` back to an `$fetch.create({ baseURL })` client.
- **Multi-tenancy**: every school is a `School` row; `User`, `Class`, `Subject` and `Student` each
  carry a `schoolId`. Platform admins (schools-backoffice) are a separate account model with their
  own login — decoupled from the `ADMIN`/`TEACHER`/`PARENT` `Role` used by the school/parent portals
  — and are the only accounts that can create, edit or suspend a `School`.
- **Auth**: JWT access + rotating refresh tokens (argon2 password hashing). Two SPA portals share
  one stateless API; each guards its own role (`ADMIN`/`TEACHER` for school, `PARENT` for parent).
- **Authorization**: parents are scoped to their own children via `Guardianship`; every parent-facing
  endpoint checks ownership (`apps/api/src/services/access.ts`).
- **Validation**: every write route validates its body with a Zod schema from `@repo/shared`.
- **Files**: student photos and report PDFs are stored on local disk (`apps/api/uploads`) and served
  at `/files/*`. Swappable for S3/Cloudinary behind `apps/api/src/lib/upload.ts`.
- **Real-time**: `apps/api/src/lib/socket.ts` — `notify()` persists a notification row *and* pushes it
  to the user's room; features (alerts, media, reports, invoices, messages) reuse it.

## Tech stack

Nuxt 4 · Vue 3 · Tailwind CSS v4 · reka-ui · Pinia · Express · Prisma · PostgreSQL · Socket.IO ·
Zod · TypeScript · pnpm workspaces.
