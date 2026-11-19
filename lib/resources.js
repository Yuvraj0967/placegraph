// Declarative description of every resource exposed by the app.
// `base` is the SELECT used for lists AND for re-reading a row after a write
// (that re-read is what gets projected into Neo4j).

const skillIds = (alias, link, key) =>
  `(SELECT JSON_ARRAYAGG(x.skill_id) FROM ${link} x WHERE x.${key} = ${alias}.${key}) AS skill_ids`;
const skillNames = (alias, link, key) =>
  `(SELECT GROUP_CONCAT(k.name ORDER BY k.name SEPARATOR ', ') FROM ${link} x JOIN skills k ON k.skill_id = x.skill_id WHERE x.${key} = ${alias}.${key}) AS skills`;

export const resources = {
  departments: {
    table: 'departments', pk: 'dept_id', alias: 'd',
    fields: ['code', 'name'], required: ['code', 'name'],
    base: 'SELECT d.*, (SELECT COUNT(*) FROM students s WHERE s.dept_id = d.dept_id) AS students FROM departments d',
  },
  skills: {
    table: 'skills', pk: 'skill_id', alias: 'k',
    fields: ['name'], required: ['name'],
    base: `SELECT k.*, (SELECT COUNT(*) FROM student_skills x WHERE x.skill_id = k.skill_id) AS students,
                      (SELECT COUNT(*) FROM job_skills x WHERE x.skill_id = k.skill_id) AS jobs
           FROM skills k`,
  },
  companies: {
    table: 'companies', pk: 'company_id', alias: 'c',
    fields: ['name', 'industry', 'location'], required: ['name'],
    search: ['c.name', 'c.industry', 'c.location'],
    base: 'SELECT c.*, (SELECT COUNT(*) FROM jobs j WHERE j.company_id = c.company_id) AS jobs FROM companies c',
  },
  students: {
    table: 'students', pk: 'student_id', alias: 's',
    fields: ['name', 'email', 'dept_id', 'cgpa', 'grad_year'],
    search: ['s.name', 's.email'], filters: { placed: 's.is_placed' }, scopeCol: 's.student_id',
    required: ['name', 'email', 'dept_id', 'cgpa', 'grad_year'],
    numeric: ['dept_id', 'cgpa', 'grad_year'],
    links: { table: 'student_skills', key: 'student_id' },
    base: `SELECT s.*, d.code AS dept_code, d.name AS dept_name,
             ${skillIds('s', 'student_skills', 'student_id')},
             ${skillNames('s', 'student_skills', 'student_id')},
             (SELECT COUNT(*) FROM applications a WHERE a.student_id = s.student_id) AS applications
           FROM students s JOIN departments d ON d.dept_id = s.dept_id`,
  },
  jobs: {
    table: 'jobs', pk: 'job_id', alias: 'j',
    fields: ['company_id', 'title', 'package_lpa', 'min_cgpa', 'openings', 'deadline'],
    search: ['j.title'], filters: { company_id: 'j.company_id' },
    required: ['company_id', 'title', 'package_lpa', 'deadline'],
    numeric: ['company_id', 'package_lpa', 'min_cgpa', 'openings'],
    links: { table: 'job_skills', key: 'job_id' },
    base: `SELECT j.*, c.name AS company_name,
             ${skillIds('j', 'job_skills', 'job_id')},
             ${skillNames('j', 'job_skills', 'job_id')},
             (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.job_id) AS applications,
             (j.deadline < CURDATE()) AS expired
           FROM jobs j JOIN companies c ON c.company_id = j.company_id`,
  },
  applications: {
    table: 'applications', pk: 'application_id', alias: 'a', fields: [],
    search: ['s.name', 'j.title', 'c.name'], filters: { status: 'a.status' }, scopeCol: 'a.student_id',
    base: `SELECT a.*, s.name AS student_name, s.cgpa, j.title AS job_title, c.name AS company_name, j.package_lpa,
             (SELECT COUNT(*) FROM interview_rounds r WHERE r.application_id = a.application_id) AS rounds
           FROM applications a
           JOIN students s  ON s.student_id = a.student_id
           JOIN jobs j      ON j.job_id = a.job_id
           JOIN companies c ON c.company_id = j.company_id`,
  },
  // composite key (application_id, round_no): the id used by the API is "12-1"
  rounds: {
    table: 'interview_rounds', alias: 'r', fields: [], composite: true,
    search: ['s.name', 'j.title'], filters: { result: 'r.result' }, scopeCol: 'a.student_id',
    base: `SELECT CONCAT(r.application_id, '-', r.round_no) AS \`key\`, r.*, s.name AS student_name,
             j.title AS job_title, c.name AS company_name, a.status AS application_status
           FROM interview_rounds r
           JOIN applications a ON a.application_id = r.application_id
           JOIN students s     ON s.student_id = a.student_id
           JOIN jobs j         ON j.job_id = a.job_id
           JOIN companies c    ON c.company_id = j.company_id`,
    order: 'r.application_id DESC, r.round_no',
  },
  // read-only: rows are created by the trigger when an offer is accepted
  placements: {
    table: 'placements', pk: 'student_id', alias: 'p', fields: [], readOnly: true, scopeCol: 'p.student_id',
    search: ['s.name', 'c.name', 'j.title'],
    base: `SELECT p.*, s.name AS student_name, d.code AS dept_code, j.title AS job_title, j.company_id, c.name AS company_name
           FROM placements p
           JOIN students s    ON s.student_id = p.student_id
           JOIN departments d ON d.dept_id = s.dept_id
           JOIN jobs j        ON j.job_id = p.job_id
           JOIN companies c   ON c.company_id = j.company_id`,
    order: 'p.placed_on DESC, p.student_id',
  },
};

/** Tables the Inspector page may show (whitelist, never user-built SQL). */
export const inspectable = {
  departments: 'SELECT * FROM departments ORDER BY 1',
  students: 'SELECT * FROM students ORDER BY 1',
  companies: 'SELECT * FROM companies ORDER BY 1',
  jobs: 'SELECT * FROM jobs ORDER BY 1',
  skills: 'SELECT * FROM skills ORDER BY 1',
  student_skills: 'SELECT * FROM student_skills ORDER BY 1, 2',
  job_skills: 'SELECT * FROM job_skills ORDER BY 1, 2',
  applications: 'SELECT * FROM applications ORDER BY 1',
  interview_rounds: 'SELECT * FROM interview_rounds ORDER BY 1, 2',
  placements: 'SELECT * FROM placements ORDER BY 1',
  users: 'SELECT user_id, email, role, student_id, created_at FROM users ORDER BY 1',
  v_job_pipeline: 'SELECT * FROM v_job_pipeline ORDER BY job_id',
  audit_log: 'SELECT * FROM audit_log ORDER BY 1 DESC LIMIT 100',
  v_placement_summary: 'SELECT * FROM v_placement_summary',
  triggers: `SELECT TRIGGER_NAME AS name, ACTION_TIMING AS timing, EVENT_MANIPULATION AS event,
                    EVENT_OBJECT_TABLE AS on_table
             FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE() ORDER BY on_table, name`,
  procedures: `SELECT ROUTINE_NAME AS name, ROUTINE_TYPE AS type, CREATED AS created
               FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE() ORDER BY name`,
};
