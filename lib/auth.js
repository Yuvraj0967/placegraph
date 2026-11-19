// Authentication: bcrypt password hashes, a signed JWT in an HTTP-only cookie.
// The user's CURRENT role is read from MySQL on every protected request, so a role
// change or deleted account takes effect immediately (not only at the next login).
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { pool } from './db.js';
import { requireEnv } from './env.js';
import { HttpError } from './core.js';
import { checkPassword } from './auth-hash.js';

const COOKIE = 'placegraph_session';
const key = () => {
  const s = requireEnv('JWT_SECRET');
  if (s.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
  return new TextEncoder().encode(s);
};


/** `identifier` may be a username or an email address. */
export async function login(identifier, password) {
  const id = String(identifier ?? '').trim().toLowerCase();
  const [[u]] = await pool.query(
    'SELECT user_id, username, email, password_hash, role, student_id FROM users WHERE username = ? OR email = ?',
    [id, id],
  );
  // same message for unknown email and wrong password (no account enumeration)
  if (!u || !(await checkPassword(String(password ?? ''), u.password_hash))) throw new HttpError(401, 'Invalid email or password');
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(u.user_id))
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(key());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 3600,
    secure: process.env.COOKIE_SECURE === 'true', // set to true when served over HTTPS
  });
  return { user_id: u.user_id, username: u.username, email: u.email, role: u.role, student_id: u.student_id };
}

export async function logout() {
  (await cookies()).delete(COOKIE);
}

/** Returns the signed-in user (fresh from MySQL) or null. */
export async function currentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    const [[u]] = await pool.query(
      `SELECT u.user_id, u.username, u.email, u.role, u.student_id, s.name AS student_name
       FROM users u LEFT JOIN students s ON s.student_id = u.student_id WHERE u.user_id = ?`,
      [Number(payload.sub)],
    );
    return u ?? null;
  } catch {
    return null;
  }
}

/** Throws 401 when signed out, 403 when the role is not allowed. */
export async function requireUser(...roles) {
  const u = await currentUser();
  if (!u) throw new HttpError(401, 'Please sign in');
  if (roles.length && !roles.includes(u.role)) throw new HttpError(403, 'You do not have permission to do this');
  return u;
}
