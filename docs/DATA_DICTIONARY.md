# Data dictionary

Generated from the installed MySQL catalog (`information_schema`) by `npm run db:dictionary` on 2026-11-19. Do not edit by hand; re-run the script after schema changes.

## applications

| Column | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| application_id | int | NO | PRI |  | auto_increment |
| student_id | int | NO | MUL |  |  |
| job_id | int | NO | MUL |  |  |
| applied_on | date | NO |  | curdate() | DEFAULT_GENERATED |
| status | enum('APPLIED','SHORTLISTED','INTERVIEW','OFFERED','ACCEPTED','REJECTED','WITHDRAWN') | NO | MUL | APPLIED |  |

Foreign keys

| Name | Columns | References | On delete | On update |
|---|---|---|---|---|
| fk_app_job | job_id | jobs(job_id) | RESTRICT | CASCADE |
| fk_app_student | student_id | students(student_id) | CASCADE | CASCADE |

Indexes

| Name | Columns | Unique | Type |
|---|---|---|---|
| fk_app_job | job_id | non-unique | BTREE |
| idx_app_status | status | non-unique | BTREE |
| PRIMARY | application_id | unique | BTREE |
| uq_applications_pair | student_id,job_id | unique | BTREE |

## audit_log

| Column | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| audit_id | bigint | NO | PRI |  | auto_increment |
| table_name | varchar(40) | NO |  |  |  |
| action | varchar(20) | NO |  |  |  |
| record_id | varchar(40) | NO |  |  |  |
| old_data | json | YES |  |  |  |
| new_data | json | YES |  |  |  |
| changed_at | timestamp | NO |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

Indexes

| Name | Columns | Unique | Type |
|---|---|---|---|
| PRIMARY | audit_id | unique | BTREE |

## companies

| Column | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| company_id | int | NO | PRI |  | auto_increment |
| name | varchar(100) | NO | UNI |  |  |
| industry | varchar(60) | YES |  |  |  |
| location | varchar(60) | YES |  |  |  |

Indexes

| Name | Columns | Unique | Type |
|---|---|---|---|
| ft_companies_text | name,industry,location | non-unique | FULLTEXT |
| PRIMARY | company_id | unique | BTREE |
| uq_companies_name | name | unique | BTREE |

## departments

| Column | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| dept_id | int | NO | PRI |  | auto_increment |
| code | varchar(10) | NO | UNI |  |  |
| name | varchar(80) | NO |  |  |  |

Indexes

| Name | Columns | Unique | Type |
|---|---|---|---|
| PRIMARY | dept_id | unique | BTREE |
| uq_departments_code | code | unique | BTREE |

## interview_rounds

| Column | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| application_id | int | NO | PRI |  |  |
| round_no | int | NO | PRI |  |  |
| round_type | enum('APTITUDE','TECHNICAL','HR') | NO |  |  |  |
| scheduled_on | date | NO |  |  |  |
| result | enum('PENDING','PASSED','FAILED') | NO |  | PENDING |  |

Foreign keys

| Name | Columns | References | On delete | On update |
|---|---|---|---|---|
| fk_rounds_application | application_id | applications(application_id) | CASCADE | CASCADE |

Indexes

| Name | Columns | Unique | Type |
|---|---|---|---|
| PRIMARY | application_id,round_no | unique | BTREE |

## job_skills

| Column | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| job_id | int | NO | PRI |  |  |
| skill_id | int | NO | PRI |  |  |

Foreign keys

| Name | Columns | References | On delete | On update |
|---|---|---|---|---|
| fk_js_job | job_id | jobs(job_id) | CASCADE | CASCADE |
| fk_js_skill | skill_id | skills(skill_id) | CASCADE | CASCADE |

Indexes

| Name | Columns | Unique | Type |
|---|---|---|---|
| fk_js_skill | skill_id | non-unique | BTREE |
| PRIMARY | job_id,skill_id | unique | BTREE |

## jobs

| Column | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| job_id | int | NO | PRI |  | auto_increment |
| company_id | int | NO | MUL |  |  |
| title | varchar(100) | NO | MUL |  |  |
| package_lpa | decimal(5,2) | NO |  |  |  |
| min_cgpa | decimal(4,2) | NO |  | 0.00 |  |
| openings | int | NO |  | 1 |  |
| deadline | date | NO | MUL |  |  |

Foreign keys

| Name | Columns | References | On delete | On update |
|---|---|---|---|---|
| fk_jobs_company | company_id | companies(company_id) | RESTRICT | CASCADE |

CHECK constraints

| Name | Rule |
|---|---|
| chk_jobs_open | (`openings` >= 0) |
| chk_jobs_package | (`package_lpa` > 0) |

Indexes

| Name | Columns | Unique | Type |
|---|---|---|---|
| fk_jobs_company | company_id | non-unique | BTREE |
| ft_jobs_title | title | non-unique | FULLTEXT |
| idx_jobs_deadline | deadline | non-unique | BTREE |
| PRIMARY | job_id | unique | BTREE |

## placements

| Column | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| student_id | int | NO | PRI |  |  |
| application_id | int | NO | UNI |  |  |
| job_id | int | NO | MUL |  |  |
| package_lpa | decimal(5,2) | NO |  |  |  |
| placed_on | date | NO |  |  |  |

Foreign keys

| Name | Columns | References | On delete | On update |
|---|---|---|---|---|
| fk_pl_application | application_id | applications(application_id) | CASCADE | CASCADE |
| fk_pl_job | job_id | jobs(job_id) | RESTRICT | CASCADE |
| fk_pl_student | student_id | students(student_id) | CASCADE | CASCADE |

Indexes

| Name | Columns | Unique | Type |
|---|---|---|---|
| fk_pl_job | job_id | non-unique | BTREE |
| PRIMARY | student_id | unique | BTREE |
| uq_placements_application | application_id | unique | BTREE |

## skills

| Column | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| skill_id | int | NO | PRI |  | auto_increment |
| name | varchar(60) | NO | UNI |  |  |

Indexes

| Name | Columns | Unique | Type |
|---|---|---|---|
| PRIMARY | skill_id | unique | BTREE |
| uq_skills_name | name | unique | BTREE |

## student_skills

| Column | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| student_id | int | NO | PRI |  |  |
| skill_id | int | NO | PRI |  |  |

Foreign keys

| Name | Columns | References | On delete | On update |
|---|---|---|---|---|
| fk_ss_skill | skill_id | skills(skill_id) | CASCADE | CASCADE |
| fk_ss_student | student_id | students(student_id) | CASCADE | CASCADE |

Indexes

| Name | Columns | Unique | Type |
|---|---|---|---|
| fk_ss_skill | skill_id | non-unique | BTREE |
| PRIMARY | student_id,skill_id | unique | BTREE |

## students

| Column | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| student_id | int | NO | PRI |  | auto_increment |
| name | varchar(100) | NO | MUL |  |  |
| email | varchar(120) | NO | UNI |  |  |
| dept_id | int | NO | MUL |  |  |
| cgpa | decimal(4,2) | NO | MUL |  |  |
| grad_year | smallint | NO |  |  |  |
| is_placed | tinyint(1) | NO |  | 0 |  |

Foreign keys

| Name | Columns | References | On delete | On update |
|---|---|---|---|---|
| fk_students_dept | dept_id | departments(dept_id) | RESTRICT | CASCADE |

CHECK constraints

| Name | Rule |
|---|---|
| chk_students_cgpa | (`cgpa` between 0 and 10) |
| chk_students_year | (`grad_year` between 2000 and 2100) |

Indexes

| Name | Columns | Unique | Type |
|---|---|---|---|
| fk_students_dept | dept_id | non-unique | BTREE |
| ft_students_text | name,email | non-unique | FULLTEXT |
| idx_students_cgpa | cgpa | non-unique | BTREE |
| PRIMARY | student_id | unique | BTREE |
| uq_students_email | email | unique | BTREE |

## users

| Column | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| user_id | int | NO | PRI |  | auto_increment |
| email | varchar(120) | NO | UNI |  |  |
| password_hash | varchar(100) | NO |  |  |  |
| role | enum('officer','student') | NO |  |  |  |
| student_id | int | YES | UNI |  |  |
| created_at | timestamp | NO |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

Foreign keys

| Name | Columns | References | On delete | On update |
|---|---|---|---|---|
| fk_users_student | student_id | students(student_id) | CASCADE | CASCADE |

Indexes

| Name | Columns | Unique | Type |
|---|---|---|---|
| PRIMARY | user_id | unique | BTREE |
| uq_users_email | email | unique | BTREE |
| uq_users_student | student_id | unique | BTREE |

## Views

- `v_job_pipeline`
- `v_placement_summary`

## Triggers (16)

| Name | Timing | Event | Table |
|---|---|---|---|
| trg_applications_after_delete | AFTER | DELETE | applications |
| trg_applications_after_insert | AFTER | INSERT | applications |
| trg_applications_after_update | AFTER | UPDATE | applications |
| trg_applications_before_insert | BEFORE | INSERT | applications |
| trg_applications_before_update | BEFORE | UPDATE | applications |
| trg_rounds_after_insert | AFTER | INSERT | interview_rounds |
| trg_rounds_after_update | AFTER | UPDATE | interview_rounds |
| trg_rounds_before_insert | BEFORE | INSERT | interview_rounds |
| trg_jobs_after_delete | AFTER | DELETE | jobs |
| trg_jobs_after_insert | AFTER | INSERT | jobs |
| trg_jobs_after_update | AFTER | UPDATE | jobs |
| trg_students_after_insert | AFTER | INSERT | students |
| trg_students_after_update | AFTER | UPDATE | students |
| trg_students_before_delete | BEFORE | DELETE | students |
| trg_users_before_insert | BEFORE | INSERT | users |
| trg_users_before_update | BEFORE | UPDATE | users |

## Stored procedures

- `sp_accept_offer` (PROCEDURE)
- `sp_apply` (PROCEDURE)
- `sp_placement_stats` (PROCEDURE)
- `sp_schedule_round` (PROCEDURE)
- `sp_set_round_result` (PROCEDURE)
- `sp_student_report` (PROCEDURE)
- `sp_update_application_status` (PROCEDURE)

## Totals

12 tables, 2 views, 16 triggers, 7 routines, 37 table constraints (PK, FK, UNIQUE, CHECK).
