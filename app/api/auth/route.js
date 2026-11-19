import { respond } from '@/lib/http';
import { currentUser, login, logout } from '@/lib/auth';
export const dynamic = 'force-dynamic';

// GET    /api/auth  -> { user } (null when signed out)    used by the page gate
// POST   /api/auth  -> sign in { email, password }
// DELETE /api/auth  -> sign out
export const GET = () => respond(async () => ({ user: await currentUser() }));
export const POST = (req) => respond(async () => {
  const { username, email, password } = await req.json(); // 'username' may hold a username or an email
  return { user: await login(username ?? email, password) };
});
export const DELETE = () => respond(async () => { await logout(); return { ok: true }; });
