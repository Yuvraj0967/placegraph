# The full demo for your teacher: what to say, click and type

A 15-minute demonstration, in order. Every value to type is given exactly. Every result below was **dry-run on the real application** and works with the sample data.

The teacher's priority: *"actually demonstrate the working database, execute queries, show trigger execution, and prove the website is connected to the database."* Every step below ends with a **proof in MySQL**, not just on screen.

---

## 0. Before she arrives (10 minutes)

| # | Do this | How you know it worked |
|---|---|---|
| 1 | Start **Docker Desktop**; wait until it says it is running | whale icon is steady |
| 2 | In the project folder: `npm run db:setup` | last line: `OK: MySQL and Neo4j are in sync.` |
| 3 | `npm start` (keep this terminal open) | `Ready` message |
| 4 | **Window 1 (browser):** open http://localhost:3001, sign in as **`officer`** (password: `DEMO_OFFICER_PASSWORD` in `.env`) | menu with Dashboard, Students... |
| 5 | **Window 2 (second browser window or private window):** open http://localhost:3001, sign in as **`meera`** (password: `DEMO_STUDENT_PASSWORD`) | short menu: My dashboard, Jobs... |
| 6 | **MySQL prompt** (use `MYSQL_ROOT_PASSWORD` from `.env`):<br>`docker exec -it -e MYSQL_PWD=YOUR_ROOT_PASSWORD placegraph-mysql mysql -uroot placegraph` | prompt `mysql>` |
| 7 | **Neo4j Browser:** open http://localhost:7475, **set Connection URL to `localhost:7688`** (not the default 7687), user `neo4j`, password `NEO4J_PASSWORD` from `.env` | "Instance: localhost:7688" shows at the top, empty query box |
| 8 | Print `docs/er_diagram.pdf` and `docs/relational_schema.pdf` | on the table |
| 9 | Open `docs/sql/` in your editor | files 01 to 08 visible |

Show passwords with `findstr DEMO .env` (and `findstr PASSWORD .env`). **Do not show the `.env` file on screen to your teacher**, it contains your private passwords.

**Starting numbers (check on the Dashboard):** Placed **4**, Pending offers **3**, Students **12**. If they differ, run `npm run db:setup` again.

---

## Timeline at a glance

| Time | Part | Teacher's requirement item |
|---|---|---|
| 0:00 | 1. Introduction | 1 |
| 1:00 | 2. ER diagram and schema (paper) | 2, 3 |
| 2:30 | 3. Tables and CREATE TABLE in MySQL | 4 |
| 3:30 | 4. DDL and DML files | 5, 6 |
| 4:30 | 5. CRUD in the website, proved in MySQL | 7 |
| 7:30 | 6. The trigger demonstration | 9 |
| 10:00 | 7. Recruitment workflow, procedures | 8 |
| 12:00 | 8. Nested queries | 8 |
| 12:45 | 9. Neo4j (NoSQL) | 10 |
| 14:15 | 10. Two roles and security | extra |
| 15:00 | 11. Tests, documentation, close | 11, 12 |

---

## 1. Introduction (1 min)

**Say:**
> "Our project is **PlaceGraph**, a placement cell management system. Students apply to company jobs; applications go through shortlisting, interviews and an offer; accepting an offer places the student. **MySQL** enforces the rules with triggers and stored procedures and keeps an audit log. **Neo4j**, a graph database, matches students to jobs by skills. The website is **Next.js** with login and two roles."

**Do:** show the Dashboard (Window 1).
**Point at:** the "in sync" badge, "Placed 4", the department table.

---

## 2. ER diagram and relational schema (1.5 min)

**Do:** hold up `er_diagram.pdf`.
**Say:**
> "Strong entities have their own key: department, student, company, job, skill, application, placement, user. The **weak entity is the interview round**: round 2 means nothing without its application, so its key is **application id plus round number**, drawn as a double box with a double diamond."

**Do:** hold up `relational_schema.pdf`.
**Say:** "These are the 12 real tables with primary keys and foreign keys. Skills are many-to-many with both students and jobs, so we have two link tables."

---

## 3. Tables and CREATE TABLE in MySQL (1 min)

**Type in the MySQL prompt, one at a time:**
```sql
SHOW TABLES;
SHOW CREATE TABLE interview_rounds\G
```
**Expect:** 14 rows (12 tables + 2 views); then the `CREATE TABLE` with `PRIMARY KEY (application_id, round_no)` and the foreign key with `ON DELETE CASCADE`.
**Say:** "Here is the weak entity as a real table. Two-column primary key, and rounds are deleted with their application."

*(In the website you can also show officer -> **DB Inspector**: it lists every table, both views, the triggers and the procedures.)*

---

## 4. DDL and DML files (1 min)

**Do:** open `docs/sql/01_ddl.sql` and scroll: `CREATE TABLE`, `ALTER TABLE ... ADD FULLTEXT`, `DROP TABLE scratch_demo`, `CREATE VIEW`.
**Do:** open `docs/sql/05_dml_demo.sql` and point at `INSERT`, `UPDATE`, `DELETE`, `SELECT` with joins and `GROUP BY`.
**Say:** "All structure is DDL in these files; all data commands are DML. The website runs exactly these kinds of statements."

---

## 5. CRUD in the website, proved in MySQL (3 min)

Keep the browser and the MySQL window side by side.

### 5a. CREATE

**Click:** Students -> **Add student**. **Enter exactly:**

| Field | Value |
|---|---|
| Full name | `Demo Student` |
| Email | `demo.student@college.edu` |
| Department | `CSE - Computer Science and Engineering` |
| CGPA (0-10) | `8.2` |
| Graduation year | `2026` (already filled) |
| Skills | tick **Python** and **SQL** |

Click **Save**.
**Expect:** green banner with `INSERT INTO students ...`, "MySQL committed", "Neo4j graph updated".
**Proof, in MySQL:**
```sql
SELECT student_id, name, email, cgpa FROM students ORDER BY student_id DESC LIMIT 1;
SELECT * FROM student_skills WHERE student_id = (SELECT MAX(student_id) FROM students);
```
**Expect:** the new student (id 13) and 2 skill rows.
**Say:** "The row is really in MySQL, and the banner shows the exact SQL the website ran."

### 5b. READ (search and filter)

**Type in the Search box:** `demo` -> only Demo Student remains.
**Then clear it and pick Status: Unplaced** -> only unplaced students.
**Say:** "Search uses a MySQL FULLTEXT index."

### 5c. UPDATE

**Click:** **Edit** on Demo Student, change **CGPA to `8.9`**, **Save**.
**Proof:**
```sql
SELECT student_id, cgpa FROM students ORDER BY student_id DESC LIMIT 1;
SELECT action, old_data, new_data FROM audit_log ORDER BY audit_id DESC LIMIT 1;
```
**Expect:** cgpa 8.90, and an `UPDATE` audit row with `"cgpa": 8.2` before and `8.9` after.
**Say:** "We never wrote that audit row; a trigger did, automatically."

### 5d. Show it in the graph database too

**In Neo4j Browser run:**
```cypher
MATCH (s:Student {name:'Demo Student'})-[:HAS_SKILL]->(k:Skill) RETURN s, k
```
**Expect:** the student node with Python and SQL.
**Say:** "Every website change reaches both databases."

### 5e. DELETE

**Click:** **Delete** on Demo Student -> confirm.
**Proof:**
```sql
SELECT COUNT(*) AS rows_left FROM students WHERE name = 'Demo Student';
SELECT COUNT(*) AS orphan_skill_rows FROM student_skills WHERE student_id NOT IN (SELECT student_id FROM students);
```
**Expect:** `0` and `0` (the skill links were cascade-deleted).

---

## 6. The trigger demonstration (2.5 min)

Her exact sequence: code, before, fire, after, explain.

**Click:** officer -> **Trigger Lab** -> tab **Trigger: Accept an offer: UPDATE on applications**. The default offer is **#17 Neha Verma, Data Analyst @ DataWorks**. Do not change it.

| Step on the page | What to do and say |
|---|---|
| **1 Show the trigger code** | Read the first lines: "When the status becomes ACCEPTED, insert into placements, set is_placed to 1, reduce openings by 1, write an audit row." |
| **2 Data BEFORE** | Point at: application **OFFERED**; student **is_placed = 0**; job **openings = 2**; placements **(no rows)**. |
| **3 Fire it** | Click **Run the statement that activates the trigger**. Show the single SQL line: `UPDATE applications SET status = 'ACCEPTED' WHERE application_id = 17`. |
| **4 Data AFTER** | Green rows: application **ACCEPTED**, **is_placed = 1**, **openings = 1**, a new **placements** row (9 LPA), new `PLACED` audit row. |
| **5 Explanation** | Read it: "We changed one column. The trigger created the placement, marked the student placed, used up an opening and wrote the audit row, all automatically." |

**Proof in MySQL (the trigger really ran):**
```sql
SELECT * FROM placements WHERE student_id = 11;
SELECT audit_id, table_name, action, record_id FROM audit_log ORDER BY audit_id DESC LIMIT 4;
```

### 6b. A trigger that refuses bad data

**Click:** tab **Trigger: Apply for a job: INSERT on applications**. **Choose:**

| Field | Value |
|---|---|
| Student (not placed) | `Arjun Reddy (CGPA 6.8, CSE)` |
| Job (open) | `Software Engineer @ TechNova (min CGPA 7.5, ...)` |

Click **Run the statement...**.
**Expect:** a red message from the **database**: *"Not eligible: CGPA is below the minimum required for this job"*; nothing is inserted.
**Say:** "This is a BEFORE INSERT trigger. The rule lives in MySQL, so it cannot be bypassed by any program."

**Dashboard check:** Placed is now **5** (Neha added to the original 4).

---

## 7. Recruitment workflow and stored procedures (2 min)

### 7a. A stored procedure with an OUT parameter

**Click:** Trigger Lab -> tab **Procedure: CALL sp_apply** (defaults: Kabir Singh and QA Engineer). Click **Execute the procedure**.
**Expect:** `CALL sp_apply(5, 2, @new_app_id)` and the output `new_application_id` (a new number).
**Say:** "sp_apply checks the student and job, blocks duplicates, inserts the application and returns its id through an OUT parameter. The eligibility trigger runs inside it."
**Run again:** click Execute a second time -> error *"The student has already applied for this job"*.

### 7b. A full lifecycle with real buttons (Vikram Rao)

1. **Interviews** -> **Schedule round**:

| Field | Value |
|---|---|
| Application | `#21 Vikram Rao - Design Engineer @ AutoDrive [SHORTLISTED]` |
| Round type | `TECHNICAL` |
| Date | leave today's date |

   **Save** -> banner `CALL sp_schedule_round(...)`; the round number was **generated** (1).
2. **Applications** -> find Vikram Rao -> his status is now **INTERVIEW**. Click **Make offer** -> red message *"Every interview round must be held and PASSED before an offer"*.
3. **Interviews** -> Vikram's round -> **Mark PASSED**.
4. **Applications** -> Vikram -> **Make offer** (works now) -> **Accept offer**.
5. **Placements** page now lists Vikram Rao at AutoDrive.

**Say:** "Each button calls a stored procedure that enforces the recruitment order, and the accept fires the trigger we just saw."
**Proof:**
```sql
SELECT application_id, status FROM applications WHERE application_id = 21;
SELECT * FROM placements WHERE student_id = 9;
CALL sp_placement_stats();
```
**Dashboard check:** Placed is now **6**.

---

## 8. Nested queries (45 sec)

**Click:** officer -> **Queries** -> under *Nested SQL queries* click **Run** on:
1. *Students whose CGPA is above their own department's average* (correlated subquery)
2. *Students who have ALL skills required by the Software Engineer role* (double NOT EXISTS, relational division)

**Say:** "These are subqueries inside queries; the text on screen is the exact query from `06_nested_queries.sql`."

---

## 9. Neo4j, the NoSQL part (1.5 min)

**Click:** officer -> **Graph**. **Say:** "Each dot is a node in Neo4j: students, jobs, skills, companies, departments. Lines are relationships."

**In the 'Job matches' dropdown choose `Meera Nair`.**
**Point at:** the jobs ranked by **skills matched**, with the **missing skills** listed.
**Say:** "Meera knows C++ and Communication. The graph ranks open jobs by matching skills and tells her what to learn. This is a short Cypher traversal Student -> Skill <- Job; in SQL it would be several joins."

**Optional, in Neo4j Browser:**
```cypher
MATCH (s:Student {name:'Meera Nair'})-[:HAS_SKILL]->(k:Skill)<-[:REQUIRES]-(j:Job) RETURN s, k, j
MATCH (s)-[r:PLACED_AT]->(c) RETURN s.name, c.name, r.package
```
**Say:** "MySQL is the source of truth; Neo4j is a copy that can always be rebuilt with the Dashboard button."

---

## 10. Two roles and security (45 sec)

**Switch to Window 2 (signed in as `meera`).**
1. **My dashboard:** CGPA 7.2, Unplaced, her own applications and job matches.
2. **Applications** -> **New application** -> there is **no student picker** (she can only apply as herself). Choose **Job: `QA Engineer @ TechNova`** -> **Save**. Only her own applications are listed.
3. In the address bar open `/inspector` -> red error **"You do not have permission"** (HTTP 403).

**Say:** "Roles are enforced on the server, not just by hiding buttons. Passwords are stored as bcrypt hashes."
**Proof:**
```sql
SELECT username, role, LEFT(password_hash,7) AS hash_start FROM users LIMIT 3;
```
**Expect:** `$2b$10$`, no plain passwords.

---

## 11. Tests, documentation, close (45 sec)

**Do:** open `docs/test-results/latest.txt` (or run `npm test` after `npm run db:setup`): **39 tests, 39 pass**.
**Do:** show the `docs/` folder: `PROJECT_REPORT.md`, ER and schema PDFs, `sql/`, `neo4j/`, `screenshots/`, `evidence/`.
**Say:**
> "To summarise: 12 tables including a weak entity, 16 triggers, 7 stored procedures, 2 views, transactions, full-text search, a Neo4j graph for matching, login with two roles, 39 passing tests, and every claim backed by real output in the docs folder. Thank you."

---

## Quick reference card (keep this next to you)

**People and jobs used in the demo**

| Who / what | Why |
|---|---|
| `officer` / `meera` | the two logins |
| Demo Student (create, edit, delete) | CRUD proof |
| Neha Verma, offer #17 | trigger demonstration (Trigger Lab default) |
| Arjun Reddy (CGPA 6.8) + Software Engineer (min 7.5) | trigger that refuses |
| Kabir Singh + QA Engineer | `sp_apply` |
| Vikram Rao, application #21 | schedule round, PASSED, offer, accept |
| Meera Nair | student view and job matches |

**Numbers on the Dashboard as you go:** start **4 placed** -> after Neha **5** -> after Vikram **6**.

**Proof SQL, copy-paste**
```sql
SELECT student_id, name, cgpa FROM students ORDER BY student_id DESC LIMIT 1;
SELECT * FROM audit_log ORDER BY audit_id DESC LIMIT 3;
SELECT * FROM placements;
SELECT * FROM v_placement_summary;
SHOW TRIGGERS;
```

---

## If something goes wrong

| Problem | Fix |
|---|---|
| A step shows different numbers | you ran a step twice or out of order: `npm run db:setup`, then continue from that step |
| Page blank or errors | refresh; if it persists, `Ctrl+C` the server and run `npm start` |
| "Neo4j failed" banner | MySQL is still correct; Dashboard -> **Rebuild graph from MySQL** |
| Docker problem | start Docker Desktop, wait, `npm run db:setup` |
| Anything fails live | say what you expect, then show the recorded proof in `docs/screenshots/` and `docs/evidence/` |

**After you rehearse, run `npm run db:setup` again** so the numbers start at Placed 4 for the real demo.

## If she asks a question during the demo

Answers are in [VIVA_PREP_GUIDE.md](VIVA_PREP_GUIDE.md). Most likely:
- *"Why a weak entity?"* -> Q10. *"Explain ACID"* -> Q62. *"Trigger vs procedure?"* -> Q78.
- *"How are passwords stored?"* -> Q122. *"What if Neo4j is down?"* -> Q66 and Q103.
- *"Is this original / did you use AI?"* -> part 20. Answer honestly and according to your course policy.
