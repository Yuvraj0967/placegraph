# Before and after: proving a change in MySQL and Neo4j

How to show your teacher that an action in the website **really changes the databases**, for any category: student, company, job, skill, department, application, interview round, placement.

The method is always the same: **snapshot BEFORE -> do the action in the website -> snapshot AFTER -> compare**.

> Start clean: run `npm run db:setup` so the numbers below match (12 students, 35 student-skill links, 21 applications, 4 placements).

---

## 0. Setup (2 minutes)

| What | How |
|---|---|
| Website | http://localhost:3001, sign in as `officer` |
| MySQL prompt | In PowerShell, in the project folder:<br>`$p = (Select-String -Path .env -Pattern '^MYSQL_ROOT_PASSWORD=').Line.Split('=',2)[1]`<br>`docker exec -it -e MYSQL_PWD=$p placegraph-mysql mysql -uroot placegraph` |
| Neo4j Browser | http://localhost:7475/browser/?connectURL=bolt://neo4j@localhost:7688 (the URL must say `localhost:7688`, not the default 7687), user `neo4j`, password `NEO4J_PASSWORD` from `.env` |

Use a wide terminal so MySQL tables do not wrap. In Neo4j use the **Table** tab for lists and the **Graph** tab for pictures; run with **Ctrl+Enter**.

---

## 1. The three-step recipe

1. **BEFORE:** run the snapshot query (below) in MySQL and in Neo4j. Write the numbers down.
2. **ACT:** do the action in the website (add, edit, delete, apply, accept...).
3. **AFTER:** run the same snapshot again, then the specific query for that category.

### Snapshot for MySQL: the size of every table

```sql
SELECT 'departments' AS table_name, COUNT(*) AS row_count FROM departments
UNION ALL SELECT 'students', COUNT(*) FROM students
UNION ALL SELECT 'companies', COUNT(*) FROM companies
UNION ALL SELECT 'jobs', COUNT(*) FROM jobs
UNION ALL SELECT 'skills', COUNT(*) FROM skills
UNION ALL SELECT 'student_skills', COUNT(*) FROM student_skills
UNION ALL SELECT 'job_skills', COUNT(*) FROM job_skills
UNION ALL SELECT 'applications', COUNT(*) FROM applications
UNION ALL SELECT 'interview_rounds', COUNT(*) FROM interview_rounds
UNION ALL SELECT 'placements', COUNT(*) FROM placements
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'audit_log', COUNT(*) FROM audit_log;
```

### Snapshot for Neo4j: every node type and relationship type

```cypher
MATCH (n) RETURN labels(n)[0] AS what, count(*) AS total
UNION ALL
MATCH ()-[r]->() RETURN type(r) AS what, count(*) AS total
```

Starting values after `npm run db:setup`:

| MySQL | Neo4j |
|---|---|
| students 12, student_skills 35, companies 5, jobs 8, applications 21, placements 4, audit_log 0 | Student 12, Job 8, Department 4, Skill 10, Company 5; IN_DEPT 12, HAS_SKILL 35, POSTED 8, REQUIRES 18, APPLIED_TO 21, PLACED_AT 4 |

---

## 2. What changes for each category

The website writes to MySQL first and then copies the change to Neo4j, so **both change together**.

### Table of changes

| Website action | MySQL (what changes) | Neo4j (what changes) |
|---|---|---|
| **Add student** (department + 2 skills) | students **+1**, student_skills **+2**, audit_log **+1** | Student **+1**, IN_DEPT **+1**, HAS_SKILL **+2** |
| **Add company** | companies **+1** | Company **+1** |
| **Add job posting** (company + skills) | jobs **+1**, job_skills **+n**, audit_log **+1** | Job **+1**, POSTED **+1**, REQUIRES **+n** |
| **Add skill** | skills **+1** | Skill **+1** |
| **Add department** | departments **+1** | Department **+1** |
| **New application** | applications **+1**, audit_log **+1** | APPLIED_TO **+1** |
| **Shortlist / Make offer / Reject** | the application's `status` changes, audit_log **+1** | the APPLIED_TO relationship's `status` changes (no count change) |
| **Schedule interview round** | interview_rounds **+1**, application status becomes INTERVIEW | **no new node**: rounds are not in the graph; only the APPLIED_TO `status` changes |
| **Accept offer** | placements **+1**, student `is_placed` 0 to 1, job `openings` -1, audit_log **+4**, other applications WITHDRAWN | PLACED_AT **+1**, student `placed` false to true, job `openings` -1, APPLIED_TO statuses updated |
| **Edit** any record | the column changes, audit row for students/jobs | the property changes (no count change) |
| **Delete** any record | the same counts go **down** (children cascade) | the same counts go **down** |

### What is NOT in Neo4j
`users`, `interview_rounds` and `audit_log` live only in MySQL. Do not promise a Neo4j count for them.

---

## 3. Specific queries per category

### MySQL: the newest row of each table

```sql
SELECT * FROM students   ORDER BY student_id     DESC LIMIT 1;
SELECT * FROM companies  ORDER BY company_id     DESC LIMIT 1;
SELECT * FROM jobs       ORDER BY job_id         DESC LIMIT 1;
SELECT * FROM skills     ORDER BY skill_id       DESC LIMIT 1;
SELECT * FROM departments ORDER BY dept_id       DESC LIMIT 1;
SELECT * FROM applications ORDER BY application_id DESC LIMIT 1;
SELECT * FROM interview_rounds ORDER BY application_id DESC, round_no DESC LIMIT 1;
SELECT * FROM placements ORDER BY placed_on DESC, student_id DESC LIMIT 1;
SELECT audit_id, table_name, action, record_id, new_data FROM audit_log ORDER BY audit_id DESC LIMIT 3;
```

Child rows created with a record:
```sql
SELECT * FROM student_skills WHERE student_id = (SELECT MAX(student_id) FROM students);
SELECT * FROM job_skills     WHERE job_id     = (SELECT MAX(job_id) FROM jobs);
```

### Neo4j: the newest node or relationship of each type

```cypher
MATCH (s:Student)    RETURN s ORDER BY s.id DESC LIMIT 1
MATCH (c:Company)    RETURN c ORDER BY c.id DESC LIMIT 1
MATCH (k:Skill)      RETURN k ORDER BY k.id DESC LIMIT 1
MATCH (d:Department) RETURN d ORDER BY d.id DESC LIMIT 1
```

A job with its company:
```cypher
MATCH (j:Job)<-[:POSTED]-(c:Company)
RETURN j.title AS job, c.name AS company, j.package AS package ORDER BY j.id DESC LIMIT 1
```

A student with their skills and department as a picture (use the **Graph** tab; replace the name, which is case-sensitive):
```cypher
MATCH (s:Student {name:'Demo Student'})
OPTIONAL MATCH (s)-[:HAS_SKILL]->(k:Skill)
OPTIONAL MATCH (s)-[:IN_DEPT]->(d:Department)
RETURN s, k, d
```

Applications and their status (the newest two):
```cypher
MATCH (s:Student)-[r:APPLIED_TO]->(j:Job)
RETURN s.name AS student, r.status AS status, j.title AS job
ORDER BY r.applicationId DESC LIMIT 2
```

Placements:
```cypher
MATCH (s:Student)-[r:PLACED_AT]->(c:Company)
RETURN s.name AS student, c.name AS company, r.package AS package ORDER BY s.name
```

After an **Accept offer**, also check the two changed properties (example: Neha Verma, Data Analyst):
```cypher
MATCH (s:Student {name:'Neha Verma'}) RETURN s.name, s.placed
MATCH (j:Job {title:'Data Analyst'})  RETURN j.title, j.openings
```

---

## 4. The full demo: "show the whole database, then add a student"

### Part 1: show everything (before)

**MySQL**
```sql
SHOW TABLES;
SELECT * FROM departments;
SELECT * FROM students;
SELECT * FROM companies;
SELECT * FROM jobs;
SELECT * FROM skills;
SELECT * FROM student_skills;
SELECT * FROM job_skills;
SELECT * FROM applications;
SELECT * FROM interview_rounds;
SELECT * FROM placements;
SELECT user_id, username, email, role, student_id FROM users;
SELECT * FROM audit_log;
```
(The `users` query leaves out the password hash on purpose.)

**Neo4j**
```cypher
MATCH (s:Student) RETURN s.id AS id, s.name AS name, s.email AS email, s.cgpa AS cgpa, s.placed AS placed ORDER BY s.id
MATCH (j:Job) RETURN j.id AS id, j.title AS title, j.package AS package_lpa, j.minCgpa AS min_cgpa, j.openings AS openings ORDER BY j.id
MATCH (c:Company) RETURN c.id AS id, c.name AS name, c.industry AS industry, c.location AS location ORDER BY c.id
MATCH (k:Skill) RETURN k.id AS id, k.name AS name ORDER BY k.id
MATCH (d:Department) RETURN d.id AS id, d.code AS code, d.name AS name ORDER BY d.id
MATCH (a:Student)-[r:APPLIED_TO]->(b:Job) RETURN a.name AS student, r.status AS status, b.title AS job ORDER BY a.name
```
The whole graph as one picture (click the **Graph** tab):
```cypher
MATCH p=()-[]->() RETURN p
```
Neo4j prints numbers like ids as `1.0`; that is only how it displays numbers.

### Part 2: add the student in the website

Students -> **＋ Add student**:

| Field | Value |
|---|---|
| Full name | `Demo Student` |
| Email | `demo.student@college.edu` |
| Department | `CSE - Computer Science and Engineering` |
| CGPA | `8.2` |
| Skills | tick **Python** and **SQL** |

Click **Save**. The green banner shows the SQL that ran, "MySQL committed" and "Neo4j graph updated".

### Part 3: show it directly in each database (after)

**MySQL:** run the snapshot again (students 12 to **13**, student_skills 35 to **37**, audit_log 0 to **1**), then:
```sql
SELECT * FROM students;
SELECT * FROM student_skills WHERE student_id = (SELECT MAX(student_id) FROM students);
SELECT * FROM audit_log;
```
**Neo4j:** run its snapshot again (Student 12 to **13**, HAS_SKILL 35 to **37**, IN_DEPT 12 to **13**), then:
```cypher
MATCH (s:Student) RETURN s ORDER BY s.id DESC LIMIT 1
```
and the picture query for `Demo Student` from section 3.

**Say:** "I added this in the website. Nobody typed anything in MySQL or Neo4j. The app saved it to MySQL, then copied it to Neo4j."

### Live version for MySQL (optional)
Open officer -> **DB Inspector -> students**, tick **live refresh (2s)**, add the student in a second browser tab: the row appears within two seconds. The Inspector reads MySQL directly.

### Finish
Delete the student in the website (the counts return to the starting numbers) or run `npm run db:setup`.

---

## 5. If you change a database directly, not through the website

| You change | What happens to the other database |
|---|---|
| MySQL directly (`INSERT`, `UPDATE`, `DELETE` in the prompt) | **Neo4j does not change** until you sync: officer Dashboard -> **Rebuild graph from MySQL**, or `npm run db:sync` |
| Neo4j directly (`CREATE`, `SET`, `DETACH DELETE`) | **MySQL does not change**. Neo4j is only a copy, and a rebuild would erase the Neo4j-only change |

Say: "MySQL is the source of truth. The website updates both. Direct changes to MySQL reach Neo4j after a sync."

---

## 6. Tips and traps

- Cypher names are **case-sensitive**: use the name exactly as saved, or use the "newest" query (`ORDER BY ... DESC LIMIT 1`), which does not depend on the name.
- Neo4j has **no live refresh**: re-run the query after the action.
- If your numbers differ from this guide, you ran something earlier: `npm run db:setup`.
- Passwords are in your private `.env` (never shown on screen).
- Related guides: [PRESENTATION_SCRIPT.md](PRESENTATION_SCRIPT.md) (full timed demo), [DEMO_GUIDE.md](DEMO_GUIDE.md), [SCHEMA_GUIDE.md](SCHEMA_GUIDE.md), [VIVA_PREP_GUIDE.md](VIVA_PREP_GUIDE.md).
