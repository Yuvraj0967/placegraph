# PlaceGraph

A placement cell management system for the DBMS mini project. **MySQL 8** is the system of record (tables, triggers, stored procedures, views, audit trail); **Neo4j 5** holds a graph of students, skills and jobs for skill-based job matching; **Next.js 15** provides the web app and API with two roles (placement officer and student). Full design and evidence: [docs/PROJECT_REPORT.md](docs/PROJECT_REPORT.md).

```
Next.js pages --> /api/* (login + role checks) --> lib/core.js --> 1. MySQL (transaction, triggers, procedures)
                                                              --> 2. Neo4j (committed rows mirrored as nodes/edges)
```

## Requirements

- Docker Desktop (running)
- Node.js 20 or newer with npm
- Free local ports 3001 (app), 3308 (MySQL), 7475 and 7688 (Neo4j). Change them in `.env.example` before the first run if needed.

## First run

```bash
npm install
npm run setup     # creates .env with random secrets, starts MySQL + Neo4j, builds the schema, seeds data, builds the graph
npm run build
npm start         # http://localhost:3001
```

`npm run setup` creates a private, git-ignored `.env` with random database passwords, a JWT secret and the two demo passwords. Open `.env` to read the demo logins:

| Role | Email | Password |
|---|---|---|
| Placement officer | `officer@college.edu` | `DEMO_OFFICER_PASSWORD` in `.env` |
| Student (Meera Nair) | `meera@college.edu` | `DEMO_STUDENT_PASSWORD` in `.env` |

To reset the demo data at any time: `npm run db:setup`. Add another login: `npm run user:create -- someone@college.edu "a-long-password" student 5` (or `officer`, no student id).

For development use `npm run dev` instead of build + start.

## Roles

- **Officer:** manages students, companies, jobs, skills, departments; shortlists, schedules interviews, records results, makes and accepts offers; sees the dashboard, graph, queries, Trigger Lab and DB Inspector.
- **Student:** sees jobs and companies, applies as themselves, sees only their own applications, interview rounds, placement and graph job matches. Officer endpoints return 403. This is enforced on the server (`lib/access.js`), not just hidden in the UI.

## Scripts

| Command | Purpose |
|---|---|
| `npm run setup` | First-time setup (env + containers + database + graph). |
| `npm run db:up` | Start the containers only. |
| `npm run db:setup` | Rebuild the database from `docs/sql/01..04`, create demo accounts, rebuild the graph. Resets all data. |
| `npm run db:sync` | Rebuild the Neo4j graph from MySQL. |
| `npm run user:create` | Create a login. |
| `npm run db:dictionary` | Regenerate `docs/DATA_DICTIONARY.md` from the live catalog. |
| `npm test` | Run all 34 tests (needs the app running; run `npm run db:setup` first). |
| `npm run test:record` | Reset, run all tests, save real output to `docs/test-results/latest.txt`. |
| `npm run evidence:sql` | Run the demo SQL scripts on a fresh database and save their output to `docs/evidence/`. |
| `npm run evidence` | Drive the real website in Edge and save screenshots and `crud_proof.txt`. |
| `npm run diagrams` | Regenerate the ER diagram and relational schema (SVG, PDF, PNG). |
| `npm run build` / `npm start` | Production build / run on port 3001. |

Direct access during a demo (replace the password with `MYSQL_ROOT_PASSWORD` from `.env`):

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
- Every change to students, jobs, applications and rounds is recorded in `audit_log`.

## Project layout

```
app/            Next.js pages and API route handlers
components/     CrudPage (search, filters, role-aware), Auth gate, Nav, shared UI
lib/            core.js (MySQL + Neo4j), auth.js, access.js, db.js, graph.js, lab.js, queries.js, resources.js, env.js
scripts/        setup, sync, user creation, dictionary, diagrams, evidence, test recorder
tests/          01-sql, 02-api, 03-graph test suites
docs/           PROJECT_REPORT, REQUIREMENTS_CHECKLIST, DATA_DICTIONARY, VIVA_NOTES, GIT_GUIDE, CONTRIBUTIONS,
                ENDPOINT_UI, DIAGRAMS, diagrams (PDF/SVG/PNG), sql/, neo4j/, evidence/, screenshots/, test-results/
```

## Project evidence and team work

- [Project report](docs/PROJECT_REPORT.md) - [Requirements checklist](docs/REQUIREMENTS_CHECKLIST.md) - [Data dictionary](docs/DATA_DICTIONARY.md)
- ER diagram: [PDF](docs/er_diagram.pdf) - Relational schema: [PDF](docs/relational_schema.pdf)
- [Real test output](docs/test-results/latest.txt) - [SQL evidence](docs/evidence/) - [Screenshots](docs/screenshots/)
- [Viva notes](docs/VIVA_NOTES.md) - [Endpoint map](docs/ENDPOINT_UI.md) - [Git guide](docs/GIT_GUIDE.md) - [Contributions](docs/CONTRIBUTIONS.md)

Team names, register numbers, instructor approval, the live demonstration and the originality statement are for the team to supply (see the checklist and `docs/CONTRIBUTIONS.md`).
