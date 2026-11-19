# PlaceGraph

A placement cell management system for the DBMS mini project. **MySQL 8** is the system of record (tables, triggers, stored procedures, views, audit trail); **Neo4j 5** holds a graph of students, skills and jobs for skill-based job matching; **Next.js 15** provides the web app and API with two roles (placement officer and student).

```
Next.js pages --> /api/* (login + role checks) --> lib/core.js --> 1. MySQL (transaction, triggers, procedures)
                                                              --> 2. Neo4j (committed rows mirrored as nodes/edges)
```

## Quick start (4 commands)

Needs Docker Desktop (running) and Node.js 20+. Full beginner guide: **[docs/HOW_TO_RUN.md](docs/HOW_TO_RUN.md)**.

```bash
npm install
npm run setup     # creates .env with random secrets, starts MySQL + Neo4j, builds schema, seeds data, creates logins, builds graph
npm run build
npm start         # http://localhost:3001
```

## Logins

Sign in with a **username or email**. Passwords are random and live in your private, git-ignored `.env` file (`findstr DEMO .env` on Windows): officers use `DEMO_OFFICER_PASSWORD`, students use `DEMO_STUDENT_PASSWORD`.

| Username | Email | Role |
|---|---|---|
| `officer` | officer@college.edu | Placement officer (everything) |
| `tpo` | tpo@college.edu | Placement officer |
| `aarav` `diya` `rohan` `sneha` `kabir` `meera` `arjun` `ananya` `vikram` `isha` `neha` `rahul` | `<name>@college.edu` | Student, linked to the student with that first name |

Officers add or remove accounts on the **Users** page (or `npm run user:create -- <username> <email> <password> <officer|student> [student_id]`).

## Roles

- **Officer:** manages students, companies, jobs, skills, departments and users; shortlists, schedules interviews, records results, makes and accepts offers; sees the dashboard, graph, queries, Trigger Lab and DB Inspector.
- **Student:** sees jobs and companies, applies as themselves, sees only their own applications, interview rounds, placement and graph job matches. Officer endpoints return 403. This is enforced on the server (`lib/access.js`), not just hidden in the UI.

## Guides

| Guide | What it is for |
|---|---|
| [docs/HOW_TO_RUN.md](docs/HOW_TO_RUN.md) | Run it step by step, everyday commands, fixing problems |
| [docs/BUTTON_LIFECYCLE.md](docs/BUTTON_LIFECYCLE.md) | What happens, step by step, when you click each button |
| [docs/SCHEMA_GUIDE.md](docs/SCHEMA_GUIDE.md) | The tables, relationships, triggers and graph explained simply |
| [docs/DEMO_GUIDE.md](docs/DEMO_GUIDE.md) | Every item on the teacher's requirement list with exact demo steps |
| [docs/PROJECT_REPORT.md](docs/PROJECT_REPORT.md) | Full project report |
| [docs/REQUIREMENTS_CHECKLIST.md](docs/REQUIREMENTS_CHECKLIST.md) | Course requirements vs evidence |
| [docs/README.md](docs/README.md) | Index of everything in `docs/` |

## Scripts

| Command | Purpose |
|---|---|
| `npm run setup` | First-time setup (env + containers + database + graph). |
| `npm run db:up` | Start the containers only. |
| `npm run db:setup` | Rebuild the database from `docs/sql/01..04`, create the accounts, rebuild the graph. **Resets all data.** |
| `npm run db:sync` | Rebuild the Neo4j graph from MySQL. |
| `npm run user:create` | Create a login. |
| `npm run db:dictionary` | Regenerate `docs/DATA_DICTIONARY.md` from the live catalog. |
| `npm test` | Run all 39 tests (needs the app running; run `npm run db:setup` first). |
| `npm run test:record` | Reset, run all tests, save real output to `docs/test-results/latest.txt`. |
| `npm run evidence:sql` | Run the demo SQL scripts on a fresh database and save their output to `docs/evidence/`. |
| `npm run evidence` | Drive the real website in Edge and save screenshots and `crud_proof.txt`. |
| `npm run diagrams` | Regenerate the ER diagram and relational schema (SVG, PDF, PNG). |
| `npm run build` / `npm start` | Production build / run on port 3001. |

Direct access (replace the password with `MYSQL_ROOT_PASSWORD` from `.env`):

```bash
docker exec -it -e MYSQL_PWD=YOUR_ROOT_PASSWORD placegraph-mysql mysql -uroot placegraph
```

Neo4j Browser: http://localhost:7475 (user `neo4j`, password `NEO4J_PASSWORD` from `.env`), for example `MATCH (n) RETURN n LIMIT 80`.

## Rules enforced by the database

- A student can apply only if not already placed, CGPA >= the job's minimum, deadline not passed and openings remain.
- Status flow: only OFFERED can become ACCEPTED; closed applications are frozen; an offer needs every interview round PASSED.
- Accepting an offer creates the placement, marks the student placed and uses an opening (trigger); the student's other applications are withdrawn (procedure).
- A FAILED interview round rejects the application (trigger).
- A company with jobs and a department with students cannot be deleted; deleting a student cascades to their skills, applications and rounds.
- A student account must be linked to a student record; an officer account must not be (trigger).
- Every change to students, jobs, applications and rounds is recorded in `audit_log`.

## Project layout

```
app/            Next.js pages and API route handlers
components/     CrudPage (search, filters, role-aware), Auth gate, Nav, shared UI
lib/            core.js (MySQL + Neo4j), auth.js, access.js, db.js, graph.js, lab.js, queries.js, resources.js, env.js
scripts/        setup, sync, user creation, dictionary, diagrams, evidence, test recorder
tests/          01-sql, 02-api, 03-graph test suites
docs/           guides, report, checklist, dictionary, diagrams, sql/, neo4j/, evidence/, screenshots/, test-results/
```

Team names, register numbers, instructor approval, the live demonstration and the originality statement are for the team to supply (see `docs/REQUIREMENTS_CHECKLIST.md` and `docs/CONTRIBUTIONS.md`).
