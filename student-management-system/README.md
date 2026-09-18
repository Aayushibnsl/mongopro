# Scholaris — Student Management & Academic Intelligence Platform

A full-stack platform for managing students, courses and attendance across a department, with
analytics and rule-based academic insights layered on top of the records.

Built with React, Vite, Tailwind CSS, Express, Mongoose and MongoDB Atlas.

---

## What it does

| Area                     | Capability                                                                                               |
| ------------------------ | -------------------------------------------------------------------------------------------------------- |
| **Dashboard**            | Headline figures, attendance by course, performance distribution, recent students and derived alerts.      |
| **Students**             | Search, filter, sort and paginate the roll; create, edit and remove records; a dedicated profile per student. |
| **Courses**              | Course catalogue with live enrolment counts and per-course attendance.                                     |
| **Attendance**           | Attendance analytics, distribution bands, per-course averages and a flagged list of students at risk.       |
| **Academic Performance** | CGPA distribution, averages by branch and semester, top performers and students needing attention.          |
| **Insights**             | Observations generated from the stored records by a fixed rule set.                                        |
| **Settings**             | Live system status, full archive synchronisation and the academic thresholds in force.                     |

### About the insights

The Insights screen is **rule-based, not predictive**. Every observation is computed from records
already in the database — attendance thresholds, grade bands, course averages and coverage gaps.
No external model is involved, nothing is estimated, and a rule with no supporting data produces
no insight. This keeps every statement on screen verifiable against the underlying records.

---

## Architecture

```text
client/                     React + Vite + Tailwind
  src/
    components/
      charts/               BarList, ColumnChart, DistributionBar, Meter
      layout/               AppShell, Sidebar, Topbar, GlobalSearch
      ui/                   StatCard, SectionCard, PageHeader, Skeleton
    hooks/useAnalytics.jsx  Shared analytics context — one request for every analytics screen
    pages/                  Dashboard, Students, StudentProfile, Courses,
                            Attendance, Performance, Insights, Settings
    services/               Thin API clients (axios)

server/                     Express 5 + Mongoose
  config/db.js              Two independent Atlas connections
  controllers/              students, courses, attendance, analytics, dashboard, database
  services/
    syncService.js          Mirrors every write to the archive database
    insightService.js       Rule set that turns aggregates into written observations
  models/                   Student, Course, Attendance
```

The browser never talks to the database. It calls `/api`, which Vite proxies in development and
Vercel rewrites in production, so no connection string or credential ever reaches the client.

### Two databases

| Role                     | Database             | Purpose                                                                  |
| ------------------------ | -------------------- | ------------------------------------------------------------------------ |
| **Primary data store**   | `student_management` | Source of truth. Every screen reads from here.                           |
| **Institutional archive**| `PCEA24CY002`        | Receives a synchronised copy of every record on a separate Atlas cluster. |

Mongoose supports one default connection, so both are opened with `mongoose.createConnection()`.
Writes go to the primary store first; the archive copy is then upserted by stable ID
(`studentId`, `courseId`, or the pair). If the archive is unreachable the primary write still
succeeds and the response reports the sync status — so syncing the same record repeatedly still
leaves exactly one copy, and an outage never loses data.

---

## Setup

Requires Node.js 18+ and a MongoDB Atlas connection string.

```bash
# 1. Backend
cd server
npm install
cp .env.example .env        # then fill in the values below
npm run dev                 # http://localhost:5000

# 2. Frontend (in a second terminal)
cd client
npm install
npm run dev                 # http://localhost:5173
```

### Environment variables (`server/.env`)

| Variable              | Required | Purpose                                                   |
| --------------------- | -------- | --------------------------------------------------------- |
| `PRIMARY_MONGODB_URI` | Yes      | Atlas connection string for the primary data store.       |
| `SIR_MONGODB_URI`     | No       | Archive cluster. Omit it and syncing is simply disabled.  |
| `PORT`                | No       | Defaults to `5000`.                                        |

Never commit `.env`. On macOS, port 5000 is often taken by AirPlay Receiver — set `PORT=5001`
and start the client with `BACKEND_URL=http://localhost:5001 npm run dev`.

### Demo data

```bash
cd server && npm run seed
```

Loads 20 students, 10 courses and 31 attendance records. The script is **additive and idempotent**:
records that already exist (matched on their stable IDs) are left untouched and only missing ones
are inserted, so it never overwrites or deletes anything you added yourself.

---

## API

All routes are prefixed with `/api` and return `{ success, data, ... }`.

| Method   | Route                  | Purpose                                                        |
| -------- | ---------------------- | -------------------------------------------------------------- |
| `GET`    | `/health`              | Liveness check (works without a database).                     |
| `GET`    | `/analytics`           | Every analytics figure and generated insight, in one payload.  |
| `GET`    | `/dashboard`           | Summary counts and distributions.                              |
| `GET`    | `/students`            | Paginated list — `search`, `branch`, `city`, `sortBy`, `order`, `page`, `limit`. |
| `GET`    | `/students/filters`    | Distinct branches and cities for the filter controls.          |
| `GET`    | `/students/:id`        | One student with their attendance records.                     |
| `POST`   | `/students`            | Create.                                                        |
| `PUT`    | `/students/:id`        | Update.                                                        |
| `DELETE` | `/students/:id`        | Remove, together with that student's attendance.               |
| `GET`    | `/courses`             | Courses with enrolment and attendance summaries — `search`.    |
| `POST` / `PUT` / `DELETE` | `/courses[/:id]` | Course CRUD.                                             |
| `GET`    | `/attendance`          | Records with student names — `courseId`, `studentId`, `low`.   |
| `POST` / `PUT` / `DELETE` | `/attendance[/:id]` | Attendance CRUD.                                      |
| `GET`    | `/database/status`     | Connection state of both stores. Never returns credentials.    |
| `POST`   | `/database/sync-all`   | Copy every current record to the archive.                      |

Write responses include a `sync` object (`synced` / `skipped` / `failed`) describing what happened
to the archive copy.

---

## Design notes

- **One accent** (indigo) carries identity; the status palette — green, amber, red — is reserved
  for good / warning / at-risk and always ships with an icon or a written label, so no meaning
  depends on colour alone.
- **Charts are hand-built** from the same primitives (thin bars, 4px data-ends, hairline chrome,
  direct value labels) — no charting dependency, and they resize with their container.
- **Every screen has loading, empty and error states.** Skeletons mirror the real layout so
  nothing jumps, and a refetch holds the previous render at reduced opacity instead of flashing.
- **Analytics are fetched once** into a shared context, so moving between the dashboard,
  attendance, performance and insights screens costs no additional requests.

---

## Deployment

The client and server deploy as two Vercel projects.

1. **Server** — root directory `server`. Set `PRIMARY_MONGODB_URI` and `SIR_MONGODB_URI` in the
   project's environment variables. Connections are opened lazily on the first request, which is
   what serverless requires.
2. **Client** — root directory `client`. `client/vercel.json` rewrites `/api/*` to the deployed
   server and sends everything else to `index.html` for client-side routing.

Deploy the server first whenever the API has changed, so the client never calls a route that
isn't live yet.
