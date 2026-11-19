-- =====================================================================
--  PlaceGraph  |  07_trigger_demo.sql
--  Follow mam's sequence: 1) show code  2) BEFORE  3) fire it  4) AFTER  5) explain
--  Run right after a fresh `npm run db:setup`.
-- =====================================================================
USE placegraph;

-- ============ DEMO A : accept an offer (UPDATE -> automatic placement) ==

-- STEP 1: show the trigger code
SHOW CREATE TRIGGER trg_applications_after_update\G

-- STEP 2: BEFORE  - application 10 (Sneha Iyer, Data Analyst) is OFFERED; nothing placed yet
SELECT application_id, student_id, job_id, status FROM applications WHERE application_id = 10;
SELECT student_id, name, is_placed FROM students WHERE student_id = 4;
SELECT job_id, title, openings FROM jobs WHERE job_id = 3;
SELECT * FROM placements WHERE student_id = 4;
SELECT audit_id, table_name, action, record_id FROM audit_log ORDER BY audit_id DESC LIMIT 3;

-- STEP 3: fire the trigger - one plain UPDATE
UPDATE applications SET status = 'ACCEPTED' WHERE application_id = 10;

-- STEP 4: AFTER
SELECT application_id, student_id, job_id, status FROM applications WHERE application_id = 10;
SELECT student_id, name, is_placed FROM students WHERE student_id = 4;
SELECT job_id, title, openings FROM jobs WHERE job_id = 3;
SELECT * FROM placements WHERE student_id = 4;
SELECT audit_id, table_name, action, record_id, new_data FROM audit_log ORDER BY audit_id DESC LIMIT 5;

-- STEP 5: explanation
--   We only changed applications.status. The AFTER UPDATE trigger on its own:
--   inserted the placement row, set students.is_placed = 1, reduced jobs.openings 2 -> 1
--   (which in turn fired the students/jobs audit triggers) and wrote a PLACED audit row.

-- Guard trigger (BEFORE INSERT): a placed student cannot apply again -> ERROR 1644
INSERT INTO applications (student_id, job_id) VALUES (4, 2);

-- Guard trigger: CGPA below the minimum (Arjun 6.8 vs Software Engineer 7.5) -> ERROR 1644
INSERT INTO applications (student_id, job_id) VALUES (7, 1);

-- Guard trigger: only an OFFERED application can be accepted -> ERROR 1644
UPDATE applications SET status = 'ACCEPTED' WHERE application_id = 20;


-- ============ DEMO B : failed interview round (UPDATE -> auto rejection) =
SHOW CREATE TRIGGER trg_rounds_after_update\G

-- BEFORE: application 11 (Kabir Singh, Embedded Engineer) is in INTERVIEW, round 1 PENDING
SELECT application_id, status FROM applications WHERE application_id = 11;
SELECT * FROM interview_rounds WHERE application_id = 11;

-- fire: record a failed result
UPDATE interview_rounds SET result = 'FAILED' WHERE application_id = 11 AND round_no = 1;

-- AFTER: the application was REJECTED by the trigger
SELECT application_id, status FROM applications WHERE application_id = 11;
SELECT * FROM interview_rounds WHERE application_id = 11;
SELECT audit_id, table_name, action, record_id, old_data, new_data FROM audit_log ORDER BY audit_id DESC LIMIT 4;


-- ============ DEMO C : audit trigger on students (UPDATE) =============
SHOW CREATE TRIGGER trg_students_after_update\G
SELECT student_id, name, cgpa FROM students WHERE student_id = 9;           -- BEFORE
UPDATE students SET cgpa = 6.90 WHERE student_id = 9;                      -- fire
SELECT student_id, name, cgpa FROM students WHERE student_id = 9;           -- AFTER
SELECT * FROM audit_log WHERE table_name = 'students' ORDER BY audit_id DESC LIMIT 1;  -- old vs new JSON
UPDATE students SET cgpa = 6.50 WHERE student_id = 9;                      -- restore
