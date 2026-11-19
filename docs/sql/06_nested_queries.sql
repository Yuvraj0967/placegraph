-- =====================================================================
--  PlaceGraph  |  06_nested_queries.sql  |  NESTED QUERIES (subqueries)
--  The website's "Queries" page parses and runs these blocks.
--  Each block starts with "-- @query <title>" and holds one SELECT.
-- =====================================================================

-- @query Students whose CGPA is above their own department's average (correlated subquery)
SELECT s.name, s.cgpa, d.code AS dept
FROM   students s
JOIN   departments d ON d.dept_id = s.dept_id
WHERE  s.cgpa > (SELECT AVG(s2.cgpa) FROM students s2 WHERE s2.dept_id = s.dept_id)
ORDER  BY d.code, s.cgpa DESC;

-- @query Companies offering a job above the average package (IN with scalar subquery)
SELECT name, industry
FROM   companies
WHERE  company_id IN (SELECT company_id FROM jobs
                      WHERE  package_lpa > (SELECT AVG(package_lpa) FROM jobs));

-- @query Students who never reached an interview round (NOT EXISTS)
SELECT s.name, s.cgpa
FROM   students s
WHERE  NOT EXISTS (SELECT 1
                   FROM   applications a JOIN interview_rounds r ON r.application_id = a.application_id
                   WHERE  a.student_id = s.student_id)
ORDER  BY s.cgpa DESC;

-- @query Jobs nobody has applied to yet (NOT IN)
SELECT j.title, c.name AS company
FROM   jobs j JOIN companies c ON c.company_id = j.company_id
WHERE  j.job_id NOT IN (SELECT job_id FROM applications);

-- @query Highest-paying job of each company (correlated MAX)
SELECT c.name AS company, j.title, j.package_lpa
FROM   jobs j JOIN companies c ON c.company_id = j.company_id
WHERE  j.package_lpa = (SELECT MAX(j2.package_lpa) FROM jobs j2 WHERE j2.company_id = j.company_id)
ORDER  BY j.package_lpa DESC;

-- @query Departments placing a larger share than the whole college (subquery in HAVING)
SELECT d.code, COUNT(*) AS students, SUM(s.is_placed) AS placed
FROM   departments d JOIN students s ON s.dept_id = d.dept_id
GROUP  BY d.dept_id, d.code
HAVING SUM(s.is_placed) / COUNT(*) > (SELECT AVG(is_placed) FROM students);

-- @query Students who have ALL skills required by the Software Engineer role (double NOT EXISTS, relational division)
SELECT s.name, s.cgpa
FROM   students s
WHERE  NOT EXISTS (
         SELECT 1 FROM job_skills js
         WHERE  js.job_id = (SELECT job_id FROM jobs WHERE title = 'Software Engineer')
           AND  NOT EXISTS (SELECT 1 FROM student_skills ss
                            WHERE ss.student_id = s.student_id AND ss.skill_id = js.skill_id));

-- @query Placed students earning more than the average placement package
SELECT s.name, p.package_lpa, c.name AS company
FROM   placements p
JOIN   students s  ON s.student_id = p.student_id
JOIN   jobs j      ON j.job_id = p.job_id
JOIN   companies c ON c.company_id = j.company_id
WHERE  p.package_lpa > (SELECT AVG(package_lpa) FROM placements)
ORDER  BY p.package_lpa DESC;
