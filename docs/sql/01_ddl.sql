-- =====================================================================
--  PlaceGraph  |  01_ddl.sql  |  DATA DEFINITION LANGUAGE
--  CREATE / ALTER / DROP statements that define the database structure.
--  Engine: MySQL 8.4
-- =====================================================================

DROP DATABASE IF EXISTS placegraph;
CREATE DATABASE placegraph CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE placegraph;

-- ---------------------------------------------------------------------
-- 1. departments  (STRONG entity)
-- ---------------------------------------------------------------------
CREATE TABLE departments (
    dept_id INT         NOT NULL AUTO_INCREMENT,
    code    VARCHAR(10) NOT NULL,
    name    VARCHAR(80) NOT NULL,
    CONSTRAINT pk_departments PRIMARY KEY (dept_id),
    CONSTRAINT uq_departments_code UNIQUE (code)
);

-- ---------------------------------------------------------------------
-- 2. students  (STRONG entity)      departments 1 --- N students
-- ---------------------------------------------------------------------
CREATE TABLE students (
    student_id INT           NOT NULL AUTO_INCREMENT,
    name       VARCHAR(100)  NOT NULL,
    email      VARCHAR(120)  NOT NULL,
    dept_id    INT           NOT NULL,
    cgpa       DECIMAL(4,2)  NOT NULL,
    grad_year  SMALLINT      NOT NULL,
    is_placed  TINYINT(1)    NOT NULL DEFAULT 0,
    CONSTRAINT pk_students       PRIMARY KEY (student_id),
    CONSTRAINT uq_students_email UNIQUE (email),
    CONSTRAINT chk_students_cgpa CHECK (cgpa BETWEEN 0 AND 10),
    CONSTRAINT fk_students_dept  FOREIGN KEY (dept_id)
        REFERENCES departments (dept_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ---------------------------------------------------------------------
-- 3. companies  (STRONG entity)
-- ---------------------------------------------------------------------
CREATE TABLE companies (
    company_id INT          NOT NULL AUTO_INCREMENT,
    name       VARCHAR(100) NOT NULL,
    industry   VARCHAR(60)  NULL,
    location   VARCHAR(60)  NULL,
    CONSTRAINT pk_companies PRIMARY KEY (company_id),
    CONSTRAINT uq_companies_name UNIQUE (name)
);

-- ---------------------------------------------------------------------
-- 4. jobs  (STRONG entity: own surrogate key job_id)   companies 1 --- N jobs
-- ---------------------------------------------------------------------
CREATE TABLE jobs (
    job_id      INT           NOT NULL AUTO_INCREMENT,
    company_id  INT           NOT NULL,
    title       VARCHAR(100)  NOT NULL,
    package_lpa DECIMAL(5,2)  NOT NULL,
    min_cgpa    DECIMAL(4,2)  NOT NULL DEFAULT 0.00,
    openings    INT           NOT NULL DEFAULT 1,
    deadline    DATE          NOT NULL,
    CONSTRAINT pk_jobs          PRIMARY KEY (job_id),
    CONSTRAINT chk_jobs_package CHECK (package_lpa > 0),
    CONSTRAINT chk_jobs_open    CHECK (openings >= 0),
    CONSTRAINT fk_jobs_company  FOREIGN KEY (company_id)
        REFERENCES companies (company_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ---------------------------------------------------------------------
-- 5. skills  (STRONG entity)
-- ---------------------------------------------------------------------
CREATE TABLE skills (
    skill_id INT         NOT NULL AUTO_INCREMENT,
    name     VARCHAR(60) NOT NULL,
    CONSTRAINT pk_skills PRIMARY KEY (skill_id),
    CONSTRAINT uq_skills_name UNIQUE (name)
);

-- ---------------------------------------------------------------------
-- 6. student_skills  (M:N students <-> skills)
-- ---------------------------------------------------------------------
CREATE TABLE student_skills (
    student_id INT NOT NULL,
    skill_id   INT NOT NULL,
    CONSTRAINT pk_student_skills PRIMARY KEY (student_id, skill_id),
    CONSTRAINT fk_ss_student FOREIGN KEY (student_id) REFERENCES students (student_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ss_skill   FOREIGN KEY (skill_id)   REFERENCES skills (skill_id)     ON DELETE CASCADE ON UPDATE CASCADE
);

-- ---------------------------------------------------------------------
-- 7. job_skills  (M:N jobs <-> skills: what a job requires)
-- ---------------------------------------------------------------------
CREATE TABLE job_skills (
    job_id   INT NOT NULL,
    skill_id INT NOT NULL,
    CONSTRAINT pk_job_skills PRIMARY KEY (job_id, skill_id),
    CONSTRAINT fk_js_job   FOREIGN KEY (job_id)   REFERENCES jobs (job_id)     ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_js_skill FOREIGN KEY (skill_id) REFERENCES skills (skill_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- ---------------------------------------------------------------------
-- 8. applications  (a student applies for a job: students N --- M jobs,
--    modelled as its own entity with a surrogate key)
-- ---------------------------------------------------------------------
CREATE TABLE applications (
    application_id INT NOT NULL AUTO_INCREMENT,
    student_id     INT NOT NULL,
    job_id         INT NOT NULL,
    applied_on     DATE NOT NULL DEFAULT (CURRENT_DATE),
    status ENUM('APPLIED','SHORTLISTED','INTERVIEW','OFFERED','ACCEPTED','REJECTED','WITHDRAWN') NOT NULL DEFAULT 'APPLIED',
    CONSTRAINT pk_applications PRIMARY KEY (application_id),
    CONSTRAINT uq_applications_pair UNIQUE (student_id, job_id),
    CONSTRAINT fk_app_student FOREIGN KEY (student_id) REFERENCES students (student_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_app_job     FOREIGN KEY (job_id)     REFERENCES jobs (job_id)         ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ---------------------------------------------------------------------
-- 9. interview_rounds  (WEAK entity)
--    A round has no identity without its application: round_no (partial key)
--    is only unique WITHIN one application. Identifying owner = applications,
--    so the primary key is (application_id, round_no) and a round is deleted
--    with its application (ON DELETE CASCADE).
-- ---------------------------------------------------------------------
CREATE TABLE interview_rounds (
    application_id INT NOT NULL,
    round_no       INT NOT NULL,
    round_type     ENUM('APTITUDE','TECHNICAL','HR') NOT NULL,
    scheduled_on   DATE NOT NULL,
    result         ENUM('PENDING','PASSED','FAILED') NOT NULL DEFAULT 'PENDING',
    CONSTRAINT pk_interview_rounds PRIMARY KEY (application_id, round_no),
    CONSTRAINT fk_rounds_application FOREIGN KEY (application_id)
        REFERENCES applications (application_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- ---------------------------------------------------------------------
-- 10. placements  (created automatically by a trigger when an offer is accepted;
--     student_id is the PK because a student can be placed only once)
-- ---------------------------------------------------------------------
CREATE TABLE placements (
    student_id     INT          NOT NULL,
    application_id INT          NOT NULL,
    job_id         INT          NOT NULL,
    package_lpa    DECIMAL(5,2) NOT NULL,
    placed_on      DATE         NOT NULL,
    CONSTRAINT pk_placements PRIMARY KEY (student_id),
    CONSTRAINT uq_placements_application UNIQUE (application_id),
    CONSTRAINT fk_pl_student     FOREIGN KEY (student_id)     REFERENCES students (student_id)         ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_pl_application FOREIGN KEY (application_id) REFERENCES applications (application_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_pl_job         FOREIGN KEY (job_id)         REFERENCES jobs (job_id)                 ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ---------------------------------------------------------------------
-- 11. audit_log  (filled automatically by triggers)
-- ---------------------------------------------------------------------
CREATE TABLE audit_log (
    audit_id   BIGINT      NOT NULL AUTO_INCREMENT,
    table_name VARCHAR(40) NOT NULL,
    action     VARCHAR(20) NOT NULL,
    record_id  VARCHAR(40) NOT NULL,
    old_data   JSON        NULL,
    new_data   JSON        NULL,
    changed_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_audit_log PRIMARY KEY (audit_id)
);

-- ---------------------------------------------------------------------
-- 12. users  (login accounts; two domain roles)
--     officer = placement officer (full access), student = limited to own data.
--     The role/student link rule is enforced by triggers (see 02_triggers.sql).
--     password_hash holds a bcrypt hash, never a plain password.
-- ---------------------------------------------------------------------
CREATE TABLE users (
    user_id       INT          NOT NULL AUTO_INCREMENT,
    email         VARCHAR(120) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    role          ENUM('officer','student') NOT NULL,
    student_id    INT          NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_users PRIMARY KEY (user_id),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT uq_users_student UNIQUE (student_id),
    CONSTRAINT fk_users_student FOREIGN KEY (student_id)
        REFERENCES students (student_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- ---------------------------------------------------------------------
-- ALTER TABLE examples (modify the structure after creation)
-- ---------------------------------------------------------------------
ALTER TABLE students     ADD INDEX idx_students_cgpa (cgpa);
ALTER TABLE jobs         ADD INDEX idx_jobs_deadline (deadline);
ALTER TABLE applications ADD INDEX idx_app_status (status);
ALTER TABLE students     ADD COLUMN phone VARCHAR(20) NULL AFTER email;
ALTER TABLE students     MODIFY COLUMN phone VARCHAR(25) NULL;
ALTER TABLE students     DROP COLUMN phone;
ALTER TABLE students     ADD CONSTRAINT chk_students_year CHECK (grad_year BETWEEN 2000 AND 2100);

-- Full-text indexes power the search boxes (MATCH ... AGAINST in the API)
ALTER TABLE students  ADD FULLTEXT INDEX ft_students_text  (name, email);
ALTER TABLE jobs      ADD FULLTEXT INDEX ft_jobs_title     (title);
ALTER TABLE companies ADD FULLTEXT INDEX ft_companies_text (name, industry, location);

-- ---------------------------------------------------------------------
-- DROP example on a scratch table
-- ---------------------------------------------------------------------
CREATE TABLE scratch_demo (id INT PRIMARY KEY, note VARCHAR(30));
DROP TABLE scratch_demo;

-- ---------------------------------------------------------------------
-- VIEW: placement summary per department (used on the dashboard)
-- ---------------------------------------------------------------------
CREATE VIEW v_placement_summary AS
SELECT d.code,
       d.name,
       COUNT(s.student_id)                                           AS total_students,
       IFNULL(SUM(s.is_placed), 0)                                   AS placed,
       ROUND(100 * IFNULL(SUM(s.is_placed), 0) / NULLIF(COUNT(s.student_id), 0), 1) AS placement_pct,
       ROUND(AVG(p.package_lpa), 2)                                  AS avg_package_lpa
FROM   departments d
LEFT JOIN students   s ON s.dept_id = d.dept_id
LEFT JOIN placements p ON p.student_id = s.student_id
GROUP  BY d.dept_id, d.code, d.name;

-- ---------------------------------------------------------------------
-- VIEW: application pipeline per job (counts per status)
-- ---------------------------------------------------------------------
CREATE VIEW v_job_pipeline AS
SELECT j.job_id,
       j.title,
       c.name                                   AS company,
       j.openings,
       COUNT(a.application_id)                  AS applications,
       IFNULL(SUM(a.status = 'SHORTLISTED'), 0) AS shortlisted,
       IFNULL(SUM(a.status = 'INTERVIEW'), 0)   AS in_interview,
       IFNULL(SUM(a.status = 'OFFERED'), 0)     AS offered,
       IFNULL(SUM(a.status = 'ACCEPTED'), 0)    AS accepted
FROM   jobs j
JOIN   companies c ON c.company_id = j.company_id
LEFT JOIN applications a ON a.job_id = j.job_id
GROUP  BY j.job_id, j.title, c.name, j.openings;
