# Button lifecycle: what happens when you click

Every button follows the same road. Learn this once, then each button below is just a variation.

## The road every click travels

```
 YOU click a button
   |
   v
 1. BROWSER (React page)       builds a request, e.g.  POST /api/students  { name, cgpa, ... }
   |
   v
 2. API ROUTE (Next.js)        a) is the session cookie valid?        no -> 401 "Please sign in"
   |                           b) is your role allowed?               no -> 403 "You do not have permission"
   |                           c) students: rows are limited to their own
   v
 3. CORE (lib/core.js)         opens a MySQL TRANSACTION (BEGIN)
   |                           checks required fields / numbers
   v
 4. MYSQL                      runs the SQL or CALLs a stored procedure
   |                           -> BEFORE triggers can reject it (SIGNAL = readable error)
   |                           -> constraints (FK, UNIQUE, CHECK) can reject it
   |                           -> AFTER triggers do extra work (placement, audit rows, ...)
   |                           any error = ROLLBACK (nothing is saved)
   v
 5. COMMIT                     the change is now permanent in MySQL
   |
   v
 6. NEO4J (graph)              the changed rows are re-read from MySQL and copied into the graph
   |                           (one node/edge, or a full rebuild for workflow actions)
   v
 7. RESPONSE                   { data, sql (the exact SQL that ran), graph: ok / failed }
   |
   v
 8. BROWSER                    shows a green banner (MySQL committed, Neo4j updated, the SQL)
                               or a red banner with the readable error, then reloads the table
```

**If any step fails** the page shows a red banner with a plain message (for example "Not eligible: CGPA is below the minimum required for this job"), and MySQL is left exactly as it was.

**If only Neo4j fails** MySQL stays correct, the banner says "Neo4j failed", and Dashboard -> *Rebuild graph from MySQL* repairs the graph.

## Buttons on every table page (Students, Companies, Jobs, Skills, Departments, Users)

| Button | Who | What happens, step by step |
|---|---|---|
| **＋ Add ...** | Officer | Opens the form (no server call). Nothing changes until you press Save. |
| **Save** (new) | Officer | `POST /api/<resource>` -> role check -> BEGIN -> `INSERT` (students and jobs also rewrite their skill links) -> triggers (students/jobs: audit row) -> COMMIT -> re-read the row -> Neo4j `MERGE` of that node -> green banner with the SQL -> table reloads. |
| **Edit** | Officer | Opens the form filled with the row. Save sends `PUT /api/<resource>/<id>` -> `UPDATE` (+ skill links) -> audit trigger stores old and new values -> COMMIT -> Neo4j node updated. |
| **Delete** | Officer | Browser asks "Are you sure?" -> `DELETE /api/<resource>/<id>` -> MySQL checks foreign keys: a company with jobs or a department with students is **refused** (red banner); otherwise the row (and its children, e.g. a student's skills, applications, rounds) is removed -> COMMIT -> Neo4j `DETACH DELETE` removes the node and its edges. |
| **Cancel** | Anyone | Closes the form. No server call. |
| **↻ Refresh** | Anyone | `GET /api/<resource>` again: the table is re-read from MySQL. |
| **Search box** | Anyone | After you stop typing for 0.3 s: `GET /api/<resource>?q=text`. The server uses the **FULLTEXT index** (`MATCH ... AGAINST`) when every word has 3+ letters, otherwise `LIKE`. |
| **Filter dropdowns** | Anyone | Immediately `GET /api/<resource>?status=...` (or `placed`, `role`, `result`). Search and filters combine. |

Students see the same tables but **without** Add/Edit/Delete (except where noted below), and the server only returns their own rows for students, applications, interviews and placements.

## Applications page: the recruitment buttons

| Button | Who | What happens |
|---|---|---|
| **New application -> Save** | Officer (picks student + job) or Student (picks job; the student is forced to be themselves) | `POST /api/applications` -> `CALL sp_apply(student, job)` -> checks student and job exist and no duplicate -> `INSERT` -> **BEFORE INSERT trigger** rejects if the student is already placed, CGPA < job minimum, deadline passed or no openings -> AFTER INSERT trigger writes an audit row -> COMMIT -> **full graph rebuild** (new `APPLIED_TO` edge). |
| **Shortlist** (status APPLIED) | Officer | `PUT {action:"shortlist"}` -> `CALL sp_update_application_status(id,'SHORTLISTED')` -> `UPDATE` -> BEFORE UPDATE trigger (closed applications are frozen) -> AFTER UPDATE trigger writes a STATUS_CHANGE audit row -> graph rebuild. |
| **Make offer** (status INTERVIEW) | Officer | `PUT {action:"offer"}` -> the procedure requires the status INTERVIEW **and** at least one round, **all PASSED**; otherwise a red banner. Then `UPDATE` to OFFERED + audit. |
| **Accept offer** (status OFFERED) | Officer | `PUT {action:"accept"}` -> `CALL sp_accept_offer(id)` -> `UPDATE ... status='ACCEPTED'` -> **AFTER UPDATE trigger**: inserts the **placement** (package copied from the job), sets `students.is_placed = 1` (audit), reduces `jobs.openings` by 1 (audit), writes a PLACED audit row -> back in the procedure: the student's **other open applications become WITHDRAWN** -> COMMIT -> graph rebuild adds the `PLACED_AT` edge. |
| **Reject** | Officer | `PUT {action:"reject"}` -> `CALL sp_update_application_status(id,'REJECTED')` -> `UPDATE` + audit -> graph rebuild. |
| **Delete** | Officer | `DELETE` -> the interview rounds and placement are removed by cascade; if the application was ACCEPTED, the trigger also marks the student unplaced and returns the opening; delete audit row -> graph rebuild. |

Allowed status flow: `APPLIED -> SHORTLISTED -> INTERVIEW -> OFFERED -> ACCEPTED`, and `REJECTED` / `WITHDRAWN` from any open state. A closed application cannot change again.

## Interviews page (the weak entity)

| Button | Who | What happens |
|---|---|---|
| **Schedule round -> Save** | Officer | `POST /api/rounds` -> `CALL sp_schedule_round(app, type, date)` -> only SHORTLISTED/INTERVIEW applications; the previous round must be PASSED; **the round number is generated** (1, 2, 3...) -> `INSERT` -> BEFORE trigger refuses closed applications -> AFTER trigger moves the application to **INTERVIEW** and audits -> graph rebuild. |
| **Mark PASSED** | Officer | `PUT {result:"PASSED"}` -> `CALL sp_set_round_result` -> `UPDATE` -> AFTER UPDATE trigger writes an audit row. The next round or an offer is now possible. |
| **Mark FAILED** | Officer | Same call with FAILED -> AFTER UPDATE trigger **rejects the whole application automatically** and audits both changes -> graph rebuild. |
| **Delete** | Officer | Removes that round; the application keeps its current status. |

## Users page

| Button | What happens |
|---|---|
| **Add account -> Save** | `POST /api/users` -> password must be 8+ characters -> it is hashed with bcrypt in the server (the hash is **never shown**; the banner prints `<bcrypt hash>`) -> `INSERT` -> **trigger** checks: a student account needs a linked student, an officer must have none -> COMMIT. Users are not part of the graph. |
| **Edit** | Same, `UPDATE`; leave the password blank to keep the old one; a new password replaces the hash. |
| **Delete** | Refused for your own account and for the last officer; otherwise the account is deleted. |

## Login and session buttons

| Button | What happens |
|---|---|
| **Sign in** | `POST /api/auth` -> `SELECT ... WHERE username = ? OR email = ?` -> bcrypt compares the password -> a signed token is stored in an **HTTP-only cookie** (8 hours) -> the page shows the menu for your role. Wrong details always give the same message "Invalid email or password". |
| **Sign out** | `DELETE /api/auth` -> the cookie is removed -> back to the login page. |
| **Every page load** | `GET /api/auth` -> the server re-reads your role from MySQL, so changing a role or deleting an account takes effect immediately. |

## Dashboard, Graph, Queries, Trigger Lab, DB Inspector

| Button | What happens |
|---|---|
| **Dashboard ↻ Refresh** | `GET /api/stats` (row counts in MySQL, node/edge counts in Neo4j) and the view `v_placement_summary`; the badge shows whether both stores agree. |
| **Rebuild graph from MySQL** | `POST /api/resync` -> reads all tables from MySQL -> **wipes the graph** -> creates uniqueness constraints -> re-creates every node and edge. Use it if the graph ever looks wrong. |
| **Graph ↻ Refresh** | `GET /api/graph/snapshot` (all nodes and edges, drawn as a picture) and the student list. |
| **Graph: student dropdown** | `GET /api/graph/recommend?studentId=` -> two Cypher queries: jobs ranked by matching skills (with the missing skills listed) and peers with similar skills. Students always get their own result. |
| **Queries ▶ Run** | `GET /api/queries?kind=sql|cypher&id=` -> runs the exact query printed on the page (SQL is SELECT-only; Cypher parameters come from the small text boxes) and shows the rows. |
| **Trigger Lab: tab** | `GET /api/lab?scenario=...` -> `SHOW CREATE TRIGGER/PROCEDURE` (step 1: the code) and a snapshot of the tables (step 2: BEFORE). Changing a drop-down refreshes the BEFORE tables. |
| **Trigger Lab: Run the statement / Execute the procedure** | `POST /api/lab` -> runs the demo statement (or CALL) -> reads the tables again (step 4: AFTER, changed rows green) -> rebuilds the graph -> shows the explanation (step 5). Rule violations appear as the database's own error message. |
| **DB Inspector: table tabs, live refresh** | `GET /api/inspect?table=` reads the raw table (never the password hash). With "live refresh" it re-reads every 2 seconds. |

## Worked example: clicking "Accept offer" for Sneha Iyer (application #10, Data Analyst)

| Step | Where | What changes |
|---|---|---|
| 1 | Browser | `PUT /api/applications/10 {"action":"accept"}` |
| 2 | API | cookie valid, role = officer |
| 3 | Core | `BEGIN` |
| 4 | MySQL procedure | `sp_accept_offer(10)`: status is OFFERED, so continue |
| 5 | `applications` | row 10: `OFFERED -> ACCEPTED` |
| 6 | Trigger `before_update` | allowed (OFFERED -> ACCEPTED) |
| 7 | Trigger `after_update` | new row in **`placements`** (student 4, job 3, 9.00 LPA, today) |
| 8 | `students` | Sneha: `is_placed` 0 -> 1 (audit row) |
| 9 | `jobs` | Data Analyst: `openings` 2 -> 1 (audit row) |
| 10 | `audit_log` | action **PLACED** for application 10 |
| 11 | Procedure continues | Sneha's other application (#9, QA Engineer) `APPLIED -> WITHDRAWN` (audit row) |
| 12 | Core | `COMMIT`, then Neo4j rebuild: new edge `(Sneha)-[:PLACED_AT]->(DataWorks)` |
| 13 | Browser | green banner: "MySQL committed", "Neo4j updated", `CALL sp_accept_offer(10)`; table shows ACCEPTED |

To **see** each of these: DB Inspector tabs `applications`, `placements`, `students`, `jobs`, `audit_log`, or the Trigger Lab scenario *Accept an offer*.
