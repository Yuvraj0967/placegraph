'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, DataTable } from '@/components/ui';

const tables = ['students', 'departments', 'companies', 'jobs', 'skills', 'student_skills', 'job_skills', 'applications', 'interview_rounds', 'placements', 'audit_log', 'v_placement_summary', 'triggers', 'procedures'];

export default function Inspector() {
  const [table, setTable] = useState('students');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [auto, setAuto] = useState(false);
  const [at, setAt] = useState('');

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('table');
    if (t && tables.includes(t)) setTable(t);
  }, []);

  const load = useCallback(async () => {
    try {
      setRows(await api(`/api/inspect?table=${table}`));
      setError('');
      setAt(new Date().toLocaleTimeString());
    } catch (e) { setError(e.message); }
  }, [table]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(load, 2000);
    return () => clearInterval(id);
  }, [auto, load]);

  return (
    <>
      <h1>DB Inspector</h1>
      <p className="sub">Reads the MySQL tables directly (no UI logic in between). Use it to prove that a change made on the website really reached the database.</p>
      <div className="tabs">
        {tables.map((t) => (
          <button key={t} className={t === table ? 'on' : ''} onClick={() => { setTable(t); history.replaceState(null, '', `/inspector?table=${t}`); }}>{t}</button>
        ))}
      </div>
      <div className="card">
        <div className="toolbar">
          <span><span className="pill mysql">MySQL</span> <b>{table}</b> — {rows.length} row(s) <span className="muted">· read at {at}</span></span>
          <span>
            <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginRight: 10 }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={auto} onChange={(e) => setAuto(e.target.checked)} /> live refresh (2s)
            </label>
            <button onClick={load}>↻ Refresh</button>
          </span>
        </div>
        {error ? <p className="pill bad">{error}</p> : <DataTable rows={rows} />}
      </div>
    </>
  );
}
