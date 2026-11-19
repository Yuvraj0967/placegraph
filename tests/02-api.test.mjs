// API tests against the running website (http://localhost:3001): authentication, roles, CRUD, search.
// They create their own temporary rows and delete them again.
import test from 'node:test';
import assert from 'node:assert/strict';
import { login, asOfficer, asStudent, call } from './helpers.mjs';

test('requests without a session get 401', async () => {
  assert.equal((await call('', 'GET', '/api/students')).status, 401);
  assert.equal((await call('', 'GET', '/api/jobs')).status, 401);
});

test('login: wrong password is rejected, right password sets a session', async () => {
  const bad = await login('officer@college.edu', 'definitely-wrong');
  assert.equal(bad.status, 401);
  const good = await login('officer@college.edu', process.env.DEMO_OFFICER_PASSWORD);
  assert.equal(good.status, 200);
  assert.equal(good.body.user.role, 'officer');
  assert.ok(good.cookie.startsWith('placegraph_session='));
});

test('roles: a student gets 403 on officer-only endpoints', async () => {
  const s = await asStudent();
  for (const path of ['/api/stats', '/api/inspect?table=users', '/api/lab', '/api/queries?kind=sql', '/api/graph/snapshot']) {
    assert.equal((await call(s, 'GET', path)).status, 403, path);
  }
  assert.equal((await call(s, 'POST', '/api/students', { name: 'x' })).status, 403);
  assert.equal((await call(s, 'DELETE', '/api/jobs/1')).status, 403);
  assert.equal((await call(s, 'PUT', '/api/applications/17', { action: 'accept' })).status, 403);
});

test('roles: a student only sees their own applications and student row', async () => {
  const s = await asStudent();
  const apps = (await call(s, 'GET', '/api/applications')).body;
  assert.ok(apps.length >= 1 && apps.every((a) => a.student_id === 6));
  const me = (await call(s, 'GET', '/api/students')).body;
  assert.equal(me.length, 1);
  assert.equal(me[0].name, 'Meera Nair');
});

test('roles: an officer sees everything', async () => {
  const o = await asOfficer();
  assert.equal((await call(o, 'GET', '/api/students')).body.length, 12);
  assert.equal((await call(o, 'GET', '/api/stats')).status, 200);
});

test('student CRUD lifecycle (officer): create, read, update, search, delete', async () => {
  const o = await asOfficer();
  const created = await call(o, 'POST', '/api/students', { name: 'Test Student', email: 'api.test@college.edu', dept_id: 1, cgpa: 7.7, grad_year: 2026, skill_ids: [1, 3] });
  assert.equal(created.status, 200);
  assert.equal(created.body.graph.ok, true);
  const id = created.body.data.student_id;
  try {
    assert.equal(created.body.data.skills, 'Python, SQL');
    const updated = await call(o, 'PUT', `/api/students/${id}`, { cgpa: 8.1 });
    assert.equal(updated.body.data.cgpa, 8.1);
    const found = (await call(o, 'GET', '/api/students?q=Test%20Student')).body;
    assert.ok(found.some((s) => s.student_id === id));
  } finally {
    const del = await call(o, 'DELETE', `/api/students/${id}`);
    assert.equal(del.status, 200);
  }
  assert.ok(!(await call(o, 'GET', '/api/students?q=api.test')).body.some((s) => s.student_id === id));
});

test('validation: missing fields and duplicates are rejected with readable 4xx errors', async () => {
  const o = await asOfficer();
  const missing = await call(o, 'POST', '/api/students', { name: 'No email' });
  assert.equal(missing.status, 400);
  const dup = await call(o, 'POST', '/api/companies', { name: 'TechNova' });
  assert.equal(dup.status, 409);
  const fk = await call(o, 'DELETE', '/api/companies/1');
  assert.equal(fk.status, 409);
});

test('workflow: the database rules surface as 400 errors through the API', async () => {
  const o = await asOfficer();
  const low = await call(o, 'POST', '/api/applications', { student_id: 7, job_id: 1 });
  assert.equal(low.status, 400);
  assert.match(low.body.error, /CGPA/);
  const noOffer = await call(o, 'PUT', '/api/applications/20', { action: 'accept' });
  assert.equal(noOffer.status, 400);
  const early = await call(o, 'PUT', '/api/applications/9', { action: 'offer' });
  assert.equal(early.status, 400);
});

test('search and filters', async () => {
  const o = await asOfficer();
  const jobs = (await call(o, 'GET', '/api/jobs?q=engineer')).body;
  assert.ok(jobs.length >= 5 && jobs.every((j) => /engineer/i.test(j.title)));
  const offered = (await call(o, 'GET', '/api/applications?status=OFFERED')).body;
  assert.ok(offered.length >= 3 && offered.every((a) => a.status === 'OFFERED'));
  const placed = (await call(o, 'GET', '/api/students?placed=1')).body;
  assert.ok(placed.length >= 4 && placed.every((s) => s.is_placed === 1));
});

test('a student can apply, but only as themselves, and is then blocked from applying twice', async () => {
  const s = await asStudent();
  const o = await asOfficer();
  const first = await call(s, 'POST', '/api/applications', { student_id: 1, job_id: 6 }); // student_id in the body is ignored
  assert.equal(first.status, 200);
  assert.equal(first.body.data.student_id, 6);
  const again = await call(s, 'POST', '/api/applications', { job_id: 6 });
  assert.equal(again.status, 400);
  assert.match(again.body.error, /already applied/);
  await call(o, 'DELETE', `/api/applications/${first.body.data.application_id}`); // clean up
});
