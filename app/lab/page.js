'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, DataTable } from '@/components/ui';

const filters = {
  unplaced: (o) => !o.is_placed,
  open: (o) => !o.expired && o.openings > 0,
  applied: (o) => o.status === 'APPLIED',
  offered: (o) => o.status === 'OFFERED',
  schedulable: (o) => ['SHORTLISTED', 'INTERVIEW'].includes(o.status),
  pending: (o) => o.result === 'PENDING',
};
const labelOf = {
  students: (o) => `${o.name} (CGPA ${o.cgpa}, ${o.dept_code}${o.is_placed ? ', placed' : ''})`,
  jobs: (o) => `${o.title} @ ${o.company_name} (min CGPA ${o.min_cgpa}, ${o.openings} openings)`,
  applications: (o) => `#${o.application_id} ${o.student_name} - ${o.job_title} @ ${o.company_name} [${o.status}]`,
  rounds: (o) => `#${o.application_id}-R${o.round_no} ${o.student_name}: ${o.round_type} (${o.job_title})`,
};
const idOf = { students: 'student_id', jobs: 'job_id', applications: 'application_id', rounds: 'key' };
const SOURCES = ['students', 'jobs', 'applications', 'rounds'];

export default function LabPage() {
  const [list, setList] = useState([]);
  const [sel, setSel] = useState('app_accept');
  const [options, setOptions] = useState({});
  const [params, setParams] = useState({});
  const [prep, setPrep] = useState(null); // { code, before }
  const [fired, setFired] = useState(null); // { sql, result, after, graph }
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [initFor, setInitFor] = useState('');

  const scenario = list.find((s) => s.id === sel);

  const loadOptions = useCallback(async () => {
    const loaded = {};
    await Promise.all(SOURCES.map(async (r) => (loaded[r] = await api(`/api/${r}`))));
    setOptions(loaded);
  }, []);

  useEffect(() => {
    api('/api/lab').then(setList).catch((e) => setError(e.message));
    loadOptions().catch((e) => setError(e.message));
  }, [loadOptions]);

  // default the parameters when the scenario changes (reloading option lists after firing must NOT reset the AFTER panel)
  useEffect(() => {
    if (!scenario || !options.students || initFor === sel) return;
    setInitFor(sel);
    const p = {};
    for (const f of scenario.params) {
      if (f.from) {
        const rows = options[f.from].filter(filters[f.filter] ?? (() => true));
        const wanted = scenario.defaults[f.name];
        const hit = rows.find((r) => String(r[idOf[f.from]]) === String(wanted)) ?? rows[0];
        p[f.name] = hit ? String(hit[idOf[f.from]]) : '';
      } else p[f.name] = f.default ?? f.choices?.[0] ?? '';
    }
    setParams(p);
    setFired(null);
  }, [scenario, options, initFor, sel]);

  // steps 1 + 2: show code and BEFORE whenever the selection changes
  useEffect(() => {
    // wait until the parameters belong to the selected scenario (avoid sending the previous scenario's values)
    if (!scenario || initFor !== sel || !scenario.params.every((f) => f.name in params)) return;
    let stale = false;
    const qs = new URLSearchParams({ scenario: sel, ...params });
    api(`/api/lab?${qs}`)
      .then((r) => { if (!stale) { setPrep(r); setError(''); } })
      .catch((e) => { if (!stale) setError(e.message); });
    return () => { stale = true; };
  }, [sel, params, scenario, initFor]);

  async function fire() {
    setBusy(true);
    setError('');
    try {
      setFired(await api('/api/lab', { method: 'POST', body: JSON.stringify({ scenario: sel, params }) }));
      await loadOptions();
    } catch (e) { setError(e.message); setFired(null); } finally { setBusy(false); }
  }

  const change = (name, v) => { setFired(null); setError(''); setParams({ ...params, [name]: v }); };

  return (
    <>
      <h1>Trigger & Procedure Lab</h1>
      <p className="sub">The demonstration sequence from the rubric: show the code, show the data BEFORE, fire it, show the data AFTER, explain. Rows that changed are highlighted in green. Business-rule violations show up as errors raised by the database itself.</p>

      <div className="card">
        <div className="tabs">
          {list.map((s) => (
            <button key={s.id} className={s.id === sel ? 'on' : ''} onClick={() => { if (s.id === sel) return; setInitFor(''); setSel(s.id); setPrep(null); setFired(null); setError(''); }}>
              {s.kind === 'TRIGGER' ? 'Trigger' : 'Procedure'}: {s.title}
            </button>
          ))}
        </div>
        {scenario && scenario.params.length > 0 && (
          <div className="formgrid">
            {scenario.params.map((f) => (
              <div key={f.name}>
                <label>{f.label}</label>
                {f.from || f.choices ? (
                  <select value={params[f.name] ?? ''} onChange={(e) => change(f.name, e.target.value)}>
                    {f.choices
                      ? f.choices.map((c) => <option key={c} value={c}>{c}</option>)
                      : (options[f.from] ?? []).filter(filters[f.filter] ?? (() => true)).map((o) => (
                        <option key={o[idOf[f.from]]} value={o[idOf[f.from]]}>{labelOf[f.from](o)}</option>
                      ))}
                  </select>
                ) : (
                  <input value={params[f.name] ?? ''} onChange={(e) => change(f.name, e.target.value)} />
                )}
              </div>
            ))}
          </div>
        )}
        {error && <p className="pill bad">{error}</p>}
      </div>

      {prep && (
        <>
          <div className="card">
            <div className="step"><span className="n">1</span><h2>Show the {scenario?.kind.toLowerCase()} code</h2><span className="pill mysql">{scenario?.object}</span></div>
            <pre>{prep.code}</pre>
          </div>

          <div className="card">
            <div className="step"><span className="n">2</span><h2>Data BEFORE</h2></div>
            {prep.before.length === 0 && <p className="muted">This procedure only reads data; there is no state to compare.</p>}
            {prep.before.map((t) => (
              <div key={t.title}><b>{t.title}</b><DataTable rows={t.rows} empty="(no rows)" /></div>
            ))}
          </div>

          <div className="card">
            <div className="step"><span className="n">3</span><h2>Fire it</h2></div>
            <button className="primary" onClick={fire} disabled={busy}>{busy ? 'Running…' : scenario?.kind === 'TRIGGER' ? 'Run the statement that activates the trigger' : 'Execute the procedure'}</button>
            {error && <p className="pill bad" style={{ marginTop: 10 }}>The database rejected it: {error}</p>}
            {fired && (
              <>
                {fired.sql.map((s, i) => <code key={i} className="sql" style={{ display: 'block' }}>{s}</code>)}
                <p style={{ marginBottom: 0 }}>
                  <span className="pill mysql">MySQL ✔ executed</span>{' '}
                  {fired.graph?.ok ? <span className="pill neo">Neo4j ✔ graph re-synced</span> : <span className="pill bad">Neo4j ✖ {fired.graph?.error}</span>}
                </p>
              </>
            )}
          </div>

          {fired && (
            <div className="card">
              <div className="step"><span className="n">4</span><h2>Data AFTER</h2></div>
              {fired.result && <><b>Procedure output</b><DataTable rows={fired.result} /></>}
              {fired.after.map((t, i) => (
                <div key={t.title}><b>{t.title}</b><DataTable rows={t.rows} baseline={prep.before[i]?.rows} empty="(no rows)" /></div>
              ))}
              <div className="step" style={{ marginTop: 14 }}><span className="n">5</span><h2>Explanation</h2></div>
              <p>{scenario?.explain}</p>
            </div>
          )}
        </>
      )}
    </>
  );
}
