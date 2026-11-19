-- =====================================================================
--  PlaceGraph  |  08_procedure_demo.sql  |  Stored procedure execution
--  Run right after a fresh `npm run db:setup`.
-- =====================================================================
USE placegraph;

-- show the code
SHOW CREATE PROCEDURE sp_accept_offer\G

-- ============ sp_apply (OUT parameter = new application id) ===========
SELECT * FROM applications WHERE student_id = 5;                 -- BEFORE: Kabir has 1 application
CALL sp_apply(5, 2, @app_id);                                    -- EXECUTE: apply for QA Engineer
SELECT @app_id AS new_application_id;
SELECT * FROM applications WHERE student_id = 5;                 -- AFTER: 2 applications
CALL sp_apply(5, 2, @x);                                         -- ERROR: already applied

-- ============ status flow with business rules =========================
CALL sp_update_application_status(@app_id, 'OFFERED');           -- ERROR: offer only after interviews
CALL sp_update_application_status(@app_id, 'SHORTLISTED');       -- ok
SELECT application_id, status FROM applications WHERE application_id = @app_id;

-- ============ sp_schedule_round (round number is generated) ===========
CALL sp_schedule_round(@app_id, 'APTITUDE', DATE_ADD(CURDATE(), INTERVAL 5 DAY), @r);
SELECT @r AS round_no_created;
SELECT * FROM interview_rounds WHERE application_id = @app_id;
SELECT application_id, status FROM applications WHERE application_id = @app_id;   -- INTERVIEW (trigger)
CALL sp_schedule_round(@app_id, 'TECHNICAL', DATE_ADD(CURDATE(), INTERVAL 8 DAY), @r2);  -- ERROR: previous round not PASSED
CALL sp_set_round_result(@app_id, 1, 'PASSED');

-- ============ sp_accept_offer: placement + withdraw other applications =
SELECT application_id, student_id, job_id, status FROM applications WHERE student_id = 11;   -- BEFORE
CALL sp_accept_offer(17);                                        -- Neha accepts Data Analyst
SELECT application_id, student_id, job_id, status FROM applications WHERE student_id = 11;   -- AFTER: 17 ACCEPTED, 18 WITHDRAWN
SELECT * FROM placements WHERE student_id = 11;

-- ============ report procedures (nested subqueries / UNION) ===========
CALL sp_student_report(3);
CALL sp_placement_stats();
