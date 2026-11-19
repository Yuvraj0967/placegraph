-- =====================================================================
--  PlaceGraph  |  03_procedures.sql  |  STORED PROCEDURES
--  The website calls these for applying, status changes, interviews and offers.
-- =====================================================================
USE placegraph;

DELIMITER $$

-- ---------------------------------------------------------------------
-- sp_apply: a student applies for a job.
--   Eligibility (CGPA, deadline, openings, not placed) is enforced by the
--   BEFORE INSERT trigger; the procedure adds the duplicate check.
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_apply (
    IN  p_student_id INT,
    IN  p_job_id     INT,
    OUT p_app_id     INT
)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM students WHERE student_id = p_student_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student does not exist';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM jobs WHERE job_id = p_job_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Job does not exist';
    END IF;
    IF EXISTS (SELECT 1 FROM applications WHERE student_id = p_student_id AND job_id = p_job_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'The student has already applied for this job';
    END IF;

    INSERT INTO applications (student_id, job_id) VALUES (p_student_id, p_job_id);
    SET p_app_id = LAST_INSERT_ID();
END$$

-- ---------------------------------------------------------------------
-- sp_update_application_status: SHORTLISTED / OFFERED / REJECTED / WITHDRAWN
--   with the recruitment rules:
--     SHORTLISTED only from APPLIED
--     OFFERED     only from INTERVIEW and only if every round was held and PASSED
--     REJECTED / WITHDRAWN from any open status
--   (ACCEPTED has its own procedure, sp_accept_offer.)
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_update_application_status (
    IN p_app_id INT,
    IN p_status VARCHAR(20)
)
BEGIN
    DECLARE v_status VARCHAR(20);

    SELECT status INTO v_status FROM applications WHERE application_id = p_app_id;
    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Application does not exist';
    END IF;

    IF p_status = 'SHORTLISTED' THEN
        IF v_status <> 'APPLIED' THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only an APPLIED application can be shortlisted';
        END IF;
    ELSEIF p_status = 'OFFERED' THEN
        IF v_status <> 'INTERVIEW' THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'An offer can only be made after the interview stage';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM interview_rounds WHERE application_id = p_app_id)
           OR EXISTS (SELECT 1 FROM interview_rounds WHERE application_id = p_app_id AND result <> 'PASSED') THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Every interview round must be held and PASSED before an offer';
        END IF;
    ELSEIF p_status IN ('REJECTED','WITHDRAWN') THEN
        IF v_status IN ('ACCEPTED','REJECTED','WITHDRAWN') THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This application is already closed';
        END IF;
    ELSE
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unsupported status (use sp_accept_offer to accept)';
    END IF;

    UPDATE applications SET status = p_status WHERE application_id = p_app_id;
END$$

-- ---------------------------------------------------------------------
-- sp_schedule_round: add the next interview round (round_no is generated).
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_schedule_round (
    IN  p_app_id INT,
    IN  p_type   VARCHAR(20),
    IN  p_date   DATE,
    OUT p_round  INT
)
BEGIN
    DECLARE v_status VARCHAR(20);

    SELECT status INTO v_status FROM applications WHERE application_id = p_app_id;
    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Application does not exist';
    END IF;
    IF v_status NOT IN ('SHORTLISTED','INTERVIEW') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only shortlisted candidates can be scheduled for interviews';
    END IF;
    IF EXISTS (SELECT 1 FROM interview_rounds WHERE application_id = p_app_id AND result <> 'PASSED') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'The previous round is not PASSED yet';
    END IF;

    SELECT IFNULL(MAX(round_no), 0) + 1 INTO p_round FROM interview_rounds WHERE application_id = p_app_id;
    INSERT INTO interview_rounds (application_id, round_no, round_type, scheduled_on)
    VALUES (p_app_id, p_round, p_type, p_date);
END$$

-- ---------------------------------------------------------------------
-- sp_set_round_result: record PASSED / FAILED for a round.
--   A FAILED result fires trg_rounds_after_update which rejects the application.
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_set_round_result (
    IN p_app_id INT,
    IN p_round  INT,
    IN p_result VARCHAR(10)
)
BEGIN
    IF p_result NOT IN ('PASSED','FAILED') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Result must be PASSED or FAILED';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM interview_rounds WHERE application_id = p_app_id AND round_no = p_round) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Interview round does not exist';
    END IF;
    UPDATE interview_rounds SET result = p_result
    WHERE  application_id = p_app_id AND round_no = p_round;
END$$

-- ---------------------------------------------------------------------
-- sp_accept_offer: the student accepts. The status change fires the trigger that
-- creates the placement; then every other open application of the student
-- is WITHDRAWN (a trigger cannot do this itself, see the note at the top of 02).
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_accept_offer (IN p_app_id INT)
BEGIN
    DECLARE v_student INT;
    DECLARE v_status  VARCHAR(20);

    SELECT student_id, status INTO v_student, v_status FROM applications WHERE application_id = p_app_id;
    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Application does not exist';
    END IF;
    IF v_status <> 'OFFERED' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only an application with an OFFER can be accepted';
    END IF;

    UPDATE applications SET status = 'ACCEPTED' WHERE application_id = p_app_id;

    UPDATE applications
    SET    status = 'WITHDRAWN'
    WHERE  student_id = v_student
      AND  application_id <> p_app_id
      AND  status IN ('APPLIED','SHORTLISTED','INTERVIEW','OFFERED');
END$$

-- ---------------------------------------------------------------------
-- sp_student_report: one-row summary (nested subqueries).
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_student_report (IN p_student_id INT)
BEGIN
    SELECT s.student_id,
           s.name,
           (SELECT d.code FROM departments d WHERE d.dept_id = s.dept_id)                           AS dept,
           s.cgpa,
           (SELECT COUNT(*) FROM applications a WHERE a.student_id = s.student_id)                    AS applications,
           (SELECT COUNT(*) FROM applications a WHERE a.student_id = s.student_id AND a.status = 'OFFERED') AS pending_offers,
           s.is_placed,
           (SELECT p.package_lpa FROM placements p WHERE p.student_id = s.student_id)                  AS package_lpa
    FROM   students s
    WHERE  s.student_id = p_student_id;
END$$

-- ---------------------------------------------------------------------
-- sp_placement_stats: placement percentage per department plus the overall row.
-- ---------------------------------------------------------------------
CREATE PROCEDURE sp_placement_stats ()
BEGIN
    SELECT code, name, total_students, placed, placement_pct, avg_package_lpa
    FROM   v_placement_summary
    UNION ALL
    SELECT 'ALL', 'All departments',
           (SELECT COUNT(*) FROM students),
           (SELECT COUNT(*) FROM students WHERE is_placed = 1),
           ROUND(100 * (SELECT COUNT(*) FROM students WHERE is_placed = 1) / NULLIF((SELECT COUNT(*) FROM students), 0), 1),
           (SELECT ROUND(AVG(package_lpa), 2) FROM placements);
END$$

DELIMITER ;
