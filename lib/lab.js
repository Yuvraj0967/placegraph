// Trigger & Procedure Lab: runs the demonstrations mam asked for, inside the app.
//   1) show the code  2) show BEFORE  3) fire it  4) show AFTER  5) explain
import { pool, format } from './db.js';
import { HttpError, friendly, resyncGraph } from './core.js';

const AUDIT = ['audit_log (latest 5 rows)', 'SELECT audit_id, table_name, action, record_id, old_data, new_data FROM audit_log ORDER BY audit_id DESC LIMIT 5', () => []];
const appRow = ['the application', 'SELECT application_id, student_id, job_id, status FROM applications WHERE application_id = ?', (p) => [p.application_id]];
const ofApp = (cols, table, key) => `SELECT ${cols} FROM ${table} WHERE ${key} = (SELECT ${key} FROM applications WHERE application_id = ?)`;
const studentOfApp = ['the student', ofApp('student_id, name, cgpa, is_placed', 'students', 'student_id'), (p) => [p.application_id]];
const jobOfApp = ['the job (openings)', ofApp('job_id, title, openings', 'jobs', 'job_id'), (p) => [p.application_id]];
const placementOfApp = ['placements for this student', ofApp('*', 'placements', 'student_id'), (p) => [p.application_id]];
const roundKey = (p) => String(p.round_key ?? '').split('-').map(Number);

const studentSel = { name: 'student_id', label: 'Student', from: 'students' };
const unplacedSel = { name: 'student_id', label: 'Student (not placed)', from: 'students', filter: 'unplaced' };
const jobSel = { name: 'job_id', label: 'Job (open)', from: 'jobs', filter: 'open' };
const appSel = (label, filter) => ({ name: 'application_id', label, from: 'applications', filter });

const inDays = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

export const scenarios = {
  app_insert: {
    kind: 'TRIGGER', title: 'Apply for a job: INSERT on applications', object: 'trg_applications_before_insert',
    explain: 'The BEFORE INSERT trigger checks eligibility (not already placed, CGPA at least the job minimum, deadline not passed, openings left) and raises an error if any rule fails, so nothing is inserted. If all pass, the AFTER INSERT trigger writes an audit row. Try Arjun Reddy (CGPA 6.8) with Software Engineer (minimum 7.5) to see the guard reject it.',
    params: [unplacedSel, jobSel], defaults: { student_id: 6, job_id: 6 },
    watch: [['applications (latest 3)', 'SELECT application_id, student_id, job_id, status FROM applications ORDER BY application_id DESC LIMIT 3', () => []], AUDIT],
    async run(conn, p, sql) {
      const q = 'INSERT INTO applications (student_id, job_id) VALUES (?, ?)';
      sql.push(format(q, [p.student_id, p.job_id]));
      await conn.query(q, [p.student_id, p.job_id]);
    },
  },
  app_accept: {
    kind: 'TRIGGER', title: 'Accept an offer: UPDATE on applications', object: 'trg_applications_after_update',
    explain: 'We only changed applications.status to ACCEPTED. The AFTER UPDATE trigger on its own inserted the placement, set students.is_placed = 1, used up one job opening and wrote a PLACED audit row. (A raw UPDATE does not withdraw the student\'s other applications; the procedure sp_accept_offer does that.)',
    params: [appSel('Offered application', 'offered')], defaults: { application_id: 17 },
    watch: [appRow, studentOfApp, jobOfApp, placementOfApp, AUDIT],
    async run(conn, p, sql) {
      const q = "UPDATE applications SET status = 'ACCEPTED' WHERE application_id = ?";
      sql.push(format(q, [p.application_id]));
      await conn.query(q, [p.application_id]);
    },
  },
  round_fail: {
    kind: 'TRIGGER', title: 'Fail an interview round: UPDATE on interview_rounds', object: 'trg_rounds_after_update',
    explain: 'Recording FAILED for a round fires the AFTER UPDATE trigger, which rejects the whole application automatically and logs the result change in audit_log.',
    params: [{ name: 'round_key', label: 'Pending interview round', from: 'rounds', filter: 'pending' }], defaults: { round_key: '11-1' },
    watch: [
      ['the interview round', 'SELECT * FROM interview_rounds WHERE application_id = ? AND round_no = ?', (p) => roundKey(p)],
      ['the application', 'SELECT application_id, student_id, job_id, status FROM applications WHERE application_id = ?', (p) => [roundKey(p)[0]]],
      AUDIT,
    ],
    async run(conn, p, sql) {
      const [a, n] = roundKey(p);
      const q = "UPDATE interview_rounds SET result = 'FAILED' WHERE application_id = ? AND round_no = ?";
      sql.push(format(q, [a, n]));
      await conn.query(q, [a, n]);
    },
  },
  student_update: {
    kind: 'TRIGGER', title: 'Audit trigger: UPDATE on students', object: 'trg_students_after_update',
    explain: 'The AFTER UPDATE trigger copies the OLD and NEW values of the row into audit_log as JSON, automatically.',
    params: [studentSel, { name: 'cgpa', label: 'New CGPA', type: 'text', default: '7.00' }], defaults: { student_id: 9 },
    watch: [['the student', 'SELECT student_id, name, cgpa, is_placed FROM students WHERE student_id = ?', (p) => [p.student_id]], AUDIT],
    async run(conn, p, sql) {
      if (!(Number(p.cgpa) >= 0)) throw new HttpError(400, 'Enter a CGPA between 0 and 10');
      const q = 'UPDATE students SET cgpa = ? WHERE student_id = ?';
      sql.push(format(q, [p.cgpa, p.student_id]));
      await conn.query(q, [p.cgpa, p.student_id]);
    },
  },
  proc_apply: {
    kind: 'PROCEDURE', title: 'CALL sp_apply', object: 'sp_apply',
    explain: 'The procedure verifies the student and job exist and that the student has not applied before, then inserts the application and returns its id in an OUT parameter. The INSERT inside it still fires the eligibility trigger.',
    params: [unplacedSel, jobSel], defaults: { student_id: 5, job_id: 2 },
    watch: [['applications of this student', 'SELECT application_id, job_id, status FROM applications WHERE student_id = ? ORDER BY application_id', (p) => [p.student_id]]],
    async run(conn, p, sql) {
      const q = 'CALL sp_apply(?, ?, @new_app_id)';
      sql.push(format(q, [p.student_id, p.job_id]), 'SELECT @new_app_id');
      await conn.query(q, [p.student_id, p.job_id]);
      return [{ new_application_id: (await conn.query('SELECT @new_app_id AS id'))[0][0].id }];
    },
  },
  proc_status: {
    kind: 'PROCEDURE', title: 'CALL sp_update_application_status', object: 'sp_update_application_status',
    explain: 'The procedure enforces the recruitment flow: shortlist only from APPLIED, offer only after every interview round is PASSED, reject/withdraw only while the application is open. Each change fires the audit trigger.',
    params: [appSel('Application (APPLIED)', 'applied'), { name: 'status', label: 'New status', choices: ['SHORTLISTED', 'REJECTED', 'WITHDRAWN', 'OFFERED'], default: 'SHORTLISTED' }],
    defaults: { application_id: 18 },
    watch: [appRow, AUDIT],
    async run(conn, p, sql) {
      const q = 'CALL sp_update_application_status(?, ?)';
      sql.push(format(q, [p.application_id, p.status]));
      await conn.query(q, [p.application_id, p.status]);
    },
  },
  proc_schedule: {
    kind: 'PROCEDURE', title: 'CALL sp_schedule_round', object: 'sp_schedule_round',
    explain: 'The procedure generates the next round number (the weak entity\'s partial key), requires the previous round to be PASSED, inserts the round and returns the number. The AFTER INSERT trigger moves the application to INTERVIEW.',
    params: [appSel('Shortlisted application', 'schedulable'), { name: 'round_type', label: 'Round type', choices: ['APTITUDE', 'TECHNICAL', 'HR'], default: 'APTITUDE' }, { name: 'scheduled_on', label: 'Date (YYYY-MM-DD)', type: 'text', default: inDays(7) }],
    defaults: { application_id: 21 },
    watch: [appRow, ['interview rounds of this application', 'SELECT * FROM interview_rounds WHERE application_id = ? ORDER BY round_no', (p) => [p.application_id]]],
    async run(conn, p, sql) {
      const q = 'CALL sp_schedule_round(?, ?, ?, @new_round)';
      sql.push(format(q, [p.application_id, p.round_type, p.scheduled_on]), 'SELECT @new_round');
      await conn.query(q, [p.application_id, p.round_type, p.scheduled_on]);
      return [{ round_no_created: (await conn.query('SELECT @new_round AS n'))[0][0].n }];
    },
  },
  proc_accept: {
    kind: 'PROCEDURE', title: 'CALL sp_accept_offer', object: 'sp_accept_offer',
    explain: 'Accepting fires the trigger that creates the placement; then the procedure WITHDRAWS every other open application of that student (something a trigger cannot do on its own table).',
    params: [appSel('Offered application', 'offered')], defaults: { application_id: 7 },
    watch: [
      ['all applications of this student', 'SELECT application_id, job_id, status FROM applications WHERE student_id = (SELECT student_id FROM applications WHERE application_id = ?) ORDER BY application_id', (p) => [p.application_id]],
      placementOfApp,
      jobOfApp,
    ],
    async run(conn, p, sql) {
      const q = 'CALL sp_accept_offer(?)';
      sql.push(format(q, [p.application_id]));
      await conn.query(q, [p.application_id]);
    },
  },
  proc_report: {
    kind: 'PROCEDURE', title: 'CALL sp_student_report', object: 'sp_student_report',
    explain: 'A read-only procedure: it returns one summary row built from nested subqueries.',
    params: [studentSel], defaults: { student_id: 3 }, watch: [],
    async run(conn, p, sql) {
      const q = 'CALL sp_student_report(?)';
      sql.push(format(q, [p.student_id]));
      return (await conn.query(q, [p.student_id]))[0][0];
    },
  },
  proc_stats: {
    kind: 'PROCEDURE', title: 'CALL sp_placement_stats', object: 'sp_placement_stats',
    explain: 'A report procedure: placement percentage and average package per department (from the view) plus an overall row added with UNION ALL.',
    params: [], watch: [],
    async run(conn, p, sql) {
      sql.push('CALL sp_placement_stats()');
      return (await conn.query('CALL sp_placement_stats()'))[0][0];
    },
  },
};

export const list = () =>
  Object.entries(scenarios).map(([id, s]) => ({ id, kind: s.kind, title: s.title, object: s.object, explain: s.explain, params: s.params, defaults: s.defaults ?? {} }));

function get(id) {
  const s = scenarios[id];
  if (!s) throw new HttpError(404, 'Unknown scenario');
  return s;
}

async function snapshot(s, p) {
  const out = [];
  for (const [title, q, args] of s.watch) {
    const [rows] = await pool.query(q, args(p));
    out.push({ title, rows });
  }
  return out;
}

/** Form values arrive as strings; ids become numbers so the displayed SQL is realistic. */
const norm = (p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, k.endsWith('_id') && /^\d+$/.test(v) ? Number(v) : v]));

/** Steps 1+2: the code and the BEFORE state. */
export async function prepare(id, p) {
  const s = get(id);
  p = norm(p);
  const [rows] = await pool.query(`SHOW CREATE ${s.kind} ${s.object}`);
  const code = rows[0]['SQL Original Statement'] ?? rows[0]['Create Procedure'];
  return { code, before: await snapshot(s, p) };
}

/** Steps 3+4: fire it and read the AFTER state. */
export async function fire(id, p) {
  const s = get(id);
  p = norm(p);
  const sql = [];
  const conn = await pool.getConnection();
  try {
    const result = await s.run(conn, p, sql);
    const after = await snapshot(s, p);
    const graph = await resyncGraph().then(() => ({ ok: true }), (e) => ({ ok: false, error: e.message }));
    return { sql, result: result ?? null, after, graph };
  } catch (e) {
    throw friendly(e);
  } finally {
    conn.release();
  }
}
