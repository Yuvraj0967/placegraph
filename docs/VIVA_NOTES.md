# PlaceGraph viva notes

Study prompts that refer to the current source. Read the files and run the demo yourself; do not memorise answers you cannot show.

## Project and design
1. **What problem does it solve?** A placement cell cannot enforce its rules in spreadsheets. PlaceGraph makes the database enforce eligibility, the recruitment status flow, automatic placement and an audit trail, and uses a graph to match students to jobs by skills. See PROJECT_REPORT §1.
2. **Why two databases?** MySQL for structured, rule-heavy data with ACID transactions; Neo4j for skill/relationship traversals. MySQL is the source of truth; the graph is rebuilt from it. See §5.
3. **Could SQL alone do the matching?** Yes, with joins and aggregation (and a recursive CTE for paths). Cypher is shorter for these questions; we made no speed claim. See §5.
4. **Why no vector database?** The course option is SQL + NoSQL; matching is exact and explainable (skill names), no embeddings.
5. **What happens if Neo4j is down?** The MySQL commit stands, the UI shows "Neo4j failed", and Dashboard -> Rebuild graph from MySQL repairs it. A transactional outbox would be the next step (§16).

## ER and schema
6. **Which entity is weak?** `INTERVIEW_ROUND`: round 1/2/3 mean nothing without the application; `round_no` is a partial key; PK `(application_id, round_no)`; `ON DELETE CASCADE`; identifying relationship APPLICATION-has-INTERVIEW_ROUND.
7. **Is JOB weak because it depends on a company?** No. It has its own key `job_id`; the foreign key only expresses 1:N.
8. **How were M:N relationships handled?** `student_skills` and `job_skills` (composite keys). STUDENT-JOB became the entity `applications` because it has attributes (status, date) and children (rounds).
9. **Why is `student_id` the PK of `placements`?** A student can be placed once; the key guarantees it.
10. **Normal form?** 3NF. `students.is_placed` and `jobs.openings` are deliberate, trigger-maintained derived values.
11. **Why RESTRICT for company->jobs and department->students but CASCADE for student->applications?** Deleting a company or department would destroy history; deleting a student removes only that student's own data.

## SQL
12. **Which four-plus advanced concepts are live?** Transactions (`lib/core.js`), views (`v_placement_summary`, `v_job_pipeline`), stored procedures (7), triggers (16), FULLTEXT/indexing (search boxes, EXPLAIN evidence).
13. **Walk through accepting an offer.** `UPDATE applications SET status='ACCEPTED'` -> BEFORE UPDATE checks the old status was OFFERED -> AFTER UPDATE inserts the placement, sets `is_placed = 1`, reduces `openings` (firing audit triggers) and writes a PLACED audit row. `sp_accept_offer` then withdraws the student's other open applications.
14. **Why does the procedure, not the trigger, withdraw the other applications?** MySQL forbids a trigger from modifying the table that fired it.
15. **Why does `trg_students_before_delete` exist?** Rows removed by a foreign-key CASCADE do not fire triggers; if a placed student is deleted, the trigger gives the opening back first.
16. **BEFORE vs AFTER triggers?** BEFORE validates and can reject with `SIGNAL`; AFTER reacts to what happened (placement, audit).
17. **Trigger vs procedure?** A trigger runs automatically on a data change; a procedure runs when called, takes parameters and can return OUT values.
18. **DDL vs DML?** DDL defines structure (`01_ddl.sql`); DML manipulates rows (`04`, `05`).
19. **Show a nested query.** `06_nested_queries.sql`: correlated subquery, IN with scalar subquery, NOT EXISTS, NOT IN, correlated MAX, subquery in HAVING, double NOT EXISTS (relational division), subquery against placements.
20. **Did the FULLTEXT index get used?** Yes for the `MATCH ... AGAINST` form; the `LIKE '%..%'` form scans the table. See `docs/evidence/explain_output.txt`. On 8 rows no speed difference is meaningful, so we claim none.
21. **How is search implemented?** The API uses `MATCH ... AGAINST` when every word has 3+ letters and one table is searched, otherwise `LIKE` (InnoDB does not index words under 3 letters).
22. **What bug did the tests find?** CGPA stored as `DECIMAL(3,2)` cannot hold 10.00 (max 9.99); widened to `DECIMAL(4,2)` with a regression test.

## NoSQL
23. **Which advanced NoSQL concepts?** Variable-length `shortestPath`, aggregation with `collect`/`count`/`avg`, pattern predicates and list comprehensions (matched vs missing skills).
24. **Graph model?** Nodes Student, Department, Company, Job, Skill; edges IN_DEPT, HAS_SKILL, REQUIRES, POSTED, APPLIED_TO, PLACED_AT.
25. **How does the sync avoid duplicates?** Nodes are `MERGE`d by SQL id; a node's edges are replaced; the full rebuild clears and recreates everything.

## Application, auth and security
26. **Where is the password stored?** Only as a bcrypt hash in `users.password_hash`. Demo passwords are random, in the git-ignored `.env`.
27. **How is the session handled?** Signed JWT in an HTTP-only SameSite=Lax cookie (8 h); the user's current role is re-read from MySQL on every protected request.
28. **How are roles enforced?** `requireUser('officer')` and `lib/access.js` on the server. A student gets only their own rows and 403 on officer endpoints (API tests). Hiding buttons is only cosmetic.
29. **Why can a student not apply as someone else?** The API overwrites `student_id` with the signed-in student's id.
30. **How are secrets kept out of the code?** `lib/env.js` reads only environment variables; `npm run init` writes random values into `.env`; `.env.example` has placeholders; the app uses a limited MySQL user, root only for setup.
31. **Where is validation enforced?** Forms and `lib/core.js` check shape; CHECK/FK/UNIQUE/ENUM/triggers are the final authority and their errors are shown as readable 4xx messages.

## Five-minute live demonstration
1. **0:00-0:45** Open the ER and schema PDFs: point at the weak entity, the M:N tables and `users`.
2. **0:45-1:30** Show `02_triggers.sql` (auto placement) and `03_procedures.sql` (`sp_accept_offer`) and the FULLTEXT indexes in `01_ddl.sql`.
3. **1:30-2:30** Sign in as the officer: apply Arjun Reddy (CGPA 6.8) to Software Engineer (min 7.5): the trigger rejects it. Apply, shortlist and schedule a round for Meera.
4. **2:30-3:20** Accept Sneha's offer: show Placements, audit log, openings and the Neo4j `PLACED_AT` edge. Show Trigger Lab (code, before, fire, after).
5. **3:20-4:10** Sign out, sign in as the student: own dashboard and job matches, apply as herself, officer pages blocked (403).
6. **4:10-5:00** Show `docs/test-results/latest.txt` (39 pass) and `git shortlog -sn --all` once both members have real commits. State one limitation.
