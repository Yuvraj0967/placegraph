'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './ui';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function LoginForm({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { user } = await api('/api/auth', { method: 'POST', body: JSON.stringify({ email, password }) });
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '10vh auto', padding: 16 }}>
      <form className="card" onSubmit={submit}>
        <h1 style={{ fontSize: 24 }}>🎓 PlaceGraph</h1>
        <p className="sub">Sign in to the placement cell.</p>
        {error && <div className="notice bad"><b>✖ {error}</b></div>}
        <label htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <div style={{ height: 12 }} />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <div style={{ height: 16 }} />
        <button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>Demo accounts and their passwords are created by <code>npm run db:setup</code>; the passwords are in your private <code>.env</code> file.</p>
      </form>
    </div>
  );
}

/** Shows the login form until a session exists; provides { user, logout } to the pages. */
export function AuthGate({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still checking
  useEffect(() => { api('/api/auth').then((r) => setUser(r.user)).catch(() => setUser(null)); }, []);
  const logout = useCallback(async () => {
    await api('/api/auth', { method: 'DELETE' });
    setUser(null);
  }, []);

  if (user === undefined) return null;
  if (!user) return <LoginForm onLogin={setUser} />;
  return <AuthContext.Provider value={{ user, logout }}>{children}</AuthContext.Provider>;
}
