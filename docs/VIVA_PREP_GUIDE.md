# PlaceGraph: complete viva preparation guide

What your DBMS teacher is likely to ask, how to answer, and where to **show** the answer in your own project. Read it once fully, then use the checklists. Every answer below matches the real code and database in this repository; if you change the project, change the answer.

> **The golden rule of this viva:** she wants to see the *working* database, not just slides. For every answer, be ready to do one of three things: open the file, run the query, or click the button. "Show:" lines tell you what.

---

## How to use this guide

| Tag | Meaning |
|---|---|
| **[Easy]** | Almost certain to be asked. You must answer without thinking. |
| **[Medium]** | Likely. Know the idea and one example from the project. |
| **[Hard]** | A strong student gets this. Do not panic if you stumble, but read it. |
| **Answer** | What to say (simple wording first, details after). |
| **Show** | The file, click or command that proves it. |
| **Careful** | A trap or an easy way to say something untrue. |

**Before the viva (30 minutes):** read parts 1, 2 and 15; skim your own areas; run the demo once (see `DEMO_GUIDE.md`).
**The night before:** read parts 3 to 12; practise the rapid-fire list in part 17 aloud.

### Contents

1. Your opening: 60-second and 3-minute explanations
2. Key facts and numbers (memorise these)
3. Project and motivation
4. ER model and design
5. Keys and the relational schema
6. Normalization
7. SQL: DDL, DML, queries
8. Indexes, views, performance
9. Transactions, ACID and concurrency
10. Triggers
11. Stored procedures
12. Neo4j and NoSQL
13. The web application (Next.js, API, integration)
14. Security, login and roles
15. "What happens if...?" scenarios
16. Code walkthrough: which file does what
17. Rapid-fire round (one-line answers)
18. General DBMS theory she may ask
19. Limitations and improvements (answer honestly)
20. Team, Git, originality and AI-assisted work
21. Live "show me" cheat sheet
22. How to answer well, and what not to claim

---

## 1. Your opening

She will almost certainly start with: *"Explain your project."* Prepare both versions.

### 60-second version

> "Our project is **PlaceGraph**, a placement cell management system for a college. The placement cell keeps students, companies and job postings, and students apply to jobs. An application goes through shortlisting, interview rounds and an offer, and when the student accepts, they are placed.
> The problem is that in spreadsheets nothing enforces the rules: an ineligible student can apply, applications can skip stages, a student can accept two offers, and there is no history. So **MySQL enforces the rules itself** with constraints, triggers and stored procedures, and keeps an audit log. We also use **Neo4j, a graph database**, to match students to jobs by skills and show the skill gap. The website is **Next.js** with login and two roles, officer and student. MySQL is the source of truth and Neo4j is a copy that can always be rebuilt."

### 3-minute version (add these four parts)

1. **Design:** "12 tables. The weak entity is `interview_rounds`, because round 2 means nothing without its application, so its key is `(application_id, round_no)`. Skills are many-to-many with both students and jobs, so we have two link tables."
2. **Database features:** "16 triggers and 7 stored procedures. Example: when an offer is accepted, one update fires a trigger that creates the placement, marks the student placed, reduces the job's openings and writes an audit row. We also use transactions, 2 views, and full-text indexes for search."
3. **Graph:** "Neo4j has students, skills, jobs, companies and departments as nodes. A Cypher query ranks open jobs by how many of the job's required skills the student has and lists the missing skills."
4. **Quality:** "39 automated tests pass, there are screenshots and real SQL output as evidence, and the app never hard-codes passwords: everything comes from an `.env` file."

**Show:** the dashboard at `http://localhost:3001` (login as `officer`).

---

## 2. Key facts and numbers (memorise these)

| Fact | Value |
|---|---|
| Stack | Next.js 15 (React 19) + MySQL 8.4 + Neo4j 5, run in Docker |
| MySQL tables | **12**: departments, students, companies, jobs, skills, student_skills, job_skills, applications, interview_rounds, placements, users, audit_log |
| Views | **2**: `v_placement_summary`, `v_job_pipeline` |
| Triggers | **16** (applications 5, interview_rounds 3, students 3, jobs 3, users 2) |
| Stored procedures | **7**: sp_apply, sp_update_application_status, sp_schedule_round, sp_set_round_result, sp_accept_offer, sp_student_report, sp_placement_stats |
| Weak entity | `interview_rounds` (key = application_id + round_no) |
| Strong entities | departments, students, companies, jobs, skills, applications, placements, users |
| Neo4j nodes | Student, Department, Company, Job, Skill (39 nodes at seed) |
| Neo4j relationships | IN_DEPT, HAS_SKILL, REQUIRES, POSTED, APPLIED_TO, PLACED_AT |
| Seed data | 4 departments, 12 students, 5 companies, 8 jobs, 10 skills, 21 applications, 4 placements |
| Roles | `officer` and `student` |
| Demo logins | 2 officers (`officer`, `tpo`) + 12 students (first names, e.g. `meera`) = 14 |
| Status flow | APPLIED, SHORTLISTED, INTERVIEW, OFFERED, ACCEPTED (or REJECTED / WITHDRAWN) |
| SQL queries (nested) | 8 in `docs/sql/06_nested_queries.sql` |
| Cypher queries | 10 in `docs/neo4j/cypher_queries.cypher` |
| Tests | **39** (21 SQL, 13 API, 5 graph), all passing |
| Password storage | bcrypt hash (cost 10) |
| Session | signed JWT (HS256) in an HTTP-only SameSite=Lax cookie, 8 hours |
| Ports | app 3001, MySQL 3308, Neo4j browser 7475, Neo4j bolt 7688 |

**Key files:** `docs/sql/01_ddl.sql` (tables), `02_triggers.sql`, `03_procedures.sql`, `04_dml_seed.sql`, `lib/core.js` (the data layer), `lib/graph.js` (Neo4j), `lib/auth.js` + `lib/access.js` (login and roles), `docs/er_diagram.pdf`, `docs/relational_schema.pdf`.

## 3. Project and motivation

**Q1. Why did you choose a placement management system?** `[Easy]`
- **Answer:** It is a real problem every college has. It has rich relationships (students, skills, jobs, applications, interviews), strict rules (eligibility, one placement per student, status order) and history needs (audit). That makes it a good fit for a relational database with triggers, and the skill matching is a natural graph problem.
- **Careful:** Do not say "because it was easy". Say what made it a good DBMS problem.

**Q2. What problem does it solve that a spreadsheet cannot?** `[Easy]`
- **Answer:** A spreadsheet cannot *enforce* rules. Here the database itself refuses an ineligible application (low CGPA, expired deadline, no openings, already placed), forces the status order, creates the placement automatically on an accepted offer, and records every change. It also shows which jobs match a student's skills.
- **Show:** Trigger Lab -> *Apply for a job* with Arjun Reddy + Software Engineer: the database error appears.

**Q3. Is this just CRUD?** `[Medium]`
- **Answer:** No. CRUD is only the surface. Beyond it: triggers that change other tables on their own, stored procedures with business rules, transactions, an audit trail, role-based access, full-text search, and a graph database that produces recommendations and a skill-gap list.
- **Show:** accept an offer and watch four tables change from one click (see `BUTTON_LIFECYCLE.md`).

**Q4. Who are the users and what can each do?** `[Easy]`
- **Answer:** *Officer:* everything (manage data, run the recruitment workflow, manage accounts, see the dashboard, graph, Trigger Lab, DB Inspector). *Student:* see jobs and companies, apply as themselves, see only their own applications, interviews, placement and job matches.
- **Show:** log in as `officer`, then as `meera`; compare the menus. Try `GET /api/stats` as a student: 403.

**Q5. What technologies did you use and why each?** `[Easy]`
- **Answer:** *MySQL* for structured, rule-heavy data with transactions. *Neo4j* for the skill-job relationships. *Next.js* for one codebase with pages and API. *Docker* so the databases run the same on every machine. *bcrypt and JWT* for login.
- **Careful:** Do not claim a technology is "faster". Say it is a better fit.

**Q6. What is the architecture?** `[Medium]`
- **Answer:** Three tiers. Browser (React pages) -> Next.js API routes (login and role checks) -> one data layer (`lib/core.js`) -> MySQL (source of truth), then the committed rows are copied to Neo4j.
- **Show:** the diagram at the top of `README.md`; open `lib/core.js`.

**Q7. How is the work split between SQL and the application?** `[Medium]`
- **Answer:** Rules live in the database (constraints, triggers, procedures) because they must hold no matter which program touches the data. The application handles login, forms, formatting errors and talking to both databases.

**Q8. What would a real placement cell still need that you do not have?** `[Medium]`
- **Answer:** Student-facing "accept offer" button, password reset, email notifications, resume upload, pagination, and a production deployment. (See part 19.)

---

## 4. ER model and design

**Q9. List your entities and relationships.** `[Easy]`
- **Answer:** Entities: department, student, company, job, skill, application, interview round (weak), placement, user, audit log. Relationships: department 1:N student; company 1:N job; student M:N skill; job M:N skill; student 1:N application; job 1:N application; application 1:N interview round; application 1:1 placement; user 1:1 student (optional).
- **Show:** `docs/er_diagram.pdf`.

**Q10. Which entity is weak and why?** `[Easy]` *(almost guaranteed)*
- **Answer:** `INTERVIEW_ROUND`. "Round 2" exists for every application, so a round cannot be identified on its own. Its identity needs the owner (`application_id`) plus a partial key (`round_no`). The primary key therefore has two columns, and the round is deleted with its application (`ON DELETE CASCADE`). In the ER diagram it is a double rectangle and the relationship `has` is a double diamond (identifying relationship) with total participation.
- **Show:** `SHOW CREATE TABLE interview_rounds\G` and the ER diagram.
- **Careful:** The *foreign key* alone does not make an entity weak. The test is "can it be identified without the owner?".

**Q11. Is `jobs` a weak entity since it depends on a company?** `[Medium]`
- **Answer:** No. A job has its own key `job_id`. The foreign key `company_id` only says which company posted it. A weak entity has no key of its own.

**Q12. Is `applications` an entity or just a relationship?** `[Medium]`
- **Answer:** Student-applies-for-job is a many-to-many relationship, but it has its own attributes (`status`, `applied_on`) and its own child (interview rounds). Because of that we model it as an entity with its own key `application_id`, with `UNIQUE (student_id, job_id)` so a student cannot apply twice to the same job. In Chen notation it could be drawn as a relationship with attributes; both are valid.

**Q13. What are the cardinalities and participation constraints?** `[Medium]`
- **Answer:** Department 1:N student (a student has exactly one department: total participation on the student side). Application N:1 job and N:1 student. Application 1:N round (a round must have an application: total participation of the weak entity). Application 1:1 placement (partial: only accepted applications have a placement). User 1:1 student is optional (officers have no student).

**Q14. How did you handle the many-to-many relationships?** `[Easy]`
- **Answer:** A separate link table whose primary key is both foreign keys: `student_skills(student_id, skill_id)` and `job_skills(job_id, skill_id)`. This stops duplicates and keeps skill names in one place.

**Q15. Did you use any multivalued or derived attributes?** `[Medium]`
- **Answer:** *Multivalued:* a student's skills, stored as the link table, not as a comma-separated column. *Derived:* `students.is_placed` and `jobs.openings` could be calculated from other tables, but we store them on purpose for fast reads and keep them correct with triggers. That is controlled denormalization.

**Q16. Composite attributes, generalization or specialization?** `[Hard]`
- **Answer:** We kept names as single columns. Users have a role (officer or student), which is a simple form of specialization, implemented as one table with a role column and a trigger that checks the student link, rather than two tables.

**Q17. Why a separate `users` table instead of putting passwords in `students`?** `[Medium]`
- **Answer:** Officers are not students, login data is a different concern from student data, and a student table row should exist without a login. `users.student_id` links an account to a student (optional, unique).

**Q18. Why a surrogate key (`application_id`) when `(student_id, job_id)` is already unique?** `[Hard]`
- **Answer:** `(student_id, job_id)` is a candidate key, and we keep it as `UNIQUE`. The surrogate key is shorter and stable, so child tables (`interview_rounds`, `placements`) reference one small integer instead of two columns.

**Q19. How is the ER diagram converted to the relational schema?** `[Medium]`
- **Answer:** Rules: each strong entity becomes a table; 1:N becomes a foreign key on the "many" side; M:N becomes a link table with a composite key; a weak entity becomes a table whose key is the owner's key plus its partial key; 1:1 gets a unique foreign key (`placements.application_id`).
- **Show:** `docs/relational_schema.pdf` next to the ER diagram.

---

## 5. Keys and the relational schema

**Q20. Define primary key, candidate key, super key, foreign key, composite key.** `[Easy]`
- **Answer:** *Super key:* any set of columns that identifies a row. *Candidate key:* a minimal super key. *Primary key:* the candidate key chosen as the main identifier (not null, unique). *Foreign key:* a column that must match a primary or unique key in another table. *Composite key:* a key made of more than one column.
- **Project examples:** `students` has candidate keys `student_id` and `email`; primary key is `student_id`. `interview_rounds` has a composite primary key. `applications.student_id` is a foreign key to `students`.

**Q21. What is referential integrity and how do you enforce it?** `[Easy]`
- **Answer:** Every foreign key value must exist in the referenced table. MySQL InnoDB enforces it, so you cannot add an application for a student that does not exist, nor delete a referenced row unless the delete rule allows it.
- **Show:** `DELETE FROM companies WHERE company_id = 1;` -> error 1451.

**Q22. Explain your ON DELETE rules and why.** `[Medium]`
- **Answer:** *RESTRICT* for company -> jobs, department -> students, job -> applications, job -> placements: deleting the parent would destroy history, so it is refused. *CASCADE* for student -> (skills, applications, login, placement), application -> (rounds, placement), skill -> links: these children have no meaning without the parent.
- **Show:** the delete-rule table in `SCHEMA_GUIDE.md`; try deleting a company in the app: red banner.

**Q23. Why is `student_id` the primary key of `placements`?** `[Medium]`
- **Answer:** A student can be placed at most once; making `student_id` the key lets the database guarantee that. `application_id` is also `UNIQUE` (one placement per application).

**Q24. Why did you copy `package_lpa` into `placements` when `jobs` already has it?** `[Hard]`
- **Answer:** It is a historical snapshot. If the company later changes the job's package, the student's placement record must still show what was agreed on the day. So it is not a dependency violation; it is a separate fact.

**Q25. What data types did you choose and why?** `[Medium]`
- **Answer:** `INT` ids with `AUTO_INCREMENT`; `VARCHAR` for text with sensible limits; `DECIMAL(4,2)` for CGPA and `DECIMAL(5,2)` for packages because they are exact decimals, unlike `FLOAT` which rounds; `DATE` for deadlines (no time needed); `ENUM` for small fixed lists (status, role); `TINYINT(1)` for the 0/1 placed flag; `JSON` for audit snapshots; `TIMESTAMP` for audit time.
- **Careful:** We found a real bug here: CGPA was `DECIMAL(3,2)` which cannot store 10.00 (max 9.99). We widened it to `DECIMAL(4,2)` and added a regression test.

**Q26. ENUM versus a lookup table?** `[Hard]`
- **Answer:** ENUM is compact and the database rejects other values, which suits a short, rarely changing list like our statuses. A lookup table is better when the list changes often or needs extra data. Trade-off: changing an ENUM needs an `ALTER TABLE`.

**Q27. List the constraints you used.** `[Easy]`
- **Answer:** PRIMARY KEY, FOREIGN KEY, UNIQUE (emails, usernames, company names, skill names, one application per student and job), NOT NULL, DEFAULT, CHECK (CGPA between 0 and 10, package > 0, openings >= 0, graduation year range), ENUM.
- **Show:** `docs/DATA_DICTIONARY.md` lists them all, generated from the live database.

---

## 6. Normalization

**Q28. What is normalization and why do we do it?** `[Easy]`
- **Answer:** Organizing tables to remove redundancy and avoid insert, update and delete anomalies. We store each fact once: a skill's name in `skills`, a company's name in `companies`.

**Q29. Explain 1NF, 2NF, 3NF, BCNF.** `[Easy]`
- **Answer:** *1NF:* each cell has one atomic value (no comma lists). *2NF:* no partial dependency on part of a composite key. *3NF:* no transitive dependency (non-key depends on non-key). *BCNF:* every determinant is a candidate key.

**Q30. Is your schema in 3NF? Prove it with an example.** `[Medium]`
- **Answer:** Yes. Example: a student's skills are in `student_skills`, not a comma list (1NF). In `student_skills (student_id, skill_id)` there are no other columns, so no partial dependency (2NF). A student's department *name* is not stored in `students`, only `dept_id`; the name depends on `dept_id` in `departments`, so there is no transitive dependency (3NF).
- **Show:** `students` columns: every non-key column depends only on `student_id`.

**Q31. Where did you break normalization on purpose, and why?** `[Medium]`
- **Answer:** `students.is_placed` and `jobs.openings` are derived values (placed = a row exists in placements; openings = original openings minus accepted). We store them for fast reads and keep them correct with triggers. The `placements.package_lpa` is a snapshot (see Q24).
- **Careful:** Say "deliberate and maintained by triggers", not "we forgot".

**Q32. Is `placements` in BCNF given it has both `application_id` and `job_id`?** `[Hard]`
- **Answer:** `application_id -> job_id` holds, but `application_id` is a candidate key of `placements` (it is `UNIQUE`), so the determinant is a candidate key and BCNF holds.

**Q33. What anomalies would appear without normalization?** `[Medium]`
- **Answer:** If every application row stored the company name, then renaming a company would need many updates (update anomaly); deleting a company's last application would lose the company (delete anomaly); you could not store a company that has no applications yet (insert anomaly).

**Q34. What is a functional dependency? Give two from your project.** `[Medium]`
- **Answer:** A -> B means A determines B. `student_id -> name, email, dept_id, cgpa`; `job_id -> company_id, title, package_lpa, min_cgpa`; `(application_id, round_no) -> round_type, scheduled_on, result`.

**Q35. Why not store skills as text in the `students` table?** `[Easy]`
- **Answer:** It would break 1NF, make searching and counting by skill very hard, and duplicate skill names. The link table lets the database enforce valid skills and lets Neo4j and SQL reason about them.

## 7. SQL: DDL, DML, queries

**Q36. What are DDL, DML, DCL and TCL? Give an example of each from your project.** `[Easy]`
- **Answer:** *DDL* defines structure: `CREATE TABLE`, `ALTER TABLE`, `DROP TABLE` (`docs/sql/01_ddl.sql`). *DML* changes or reads rows: `INSERT`, `UPDATE`, `DELETE`, `SELECT` (`04_dml_seed.sql`, `05_dml_demo.sql`). *DCL* controls access: `GRANT`/`REVOKE`; our app connects as a limited user created by Docker with rights only on the `placegraph` database, and root is used only by the setup script. *TCL* controls transactions: `START TRANSACTION`, `COMMIT`, `ROLLBACK` (used in `lib/core.js`).

**Q37. Show the DDL commands you used.** `[Easy]`
- **Show:** open `docs/sql/01_ddl.sql`: `CREATE TABLE` (12 tables), `CREATE VIEW` (2), `ALTER TABLE ... ADD INDEX / ADD CONSTRAINT CHECK / ADD COLUMN / MODIFY COLUMN / DROP COLUMN / ADD FULLTEXT INDEX`, `DROP TABLE scratch_demo`, and `DROP DATABASE IF EXISTS` at the top.

**Q38. Difference between DELETE, TRUNCATE and DROP?** `[Easy]`
- **Answer:** `DELETE` removes chosen rows, can have a `WHERE`, fires triggers and can be rolled back. `TRUNCATE` removes all rows quickly, resets AUTO_INCREMENT, does not fire row triggers and cannot be rolled back (it is DDL). `DROP` removes the whole table or database structure.
- **Project:** the seed script runs `TRUNCATE TABLE audit_log` so demos start with an empty log.

**Q39. Explain the types of joins with an example from your project.** `[Easy]`
- **Answer:** *INNER JOIN* keeps matching rows only: applications joined with students, jobs and companies to show "student, role, company, status". *LEFT JOIN* keeps all rows from the left table even with no match: `v_placement_summary` left-joins students to departments so a department with no students still appears. *RIGHT JOIN* is the mirror. *FULL OUTER* is not in MySQL (use `UNION`). *CROSS JOIN* pairs every row with every row (not used). *Self join* joins a table to itself (not needed here).
- **Show:** the join query in `05_dml_demo.sql`; the Applications page is built from one.

**Q40. WHERE versus HAVING?** `[Easy]`
- **Answer:** `WHERE` filters rows *before* grouping; `HAVING` filters *groups* after aggregation.
- **Project:** `HAVING SUM(s.is_placed) / COUNT(*) > (SELECT AVG(is_placed) FROM students)` in the nested queries.

**Q41. What is the order of execution of a SELECT?** `[Medium]`
- **Answer:** `FROM/JOIN -> WHERE -> GROUP BY -> HAVING -> SELECT -> DISTINCT -> ORDER BY -> LIMIT`.

**Q42. What aggregate functions did you use?** `[Easy]`
- **Answer:** `COUNT`, `SUM`, `AVG`, `MAX`, `ROUND`, and also `GROUP_CONCAT` (skill lists) and `JSON_ARRAYAGG` (skill ids) in the application queries.

**Q43. Explain subqueries and show your nested queries.** `[Easy]` *(she asked for them explicitly)*
- **Answer:** A subquery is a query inside another. Types: *scalar* (returns one value), *row/table*, *correlated* (refers to the outer query), used with `IN`, `EXISTS`, comparison operators, or in `FROM` (derived table).
- **Show:** the **Queries** page (8 queries with Run buttons) or `docs/sql/06_nested_queries.sql`:

| # | Query | Subquery kind |
|---|---|---|
| 1 | Students above their own department's average CGPA | correlated, scalar |
| 2 | Companies with a job paying above the average package | `IN` with a scalar subquery |
| 3 | Students who never reached an interview round | `NOT EXISTS` |
| 4 | Jobs nobody applied to | `NOT IN` |
| 5 | Highest paying job per company | correlated `MAX` |
| 6 | Departments placing a larger share than the whole college | subquery in `HAVING` |
| 7 | Students who have *all* skills of the Software Engineer role | double `NOT EXISTS` (relational division) |
| 8 | Placed students earning above the average placement package | scalar subquery against `placements` |

**Q44. `IN` versus `EXISTS`? `NOT IN` versus `NOT EXISTS`?** `[Medium]`
- **Answer:** `IN` compares against a list built by the subquery. `EXISTS` checks whether the correlated subquery returns any row and can stop at the first. `NOT IN` returns nothing if the list contains a `NULL`, so `NOT EXISTS` is safer when NULLs are possible.
- **Project:** query 4 uses `NOT IN (SELECT job_id FROM applications)`, which is safe because `job_id` is `NOT NULL`.

**Q45. What is a correlated subquery?** `[Medium]`
- **Answer:** One that uses a column from the outer query, so it runs once per outer row. Query 1: for each student the inner query computes the average CGPA of *that student's* department.

**Q46. What is relational division? Where did you use it?** `[Hard]`
- **Answer:** "Find rows related to *all* items of a set." Query 7: students for whom there is **no** required skill of the job that they **do not** have (double `NOT EXISTS`).

**Q47. `UNION` versus `UNION ALL`?** `[Medium]`
- **Answer:** `UNION` removes duplicates (extra work); `UNION ALL` keeps everything. `sp_placement_stats` uses `UNION ALL` to append the overall row to the per-department rows.

**Q48. Write a query live: students placed with a package above the average.** `[Medium]`
```sql
SELECT s.name, p.package_lpa
FROM placements p JOIN students s ON s.student_id = p.student_id
WHERE p.package_lpa > (SELECT AVG(package_lpa) FROM placements);
```

**Q49. Write a query live: how many applications per status?** `[Easy]`
```sql
SELECT status, COUNT(*) AS applications FROM applications GROUP BY status ORDER BY applications DESC;
```

**Q50. Write a query live: students who have not applied anywhere (or never got shortlisted).** `[Medium]`
```sql
SELECT name FROM students s
WHERE NOT EXISTS (SELECT 1 FROM applications a WHERE a.student_id = s.student_id);
```
(With the seed data every student has applied, so this returns no rows; use query 3 on the Queries page to show a non-empty result.)

**Q51. How do you handle NULLs?** `[Medium]`
- **Answer:** `NULL` means unknown, and `= NULL` is never true; use `IS NULL`. We use `NOT NULL` wherever a value is required, allow `NULL` only where it is meaningful (an officer's `student_id`), and use `IFNULL` / `NULLIF` in the summary view to avoid division by zero.

**Q52. What is `LAST_INSERT_ID()`?** `[Medium]`
- **Answer:** Returns the AUTO_INCREMENT id generated by the last insert in this connection. `sp_apply` uses it to return the new application id through an `OUT` parameter.

---

## 8. Indexes, views, performance

**Q53. What is an index and why use one?** `[Easy]`
- **Answer:** A separate structure (a B-tree in MySQL) that lets the database find rows without scanning the whole table. It speeds up reads but costs space and slows writes, so we index what we search and join on.

**Q54. Which indexes do you have?** `[Medium]`
- **Answer:** Automatic: primary keys, unique constraints and foreign keys. Added on purpose: `idx_students_cgpa`, `idx_jobs_deadline`, `idx_app_status` (B-tree), and **FULLTEXT** indexes `ft_students_text (name,email)`, `ft_jobs_title (title)`, `ft_companies_text (name,industry,location)`.
- **Show:** `SHOW INDEX FROM jobs;` and `docs/DATA_DICTIONARY.md`.

**Q55. What is a clustered index?** `[Hard]`
- **Answer:** In InnoDB the table itself is stored in primary-key order (the clustered index); every other index stores the primary key value as its pointer. So a primary-key lookup reads the row directly.

**Q56. How does your search work and why FULLTEXT?** `[Medium]`
- **Answer:** The search box sends `?q=text`. If every word has 3 or more letters and a single table is searched, the server uses `MATCH(...) AGAINST('+word*' IN BOOLEAN MODE)` on the FULLTEXT index. Otherwise it uses `LIKE '%word%'`, because InnoDB does not index words shorter than 3 letters.
- **Show:** `lib/core.js` function `searchClause`; `docs/evidence/explain_output.txt`.

**Q57. Did the index make it faster? Prove it.** `[Hard]` *(trap)*
- **Answer:** `EXPLAIN` proves the **plan**: the `MATCH ... AGAINST` query uses the `ft_jobs_title` index (type `fulltext`), while `LIKE '%engineer%'` does a full table scan (type `ALL`), and `WHERE status='OFFERED'` uses `idx_app_status`. With only 8 rows no real speed difference can be measured, so **we do not claim a speed-up**; we claim the index is used.
- **Show:** `docs/evidence/explain_output.txt`, or run `EXPLAIN SELECT ... MATCH ...` live.

**Q58. What is a view? Why use one?** `[Easy]`
- **Answer:** A saved query that behaves like a virtual table. It simplifies repeated queries and can restrict what users see. We have `v_placement_summary` (placed percentage and average package per department, drives the dashboard) and `v_job_pipeline` (applications per status per job).
- **Show:** `SELECT * FROM v_placement_summary;`

**Q59. Can you update through a view?** `[Hard]`
- **Answer:** Only simple views (one table, no aggregates) are updatable. Ours use `GROUP BY` and joins, so they are read-only reporting views.

**Q60. Views versus materialized views?** `[Hard]`
- **Answer:** A normal view recomputes on every query. A materialized view stores results; MySQL has none built in. Our views are small, so recomputing is fine.

---

## 9. Transactions, ACID and concurrency

**Q61. What is a transaction? Where do you use one?** `[Easy]`
- **Answer:** A group of statements that succeed or fail as one unit. Every write in `lib/core.js` is wrapped in `beginTransaction ... commit`, with `rollback` on any error. The stored procedures and triggers run inside that same transaction.
- **Show:** `lib/core.js` (`create`, `update`, `remove`).

**Q62. Explain ACID with examples from your project.** `[Easy]` *(almost guaranteed)*
- **Answer:**
  - **Atomicity:** accepting an offer changes `applications`, `placements`, `students` and `jobs`; either all four change or none. If the trigger fails, everything rolls back.
  - **Consistency:** the database moves from one valid state to another: constraints, foreign keys, CHECKs and triggers keep rules true (e.g. `openings` never negative).
  - **Isolation:** two officers working at the same time do not see each other's half-finished changes.
  - **Durability:** after `COMMIT` the change survives a crash (InnoDB redo log; our data is on a Docker volume).
- **Show:** the test `transaction: a failed multi-statement unit leaves no partial rows` in `tests/01-sql.test.mjs`.

**Q63. What are isolation levels? Which one do you use?** `[Medium]`
- **Answer:** They control what concurrent transactions can see: READ UNCOMMITTED (dirty reads possible), READ COMMITTED (no dirty reads), REPEATABLE READ (also no non-repeatable reads; InnoDB's **default**, which we use), SERIALIZABLE (fully isolated, slowest). Problems they prevent: *dirty read*, *non-repeatable read*, *phantom read*.

**Q64. What are locks and deadlocks?** `[Medium]`
- **Answer:** InnoDB uses row-level locks on rows being changed. A deadlock happens when two transactions each wait for a lock the other holds; MySQL detects it and rolls one back. Our transactions are short and touch rows in a consistent order, so deadlocks are unlikely.

**Q65. Two officers accept offers for the last opening of the same job at the same moment. What happens?** `[Hard]`
- **Answer:** Each acceptance runs `UPDATE jobs SET openings = openings - 1`. InnoDB locks the row, so the updates happen one after the other; the second one would make `openings` -1, which violates `CHECK (openings >= 0)`, so that transaction fails and rolls back (the application stays OFFERED). The constraint protects integrity even under a race.
- **Careful:** Do not say "we use SELECT FOR UPDATE" (we do not). Say the CHECK constraint is the safety net.

**Q66. Is the Neo4j copy part of the same transaction?** `[Hard]`
- **Answer:** No. MySQL commits first, then the changed rows are copied to Neo4j. There is no two-phase commit, so the two stores are **eventually consistent**. If Neo4j fails, MySQL stays correct, the banner shows "Neo4j failed", and Dashboard -> *Rebuild graph from MySQL* fixes it.
- **Honest improvement:** a transactional outbox (queue table written in the same MySQL transaction, retried later).

**Q67. What is autocommit?** `[Medium]`
- **Answer:** By default every single statement commits immediately. A transaction turns it off until `COMMIT`. DDL statements (`CREATE`, `ALTER`, `TRUNCATE`) commit implicitly and cannot be rolled back.

**Q68. How do your tests avoid damaging data?** `[Medium]`
- **Answer:** Each SQL test runs inside a transaction that is **always rolled back**, so tests leave no trace.
- **Show:** `inRollback` in `tests/helpers.mjs`.

---

## 10. Triggers

**Q69. What is a trigger?** `[Easy]` *(guaranteed)*
- **Answer:** Code stored in the database that runs **automatically** before or after an `INSERT`, `UPDATE` or `DELETE` on a table. You do not call it; the data change fires it.

**Q70. BEFORE versus AFTER triggers?** `[Easy]`
- **Answer:** BEFORE runs first and can **validate and reject** (with `SIGNAL`) or change the incoming row; AFTER runs once the row has changed and is used to react (create the placement, write audit rows).
- **Project:** `trg_applications_before_insert` rejects bad applications; `trg_applications_after_update` creates the placement.

**Q71. What are `NEW` and `OLD`?** `[Easy]`
- **Answer:** In a trigger, `NEW` is the incoming row (insert, update) and `OLD` is the row before the change (update, delete). Audit triggers store both to show "before and after".

**Q72. How does a trigger stop a bad action?** `[Medium]`
- **Answer:** With `SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '...'`. It raises an error, the statement is cancelled, the transaction rolls back, and our API shows the message in a red banner.
- **Show:** Trigger Lab -> *Apply for a job* with Arjun Reddy + Software Engineer: "Not eligible: CGPA is below the minimum required for this job".

**Q73. List your triggers.** `[Easy]`

| Table | Trigger | Purpose |
|---|---|---|
| applications | `before_insert` | eligibility: not placed, CGPA >= minimum, deadline, openings |
| applications | `after_insert` | audit |
| applications | `before_update` | closed applications frozen; ACCEPTED only from OFFERED |
| applications | `after_update` | on ACCEPTED: placement + `is_placed` + `openings`; audit |
| applications | `after_delete` | audit; undo placement effects if it was ACCEPTED |
| interview_rounds | `before_insert` | no rounds for closed applications |
| interview_rounds | `after_insert` | application becomes INTERVIEW; audit |
| interview_rounds | `after_update` | FAILED rejects the application; audit |
| students | `after_insert`, `after_update` | audit (old and new values) |
| students | `before_delete` | gives the job opening back if the student was placed |
| jobs | `after_insert`, `after_update`, `after_delete` | audit |
| users | `before_insert`, `before_update` | student account must have a student link; officer must not |

**Q74. Describe your most important trigger step by step.** `[Easy]` *(the "demonstration" question)*
- **Answer:** `trg_applications_after_update`. When `applications.status` changes to ACCEPTED: (1) insert a row into `placements` with the job's package and today's date; (2) set `students.is_placed = 1`; (3) subtract one from `jobs.openings`; (4) write an audit row with action PLACED. Steps 2 and 3 also fire the student and job audit triggers.
- **Show:** the Trigger Lab, tab *Trigger: Accept an offer*.

**Q75. How do you demonstrate a trigger? (her exact sequence)** `[Easy]`
1. Show the trigger code (`SHOW CREATE TRIGGER trg_applications_after_update\G`, or step 1 of the Trigger Lab).
2. Show the tables **before**: the application is OFFERED, the student has `is_placed = 0`, the job's openings, no placement, the audit log.
3. Fire it with one plain statement: `UPDATE applications SET status = 'ACCEPTED' WHERE application_id = 10;`
4. Show the tables **after**: ACCEPTED, `is_placed = 1`, openings reduced, a new placement row, new audit rows (changed rows are green in the Lab).
5. Explain the difference: *we changed one column; the trigger did the rest automatically.*
- **Show:** `docs/sql/07_trigger_demo.sql` has the same sequence in plain SQL.

**Q76. Why did you use triggers instead of application code?** `[Medium]`
- **Answer:** Rules must hold for **every** way of changing data: the website, a script, someone typing SQL. A trigger cannot be bypassed by an application bug. The audit trail in particular must never be skipped.

**Q77. What are the drawbacks of triggers?** `[Medium]`
- **Answer:** Hidden logic (a simple update causes other changes), harder debugging, extra cost on writes, and difficult to version and test. We reduce this by documenting every trigger, showing them in the Trigger Lab, and testing them.

**Q78. Trigger versus constraint versus stored procedure?** `[Medium]`
- **Answer:** A *constraint* is a simple declarative rule (CHECK, FK, UNIQUE): use it first. A *trigger* reacts automatically to data changes and can do multi-table logic. A *stored procedure* is called explicitly and can take parameters and return values.

**Q79. What are the limits of MySQL triggers? Which did you hit?** `[Hard]`
- **Answer:** (1) A trigger **cannot modify the table that fired it**, so `sp_accept_offer` (not the trigger) withdraws the student's other applications. (2) **Cascaded deletes do not fire triggers**, so `trg_students_before_delete` returns the job opening before the cascade, and `trg_applications_after_delete` undoes the placement effects. (3) No `COMMIT` or `ROLLBACK` inside a trigger. (4) MySQL only has row-level triggers (`FOR EACH ROW`).

**Q80. Can triggers fire other triggers?** `[Hard]`
- **Answer:** Yes. Accepting an offer updates `students` and `jobs`, which fire their audit triggers. A failed interview round updates `applications`, which fires the application triggers.

**Q81. How can a viewer see the triggers?** `[Easy]`
- **Show:** `SHOW TRIGGERS;` in MySQL, or the website: officer -> DB Inspector -> `triggers` tab. `docs/DATA_DICTIONARY.md` lists all 16.

**Q82. How is the audit log designed?** `[Medium]`
- **Answer:** One table `audit_log(table_name, action, record_id, old_data JSON, new_data JSON, changed_at)`. It has **no foreign key** on purpose, so the history survives when the audited row is deleted. JSON snapshots mean one table can record any table's change.

---

## 11. Stored procedures

**Q83. What is a stored procedure and why use it?** `[Easy]`
- **Answer:** Named SQL logic stored and run inside the database (`CALL name(...)`). Benefits: business rules in one place, fewer round trips, reuse, and permissions can allow `EXECUTE` without table access.

**Q84. Procedure versus function?** `[Medium]`
- **Answer:** A function returns one value and can be used inside a query (`SELECT f(x)`); a procedure is called with `CALL`, may return several values through `OUT` parameters or result sets, and can change data freely.

**Q85. Explain IN, OUT and INOUT parameters with your example.** `[Medium]`
- **Answer:** `IN` passes a value in, `OUT` returns one, `INOUT` does both. `sp_apply(IN p_student_id, IN p_job_id, OUT p_app_id)` returns the new application id.
- **Show:**
```sql
CALL sp_apply(5, 2, @new_id);
SELECT @new_id;
```

**Q86. List your 7 procedures and what each does.** `[Easy]`

| Procedure | What it does |
|---|---|
| `sp_apply` | checks student/job exist and no duplicate, inserts the application (the trigger checks eligibility), returns the id |
| `sp_update_application_status` | shortlist (only from APPLIED), offer (only from INTERVIEW and all rounds PASSED), reject/withdraw (only while open) |
| `sp_schedule_round` | needs SHORTLISTED/INTERVIEW and previous round PASSED; **generates** `round_no`; inserts the round |
| `sp_set_round_result` | records PASSED or FAILED (FAILED fires the reject trigger) |
| `sp_accept_offer` | accepts the offer, then withdraws the student's other open applications |
| `sp_student_report` | one-row summary using subqueries |
| `sp_placement_stats` | per-department statistics from the view plus an overall row with `UNION ALL` |

**Q87. Why is "accept offer" a procedure and not only a trigger?** `[Hard]`
- **Answer:** Because the second step (withdrawing the student's other applications) is an update on the `applications` table, which MySQL forbids inside a trigger fired by `applications`. The procedure does the withdrawal after the status update; the trigger handles the placement side effects.

**Q88. How does the web app call a procedure and read the OUT parameter?** `[Hard]`
- **Answer:** On one pooled connection it runs `CALL sp_apply(?, ?, @new_id)` and then `SELECT @new_id`. The session variable only exists on that same connection, which is why `lib/core.js` keeps one connection for the whole transaction.
- **Show:** `lib/core.js`, the `create` function.

**Q89. What error handling do the procedures have?** `[Medium]`
- **Answer:** They validate inputs and raise readable errors with `SIGNAL SQLSTATE '45000'` (for example "Every interview round must be held and PASSED before an offer"). The API turns SQLSTATE 45000 into an HTTP 400 and shows the message.

**Q90. Disadvantages of stored procedures?** `[Medium]`
- **Answer:** Logic lives in the database (harder to version and debug), less portable between database products, and heavy logic in the database can load it. We keep them small and test them.

**Q91. How do you show a procedure's code and run it?** `[Easy]`
- **Show:** `SHOW CREATE PROCEDURE sp_accept_offer\G`, then `CALL sp_accept_offer(17);` and `SELECT * FROM placements;`. Or the Trigger Lab *Procedure* tabs, which show code, before, run, after.

## 12. Neo4j and NoSQL

**Q92. Did you actually use NoSQL?** `[Easy]` *(she will check)*
- **Answer:** Yes: **Neo4j**, a graph database. It really runs in Docker, holds 39 nodes and about 98 relationships at seed, and the Graph page, the job recommendations and the 10 Cypher queries on the Queries page read from it.
- **Show:** open Neo4j Browser (`http://localhost:7475`) and run `MATCH (n) RETURN n LIMIT 80`; the Graph page in the app.
- **Careful:** Never claim more than this (no MongoDB, no vector search).

**Q93. What is NoSQL and what are its types?** `[Easy]`
- **Answer:** "Not only SQL": databases that do not use the fixed table model. Types: *key-value* (Redis), *document* (MongoDB), *column-family* (Cassandra), *graph* (Neo4j).

**Q94. Why a graph database for this project?** `[Easy]`
- **Answer:** Our extra questions are about **relationships and paths**: which jobs match a student's skills (`Student -> Skill <- Job`), which skills are missing, which students are similar, how two students are connected. A graph stores relationships as first-class links, so these become short traversals instead of many joins.

**Q95. Why not just MongoDB, or just SQL?** `[Medium]`
- **Answer:** Our data is structured and rule-heavy, which suits SQL; documents would not give us foreign keys, constraints or triggers. The only part that needs relationship traversal is skill matching, so a graph is the right complement. Could SQL alone do it? Yes, with joins and a recursive CTE; Cypher is simply shorter and clearer for these questions. We make **no speed claim**.

**Q96. What is the graph model?** `[Easy]`
```
(Student)-[:IN_DEPT]->(Department)
(Student)-[:HAS_SKILL]->(Skill)<-[:REQUIRES]-(Job)<-[:POSTED]-(Company)
(Student)-[:APPLIED_TO {status, appliedOn, applicationId}]->(Job)
(Student)-[:PLACED_AT {package, role}]->(Company)
```
Nodes carry the MySQL id, so each node maps to exactly one MySQL row.
- **Show:** the model diagram in `SCHEMA_GUIDE.md` section 7.

**Q97. Explain nodes, relationships, properties and labels.** `[Easy]`
- **Answer:** A *node* is an entity (a student), a *label* is its type (`:Student`), a *relationship* is a directed, typed link between two nodes (`HAS_SKILL`), and *properties* are key-value data on nodes or relationships (`cgpa` on a student, `status` on `APPLIED_TO`).

**Q98. Explain the recommendation Cypher query.** `[Medium]`
```cypher
MATCH (s:Student {id: $studentId}), (j:Job)<-[:POSTED]-(c:Company)
WHERE NOT (s)-[:APPLIED_TO]->(j) AND date(j.deadline) >= date()
OPTIONAL MATCH (j)-[:REQUIRES]->(k:Skill)
WITH s, j, c, collect(k) AS ks
WITH s, j, c, [x IN ks WHERE (s)-[:HAS_SKILL]->(x) | x.name] AS matched, [x IN ks | x.name] AS required
RETURN j.title, c.name, size(matched) AS skills_matched, [x IN required WHERE NOT x IN matched] AS missing_skills,
       s.cgpa >= j.minCgpa AS eligible
ORDER BY eligible DESC, skills_matched DESC
```
- **Answer:** For one student, take every open job not yet applied to; collect the job's required skills; split them into those the student has (matched) and lacks (missing); show whether the student is eligible by CGPA; rank eligible jobs with the most matching skills first.
- **Show:** Queries page -> *Job recommendations for a student* (change `studentId`), or the Graph page.

**Q99. `MATCH` versus `OPTIONAL MATCH`? `MERGE` versus `CREATE`?** `[Medium]`
- **Answer:** `MATCH` returns only rows where the pattern exists; `OPTIONAL MATCH` keeps the row with `null` if it does not (like a LEFT JOIN), so a job with no required skills still appears. `CREATE` always creates; `MERGE` creates only if it does not already exist, so syncing twice never duplicates a node.

**Q100. What is `shortestPath` and where do you use it?** `[Medium]`
- **Answer:** A built-in search for the fewest hops between two nodes. The query *Connection between two students* finds how two students are linked through shared skills or jobs. It is a variable-length path query (`[*..6]`), the "advanced NoSQL concept" the course asks for.

**Q101. Which advanced NoSQL concepts did you use?** `[Medium]`
- **Answer:** Variable-length path search (`shortestPath`), aggregation (`count`, `collect`, `avg` for skill demand vs supply and placements per company), pattern predicates, and list comprehensions.

**Q102. How is MySQL kept in step with Neo4j?** `[Easy]` *(guaranteed)*
- **Answer:** MySQL is the source of truth. After every successful commit, `lib/core.js` re-reads the changed rows and `MERGE`s them into Neo4j (one node and its edges, or a full rebuild for workflow actions like applications and interview rounds). `npm run db:sync` or the Dashboard button rebuilds everything from MySQL.
- **Show:** `lib/graph.js` (`upserts`, `rebuild`) and the green banner "Neo4j graph updated".

**Q103. What if the graph and MySQL disagree?** `[Medium]`
- **Answer:** MySQL wins. The Dashboard compares counts and shows an "in sync" badge; *Rebuild graph from MySQL* wipes the graph and recreates it from the tables. The graph holds no rules or unique data.

**Q104. Is Neo4j ACID? What about CAP?** `[Hard]`
- **Answer:** A single Neo4j instance is ACID for its own transactions. CAP says a distributed system can guarantee only two of Consistency, Availability, Partition tolerance; we run one instance so it does not apply directly. Our MySQL and Neo4j are *eventually consistent* with each other.

**Q105. What is ACID versus BASE?** `[Medium]`
- **Answer:** ACID favours strict correctness (relational databases). BASE (Basically Available, Soft state, Eventually consistent) favours availability and scale (many NoSQL stores).

**Q106. How are indexes and constraints used in Neo4j?** `[Medium]`
- **Answer:** On rebuild we create a uniqueness constraint on `id` for each label (Department, Skill, Company, Student, Job). A uniqueness constraint also creates an index, so lookups by id are fast and duplicates are impossible.

**Q107. Is there a risk of "Cypher injection"?** `[Hard]`
- **Answer:** All user-supplied values are passed as **parameters** (`$studentId`), never concatenated into the query text. Node labels in delete statements come from a fixed map, not from user input.

**Q108. Did you use vector search or embeddings?** `[Easy]`
- **Answer:** No. The course allows SQL + NoSQL as one option; we match by exact skills, which is explainable. Embeddings would be future work for synonyms.

**Q109. What is polyglot persistence?** `[Medium]`
- **Answer:** Using more than one database type, each for what it does best: MySQL for transactions and rules, Neo4j for relationships. That is what PlaceGraph does.

**Q110. What is index-free adjacency?** `[Hard]`
- **Answer:** In a native graph database each node directly references its neighbours, so following a relationship does not need an index lookup or a join; cost depends on the part of the graph you touch, not on the total data size.

---

## 13. The web application (Next.js, API, integration)

**Q111. Why Next.js and what is the App Router?** `[Easy]`
- **Answer:** Next.js gives pages (React) and a backend (API route handlers) in one project and one language. The App Router maps folders to URLs: `app/students/page.js` is `/students`, and `app/api/[resource]/route.js` is the API.

**Q112. How does the UI talk to the database?** `[Easy]` *(guaranteed)*
- **Answer:** The page calls `fetch('/api/students')`; the route handler checks login and role, then calls `lib/core.js`, which runs SQL on MySQL through a connection pool. The browser never connects to a database.
- **Show:** `components/CrudPage.js` -> `app/api/[resource]/route.js` -> `lib/core.js`. Also the banner showing the real SQL that ran.

**Q113. Which HTTP methods and status codes do you use?** `[Medium]`
- **Answer:** `GET` reads, `POST` creates, `PUT` updates (also workflow actions like `{action:"accept"}`), `DELETE` deletes. Status codes: 200 success, 400 bad input or a database rule (trigger/procedure), 401 not signed in, 403 not allowed, 404 not found, 409 conflict (duplicate, foreign key), 500 unexpected.
- **Show:** `docs/ENDPOINT_UI.md`.

**Q114. How do you prove the website is really connected to the database?** `[Easy]` *(her most important point)*
- **Answer:** Do an action and show the change in MySQL directly: add a student in the UI, then run `SELECT * FROM students ORDER BY student_id DESC LIMIT 1;` in the MySQL prompt; edit and show the new value and the audit row; delete and show it is gone. Also the DB Inspector page reads raw tables.
- **Show:** `DEMO_GUIDE.md` item 7; `docs/evidence/crud_proof.txt` is a recorded run.

**Q115. What is a connection pool?** `[Medium]`
- **Answer:** A set of reusable database connections (`connectionLimit: 10` in `lib/db.js`) so each request does not open a new connection, which is slow. A transaction takes one connection from the pool and holds it until commit or rollback.

**Q116. How do you configure the app? Any hard-coded passwords?** `[Easy]`
- **Answer:** No. All settings come from environment variables in `.env` (`lib/env.js` throws if one is missing or still a placeholder). `npm run init` generates random passwords. `.env` is in `.gitignore`; `.env.example` has placeholders only. Docker Compose reads the same variables.
- **Show:** `.env.example`, `.gitignore`, `lib/env.js`; GitHub has no `.env`.

**Q117. How do the list pages avoid being copy-pasted?** `[Medium]`
- **Answer:** One reusable component, `CrudPage`, renders any resource from a small config (columns, form fields, actions). The server side has a matching declarative config, `lib/resources.js`, which also acts as a **whitelist** of tables the API may touch.

**Q118. Where does validation happen?** `[Medium]`
- **Answer:** Three layers: the form (required fields, number types), the server (`lib/core.js` checks required fields and numbers), and finally the **database** (CHECK, FK, UNIQUE, ENUM, triggers) which is the authority. Database errors are translated into readable messages.

**Q119. Why is the UI showing SQL after each action?** `[Easy]`
- **Answer:** On purpose, for the demonstration: the response includes the exact statements that ran and whether MySQL and Neo4j were updated, so you can prove the connection.

**Q120. How do you run it in development and production?** `[Easy]`
- **Show:** `npm run dev` (development), `npm run build` then `npm start` (production, port 3001). Databases: `npm run setup` or `npm run db:up`.

---

## 14. Security, login and roles

**Q121. Authentication versus authorization?** `[Easy]`
- **Answer:** Authentication = *who are you* (login). Authorization = *what may you do* (roles). We do both on the server.

**Q122. How are passwords stored?** `[Easy]` *(guaranteed)*
- **Answer:** Never as plain text. We store a **bcrypt hash** (a slow, salted one-way hash, cost 10). At login the typed password is hashed and compared. A stolen database dump does not reveal passwords.
- **Show:** `SELECT username, LEFT(password_hash,7) FROM users;` shows `$2b$10$`. `lib/auth-hash.js`.

**Q123. Hashing versus encryption? What is a salt?** `[Medium]`
- **Answer:** Encryption is reversible with a key; hashing is one-way. A salt is random data mixed into each password before hashing so identical passwords give different hashes and pre-computed tables fail; bcrypt generates and stores the salt inside the hash.

**Q124. How does login work?** `[Easy]`
- **Answer:** `POST /api/auth` with username (or email) and password. The server finds the user, compares the bcrypt hash, creates a signed **JWT** (valid 8 hours) and stores it in an **HTTP-only, SameSite=Lax cookie**. Every later request sends the cookie automatically.
- **Show:** `lib/auth.js`.

**Q125. What is a JWT? Why is the cookie HTTP-only?** `[Medium]`
- **Answer:** A JSON Web Token is a signed string (header.payload.signature) proving the server issued it; we sign with HS256 using `JWT_SECRET`. *HTTP-only* means JavaScript in the page cannot read the cookie, so a script-injection (XSS) attack cannot steal it. *SameSite=Lax* stops other websites from making your browser send the cookie on cross-site POSTs (CSRF protection).

**Q126. Does a role change take effect immediately?** `[Hard]`
- **Answer:** Yes. The token only holds the user id. On every protected request the server reads the user and role **fresh from MySQL**, so changing a role or deleting an account works at once.

**Q127. How are roles enforced? Is hiding the button enough?** `[Easy]` *(guaranteed)*
- **Answer:** No. Hiding a button is only cosmetic. The API enforces: `requireUser('officer')` for officer-only endpoints and `lib/access.js` for what a student may read or create. A student calling the API directly gets **403**.
- **Show:** log in as `meera`, open `/inspector` (403 error), and `tests/02-api.test.mjs` "roles: a student gets 403...".

**Q128. How does a student only see their own data?** `[Medium]`
- **Answer:** For students, the list queries get an extra `WHERE student_id = <their id>` (the `scopeCol` in `lib/resources.js`). A student cannot ask for someone else's rows even by editing the URL.

**Q129. Can a student apply on behalf of another student?** `[Medium]`
- **Answer:** No. On create, the server **overwrites** `student_id` with the signed-in student's id, ignoring whatever the request says. There is a test for it.

**Q130. 401 versus 403?** `[Easy]`
- **Answer:** 401 = not authenticated (no valid login). 403 = authenticated but not allowed.

**Q131. How do you prevent SQL injection?** `[Easy]` *(guaranteed)*
- **Answer:** Values are always passed as **parameters** (`WHERE id = ?`), never joined into the SQL text. Table and column names come from a fixed whitelist (`lib/resources.js`), never from user input. The search text is also passed as a parameter.
- **Careful:** Our driver call `pool.query` escapes values on the client side. If asked about server-side prepared statements, say that `execute()` would use them and that parameterization is still what stops injection.
- **Show:** `lib/core.js`, any `exec(conn, sql, "... ?", [values])`.

**Q132. What about XSS and CSRF?** `[Medium]`
- **Answer:** XSS: React escapes text by default and we never use `dangerouslySetInnerHTML`; the session cookie is HTTP-only. CSRF: SameSite=Lax cookie plus JSON requests. We do not use a separate CSRF token (limitation).

**Q133. How is the database access limited?** `[Medium]`
- **Answer:** Least privilege: the app uses a limited MySQL user with rights only on `placegraph`, not root. Root is used only by the setup script.

**Q134. How do you protect secrets?** `[Easy]`
- **Answer:** `.env` has random values and is git-ignored; we scanned all committed files for those values; the demo passwords are never printed in the docs.

**Q135. What stops brute-force password guessing?** `[Hard]`
- **Answer:** Honestly: only bcrypt's slowness. There is no rate limiting or lockout; that is listed as future work.

**Q136. Why the same error for a wrong username and a wrong password?** `[Medium]`
- **Answer:** So an attacker cannot learn which usernames exist (no account enumeration).

---

## 15. "What happens if...?" scenarios

Practise saying these out loud. Each can be shown live.

| # | Scenario | What happens | Why |
|---|---|---|---|
| 1 | A student with CGPA 6.8 applies to a job needing 7.5 | Red banner "Not eligible: CGPA is below the minimum", nothing saved | `trg_applications_before_insert` raises `SIGNAL`; transaction rolled back |
| 2 | Apply after the deadline (e.g. Graduate Trainee) | "The application deadline for this job has passed" | same trigger |
| 3 | Apply twice to the same job | "The student has already applied for this job" | `sp_apply` check (and `UNIQUE (student_id, job_id)`) |
| 4 | A placed student applies again | "Student is already placed and cannot apply again" | same trigger |
| 5 | Accept an application that has no offer | "Only an application with an OFFER can be accepted" | `before_update` trigger + `sp_accept_offer` |
| 6 | Make an offer with a round still pending | "Every interview round must be held and PASSED before an offer" | `sp_update_application_status` |
| 7 | Schedule round 2 while round 1 is pending | "The previous round is not PASSED yet" | `sp_schedule_round` |
| 8 | Mark a round FAILED | The application becomes REJECTED automatically | `trg_rounds_after_update` |
| 9 | Accept an offer | Placement created, student marked placed, opening reduced, other applications withdrawn, graph edge added | trigger + `sp_accept_offer` + rebuild |
| 10 | Delete a company that has jobs | Refused (red banner) | foreign key `RESTRICT` |
| 11 | Delete a placed student | Their data is deleted; the job's opening is returned | `ON DELETE CASCADE` + `trg_students_before_delete` |
| 12 | Delete an accepted application | Placement removed, student unplaced, opening returned | `trg_applications_after_delete` |
| 13 | Neo4j is stopped | MySQL still works; banner says "Neo4j failed"; after restart use *Rebuild graph* | not part of the MySQL transaction |
| 14 | MySQL is stopped | The app shows errors; no data is lost (volume); restart the container | durability |
| 15 | A student calls an officer API with curl | 401 without cookie, 403 with a student cookie | `requireUser('officer')` |
| 16 | A student sends `student_id` of someone else when applying | Ignored; the application is created for themselves | `authorizeCreate` |
| 17 | The last officer tries to delete themselves | "You cannot delete your own account" / "last officer" | `assertUserDeletable` |
| 18 | Someone gets a copy of the database | They see bcrypt hashes, no passwords | bcrypt |
| 19 | `.env` is leaked | Change all secrets: delete `.env`, `npm run init`, recreate containers | secrets only in `.env` |
| 20 | The server restarts | Logged-in users stay logged in until the 8-hour cookie expires | JWT is stateless |
| 21 | A job's required skills are edited | `job_skills` rows replaced; the graph's `REQUIRES` edges are re-created | targeted Neo4j upsert |
| 22 | Two officers accept the last opening at once | The second fails; `openings` never goes below 0 | `CHECK (openings >= 0)` |

---

## 16. Code walkthrough: which file does what

She may open a file and say "explain this". Know the purpose and one function of each.

| File | Purpose | One thing to point at |
|---|---|---|
| `docs/sql/01_ddl.sql` | All tables, constraints, indexes, views | `interview_rounds` composite key; `ALTER TABLE ... ADD FULLTEXT` |
| `docs/sql/02_triggers.sql` | The 16 triggers | `trg_applications_after_update` |
| `docs/sql/03_procedures.sql` | The 7 procedures | `sp_accept_offer` |
| `docs/sql/04_dml_seed.sql` | Seed data, run through the real triggers | the `UPDATE ... status='ACCEPTED'` lines |
| `lib/core.js` | The data layer: list/create/update/delete in a transaction, then Neo4j sync | `create()` with `beginTransaction/commit/rollback`; `friendly()` error mapping; `searchClause()` |
| `lib/resources.js` | Declarative resource config and the table whitelist | `scopeCol`, `search`, `filters` |
| `lib/access.js` | Role rules for lists and creates | `authorizeList`, `authorizeCreate` |
| `lib/auth.js` | Login, cookie, current user, `requireUser` | `login()`; role re-read from MySQL |
| `lib/auth-hash.js` | bcrypt hash and compare | cost 10 |
| `lib/env.js`, `lib/db.js` | Env-only config and the MySQL pool | `requireEnv` throws if missing |
| `lib/graph.js` | Neo4j: upserts, rebuild, recommendations, snapshot | `recommendations()` Cypher |
| `lib/lab.js` | Trigger and Procedure Lab scenarios | the 5-step prepare/fire |
| `lib/queries.js` | Reads `06_nested_queries.sql` and the Cypher file and runs them | single source of truth for the Queries page |
| `app/api/[resource]/route.js` | Generic REST endpoint | `requireUser`, `authorizeList` |
| `components/CrudPage.js` | Reusable table, form, search, filters, role-aware buttons | `submit()`, `act()` |
| `components/Auth.js` | Login screen and session gate | `AuthGate` |
| `scripts/setup.mjs` | Applies SQL, creates accounts, builds graph | root password passed via environment, not command line |
| `scripts/init-env.mjs` | Generates random secrets into `.env` | |
| `tests/` | 39 tests | `01-sql`, `02-api`, `03-graph` |

## 17. Rapid-fire round (one-line answers)

Cover the right column and test yourself.

| Question | One-line answer |
|---|---|
| Name of the project and stack? | PlaceGraph; Next.js + MySQL + Neo4j in Docker |
| How many tables, triggers, procedures, views? | 12 tables, 16 triggers, 7 procedures, 2 views |
| Weak entity? | `interview_rounds`, key `(application_id, round_no)` |
| Source of truth? | MySQL; Neo4j is a rebuildable copy |
| Why Neo4j? | Skill-to-job relationships are paths; Cypher is short for them |
| Which normal form? | 3NF (with deliberate trigger-maintained `is_placed` and `openings`) |
| What does the accept-offer trigger do? | Creates the placement, sets `is_placed`, reduces `openings`, writes an audit row |
| Why does a procedure withdraw the other applications? | A trigger cannot modify the table that fired it |
| What stops a low-CGPA application? | `trg_applications_before_insert` with `SIGNAL` |
| What happens on a FAILED round? | The application is rejected by a trigger |
| How is the password stored? | bcrypt hash, never plain text |
| Where is the session? | Signed JWT in an HTTP-only SameSite=Lax cookie, 8 hours |
| How do you stop SQL injection? | Parameterized queries and a table whitelist |
| How do you hide officer features from students? | You do not rely on hiding: the API returns 403 |
| Two roles? | `officer` and `student` |
| How many tests and do they pass? | 39, all pass |
| What bug did tests find? | CGPA `DECIMAL(3,2)` could not store 10.00; fixed to `DECIMAL(4,2)` |
| Which isolation level? | REPEATABLE READ (InnoDB default) |
| How is search done? | FULLTEXT `MATCH ... AGAINST`, with `LIKE` for short words |
| Do you claim the index is faster? | No; `EXPLAIN` shows it is used, the data is too small to time |
| What if Neo4j is down? | MySQL still correct; "Neo4j failed" banner; rebuild from MySQL |
| How do you prove the UI changes the DB? | Make the change in the UI, then run a `SELECT` in MySQL |
| What is in `.env`? | Random passwords and the JWT secret, never committed |
| DB user for the app? | Limited user, not root |
| Any vector search? | No |
| What is `audit_log` for? | History written by triggers; JSON old and new values; no FK so history survives deletes |
| What is a view for you? | `v_placement_summary` feeds the dashboard |
| Cascade or restrict for company -> jobs? | RESTRICT |
| One placement per student, how? | `student_id` is the primary key of `placements` |
| Duplicate application stopped by? | `UNIQUE (student_id, job_id)` and `sp_apply` |
| Where is the ER diagram? | `docs/er_diagram.pdf` |
| Where is the trigger demo? | Trigger Lab page, and `docs/sql/07_trigger_demo.sql` |
| How do you run everything? | `npm run setup`, `npm run build`, `npm start` |

---

## 18. General DBMS theory she may ask

These are not about your project but are classic viva questions. Keep answers short.

| Question | Answer |
|---|---|
| **DBMS vs RDBMS** | A DBMS stores and manages data; an RDBMS stores it in related tables with keys and constraints (MySQL). |
| **What is a database schema vs instance?** | Schema = the structure (tables, columns, constraints); instance = the data in it at one moment. |
| **Three-schema architecture** | External (user views), conceptual (whole logical design), internal (physical storage); they give data independence. |
| **Data independence** | Logical: change the conceptual schema without changing programs. Physical: change storage without changing the schema. |
| **Types of integrity** | Entity (primary key not null and unique), referential (foreign keys), domain (valid values/types), user-defined (business rules via triggers or checks). |
| **Relational algebra operators** | Select (sigma) filters rows, project (pi) picks columns, join combines tables, union, difference, Cartesian product, rename. |
| **Degree and cardinality of a relation** | Degree = number of columns; cardinality = number of rows. |
| **What is a tuple, attribute, domain?** | Row, column, set of allowed values. |
| **OLTP vs OLAP** | OLTP = many small transactions (our app). OLAP = analysis of large historical data (data warehouse). |
| **Types of database users** | DBA, application programmer, end user. In PlaceGraph: officers, students, and the developer/DBA. |
| **2-tier vs 3-tier architecture** | 2-tier: client talks directly to the database. 3-tier: client -> application server -> database (ours). |
| **ORM vs raw SQL** | An ORM maps tables to objects; we used SQL directly through a small data layer so the SQL is visible. |
| **B-tree / B+ tree index** | A balanced tree keeping keys sorted, so search, insert and delete take logarithmic time; B+ trees keep all data in the leaves, which makes range scans fast. InnoDB uses B+ trees. |
| **Hash index** | Fast for equality lookups only, no ranges. |
| **What is serializability?** | A concurrent schedule gives the same result as some serial order of the transactions. |
| **Two-phase locking** | Growing phase (acquire locks), shrinking phase (release); guarantees serializability. |
| **Recovery and logging** | The write-ahead log records changes before they reach the data files so the database can redo committed work and undo incomplete work after a crash. |
| **Deadlock handling** | Prevention, detection (wait-for graph) then rolling back a victim, or timeouts. InnoDB detects and rolls back one transaction. |
| **Backup** | Logical dump with `mysqldump`, or copying the Docker volume. Our data is reproducible with `npm run db:setup`. |
| **Replication and sharding** | Copying data to other servers (availability, read scale) and splitting data across servers (write scale). Not used here. |
| **SQL vs NoSQL** | SQL: fixed schema, joins, ACID, strong integrity. NoSQL: flexible schema, scale-out, specialised models, often eventual consistency. We use both for what each is good at. |
| **What is a cursor?** | A pointer to iterate over a query result row by row inside a stored program (not used here). |
| **What is a transaction log vs audit log?** | The transaction log is the database's internal recovery journal; our `audit_log` is an application-level history of business changes. |
| **Candidate key vs primary key** | Candidate keys are all minimal unique identifiers; the primary key is the one you choose. |
| **Why use AUTO_INCREMENT ids?** | Simple, short, unique, never change; natural keys like email can change. |
| **What is data redundancy and why avoid it?** | Storing the same fact many times wastes space and causes inconsistency; normalization removes it. |

---

## 19. Limitations and improvements (answer honestly)

Teachers respect honest limits more than inflated claims. Say these confidently.

| Limitation | How to say it | Improvement |
|---|---|---|
| Graph sync is right after commit, not through an outbox | "If Neo4j is down, MySQL stays correct and we rebuild the graph; a transactional outbox would retry automatically." | Outbox table + worker |
| No login rate limiting or password reset | "Only bcrypt's slowness limits guessing; an officer can reset a password on the Users page." | Rate limiter, reset by email |
| Students cannot accept offers themselves | "The officer accepts on the student's behalf in this version." | Student-facing accept button |
| No pagination | "Tables load all rows; fine for hundreds of rows, not for tens of thousands." | Server-side pagination |
| Cookies not `Secure` on local HTTP | "Set `COOKIE_SECURE=true` behind HTTPS." | Deploy behind HTTPS |
| Small synthetic data, no timing | "We did not measure performance; we show the index is used with EXPLAIN." | Load test with large data |
| Matching uses exact skill names | "Synonyms like JS vs JavaScript would be missed." | Skill aliases or embeddings |
| Only two roles | "Officer and student; a department coordinator role is easy to add." | More roles |
| No accessibility review | "Not tested with a screen reader." | Accessibility testing |
| Tests expect fresh data | "Run `npm run db:setup` first." | Isolated test database |

---

## 20. Team, Git, originality and AI-assisted work

Expect these, especially in a two-person team.

**Q137. Who did what?** `[Easy]`
- **Answer:** Use the real split in `docs/CONTRIBUTIONS.md` (fill it in truthfully). Both members must be able to explain **both** the database side and the application side.
- **Careful:** Do not claim work you cannot explain. She may point at any file.

**Q138. Show your GitHub repository.** `[Easy]`
- **Show:** `https://github.com/Yuvraj0967/placegraph`; `git log --oneline`; `git shortlog -sn --all`. The history must show **real** commits from each member (`docs/GIT_GUIDE.md`).
- **Careful:** Do not rewrite or backdate history.

**Q139. Is this original? Did you copy from anywhere?** `[Easy]`
- **Answer:** State exactly what is true. The schema, SQL, code, queries, tests and domain content were written for the placement domain. The **structure of the documentation set and the requirements checklist** was modelled on a classmate's public repository, and we listed that reference in `docs/CONTRIBUTIONS.md`.
- **Careful:** Never say "all ours" if it is not.

**Q140. Did you use AI tools?** `[Easy]`
- **Answer:** Answer **honestly and according to your course policy.** This project was built with an AI coding assistant. If the course requires disclosure, disclose it, and be ready to explain every part yourself; the assistant does not replace understanding. If you are unsure of the policy, ask your teacher before the viva.
- **How to prepare:** Read `BUTTON_LIFECYCLE.md`, `SCHEMA_GUIDE.md`, and this guide until you can explain each file without looking.

**Q141. What was the hardest part and what did you learn?** `[Medium]`
- **Answer (use real points):** MySQL's trigger limits (cannot modify the firing table, cascades do not fire triggers), keeping two databases consistent, and enforcing roles on the server. A real bug found by tests: CGPA could not store 10.00.

**Q142. What would you do differently?** `[Medium]`
- **Answer:** Add the transactional outbox, pagination, student accept button and password reset (part 19).

**Q143. How did you test it?** `[Medium]`
- **Answer:** 39 automated tests: 21 SQL (constraints, every guard trigger, auto placement, audit, procedures, rollback), 13 API (login, 401/403, student scoping, CRUD, search), 5 graph (sync, recommendations, shortest path). Plus real screenshots and SQL output as evidence. SQL tests run in rolled-back transactions.
- **Show:** `npm test`; `docs/test-results/latest.txt`.

**Q144. What did the tests find?** `[Medium]`
- **Answer:** (1) CGPA `DECIMAL(3,2)` could not hold 10.00. (2) Deleting an accepted application left the student marked placed and did not return the opening; we fixed it in `trg_applications_after_delete` and added a test.

---

## 21. Live "show me" cheat sheet

Start: Docker Desktop running, `npm run db:setup`, `npm start`, open `http://localhost:3001`.

**MySQL prompt** (use `MYSQL_ROOT_PASSWORD` from `.env`):
```bash
docker exec -it -e MYSQL_PWD=YOUR_ROOT_PASSWORD placegraph-mysql mysql -uroot placegraph
```

| She says | You run or click |
|---|---|
| "Show your tables" | `SHOW TABLES;` and `DESCRIBE students;` |
| "Show a CREATE TABLE" | `SHOW CREATE TABLE interview_rounds\G` |
| "Show the weak entity's key" | same command: `PRIMARY KEY (application_id, round_no)` |
| "Show triggers" | `SHOW TRIGGERS;` or DB Inspector -> triggers |
| "Show a trigger's code" | `SHOW CREATE TRIGGER trg_applications_after_update\G` |
| "Run the trigger" | Trigger Lab -> *Accept an offer* -> follow the 5 steps |
| "Show a procedure" | `SHOW CREATE PROCEDURE sp_accept_offer\G` |
| "Run a procedure" | `CALL sp_apply(5, 2, @id); SELECT @id;` then `CALL sp_placement_stats();` |
| "Show a nested query" | Queries page -> *Students whose CGPA is above their own department's average* -> Run |
| "Show a join and group by" | `SELECT d.code, COUNT(s.student_id) AS students, SUM(s.is_placed) AS placed FROM departments d LEFT JOIN students s ON s.dept_id = d.dept_id GROUP BY d.dept_id, d.code;` |
| "Show a view" | `SELECT * FROM v_placement_summary;` |
| "Show the index is used" | `EXPLAIN SELECT job_id, title FROM jobs WHERE MATCH(title) AGAINST('+engineer*' IN BOOLEAN MODE);` |
| "Show a constraint rejecting data" | `DELETE FROM companies WHERE company_id = 1;` (foreign key) or `INSERT INTO students (name,email,dept_id,cgpa,grad_year) VALUES ('X','x@x.com',1,10.5,2026);` (CHECK) |
| "Show CRUD reaching the DB" | Students page: Add / Edit / Delete, then `SELECT * FROM students ORDER BY student_id DESC LIMIT 1;` and `SELECT * FROM audit_log ORDER BY audit_id DESC LIMIT 3;` |
| "Show the roles" | Sign out; log in as `meera`; show the smaller menu; open `/inspector` (403) |
| "Show the passwords are hashed" | `SELECT username, LEFT(password_hash,7) FROM users LIMIT 3;` |
| "Show the graph" | Graph page; or Neo4j Browser `http://localhost:7475` (Connection URL `localhost:7688`) |
| "Show Cypher" | `MATCH (s:Student {name:'Meera Nair'})-[:HAS_SKILL]->(k:Skill) RETURN s,k` ; `MATCH p=(s:Student)-[:APPLIED_TO]->(j:Job)<-[:POSTED]-(c:Company) RETURN p LIMIT 25` ; `MATCH (s)-[r:PLACED_AT]->(c) RETURN s.name, c.name, r.package` |
| "Show the tests" | `npm test` (or open `docs/test-results/latest.txt`) |
| "Show no hard-coded passwords" | open `.env.example` (placeholders) and `lib/env.js`; GitHub has no `.env` |
| "Show the ER diagram / schema" | printed `docs/er_diagram.pdf`, `docs/relational_schema.pdf` |

Reset before presenting: `npm run db:setup`.

---

## 22. How to answer well, and what not to claim

**Do**
- Start with a one-sentence direct answer, then add one example *from your project*.
- Say "let me show you" and demonstrate. She wants it working.
- If you do not know: say what you do know, then "I would check the documentation / run it to confirm." Do not invent.
- Know your numbers (part 2) and your demo path (`DEMO_GUIDE.md`) by heart.
- Rehearse the trigger demonstration (her five steps) and the CRUD-reaches-the-database demonstration until they are smooth.

**Do not claim**
- That an index made queries faster (you showed it is *used*, not measured faster).
- That MongoDB, vector search or embeddings are used.
- That Neo4j and MySQL are updated in one transaction.
- That a feature exists that you cannot show (for example a student accept-offer button, password reset, rate limiting).
- That you wrote code you cannot explain, or that no AI or reference was used if that is not true.

**If the demo breaks**
1. Stay calm; say what you expect to see.
2. `npm run db:setup` (about a minute) then reload the page.
3. Fall back to the evidence: `docs/screenshots/` and `docs/evidence/` are real recordings of the working system.

**Last-minute checklist**
- [ ] Docker Desktop running; `npm run db:setup`; `npm start`; page loads
- [ ] Logged in as `officer`; second window logged in as `meera`
- [ ] MySQL prompt open and tested
- [ ] ER diagram and schema printed
- [ ] You can explain: weak entity, the accept-offer trigger, why a procedure does the withdrawal, ACID with the accept-offer example, how MySQL and Neo4j stay in step, how roles are enforced, how passwords are stored
- [ ] You know who did what, and you can show real commits

Good luck. If a question is not here, answer from the principles: *what the database guarantees, where it is enforced, and how you can prove it live.*

