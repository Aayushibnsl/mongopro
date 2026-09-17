# Student Management System

A full-stack **MongoDB practical project** for managing students, courses and attendance. It's built with React, Express, Mongoose and **MongoDB Atlas**.

Besides normal CRUD (Create, Read, Update, Delete), the app has a **MongoDB Operations** page. There you can run comparison operators, logical operators, `find()`, `findOne()`, `countDocuments()`, `sort()` and `limit()` and see the results right away.

The app uses **two** Atlas databases:

| Name                      | Where                                    | Database             | Purpose                                            |
| ------------------------- | ---------------------------------------- | -------------------- | -------------------------------------------------- |
| **Primary database**      | Your own Atlas cluster                   | `student_management` | The source of truth. Every page reads from here.   |
| **Professor (Sir) database** | The professor's existing shared cluster | `PCEA24CY002`        | Receives synchronized copies so the professor can inspect your work. |

---

## Table of contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Architecture](#architecture)
4. [Database structure](#database-structure)
5. [MongoDB operators demonstrated](#mongodb-operators-demonstrated)
6. [Project folder structure](#project-folder-structure)
7. [Environment variables](#environment-variables)
8. [Installation](#installation)
9. [Running the backend](#running-the-backend)
10. [Running the frontend](#running-the-frontend)
11. [Seeding demo data](#seeding-demo-data)
12. [How synchronization works](#how-synchronization-works)
13. [Verifying the data in MongoDB Atlas](#verifying-the-data-in-mongodb-atlas)
14. [API reference](#api-reference)
15. [Deploying to Vercel](#deploying-to-vercel)
16. [Troubleshooting](#troubleshooting)
17. [Future improvements](#future-improvements)

---

## Features

- **Dashboard:** total students, total courses, average CGPA and average attendance. It also shows branch distribution, CGPA overview, attendance overview, recent students, and live **database connection status**.
- **Students:** add, view, edit and delete students. Search by name or student ID, filter by branch or city, sort by CGPA, age or name, with pagination. Each row shows the student's average attendance.
- **Student details:** every field, plus that student's attendance in each course.
- **Courses:** add, edit, delete and search courses.
- **Attendance:** add, edit and delete attendance. The percentage is calculated automatically, and low attendance (below 75%) is highlighted.
- **MongoDB Operations:** run safe, predefined queries (`$lt $gt $lte $gte $eq $and $or $nor $not`, `find`, `findOne`, `countDocuments`, `sort`, `limit`). Each one shows an explanation, the exact mongosh query, a result count, a result table, and a "View JSON" section.
- **Synchronization:** every create, update and delete is repeated in the professor's database without creating duplicates.
- **Friendly UX:** form validation messages, toast notifications, loading states, empty states and clear error messages.
- **Safe by design:** credentials live only in `server/.env`, the browser never talks to MongoDB, and no arbitrary query code can be run.

## Tech stack

| Layer    | Technology                                             |
| -------- | ------------------------------------------------------ |
| Frontend | React 19, Vite, Tailwind CSS 4, React Router, Axios, Lucide icons |
| Backend  | Node.js, Express 5                                     |
| Database | MongoDB Atlas                                          |
| ODM      | Mongoose                                               |
| Dev tool | nodemon (restarts the server when you change code)     |

Everything is plain JavaScript (no TypeScript).

## Architecture

```
 Browser (React app, http://localhost:5173)
        │
        │  HTTP requests to /api/...   (Vite forwards them to port 5000)
        ▼
 Express API (Node.js, http://localhost:5000)
        │
        ├── Mongoose PRIMARY connection ─────────►  Your Atlas cluster
        │                                            └── student_management
        │                                                 ├── students
        │                                                 ├── courses
        │                                                 └── attendance
        │
        └── syncService (after every change) ────►  Professor's Atlas cluster
                                                     └── PCEA24CY002
                                                          ├── students
                                                          ├── courses
                                                          └── attendance
```

- The **frontend** only talks to the Express API. It never sees a connection string.
- The **backend** keeps two separate connections using `mongoose.createConnection()` (see `server/config/db.js`).
- If the professor's database is down, the app keeps working with the primary database.

## Database structure

### `students` collection

```json
{
  "_id": "ObjectId(...)",
  "studentId": "PCEA24CY002",
  "name": "Aayushi Bansal",
  "age": 19,
  "email": "aayushi@example.com",
  "phone": "9876543210",
  "gender": "Female",
  "branch": "Cyber Security",
  "semester": 5,
  "cgpa": 9.0,
  "city": "Jaipur",
  "address": "Jaipur, Rajasthan",
  "createdBy": "Aayushi",
  "source": "Student Management System",
  "createdAt": "ISODate(...)",
  "updatedAt": "ISODate(...)"
}
```

`studentId` has a **unique index**, so two students can never share an ID.

### `courses` collection

```json
{
  "courseId": "CS501",
  "courseName": "Database Management System",
  "courseCode": "DBMS",
  "credits": 4,
  "faculty": "Dr. Sharma",
  "semester": 5,
  "department": "Computer Science"
}
```

`courseId` has a **unique index**.

### `attendance` collection

```json
{
  "studentId": "PCEA24CY002",
  "courseId": "CS501",
  "courseName": "Database Management System",
  "totalClasses": 40,
  "attendedClasses": 35,
  "percentage": 87.5
}
```

- `percentage` is calculated automatically before saving.
- A **compound unique index** on `studentId + courseId` allows only one record per student per course.
- `createdAt` and `updatedAt` are added to every document by Mongoose `timestamps`.

## MongoDB operators demonstrated

All queries run on `student_management.students`. The result counts are for the fresh demo data from `npm run seed`.

### Comparison operators

| Operator | Meaning                  | Query                                   | Demo result |
| -------- | ------------------------ | --------------------------------------- | ----------- |
| `$lt`    | less than                | `db.students.find({ cgpa: { $lt: 8 } })`  | 7 students  |
| `$gt`    | greater than             | `db.students.find({ cgpa: { $gt: 8 } })`  | 11 students |
| `$lte`   | less than or equal to    | `db.students.find({ cgpa: { $lte: 8 } })` | 9 students  |
| `$gte`   | greater than or equal to | `db.students.find({ cgpa: { $gte: 9 } })` | 6 students  |
| `$eq`    | equal to                 | `db.students.find({ cgpa: { $eq: 9 } })`  | 3 students  |

On the Operations page you can switch the field to **age** or **semester** and type your own number. For example, `age $lt 20` returns 9 students. The server only accepts those three fields and a number.

### Logical operators

| Operator | Query                                                                  | Demo result |
| -------- | ---------------------------------------------------------------------- | ----------- |
| `$and`   | `db.students.find({ $and: [ { age: { $gte: 20 } }, { cgpa: { $gte: 8 } } ] })` | 7 students  |
| `$or`    | `db.students.find({ $or: [ { city: "Jaipur" }, { cgpa: { $gte: 9 } } ] })`     | 9 students  |
| `$nor`   | `db.students.find({ $nor: [ { city: "Jaipur" }, { cgpa: { $gt: 9 } } ] })`     | 12 students |
| `$not`   | `db.students.find({ cgpa: { $not: { $gt: 8 } } })`                     | 9 students  |

> The `$and` example uses `age >= 20` instead of `age >= 18`. Every demo student is 18 or older, so `age >= 18` would not filter anyone out.

### Other queries

| Method             | Query                                               | Demo result |
| ------------------ | --------------------------------------------------- | ----------- |
| `find()`           | `db.students.find({ branch: "Cyber Security" })`    | 5 students  |
| `findOne()`        | `db.students.findOne({ studentId: "PCEA24CY002" })` | 1 student   |
| `countDocuments()` | `db.students.countDocuments({})`                    | 20          |
| `sort()`           | `db.students.find().sort({ cgpa: -1 })`             | 20, highest CGPA first |
| `limit()`          | `db.students.find().limit(5)`                       | 5 students  |

The app also uses these behind the scenes:

- `distinct()` fills the branch and city filters.
- `aggregate()` with `$group` and `$avg` produces the dashboard averages and branch counts.
- `aggregate()` with `$lookup` adds student names to attendance records.
- `insertMany()` runs in the seed script.
- `updateOne()` with **upsert**, `deleteOne()`, `deleteMany()` and `bulkWrite()` run in the sync service.

## Project folder structure

```
student-management-system/
├── client/                          React frontend
│   ├── index.html
│   ├── vite.config.js               Dev server + /api proxy to the backend
│   ├── public/favicon.svg
│   └── src/
│       ├── main.jsx                 App entry point
│       ├── App.jsx                  Layout + page routes
│       ├── index.css                Tailwind + theme colours + reusable classes
│       ├── components/              Reusable UI pieces (tables, forms, modals, charts, toasts)
│       ├── pages/                   Dashboard, Students, Courses, Attendance, Operations
│       ├── services/                Axios calls to the Express API
│       ├── hooks/useDebounce.js     Waits until you stop typing before searching
│       └── utils/                   Constants, formatting, form validation
│
├── server/                          Express backend
│   ├── server.js                    Starts Express and connects to both databases
│   ├── .env.example                 Template for your secrets
│   ├── config/db.js                 The two MongoDB connections (primary + sir)
│   ├── models/                      Mongoose schemas: Student, Course, Attendance
│   ├── controllers/                 What each API route does
│   ├── routes/                      URL → controller mapping
│   ├── services/syncService.js      Copies changes to the professor database
│   ├── middleware/                  Error handling + "primary DB connected?" check
│   ├── utils/                       Small helpers (safe error messages, query formatting)
│   └── seed/                        npm run seed – demo data for the primary database
│
├── README.md
└── .gitignore
```

## Environment variables

All secrets live in **`server/.env`**. This file is listed in `.gitignore`, so it is never committed.

```env
PRIMARY_MONGODB_URI=<your own MongoDB Atlas connection string>
SIR_MONGODB_URI=<the professor's shared MongoDB Atlas connection string>
PORT=5000
```

How to get a connection string:

1. Open MongoDB Atlas → your cluster → **Connect** → **Drivers**.
2. Copy the string. It looks like
   `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
3. Replace `<username>` and `<password>` with a **database user** from Atlas → **Database Access**.

Notes:

- You don't need to put a database name in the connection string. The app always uses `student_management` for the primary connection and `PCEA24CY002` for the professor connection.
- If your password contains special characters such as `@ : / ? #`, URL-encode them (for example `@` becomes `%40`).
- `SIR_MONGODB_URI` can be left empty. The app then works normally, and syncing is turned off.

## Installation

You need **Node.js 20 or newer** (check with `node -v`).

```bash
# 1. Backend
cd server
npm install
cp .env.example .env      # then open .env and paste your connection strings

# 2. Frontend (in a second terminal)
cd client
npm install
```

In **MongoDB Atlas → Network Access**, add your current IP address on **both** clusters: yours and the professor's. The app never changes Atlas settings for you.

## Running the backend

```bash
cd server
npm run dev
```

You should see:

```
🚀 Server running on http://localhost:5000
   Primary database: student_management   |   Professor database: PCEA24CY002

✔ Primary MongoDB connected (database: student_management)
✔ Sir MongoDB connected (database: PCEA24CY002)
```

The logs never show connection strings or passwords. If a connection fails, the server prints a hint, and the next request tries again (at most once every 15 seconds).

## Running the frontend

```bash
cd client
npm run dev
```

Open **http://localhost:5173**.

## Seeding demo data

```bash
cd server
npm run seed
```

This adds **20 students, 10 courses and 31 attendance records** to the **primary** database only.

- It **never overwrites** anything. If any of the three collections already has documents, it prints:
  ```
  Demo data already exists
  Nothing was overwritten
  ```
- It does **not** write to the professor database. To copy the demo data there, use **"Sync all to professor DB"** on the dashboard.
- To seed again from scratch, delete the three collections in Atlas (Browse Collections → trash icon) and run `npm run seed` again.

## How synchronization works

```
You click "Add Student"
        │
        ▼
1. Save to PRIMARY   student_management.students      (source of truth)
        │
        ▼
2. Copy to PROFESSOR PCEA24CY002.students             (syncService.js)
        │
        ▼
3. Toasts: "Student added successfully" + "Synced with professor database"
```

| Action in the app | Primary database               | Professor database                                   |
| ----------------- | ------------------------------ | ---------------------------------------------------- |
| Create            | `create()`                     | `updateOne(..., { upsert: true })`: insert the copy  |
| Update            | `save()`                       | `updateOne(..., { upsert: true })`: update the copy  |
| Delete            | `findByIdAndDelete()`          | `deleteOne()`: remove the copy                       |
| Delete a student  | also deletes their attendance  | also deletes those attendance copies                 |
| Delete a course   | also deletes its attendance    | also deletes those attendance copies                 |
| Rename a course   | updates `courseName` in attendance | same in the copies                               |

**Why no duplicates?** Copies are matched by a stable ID: `studentId`, `courseId`, or `studentId + courseId` for attendance. An **upsert** means "update if it exists, insert if it doesn't", so syncing the same record 10 times still leaves one copy. That's also why Student ID and Course ID can't be edited after creation.

**Safety rules built into the code:**

- The app only writes to the database `PCEA24CY002`, and only to its `students`, `courses` and `attendance` collections. Any other collection name is rejected (`getSirCollection()` in `syncService.js`).
- The app **never creates** `PCEA24CY002`. MongoDB normally creates a database on the first write, so the app first checks that the database already exists (has at least one collection). If it doesn't, syncing is paused and the dashboard shows **"Database not found"**.
- Mongoose's automatic collection and index creation is **turned off** for the professor connection.
- Other databases on the professor's cluster are never queried or modified.
- The professor database is never seeded with fake data automatically.

**If the professor database is unavailable:** your change is still saved in the primary database. You'll see a warning toast ("Not synced to professor database"), and the server logs a short error without secrets. Later, click **"Sync all to professor DB"** on the dashboard. It copies every record with upserts: missing copies are inserted, existing copies are updated, and nothing is deleted.

## Verifying the data in MongoDB Atlas

### Primary database

1. Atlas → **your** cluster → **Browse Collections**.
2. Open `student_management` → `students` (and `courses`, `attendance`).
3. After seeding you should see 20 students. Add a student in the app and refresh Atlas: the new document appears.

Or with mongosh:

```js
use student_management
db.students.countDocuments()
db.students.find({ cgpa: { $gt: 8 } })
```

### Professor database (synchronization)

1. Make sure the dashboard shows **Professor database: Connected**.
2. In the app, add a test student, for example Student ID `PCEA24CY099`. You should see the toast **"Synced with professor database"**.
3. Atlas → the **professor's** cluster → Browse Collections → `PCEA24CY002` → `students` → the same student is there.
4. **Update:** edit the student's CGPA in the app, then refresh Atlas. The copy changes, and there is still only one document.
5. **Delete:** delete the student in the app, then refresh Atlas. The copy is gone.

With mongosh on the professor's cluster:

```js
use PCEA24CY002
db.students.find({ studentId: "PCEA24CY099" })
db.students.countDocuments({ studentId: "PCEA24CY099" })   // always 0 or 1
```

## API reference

All responses are JSON. Errors always look like `{ "success": false, "message": "..." }`.

| Method | URL                                   | Description |
| ------ | ------------------------------------- | ----------- |
| GET    | `/api/students`                       | List students (`search`, `branch`, `city`, `sortBy`, `order`, `page`, `limit`) |
| GET    | `/api/students/filters`               | Distinct branches and cities |
| GET    | `/api/students/:id`                   | One student + their attendance |
| POST   | `/api/students`                       | Create a student |
| PUT    | `/api/students/:id`                   | Update a student |
| DELETE | `/api/students/:id`                   | Delete a student (and their attendance) |
| GET / POST / PUT / DELETE | `/api/courses`, `/api/courses/:id` | Course CRUD (`search` supported) |
| GET / POST / PUT / DELETE | `/api/attendance`, `/api/attendance/:id` | Attendance CRUD (`courseId`, `studentId`, `low=true` supported) |
| GET    | `/api/operations`                     | List of predefined operations |
| GET    | `/api/operations/comparison/:op`      | `lt`, `gt`, `lte`, `gte`, `eq` (optional `field`, `value`) |
| GET    | `/api/operations/logical/:op`         | `and`, `or`, `nor`, `not` |
| GET    | `/api/operations/other/:op`           | `find`, `findOne`, `countDocuments`, `sort`, `limit` |
| GET    | `/api/dashboard`                      | Dashboard statistics |
| GET    | `/api/database/status`                | Connection status (names only, never credentials) |
| POST   | `/api/database/sync-all`              | Copy every primary record to the professor database |

Create, update and delete responses include a `sync` object:
`{ "status": "synced" | "skipped" | "failed", "message": "..." }`.

## Deploying to Vercel

The frontend and the backend are deployed as **two separate Vercel projects**.

| Project  | Root Directory                      | Example URL                        |
| -------- | ----------------------------------- | ---------------------------------- |
| Backend  | `student-management-system/server`  | https://mongopro.vercel.app        |
| Frontend | `student-management-system/client`  | https://mongopro-3ip1.vercel.app   |

How it fits together:

- `server/server.js` exports the Express app (`export default app`). On Vercel it does not call `app.listen()`, because Vercel runs the app for each request itself.
- On Vercel nothing runs "at startup", so the database connects **on the first request** and later requests reuse that connection (`ensurePrimaryConnection()` in `server/config/db.js`).
- `client/vercel.json` forwards `/api/...` from the frontend to the backend, so the React code still calls `/api` (same as locally). It also sends page URLs like `/students` to `index.html`, so reloading a page works.

**Step 1: add environment variables to the backend project.** Vercel does not read `server/.env`, because that file is never committed. Open Vercel → backend project → **Settings → Environment Variables** and add:

| Name                  | Value                                   |
| --------------------- | --------------------------------------- |
| `PRIMARY_MONGODB_URI` | your own Atlas connection string        |
| `SIR_MONGODB_URI`     | the professor's Atlas connection string |

You don't need `PORT` on Vercel. Tick all environments (Production, Preview, Development).

**Step 2: allow Vercel in Atlas Network Access.** Vercel has no fixed IP address, so a single IP can't be allowed. In Atlas → **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`). Do this on your cluster. The professor's cluster needs the same setting for syncing to work from Vercel, and only the professor can change it. Your database user and password still protect the data.

**Step 3: redeploy the backend.** Environment variable changes only apply to new deployments. Use Vercel → Deployments → ⋯ → **Redeploy**, or push a new commit.

**Step 4: check.** Open `https://<backend>/api/database/status`. Both databases should show `"status":"connected"`. If not, the `message` tells you what is missing:

| Status shown     | Meaning                                                      |
| ---------------- | ------------------------------------------------------------ |
| `not_configured` | The environment variable isn't set on Vercel (Step 1 + Step 3). |
| `unavailable`    | Atlas blocked the connection or the credentials are wrong (Step 2). |
| `database_not_found` | `PCEA24CY002` doesn't exist on the professor's cluster.  |

## Troubleshooting

| Problem | Fix |
| ------- | --- |
| **`Port 5000 is already in use`** (common on macOS) | On macOS, **AirPlay Receiver** uses port 5000. Turn it off in System Settings → General → AirDrop & Handoff → AirPlay Receiver. Or set `PORT=5001` in `server/.env` and start the client with `BACKEND_URL=http://localhost:5001 npm run dev`. |
| **"Cannot reach the server"** in the browser | The backend isn't running. Start it with `cd server && npm run dev`. |
| **"Primary database is not connected"** | Check `PRIMARY_MONGODB_URI` in `server/.env`, then restart the server. |
| `querySrv ENOTFOUND` | The cluster address in the connection string is wrong, or there's no internet connection. |
| `bad auth : authentication failed` | Wrong database username or password. Use a user from Atlas → **Database Access**, not your Atlas login. |
| `Could not connect to any servers` / timeouts | Add your IP address in Atlas → **Network Access** (on both clusters). |
| `Invalid connection string` | URL-encode special characters in the password (`@` → `%40`, `#` → `%23`). |
| Dashboard shows **Professor database: Unavailable** | Check `SIR_MONGODB_URI` and the professor cluster's Network Access. The app keeps working, and you can use "Sync all" later. |
| Dashboard shows **Database not found** | `PCEA24CY002` doesn't exist on that cluster yet. The app will not create it. Ask your professor to create it. |
| Dashboard shows **Not configured** | `SIR_MONGODB_URI` is empty in `server/.env`. |
| `npm run seed` says "Demo data already exists" | This is expected, because the seed never overwrites data. Delete the collections in Atlas first if you really want to reseed. |
| "A student with Student ID ... already exists" | Student IDs are unique. Use a different ID. |
| Changes to `.env` aren't picked up | Stop the server (Ctrl + C) and run `npm run dev` again. |
| Deployed site shows "Primary database is not connected" | See [Deploying to Vercel](#deploying-to-vercel): set the environment variables on the backend project, allow `0.0.0.0/0` in Atlas Network Access, then redeploy. |
| Reloading a page on Vercel shows 404 | Make sure `client/vercel.json` contains the `/(.*)` → `/index.html` rewrite. |

## Future improvements

- Login for teachers and students (kept out on purpose to keep the project simple).
- Export students and attendance to CSV or PDF.
- Mark attendance per class date instead of total counts.
- Charts of CGPA trends across semesters.
- More aggregation pipeline demos (`$match`, `$group`, `$sort`, `$project`) on the Operations page.
- Automated tests for the API.
