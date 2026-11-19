# Demo guide: every item on the teacher's requirement list

This maps the **DBMS mini project presentation requirements** (items 1-12) to the exact files and the exact clicks. The teacher's most important point: **do not just show screenshots; actually demonstrate the working database, run queries, show trigger execution and prove the website is connected to the database.**

## Setup before you present (5 minutes)

1. Start Docker Desktop, then in the project folder: `npm run db:setup` (resets the sample data) and `npm start`.
2. Open http://localhost:3001 and sign in as `officer` (password: `DEMO_OFFICER_PASSWORD` in `.env`).
3. Open a second window with the MySQL prompt (replace the password with `MYSQL_ROOT_PASSWORD` from `.env`):

```bash
docker exec -it -e MYSQL_PWD=YOUR_MYSQL_ROOT_PASSWORD placegraph-mysql mysql -uroot placegraph
```

4. Have `docs/er_diagram.pdf` and `docs/relational_schema.pdf` printed.

---

## 1. Project introduction

Say (30 seconds): *"PlaceGraph runs a college placement cell. Students apply to company jobs; applications go through shortlisting, interviews and offers; accepting an offer places the student. MySQL enforces the rules and keeps history; Neo4j matches students to jobs by skills. The website is Next.js."*

Show: the dashboard (`/`). Files: `README.md`, `docs/PROJECT_REPORT.md` section 1.

## 2. ER diagram (hard copy)

Show `docs/er_diagram.pdf`. Be ready to say:
- **Strong entities:** DEPARTMENT, STUDENT, SKILL, COMPANY, JOB, APPLICATION, PLACEMENT, USER. Each has its own primary key.
- **Weak entity:** **INTERVIEW_ROUND**. "Round 2" has no meaning without its application, so its key is `(application_id, round_no)`, drawn as a double rectangle with a double diamond (identifying relationship).
- **Why JOB is not weak:** it has its own `job_id`; the foreign key only says which company posted it.

More: [SCHEMA_GUIDE.md](SCHEMA_GUIDE.md).

## 3. Relational schema (hard copy)

Show `docs/relational_schema.pdf` (12 tables with PK, FK, arrows). It matches the real database because both are generated from the same design; prove it with the live listing in step 4.

## 4. Database tables

In the MySQL prompt:

```sql
SHOW TABLES;
SHOW CREATE TABLE interview_rounds\G
DESCRIBE students;
```

Explain the columns, data types, the primary key (two columns here), and the foreign key to `applications`. Table purposes: the "Every table in plain words" table in [SCHEMA_GUIDE.md](SCHEMA_GUIDE.md). Live listing in the browser: **DB Inspector**.

## 5. SQL commands: DDL

File: `docs/sql/01_ddl.sql` (also `02_triggers.sql`, `03_procedures.sql`). Open it and point at:
- `CREATE TABLE` (12 tables), `CREATE VIEW` (2 views)
- `ALTER TABLE` (add index, add/modify/drop a column, add CHECK, add FULLTEXT)
- `DROP TABLE scratch_demo` and `DROP DATABASE IF EXISTS`

## 6. SQL commands: DML

File: `docs/sql/05_dml_demo.sql` (seed data: `04_dml_seed.sql`). Run it block by block in the MySQL prompt: `SELECT`, `INSERT`, `UPDATE`, `DELETE`, joins, `GROUP BY ... HAVING`. After each change run a `SELECT` to show its effect.

## 7. UI: CRUD, and proof the database really changed

Use the **Students** page. Keep the MySQL window beside the browser.

| Step | In the website | In MySQL (prove it) |
|---|---|---|
| Create | Students -> **Add student** -> fill the form (pick department and a few skills) -> **Save**. The green banner shows the `INSERT` and "Neo4j updated". | `SELECT * FROM students ORDER BY student_id DESC LIMIT 1;` then `SELECT * FROM student_skills WHERE student_id = (SELECT MAX(student_id) FROM students);` |
| Read | Use the search box (`demo`) and the Status filter. | `SELECT COUNT(*) FROM students;` |
| Update | **Edit** that student -> change the CGPA -> **Save**. | `SELECT student_id, cgpa FROM students ORDER BY student_id DESC LIMIT 1;` and `SELECT * FROM audit_log ORDER BY audit_id DESC LIMIT 1;` (the trigger stored the old and new values) |
| Delete | **Delete** -> confirm. | `SELECT COUNT(*) FROM students WHERE name LIKE 'Demo%';` returns 0; skill links are gone too |

Also click **DB Inspector -> students** to show the same rows read straight from MySQL. Evidence of this exact run: `docs/evidence/crud_proof.txt` and screenshots `docs/screenshots/05` to `12`.

The UI must work without errors, so rehearse once after `npm run db:setup`.

## 8. Advanced SQL

- **Nested queries:** website **Queries** page (8 SQL queries, click **▶ Run**), file `docs/sql/06_nested_queries.sql`, output `docs/evidence/nested_queries_output.txt`.
- **Triggers:** 16, see step 9.
- **Stored procedures:** 7. Website **Trigger Lab -> Procedure: CALL sp_accept_offer** (or `sp_apply`, `sp_schedule_round`...). In SQL: `docs/sql/08_procedure_demo.sql`, for example:

```sql
CALL sp_apply(5, 2, @new_id);
SELECT @new_id;
CALL sp_accept_offer(17);
CALL sp_placement_stats();
```

## 9. Trigger demonstration (the teacher's exact sequence)

**Easiest: the Trigger Lab page** (sign in as `officer` -> Trigger Lab -> tab **Trigger: Accept an offer: UPDATE on applications**). It shows the five steps in order:

1. **Show the trigger code** (`CREATE TRIGGER ...`), printed from MySQL itself.
2. **Data BEFORE**: the application (OFFERED), the student (`is_placed = 0`), the job (openings), no placement, the audit log.
3. **Fire it**: click *Run the statement that activates the trigger*. It runs one plain `UPDATE applications SET status = 'ACCEPTED' ...`.
4. **Data AFTER**: the changed rows are highlighted in green: status ACCEPTED, `is_placed = 1`, openings reduced, a new placement row, new audit rows.
5. **Explanation**: we only changed one column; the trigger created the placement, marked the student placed, used up an opening and wrote the audit row, all automatically.

The same sequence as plain SQL: `docs/sql/07_trigger_demo.sql` (run in the MySQL prompt). Other triggers to show: the **eligibility guard** (Trigger Lab tab *Apply for a job*, pick Arjun Reddy + Software Engineer to see the database refuse it), **failed round auto-reject**, and the **audit trigger**. Evidence: `docs/evidence/trigger_demo_output.txt`.

## 10. NoSQL

We **do** use NoSQL: **Neo4j** (a graph database). Do not claim more than that.
- Queries: website **Queries** page (10 Cypher queries) or `docs/neo4j/cypher_queries.cypher`; the **Graph** page shows the picture and job matches.
- Why a graph: job matching is a path `Student -> Skill <- Job`; listing the missing skills and similar students is a few lines of Cypher instead of many SQL joins.
- Why MySQL is still the source of truth: rules, history and transactions. The graph can always be rebuilt (Dashboard -> *Rebuild graph from MySQL*).
- Neo4j Browser (optional): http://localhost:7475, `MATCH (n) RETURN n LIMIT 80`.

## 11. Documentation folder

Everything is in `docs/`:

| Teacher's item | File |
|---|---|
| Project introduction | `PROJECT_REPORT.md` (sections 1-5), `../README.md` |
| ER diagram | `er_diagram.pdf` / `.png` / `.svg` |
| Relational schema | `relational_schema.pdf` / `.png` / `.svg` |
| List of tables | `SCHEMA_GUIDE.md`, `DATA_DICTIONARY.md` |
| DDL | `sql/01_ddl.sql`, `sql/02_triggers.sql`, `sql/03_procedures.sql` |
| DML | `sql/04_dml_seed.sql`, `sql/05_dml_demo.sql` |
| CREATE TABLE examples | `evidence/create_tables_output.txt` |
| Nested queries | `sql/06_nested_queries.sql`, `evidence/nested_queries_output.txt` |
| Trigger code and before/after | `sql/07_trigger_demo.sql`, `evidence/trigger_demo_output.txt`, screenshots `lab_trigger_*` |
| Stored procedures and execution | `sql/08_procedure_demo.sql`, `evidence/procedure_demo_output.txt`, screenshots `lab_procedure_*` |
| NoSQL queries and justification | `neo4j/cypher_queries.cypher`, `PROJECT_REPORT.md` section 5 and 10 |
| Screenshots of the website | `screenshots/` |
| CRUD evidence (UI changes the database) | `evidence/crud_proof.txt`, screenshots `05`-`12` |
| Tests | `test-results/latest.txt` |

## 12. Final presentation checklist

- [ ] Docker Desktop running, `npm run db:setup` done, `npm start` running without errors
- [ ] Logged in as `officer`; a student window ready (`meera`) to show the role difference
- [ ] CRUD (step 7) rehearsed: create, update, delete a student and verify each in MySQL
- [ ] Trigger Lab *Accept an offer* rehearsed (steps 1-5)
- [ ] SQL queries run (Queries page and `06_nested_queries.sql`)
- [ ] Procedures run (`CALL sp_accept_offer(17)` etc.)
- [ ] ER and schema PDFs printed; you can explain the weak entity
- [ ] `npm test` shows 39 passing
- [ ] You can explain every part: [VIVA_PREP_GUIDE.md](VIVA_PREP_GUIDE.md), [VIVA_NOTES.md](VIVA_NOTES.md) and [BUTTON_LIFECYCLE.md](BUTTON_LIFECYCLE.md)

Run `npm run db:setup` again right before presenting so the sample data is in its starting state.
