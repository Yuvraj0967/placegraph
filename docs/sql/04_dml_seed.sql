-- =====================================================================
--  PlaceGraph  |  04_dml_seed.sql  |  DML: INSERT (initial data)
--  Applications and interview rounds are inserted/updated with plain SQL, so the
--  triggers run for every row (eligibility guard, status flow, auto placement).
--  audit_log is cleared at the end so demos start clean.
-- =====================================================================
USE placegraph;

INSERT INTO departments (code, name) VALUES
 ('CSE',  'Computer Science and Engineering'),
 ('IT',   'Information Technology'),
 ('ECE',  'Electronics and Communication'),
 ('MECH', 'Mechanical Engineering');

INSERT INTO skills (name) VALUES
 ('Python'), ('Java'), ('SQL'), ('React'), ('C++'),
 ('Machine Learning'), ('Embedded C'), ('CAD'), ('Communication'), ('AWS');

INSERT INTO students (name, email, dept_id, cgpa, grad_year) VALUES
 ('Aarav Sharma', 'aarav@college.edu',  1, 8.90, 2026),
 ('Diya Patel',   'diya@college.edu',   1, 9.20, 2026),
 ('Rohan Mehta',  'rohan@college.edu',  2, 8.10, 2026),
 ('Sneha Iyer',   'sneha@college.edu',  2, 7.60, 2026),
 ('Kabir Singh',  'kabir@college.edu',  3, 8.40, 2026),
 ('Meera Nair',   'meera@college.edu',  3, 7.20, 2026),
 ('Arjun Reddy',  'arjun@college.edu',  1, 6.80, 2026),
 ('Ananya Das',   'ananya@college.edu', 4, 7.90, 2026),
 ('Vikram Rao',   'vikram@college.edu', 4, 6.50, 2026),
 ('Isha Gupta',   'isha@college.edu',   1, 9.50, 2026),
 ('Neha Verma',   'neha@college.edu',   2, 8.70, 2026),
 ('Rahul Jain',   'rahul@college.edu',  3, 7.80, 2026);

-- student skills: (student_id, skill_id)  Python=1 Java=2 SQL=3 React=4 C++=5 ML=6 EmbeddedC=7 CAD=8 Comm=9 AWS=10
INSERT INTO student_skills (student_id, skill_id) VALUES
 (1,1),(1,2),(1,3),(1,10),
 (2,1),(2,6),(2,3),(2,10),
 (3,2),(3,3),(3,4),
 (4,1),(4,3),(4,9),
 (5,7),(5,5),
 (6,5),(6,9),
 (7,2),(7,4),
 (8,8),(8,9),
 (9,8),
 (10,1),(10,6),(10,2),(10,3),(10,10),
 (11,1),(11,3),(11,4),(11,9),
 (12,7),(12,5),(12,1);

INSERT INTO companies (name, industry, location) VALUES
 ('TechNova',    'IT Services',  'Bengaluru'),
 ('DataWorks',   'Analytics',    'Pune'),
 ('CircuitPro',  'Electronics',  'Hyderabad'),
 ('AutoDrive',   'Automotive',   'Chennai'),
 ('CloudNine',   'Cloud',        'Gurugram');

INSERT INTO jobs (company_id, title, package_lpa, min_cgpa, openings, deadline) VALUES
 (1, 'Software Engineer',   12.00, 7.50, 3, DATE_ADD(CURDATE(), INTERVAL 30 DAY)),
 (1, 'QA Engineer',          6.50, 6.50, 2, DATE_ADD(CURDATE(), INTERVAL 20 DAY)),
 (2, 'Data Analyst',         9.00, 7.00, 2, DATE_ADD(CURDATE(), INTERVAL 25 DAY)),
 (2, 'ML Engineer',         18.00, 8.50, 1, DATE_ADD(CURDATE(), INTERVAL 25 DAY)),
 (3, 'Embedded Engineer',    8.00, 7.00, 2, DATE_ADD(CURDATE(), INTERVAL 15 DAY)),
 (4, 'Design Engineer',      7.50, 6.50, 2, DATE_ADD(CURDATE(), INTERVAL 40 DAY)),
 (5, 'Cloud Engineer',      14.00, 8.00, 2, DATE_ADD(CURDATE(), INTERVAL 35 DAY)),
 (5, 'Graduate Trainee',     5.50, 6.00, 5, DATE_SUB(CURDATE(), INTERVAL 5 DAY));   -- deadline already passed

INSERT INTO job_skills (job_id, skill_id) VALUES
 (1,2),(1,3),
 (2,1),(2,3),
 (3,1),(3,3),(3,9),
 (4,1),(4,6),(4,3),
 (5,7),(5,5),
 (6,8),(6,9),
 (7,10),(7,1),(7,2),
 (8,9);

-- ---------------------------------------------------------------------
-- 21 applications (ids 1..21). The BEFORE INSERT trigger checks eligibility.
-- ---------------------------------------------------------------------
INSERT INTO applications (student_id, job_id, applied_on) VALUES
 (1,1, DATE_SUB(CURDATE(), INTERVAL 12 DAY)),   -- 1
 (1,4, DATE_SUB(CURDATE(), INTERVAL 11 DAY)),   -- 2
 (1,7, DATE_SUB(CURDATE(), INTERVAL 10 DAY)),   -- 3
 (2,1, DATE_SUB(CURDATE(), INTERVAL 20 DAY)),   -- 4
 (2,4, DATE_SUB(CURDATE(), INTERVAL 19 DAY)),   -- 5
 (2,7, DATE_SUB(CURDATE(), INTERVAL 18 DAY)),   -- 6
 (3,1, DATE_SUB(CURDATE(), INTERVAL 15 DAY)),   -- 7
 (3,3, DATE_SUB(CURDATE(), INTERVAL 14 DAY)),   -- 8
 (4,2, DATE_SUB(CURDATE(), INTERVAL 13 DAY)),   -- 9
 (4,3, DATE_SUB(CURDATE(), INTERVAL 13 DAY)),   -- 10
 (5,5, DATE_SUB(CURDATE(), INTERVAL 9 DAY)),    -- 11
 (6,5, DATE_SUB(CURDATE(), INTERVAL 9 DAY)),    -- 12
 (8,6, DATE_SUB(CURDATE(), INTERVAL 16 DAY)),   -- 13
 (10,4, DATE_SUB(CURDATE(), INTERVAL 22 DAY)),  -- 14
 (10,7, DATE_SUB(CURDATE(), INTERVAL 21 DAY)),  -- 15
 (10,1, DATE_SUB(CURDATE(), INTERVAL 21 DAY)),  -- 16
 (11,3, DATE_SUB(CURDATE(), INTERVAL 8 DAY)),   -- 17
 (11,1, DATE_SUB(CURDATE(), INTERVAL 8 DAY)),   -- 18
 (12,5, DATE_SUB(CURDATE(), INTERVAL 17 DAY)),  -- 19
 (7,2,  DATE_SUB(CURDATE(), INTERVAL 5 DAY)),   -- 20
 (9,6,  DATE_SUB(CURDATE(), INTERVAL 4 DAY));   -- 21

-- ---------------------------------------------------------------------
-- Move applications through the pipeline (status-flow trigger validates each step)
-- ---------------------------------------------------------------------
UPDATE applications SET status = 'SHORTLISTED' WHERE application_id IN (2,4,7,8,10,11,13,14,17,19,21);

-- interview rounds: INSERT fires trg_rounds_after_insert (application -> INTERVIEW)
INSERT INTO interview_rounds (application_id, round_no, round_type, scheduled_on, result) VALUES
 (4, 1,'APTITUDE',  DATE_SUB(CURDATE(), INTERVAL 15 DAY), 'PASSED'),
 (4, 2,'TECHNICAL', DATE_SUB(CURDATE(), INTERVAL 13 DAY), 'PASSED'),
 (4, 3,'HR',        DATE_SUB(CURDATE(), INTERVAL 12 DAY), 'PASSED'),
 (7, 1,'APTITUDE',  DATE_SUB(CURDATE(), INTERVAL 10 DAY), 'PASSED'),
 (7, 2,'TECHNICAL', DATE_SUB(CURDATE(), INTERVAL 8 DAY),  'PASSED'),
 (8, 1,'APTITUDE',  DATE_SUB(CURDATE(), INTERVAL 9 DAY),  'PENDING'),
 (10,1,'APTITUDE',  DATE_SUB(CURDATE(), INTERVAL 9 DAY),  'PASSED'),
 (10,2,'TECHNICAL', DATE_SUB(CURDATE(), INTERVAL 7 DAY),  'PASSED'),
 (2, 1,'TECHNICAL', DATE_SUB(CURDATE(), INTERVAL 6 DAY),  'PASSED'),
 (11,1,'APTITUDE',  DATE_ADD(CURDATE(), INTERVAL 3 DAY),  'PENDING'),
 (13,1,'TECHNICAL', DATE_SUB(CURDATE(), INTERVAL 10 DAY), 'PASSED'),
 (14,1,'TECHNICAL', DATE_SUB(CURDATE(), INTERVAL 14 DAY), 'PASSED'),
 (14,2,'HR',        DATE_SUB(CURDATE(), INTERVAL 12 DAY), 'PASSED'),
 (17,1,'APTITUDE',  DATE_SUB(CURDATE(), INTERVAL 5 DAY),  'PASSED'),
 (17,2,'TECHNICAL', DATE_SUB(CURDATE(), INTERVAL 3 DAY),  'PASSED'),
 (19,1,'TECHNICAL', DATE_SUB(CURDATE(), INTERVAL 11 DAY), 'PASSED');

-- a failed round REJECTS the application (trigger trg_rounds_after_update)
UPDATE interview_rounds SET result = 'FAILED' WHERE application_id = 8 AND round_no = 1;

-- a plain rejection
UPDATE applications SET status = 'REJECTED' WHERE application_id = 12;

-- offers (applications 4,7,10,13,14,17,19 have all rounds PASSED)
UPDATE applications SET status = 'OFFERED' WHERE application_id IN (4,7,10,13,14,17,19);

-- accepted offers: the trigger creates the placement, sets is_placed and uses an opening
UPDATE applications SET status = 'ACCEPTED' WHERE application_id IN (4,13,14,19);

-- the placed students' other applications are withdrawn (what sp_accept_offer does)
UPDATE applications SET status = 'WITHDRAWN' WHERE application_id IN (5,6,15,16);

TRUNCATE TABLE audit_log;
