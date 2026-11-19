# PlaceGraph project report

Placement management system for a college placement cell. MySQL 8 is the source of truth; Neo4j 5 holds a graph projection used for skill-based job matching; Next.js 15 provides the web app and API.

## 1. Title and problem statement

**Title:** PlaceGraph, a placement cell management system with graph-based job matching.

**Problem.** A placement cell tracks students, companies, job postings and recruitment progress. In spreadsheets nothing stops an ineligible student from applying, an application from skipping stages, a student from accepting two offers, openings from going negative, or changes from happening without a record. Matching students to suitable jobs by skills is also manual.

**Solution.** A relational database enforces the recruitment rules itself (constraints, triggers, stored procedures, a role-based API) and keeps an audit trail. A graph database answers relationship questions that are awkward in SQL: which open jobs match a student's skills, which skills are missing, which students are similar. This goes beyond CRUD: the database changes state on its own (a trigger creates a placement when an offer is accepted), and the graph produces recommendations.

## 2. Objectives

1. Model students, departments, companies, jobs, skills, applications, interview rounds and placements in a normalized relational schema.
2. Enforce eligibility, status flow and integrity inside the database, not only in the UI.
3. Provide a Next.js web application with forms, tables, search, filters and a dashboard for two roles (placement officer, student).
4. Use a second paradigm (graph) where it is the better fit, keeping MySQL as the single source of truth.
5. Provide documented, tested, reproducible evidence of every feature.

## 3. Functional requirements

| # | Requirement | Where |
|---|---|---|
| F1 | Sign in; two roles: officer and student | `lib/auth.js`, `/api/auth`, `components/Auth.js` |
| F2 | Officer manages students, companies, jobs, skills, departments (CRUD) | `app/*/page.js`, `/api/[resource]` |
| F3 | Students and officers search and filter lists | `components/CrudPage.js`, FULLTEXT indexes |
| F4 | A student applies for a job; eligibility is checked by the database | `sp_apply`, `trg_applications_before_insert` |
| F5 | Officer shortlists, schedules interview rounds, records results, makes and accepts offers | procedures `sp_update_application_status`, `sp_schedule_round`, `sp_set_round_result`, `sp_accept_offer` |
| F6 | Accepting an offer creates the placement, marks the student placed and uses an opening automatically | `trg_applications_after_update` |
| F7 | Every change to students, jobs, applications and rounds is audited | audit triggers, `audit_log` |
| F8 | Dashboard: placement statistics, department-wise view, pipeline | views `v_placement_summary`, `v_job_pipeline` |
| F9 | Graph: job matches by skills, skill gaps, similar students, shortest connection | `lib/graph.js`, Graph and Queries pages |
| F10 | A student sees only their own data and cannot perform officer actions | `lib/access.js`, API tests |

## 4. System architecture

```
Browser (Next.js pages, React)
   |  fetch /api/...  (HTTP-only session cookie)
Next.js Route Handlers
   |  requireUser(role) + authorizeList/authorizeCreate (lib/auth.js, lib/access.js)
lib/core.js  -- the single data layer
   |-- 1. MySQL 8.4 (InnoDB): tables, constraints, triggers, stored procedures, views   [system of record]
   '-- 2. Neo4j 5: graph projection of the committed rows                                 [derived data]
```

Every write runs inside a MySQL transaction. After the commit, the affected rows are re-read and mirrored into Neo4j (workflow resources such as applications rebuild the projection). The response carries the executed SQL and the Neo4j status so the UI can show both. MySQL and Neo4j run in Docker Compose; all credentials come from `.env`.

## 5. Database choice and justification

**Why MySQL (SQL).** The data is structured and relational with strict rules: foreign keys between students, jobs and applications, uniqueness (one application per student and job, one placement per student), CHECK constraints, and multi-row atomic changes (accepting an offer touches four tables). These need ACID transactions, constraints and triggers. MySQL 8.4 provides all of them and is allowed by the course.

**Why Neo4j (NoSQL).** The matching questions are traversals over `Student -HAS_SKILL-> Skill <-REQUIRES- Job`. Ranking jobs by matched skills and listing missing skills is one short Cypher pattern. Finding peers with shared skills and the shortest connection between two students are also natural graph queries.

**Why not SQL only?** It could be done: the same job matching can be written with joins and aggregation, and a recursive CTE can find paths. We chose Neo4j because the Cypher is shorter and clearer for these questions and because the course asks for two paradigms. We did not run a performance comparison on this tiny dataset and make no speed claims.

**Why MySQL stays the source of truth.** Rules and history live in one place. The graph holds no business rules and can be rebuilt completely from MySQL (`npm run db:sync`).

**Why no vector database.** The project follows the course option "SQL + NoSQL". No embeddings are used; retrieval is exact (SQL conditions, FULLTEXT, graph patterns).

## 6. ER diagram

`docs/er_diagram.pdf` (also `.svg`, `.png`) is a Chen-notation diagram. Strong entities: DEPARTMENT, STUDENT, SKILL, COMPANY, JOB, APPLICATION, PLACEMENT, USER. Weak entity: INTERVIEW_ROUND (identified by APPLICATION plus the partial key `round_no`; double rectangle, identifying relationship drawn as a double diamond). Relationships: DEPARTMENT 1:N STUDENT, STUDENT M:N SKILL, JOB M:N SKILL, COMPANY 1:N JOB, STUDENT 1:N APPLICATION, JOB 1:N APPLICATION, APPLICATION 1:N INTERVIEW_ROUND, APPLICATION 1:1 PLACEMENT, USER 1:1 STUDENT (optional). AUDIT_LOG is a standalone system table.

## 7. Relational schema

`docs/relational_schema.pdf` shows the 12 tables with keys and foreign keys. Conversion rules applied: each strong entity became a table; the two M:N relationships became `student_skills` and `job_skills` with composite keys; the weak entity `interview_rounds` has the composite key `(application_id, round_no)` with `ON DELETE CASCADE`; 1:N relationships became foreign keys on the "many" side.

**Normalization.** Third normal form: every non-key attribute depends on the key, the whole key and nothing but the key. Skills, departments and companies are separate tables, so names are stored once. `students.is_placed` and `jobs.openings` are deliberate, trigger-maintained derived values (denormalization for fast reads); `audit_log` stores JSON snapshots so history survives deletion of the audited row.

| Table | Primary key | Foreign keys (delete rule) |
|---|---|---|
| departments | dept_id | none |
| students | student_id | dept_id (RESTRICT) |
| companies | company_id | none |
| jobs | job_id | company_id (RESTRICT) |
| skills | skill_id | none |
| student_skills | (student_id, skill_id) | both CASCADE |
| job_skills | (job_id, skill_id) | both CASCADE |
| applications | application_id | student_id (CASCADE), job_id (RESTRICT) |
| interview_rounds (weak) | (application_id, round_no) | application_id (CASCADE) |
| placements | student_id | student_id (CASCADE), application_id (CASCADE), job_id (RESTRICT) |
| users | user_id | student_id (CASCADE, optional) |
| audit_log | audit_id | none |

## 8. Data dictionary

`docs/DATA_DICTIONARY.md` is generated from the installed catalog by `npm run db:dictionary`: every column, type, nullability, key, default, foreign key with its rules, CHECK constraint and index, plus the views, triggers and routines.

## 9. SQL implementation

The SQL lives in `docs/sql/` and is the only thing that builds the database (`npm run db:setup`).

- **DDL (`01_ddl.sql`).** `CREATE TABLE` with primary, foreign, unique and check constraints; `ALTER TABLE` (add indexes, add/modify/drop a column, add a CHECK, add FULLTEXT indexes); `DROP TABLE` on a scratch table; `CREATE VIEW`.
- **DML (`04_dml_seed.sql`, `05_dml_demo.sql`).** INSERT, UPDATE, DELETE, SELECT with JOIN, GROUP BY, HAVING, ORDER BY and aggregates. Seed applications go through the real triggers.
- **Advanced concepts used live (the course asks for four or more):**
  1. **Transactions.** `lib/core.js` wraps every write in `BEGIN ... COMMIT` and rolls back on any error; a test proves a failed unit leaves nothing behind.
  2. **Views.** `v_placement_summary` (dashboard, department statistics) and `v_job_pipeline` (applications per status per job).
  3. **Stored procedures.** `sp_apply`, `sp_update_application_status`, `sp_schedule_round`, `sp_set_round_result`, `sp_accept_offer`, `sp_student_report`, `sp_placement_stats`, called by the API.
  4. **Triggers (16).** Eligibility guard (CGPA, deadline, openings, already placed), status-flow guard, automatic placement on accepted offer, auto-rejection on a failed round, interview status update, role/student link rule for users, and audit triggers.
  5. **Indexing and full-text search.** B-tree indexes plus FULLTEXT indexes used by the search boxes via `MATCH ... AGAINST`; `docs/evidence/explain_output.txt` shows the FULLTEXT index used for the search and a full scan for the `LIKE '%..%'` form.
- **Nested queries (`06_nested_queries.sql`).** Correlated subquery, IN with scalar subquery, NOT EXISTS, NOT IN, correlated MAX, subquery in HAVING, relational division with double NOT EXISTS, subquery against placements. Real output: `docs/evidence/nested_queries_output.txt`.

## 10. NoSQL (Neo4j) implementation

**Model.** Nodes: Student, Department, Company, Job, Skill. Relationships: `IN_DEPT`, `HAS_SKILL`, `REQUIRES`, `POSTED`, `APPLIED_TO {applicationId, status, appliedOn}`, `PLACED_AT {package, role}`. Neo4j has no collections or documents; uniqueness constraints on `id` for each label create the supporting indexes (`lib/graph.js`, rebuild step). Node properties carry the SQL ids, so every node maps to one MySQL row. No embeddings are stored.

**Synchronisation.** `lib/core.js` re-reads committed rows from MySQL and `MERGE`s them (nodes by `id`, edges replaced per node), so repeating a sync never duplicates data. `npm run db:sync` rebuilds everything from MySQL. If Neo4j is unreachable the MySQL commit still stands and the UI reports the failure; the Dashboard's "Rebuild graph from MySQL" repairs it.

**Advanced NoSQL concepts used.** Variable-length path search (`shortestPath((a)-[*..6]-(b))`), aggregation (`count`, `collect`, `avg` for skill demand vs supply and placements per company), pattern predicates and list comprehensions (matched vs missing skills). All Cypher is in `docs/neo4j/cypher_queries.cypher` and runs on the Queries page.

## 11. Important queries

| Purpose | Where | Output |
|---|---|---|
| Nested SQL (8 queries) | `docs/sql/06_nested_queries.sql` | `docs/evidence/nested_queries_output.txt` |
| Joins, GROUP BY/HAVING | `docs/sql/05_dml_demo.sql` | `docs/evidence/dml_demo_output.txt` |
| Triggers before/after | `docs/sql/07_trigger_demo.sql` | `docs/evidence/trigger_demo_output.txt` |
| Procedures | `docs/sql/08_procedure_demo.sql` | `docs/evidence/procedure_demo_output.txt` |
| Index plans | `scripts/sql-evidence.mjs` | `docs/evidence/explain_output.txt` |
| Cypher (10 queries) | `docs/neo4j/cypher_queries.cypher` | Queries page, screenshots |

## 12. Database-application integration and security

- **Integration.** Route Handlers call `lib/core.js`, which uses a pooled MySQL connection and the Neo4j driver. The UI shows the SQL that ran and the status of both stores after every write; the DB Inspector page reads the raw tables.
- **No hard-coded credentials.** `lib/env.js` reads configuration only from environment variables and refuses to start if one is missing or still a placeholder. `.env` is created with random secrets by `npm run init` and is git-ignored; `.env.example` contains placeholders only. Docker Compose interpolates the same variables. The application connects with a limited MySQL user, not root; root is used only by the setup script.
- **Authentication.** Passwords are stored as bcrypt hashes. Login issues a signed JWT in an HTTP-only, SameSite=Lax cookie (8 hours; `Secure` when `COOKIE_SECURE=true`). The same error message is returned for an unknown email and a wrong password.
- **Authorization.** Two roles, `officer` and `student`. The user's current role is read from MySQL on every protected request. Rules are enforced in the API (`lib/access.js`), not just in the UI: a student gets only their own student row, applications, interview rounds and placement, can only apply as themselves, and receives 403 for every officer endpoint. API tests prove this.

## 13. Data validation and integrity

- **Database level (final authority).** PRIMARY KEY, FOREIGN KEY with RESTRICT and CASCADE rules, UNIQUE (student email, user email, company name, skill name, one application per student and job), CHECK (CGPA 0-10, package > 0, openings >= 0, graduation year), ENUM statuses, and triggers that raise readable errors (`SIGNAL`) for business rules.
- **Application level.** Required-field and numeric checks in `lib/core.js`; database errors are translated to clear 400/409 messages and shown in the UI.
- **Consistency.** Multi-table changes (accepting an offer) happen in one transaction/trigger chain; derived values (`is_placed`, `openings`) are maintained by triggers; audit rows survive deletes.

## 14. Application screenshots

Real screenshots taken from the running application by `npm run evidence` are in `docs/screenshots/`, numbered in demo order: login and wrong-password rejection; officer dashboard; students list; create / update / delete with the SQL and Neo4j banner and verification in the DB Inspector; search and filter; the recruitment workflow (trigger rejecting an ineligible application, apply, shortlist, schedule round, accept offer, placements); the Trigger Lab for every trigger and procedure; the graph and job matches; nested SQL queries; trigger and procedure lists; and the student session (own dashboard, read-only jobs, apply as herself, job matches, own data only, officer page blocked). `docs/evidence/crud_proof.txt` records the MySQL and Neo4j state after each UI action.

## 15. Testing results

`npm test` runs 34 automated tests (`tests/`): 19 SQL tests (constraints, every guard trigger, auto placement, auto rejection, audit, procedures, views, FULLTEXT, rollback), 10 API tests (authentication, 401/403, student scoping, CRUD lifecycle, validation, search and filters, student applying) and 5 graph tests (sync, projection of create/delete and accepted offers, recommendations, shortest path). Real output is saved by `npm run test:record` in `docs/test-results/latest.txt`: **34 pass, 0 fail**. The tests expect a freshly seeded database (`npm run db:setup`). The suite found one real defect during development: CGPA was stored as `DECIMAL(3,2)`, which cannot hold 10.00; it was widened to `DECIMAL(4,2)` and a regression test was added.

## 16. Limitations and future work

- The graph is synchronised right after the MySQL commit, not through a transactional outbox, so a Neo4j outage leaves the graph stale until the rebuild button is used.
- Only two demo accounts exist; there is no user-management screen, password reset or login rate limiting (`npm run user:create` adds accounts).
- Offers are accepted by the officer on the student's behalf; there is no student-facing accept button.
- Cookies are not `Secure` by default (local HTTP); set `COOKIE_SECURE=true` behind HTTPS.
- The data is a small synthetic sample; no keyboard or screen-reader accessibility review was done.
- Matching uses exact skill names; synonyms and semantic similarity (embeddings) would be a future improvement.

## 17. Conclusion

PlaceGraph shows two paradigms working together: MySQL guarantees correctness (constraints, triggers, procedures, transactions, audit) and Neo4j adds skill-based matching that is concise to express as graph traversals. The web app enforces two roles on the server, runs from environment-only configuration, and every claim in this report is backed by SQL scripts, automated tests or recorded output in `docs/`.

## 18. Requirement traceability

See [REQUIREMENTS_CHECKLIST.md](REQUIREMENTS_CHECKLIST.md) for each course requirement with its evidence and any gap that needs a human (team approval, live demonstration, originality statement).

## 19. Team and contributions

See [CONTRIBUTIONS.md](CONTRIBUTIONS.md) and [GIT_GUIDE.md](GIT_GUIDE.md). Team member names and register numbers must be filled in by the team.
