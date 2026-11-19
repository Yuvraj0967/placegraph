// Shared helpers for the test suites. Run on a freshly seeded database:  npm run db:setup && npm test
import { pool } from '../lib/db.js';

export const BASE = process.env.BASE_URL || 'http://localhost:3001';
export { pool };

/** Sign in through the real API; returns the session cookie. */
export async function login(email, password) {
  const r = await fetch(`${BASE}/api/auth`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
  return { status: r.status, cookie: r.headers.get('set-cookie')?.split(';')[0] ?? '', body: await r.json() };
}
export const asOfficer = async () => (await login('officer@college.edu', process.env.DEMO_OFFICER_PASSWORD)).cookie;
export const asStudent = async () => (await login('meera@college.edu', process.env.DEMO_STUDENT_PASSWORD)).cookie;

export async function call(cookie, method, path, body) {
  const r = await fetch(`${BASE}${path}`, { method, headers: { 'content-type': 'application/json', cookie: cookie ?? '' }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
}

/** Run a SQL test inside a transaction that is ALWAYS rolled back, so tests never change the data. */
export async function inRollback(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await fn(conn);
  } finally {
    await conn.rollback();
    conn.release();
  }
}

/** Expect a MySQL error; returns it (errno / sqlMessage). */
export async function expectDbError(promise) {
  try {
    await promise;
  } catch (e) {
    return e;
  }
  throw new Error('Expected the database to reject this statement, but it succeeded');
}
