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
│  ├─ api/                Express + Prisma + Socket.IO (TypeScript) — legacy backend, see note below
│  ├─ school/              Nuxt 4 + Firebase — public landing page, the staff (admin/teacher)
│  │                       portal at /dashboard, and the parent portal at /parent  → http://localhost:3000
│  └─ schools-backoffice/  Nuxt 4 + Firebase Auth — platform admin portal (add/edit/suspend
│                          schools, manage admins)                                 → http://localhost:3003
├─ packages/
│  ├─ shared/    Zod schemas, enums, socket events (shared by API + apps)
│  └─ ui/        Shared shadcn-style Vue components + Tailwind v4 theme
└─ docker-compose.yml   (optional Postgres if you use Docker)
```

`apps/parent` (a separate standalone parent portal) has been retired — its pages were ported into
`apps/school` under `/parent/**`, on a shared Firestore-backed login instead of a second app. With
it gone, `apps/api` (Express + Prisma + Postgres) has no remaining caller — `school` and
`schools-backoffice` don't talk to it — so it's now dead code kept only for reference until it's
either wired back up or removed.

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
| EduCore | http://localhost:3000 | Public landing page; `/dashboard` for admins & teachers, `/parent` for parents |
| Schools backoffice | http://localhost:3003 | Platform admins (add/edit/suspend schools, manage admins) |
| API | http://localhost:3001/api | Unused — kept for reference (see note above) |

### Run apps individually

```bash
pnpm dev:api                  # the legacy API (currently unused by any frontend)
pnpm dev:school                # EduCore (landing page + staff + parent)
pnpm dev:schools-backoffice    # just the schools backoffice
```

---

## Demo accounts

Password for **all** accounts: `password123`

| Role | Email | Notes |
|------|-------|-------|
| Admin | `admin@school.test` | Full management (people, classes, subjects, timetable, fees) |
| Teacher | `sarah@school.test` | Homeroom of Nursery A |
| Parent | `mary@parent.test` | Child: **Ama Owusu** (Nursery A) — sign in with the email, not a username |
| Platform admin | `owner@backoffice.test` | Schools backoffice — add/edit/suspend schools |

Every account above — staff/parent in `apps/school`, and the platform admin in
`schools-backoffice` — lives in Firebase Auth + Firestore (or their local emulator/mock stand-ins),
seeded by `pnpm firebase:emulators` + `pnpm firebase:seed`. Add more platform admins from
`schools-backoffice` → *Admins* once signed in as the seeded one — see `server/api/platform-admins/**`
(there's no public self-signup route; an existing admin has to add you).

---

## Try the standout features (end-to-end)

1. **Absence alert → parent reason**
   - As **teacher** (`sarah@school.test`) → *Attendance* → mark **Ama Owusu absent** → **Alert parents**.
   - As **parent** (`mary@parent.test`, `/parent`) → a notification appears; open *Absence alerts* → submit a reason.
   - Back as the teacher, the reason shows on the alert (also on the dashboard).

2. **Photo to parents**
   - Teacher → open a student → *Photos* tab → **Share a photo** (upload + caption).
   - Parent → *Photos* → the picture appears instantly.

3. **Term report + progress/talent guidance**
   - Teacher → student → *Reports* (add marks) and *Progress & Talent* (strengths, talents, what's
     needed, how parents can help).
   - Parent → *Reports* and *Progress & Talent* to read them.

4. **Fees, timetable, messaging** round out the platform, all scoped per child.

5. **Manage platform admins**
   - As **Platform Owner** (schools backoffice, `owner@backoffice.test`) → *Admins* → **Add admin**
     (name, email, password) → they can sign in immediately and review signup requests / manage
     schools alongside you.
   - An admin can't remove their own access, and the last remaining admin can't be removed at all —
     there's always at least one way in.

6. **Instant self-serve signup**
   - Submit the "Get started" form on the public landing page (`http://localhost:3000/`) — name,
     email, phone (optional), password.
   - There's no review step: the account is created as `ADMIN` and you're signed straight in to
     `/dashboard`, ready to add classes, students and staff.
   - **Note**: this app's Firestore is single-tenant (one shared school, seeded as "Sunrise
     International School") — self-signup creates a new admin *account* on that same school, not a
     separate tenant. Onboarding an actually separate school is still `schools-backoffice`'s job
     (*Schools* → **Add school**), which remains on its own mock layer, unrelated to `apps/school`'s
     real Firestore — see the architecture note below.

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
  own login and their own `platformAdmins` Firestore collection — decoupled from the
  `ADMIN`/`TEACHER`/`PARENT` `Role` used by the school/parent portals — and are the only accounts
  that can create, edit or suspend a `School`, or add/remove another platform admin (real Firebase
  Auth + `server/api/platform-admins/**`, not the mock; see `schools-backoffice`'s
  `server/utils/auth.ts`).
- **Self-serve signup**: `apps/school`'s public landing page posts to `server/api/auth/register.post.ts`
  (no auth required, unlike every other `/api/**` route) — it provisions a real Firebase Auth +
  Firestore `ADMIN` account on the spot (username auto-generated from the submitted name) and the
  browser signs straight into it. No platform-admin review step exists any more.
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
