-- =====================================================================
--  PlaceGraph  |  02_triggers.sql
--  Triggers fire AUTOMATICALLY when the named operation happens.
--  Notes: a trigger may not modify the table of the statement that fired it, so
--  withdrawing a student's other applications is done in sp_accept_offer.
--  Rows removed by a FOREIGN KEY CASCADE do not fire triggers in MySQL, hence
--  trg_students_before_delete restores job openings explicitly.
-- =====================================================================
USE placegraph;

DELIMITER $$

-- =====================================================================
-- APPLICATIONS
-- =====================================================================

-- Eligibility guard: placed students, low CGPA, expired deadline, no openings.
CREATE TRIGGER trg_applications_before_insert
BEFORE INSERT ON applications
FOR EACH ROW
BEGIN
    DECLARE v_cgpa     DECIMAL(4,2);
    DECLARE v_placed   TINYINT;
    DECLARE v_min      DECIMAL(4,2);
    DECLARE v_deadline DATE;
    DECLARE v_open     INT;

    SELECT cgpa, is_placed INTO v_cgpa, v_placed FROM students WHERE student_id = NEW.student_id;
    SELECT min_cgpa, deadline, openings INTO v_min, v_deadline, v_open FROM jobs WHERE job_id = NEW.job_id;

    IF v_placed = 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student is already placed and cannot apply again';
    END IF;
    IF v_cgpa < v_min THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Not eligible: CGPA is below the minimum required for this job';
    END IF;
    IF v_deadline < CURDATE() THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'The application deadline for this job has passed';
    END IF;
    IF v_open <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This job has no openings left';
    END IF;
END$$

CREATE TRIGGER trg_applications_after_insert
AFTER INSERT ON applications
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, action, record_id, new_data)
    VALUES ('applications', 'INSERT', NEW.application_id,
            JSON_OBJECT('student_id', NEW.student_id, 'job_id', NEW.job_id, 'status', NEW.status));
END$$

-- Status-flow guard: closed applications are frozen, ACCEPTED only after an OFFER.
CREATE TRIGGER trg_applications_before_update
BEFORE UPDATE ON applications
FOR EACH ROW
BEGIN
    IF OLD.status IN ('ACCEPTED','REJECTED','WITHDRAWN') AND NEW.status <> OLD.status THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This application is closed and its status cannot change';
    END IF;
    IF NEW.status = 'ACCEPTED' AND OLD.status <> 'OFFERED' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only an application with an OFFER can be accepted';
    END IF;
END$$

-- When an offer is ACCEPTED: create the placement, mark the student placed,
-- use up one opening, and write the audit row.
CREATE TRIGGER trg_applications_after_update
AFTER UPDATE ON applications
FOR EACH ROW
BEGIN
    IF NEW.status = 'ACCEPTED' AND OLD.status <> 'ACCEPTED' THEN
        INSERT INTO placements (student_id, application_id, job_id, package_lpa, placed_on)
        SELECT NEW.student_id, NEW.application_id, NEW.job_id, j.package_lpa, CURDATE()
        FROM   jobs j WHERE j.job_id = NEW.job_id;

        UPDATE students SET is_placed = 1 WHERE student_id = NEW.student_id;
        UPDATE jobs     SET openings = openings - 1 WHERE job_id = NEW.job_id;
    END IF;

    INSERT INTO audit_log (table_name, action, record_id, old_data, new_data)
    VALUES ('applications',
            IF(NEW.status = 'ACCEPTED' AND OLD.status <> 'ACCEPTED', 'PLACED', 'STATUS_CHANGE'),
            NEW.application_id,
            JSON_OBJECT('status', OLD.status),
            JSON_OBJECT('status', NEW.status, 'student_id', NEW.student_id, 'job_id', NEW.job_id));
END$$

CREATE TRIGGER trg_applications_after_delete
AFTER DELETE ON applications
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, action, record_id, old_data)
    VALUES ('applications', 'DELETE', OLD.application_id,
            JSON_OBJECT('student_id', OLD.student_id, 'job_id', OLD.job_id, 'status', OLD.status));
END$$

-- =====================================================================
-- INTERVIEW ROUNDS (weak entity)
-- =====================================================================

-- Rounds can only be scheduled for open applications.
CREATE TRIGGER trg_rounds_before_insert
BEFORE INSERT ON interview_rounds
FOR EACH ROW
BEGIN
    DECLARE v_status VARCHAR(20);
    SELECT status INTO v_status FROM applications WHERE application_id = NEW.application_id;
    IF v_status IN ('ACCEPTED','REJECTED','WITHDRAWN') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot schedule an interview for a closed application';
    END IF;
END$$

-- First round moves the application to INTERVIEW.
CREATE TRIGGER trg_rounds_after_insert
AFTER INSERT ON interview_rounds
FOR EACH ROW
BEGIN
    UPDATE applications SET status = 'INTERVIEW'
    WHERE  application_id = NEW.application_id AND status IN ('APPLIED','SHORTLISTED');

    INSERT INTO audit_log (table_name, action, record_id, new_data)
    VALUES ('interview_rounds', 'INSERT', CONCAT(NEW.application_id, '-', NEW.round_no),
            JSON_OBJECT('round_type', NEW.round_type, 'scheduled_on', NEW.scheduled_on, 'result', NEW.result));
END$$

-- A FAILED round automatically REJECTS the application.
CREATE TRIGGER trg_rounds_after_update
AFTER UPDATE ON interview_rounds
FOR EACH ROW
BEGIN
    IF NEW.result = 'FAILED' AND OLD.result <> 'FAILED' THEN
        UPDATE applications SET status = 'REJECTED'
        WHERE  application_id = NEW.application_id AND status IN ('APPLIED','SHORTLISTED','INTERVIEW');
    END IF;

    INSERT INTO audit_log (table_name, action, record_id, old_data, new_data)
    VALUES ('interview_rounds', 'RESULT', CONCAT(NEW.application_id, '-', NEW.round_no),
            JSON_OBJECT('result', OLD.result), JSON_OBJECT('result', NEW.result));
END$$

-- =====================================================================
-- STUDENTS (audit trail + restore openings before the cascade delete)
-- =====================================================================
CREATE TRIGGER trg_students_after_insert
AFTER INSERT ON students
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, action, record_id, new_data)
    VALUES ('students', 'INSERT', NEW.student_id,
            JSON_OBJECT('name', NEW.name, 'email', NEW.email, 'cgpa', NEW.cgpa));
END$$

CREATE TRIGGER trg_students_after_update
AFTER UPDATE ON students
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, action, record_id, old_data, new_data)
    VALUES ('students', 'UPDATE', NEW.student_id,
            JSON_OBJECT('name', OLD.name, 'cgpa', OLD.cgpa, 'is_placed', OLD.is_placed),
            JSON_OBJECT('name', NEW.name, 'cgpa', NEW.cgpa, 'is_placed', NEW.is_placed));
END$$

CREATE TRIGGER trg_students_before_delete
BEFORE DELETE ON students
FOR EACH ROW
BEGIN
    -- nested query: a placed student who is removed gives the opening back
    UPDATE jobs
    SET    openings = openings + 1
    WHERE  job_id IN (SELECT job_id FROM placements WHERE student_id = OLD.student_id);

    INSERT INTO audit_log (table_name, action, record_id, old_data)
    VALUES ('students', 'DELETE', OLD.student_id,
            JSON_OBJECT('name', OLD.name, 'email', OLD.email, 'is_placed', OLD.is_placed));
END$$

-- =====================================================================
-- JOBS (audit trail; openings changes made by placements show up here too)
-- =====================================================================
CREATE TRIGGER trg_jobs_after_insert
AFTER INSERT ON jobs
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, action, record_id, new_data)
    VALUES ('jobs', 'INSERT', NEW.job_id,
            JSON_OBJECT('title', NEW.title, 'company_id', NEW.company_id, 'package_lpa', NEW.package_lpa, 'openings', NEW.openings));
END$$

CREATE TRIGGER trg_jobs_after_update
AFTER UPDATE ON jobs
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, action, record_id, old_data, new_data)
    VALUES ('jobs', 'UPDATE', NEW.job_id,
            JSON_OBJECT('title', OLD.title, 'package_lpa', OLD.package_lpa, 'openings', OLD.openings),
            JSON_OBJECT('title', NEW.title, 'package_lpa', NEW.package_lpa, 'openings', NEW.openings));
END$$

CREATE TRIGGER trg_jobs_after_delete
AFTER DELETE ON jobs
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, action, record_id, old_data)
    VALUES ('jobs', 'DELETE', OLD.job_id, JSON_OBJECT('title', OLD.title, 'company_id', OLD.company_id));
END$$

-- =====================================================================
-- USERS (database-level validation of the role / student link)
-- =====================================================================
CREATE TRIGGER trg_users_before_insert
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
    IF NEW.role = 'student' AND NEW.student_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A student account must be linked to a student record';
    END IF;
    IF NEW.role = 'officer' AND NEW.student_id IS NOT NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'An officer account must not be linked to a student record';
    END IF;
END$$

CREATE TRIGGER trg_users_before_update
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
    IF NEW.role = 'student' AND NEW.student_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A student account must be linked to a student record';
    END IF;
    IF NEW.role = 'officer' AND NEW.student_id IS NOT NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'An officer account must not be linked to a student record';
    END IF;
END$$

DELIMITER ;
