-- =====================================================================
--  PlaceGraph  |  05_dml_demo.sql  |  DML: INSERT / UPDATE / DELETE / SELECT
--  Run these live in the MySQL client to show how each command changes
--  the database. (The website runs exactly the same statements.)
-- =====================================================================
USE placegraph;

-- ---------- SELECT ---------------------------------------------------
SELECT * FROM companies;
SELECT student_id, name, cgpa FROM students WHERE cgpa >= 8.5 ORDER BY cgpa DESC;
SELECT s.name AS student, j.title AS job, c.name AS company, a.status
FROM   applications a
JOIN   students  s ON s.student_id = a.student_id
JOIN   jobs      j ON j.job_id     = a.job_id
JOIN   companies c ON c.company_id = j.company_id
ORDER  BY a.application_id;
SELECT d.code, COUNT(s.student_id) AS students, SUM(s.is_placed) AS placed
FROM   departments d LEFT JOIN students s ON s.dept_id = d.dept_id
GROUP  BY d.dept_id, d.code
HAVING COUNT(s.student_id) >= 1
ORDER  BY placed DESC;

-- ---------- INSERT ---------------------------------------------------
INSERT INTO companies (name, industry, location) VALUES ('Demo Corp', 'Consulting', 'Mumbai');
SELECT * FROM companies ORDER BY company_id DESC LIMIT 1;

INSERT INTO jobs (company_id, title, package_lpa, min_cgpa, openings, deadline)
VALUES (LAST_INSERT_ID(), 'Business Analyst', 10.00, 7.00, 2, DATE_ADD(CURDATE(), INTERVAL 30 DAY));
INSERT INTO job_skills (job_id, skill_id) VALUES (LAST_INSERT_ID(), 3), (LAST_INSERT_ID(), 9);

-- ---------- UPDATE ---------------------------------------------------
UPDATE jobs SET package_lpa = 11.50, openings = 3 WHERE title = 'Business Analyst';
SELECT job_id, title, package_lpa, openings FROM jobs WHERE title = 'Business Analyst';

-- ---------- DELETE ---------------------------------------------------
DELETE FROM jobs      WHERE title = 'Business Analyst';   -- job_skills rows vanish (ON DELETE CASCADE)
DELETE FROM companies WHERE name  = 'Demo Corp';
SELECT * FROM audit_log ORDER BY audit_id DESC LIMIT 5;   -- the job triggers recorded the changes

-- ---------- Integrity rule in action (should FAIL) -------------------
-- Company 1 still has jobs, ON DELETE RESTRICT blocks this:
-- DELETE FROM companies WHERE company_id = 1;
