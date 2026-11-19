// SQL tests: constraints, triggers, stored procedures, views, full-text search, transactions.
// Every test runs inside a transaction that is rolled back.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { pool, inRollback, expectDbError } from './helpers.mjs';

after(() => pool.end());

test('FOREIGN KEY RESTRICT: a company that has jobs cannot be deleted', () =>
  inRollback(async (c) => {
    const e = await expectDbError(c.query('DELETE FROM companies WHERE company_id = 1'));
    assert.equal(e.errno, 1451);
  }));

test('UNIQUE: duplicate student email is rejected', () =>
  inRollback(async (c) => {
    const e = await expectDbError(c.query("INSERT INTO students (name, email, dept_id, cgpa, grad_year) VALUES ('Dup', 'aarav@college.edu', 1, 7, 2026)"));
    assert.equal(e.errno, 1062);
  }));

test('CHECK: CGPA above 10 is rejected', () =>
  inRollback(async (c) => {
    const e = await expectDbError(c.query("INSERT INTO students (name, email, dept_id, cgpa, grad_year) VALUES ('Bad', 'bad@college.edu', 1, 10.5, 2026)"));
    assert.equal(e.errno, 3819);
  }));

test('trigger: eligibility guard rejects a CGPA below the job minimum', () =>
  inRollback(async (c) => {
    const e = await expectDbError(c.query('INSERT INTO applications (student_id, job_id) VALUES (7, 1)')); // 6.8 < 7.5
    assert.match(e.sqlMessage, /CGPA is below/);
  }));

test('trigger: eligibility guard rejects an expired deadline', () =>
  inRollback(async (c) => {
    const e = await expectDbError(c.query('INSERT INTO applications (student_id, job_id) VALUES (11, 8)')); // job 8 expired
    assert.match(e.sqlMessage, /deadline/);
  }));

test('trigger: a placed student cannot apply again', () =>
  inRollback(async (c) => {
    const e = await expectDbError(c.query('INSERT INTO applications (student_id, job_id) VALUES (2, 2)')); // Diya is placed
    assert.match(e.sqlMessage, /already placed/);
  }));

test('trigger: only an OFFERED application can be accepted', () =>
  inRollback(async (c) => {
    const e = await expectDbError(c.query("UPDATE applications SET status = 'ACCEPTED' WHERE application_id = 20"));
    assert.match(e.sqlMessage, /OFFER/);
  }));

test('trigger: accepting an offer creates the placement, marks the student placed and uses an opening', () =>
  inRollback(async (c) => {
    const [[before]] = await c.query('SELECT openings FROM jobs WHERE job_id = 3');
    await c.query("UPDATE applications SET status = 'ACCEPTED' WHERE application_id = 10"); // Sneha -> Data Analyst
    const [[pl]] = await c.query('SELECT package_lpa FROM placements WHERE student_id = 4');
    const [[st]] = await c.query('SELECT is_placed FROM students WHERE student_id = 4');
    const [[after]] = await c.query('SELECT openings FROM jobs WHERE job_id = 3');
    const [[audit]] = await c.query("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'PLACED'");
    assert.equal(Number(pl.package_lpa), 9);
    assert.equal(st.is_placed, 1);
    assert.equal(after.openings, before.openings - 1);
    assert.equal(audit.n, 1);
  }));

test('trigger: a FAILED interview round rejects the application', () =>
  inRollback(async (c) => {
    await c.query("UPDATE interview_rounds SET result = 'FAILED' WHERE application_id = 11 AND round_no = 1");
    const [[a]] = await c.query('SELECT status FROM applications WHERE application_id = 11');
    assert.equal(a.status, 'REJECTED');
  }));

test('trigger: audit row written when a student is updated (old and new values)', () =>
  inRollback(async (c) => {
    await c.query('UPDATE students SET cgpa = 6.90 WHERE student_id = 9');
    const [[row]] = await c.query("SELECT old_data, new_data FROM audit_log WHERE table_name = 'students' ORDER BY audit_id DESC LIMIT 1");
    assert.equal(Number(row.old_data.cgpa), 6.5);
    assert.equal(Number(row.new_data.cgpa), 6.9);
  }));

test('trigger: a student account must be linked to a student record', () =>
  inRollback(async (c) => {
    const e = await expectDbError(c.query("INSERT INTO users (email, password_hash, role) VALUES ('x@college.edu', 'hash', 'student')"));
    assert.match(e.sqlMessage, /linked to a student/);
  }));

test('procedure sp_apply: duplicate application is rejected, new one returns its id', () =>
  inRollback(async (c) => {
    await c.query('CALL sp_apply(5, 2, @id)');
    const [[o]] = await c.query('SELECT @id AS id');
    assert.ok(o.id > 21);
    const e = await expectDbError(c.query('CALL sp_apply(5, 2, @id2)'));
    assert.match(e.sqlMessage, /already applied/);
  }));

test('procedure sp_update_application_status: offer needs passed interview rounds', () =>
  inRollback(async (c) => {
    const e = await expectDbError(c.query("CALL sp_update_application_status(21, 'OFFERED')")); // shortlisted, no rounds
    assert.match(e.sqlMessage, /interview stage|PASSED/);
  }));

test('procedure sp_schedule_round: generates round_no and moves the application to INTERVIEW', () =>
  inRollback(async (c) => {
    await c.query("CALL sp_schedule_round(21, 'APTITUDE', CURDATE(), @r)");
    const [[o]] = await c.query('SELECT @r AS r');
    const [[a]] = await c.query('SELECT status FROM applications WHERE application_id = 21');
    assert.equal(o.r, 1);
    assert.equal(a.status, 'INTERVIEW');
  }));

test('procedure sp_accept_offer: places the student and withdraws their other open applications', () =>
  inRollback(async (c) => {
    await c.query('CALL sp_accept_offer(17)'); // Neha: 17 offered, 18 applied
    const [rows] = await c.query('SELECT application_id, status FROM applications WHERE student_id = 11 ORDER BY 1');
    assert.deepEqual(rows.map((r) => r.status), ['ACCEPTED', 'WITHDRAWN']);
  }));

test('views: v_placement_summary has one row per department', () =>
  inRollback(async (c) => {
    const [rows] = await c.query('SELECT * FROM v_placement_summary');
    assert.equal(rows.length, 4);
    assert.equal(rows.reduce((n, r) => n + Number(r.placed), 0), 4);
  }));

test('full-text search: MATCH ... AGAINST finds jobs by title', () =>
  inRollback(async (c) => {
    const [rows] = await c.query("SELECT title FROM jobs WHERE MATCH(title) AGAINST('+engineer*' IN BOOLEAN MODE)");
    assert.ok(rows.length >= 5);
  }));

test('transaction: a failed multi-statement unit leaves no partial rows', async () => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("INSERT INTO companies (name) VALUES ('Rollback Test Co')");
    await expectDbError(conn.query("INSERT INTO companies (name) VALUES ('TechNova')")); // unique violation
    await conn.rollback();
    const [[r]] = await conn.query("SELECT COUNT(*) AS n FROM companies WHERE name = 'Rollback Test Co'");
    assert.equal(r.n, 0);
  } finally {
    conn.release();
  }
});

test('a perfect CGPA of 10.00 can be stored (regression: DECIMAL(3,2) topped out at 9.99)', () =>
  inRollback(async (c) => {
    await c.query("INSERT INTO students (name, email, dept_id, cgpa, grad_year) VALUES ('Perfect', 'perfect@college.edu', 1, 10.00, 2026)");
    const [[r]] = await c.query("SELECT cgpa FROM students WHERE email = 'perfect@college.edu'");
    assert.equal(Number(r.cgpa), 10);
  }));
