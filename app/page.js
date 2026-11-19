'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, DataTable } from '@/components/ui';
import { useAuth } from '@/components/Auth';

function StudentHome() {
  const { user } = useAuth();
  const [me, setMe] = useState(null);
  const [apps, setApps] = useState([]);
  const [rec, setRec] = useState(null);
  const [placement, setPlacement] = useState([]);
  useEffect(() => {
    Promise.all([api('/api/students'), api('/api/applications'), api('/api/placements'), api(`/api/graph/recommend?studentId=${user.student_id}`)])
      .then(([s, a, p, r]) => { setMe(s[0]); setApps(a); setPlacement(p); setRec(r); })
      .catch(() => {});
  }, [user.student_id]);
  const count = (st) => apps.filter((a) => a.status === st).length;
  return (
    <>
      <h1>Welcome, {user.student_name}</h1>
      <p className="sub">Your placement status, applications and the open jobs that best fit your skills.</p>
      <div className="card">
        <div className="grid g4">
          <div className="stat"><b>{me?.cgpa ?? '—'}</b><span>CGPA</span></div>
          <div className="stat"><b>{me ? (me.is_placed ? 'Placed' : 'Unplaced') : '—'}</b><span>Status</span></div>
          <div className="stat"><b>{apps.length}</b><span>Applications</span></div>
          <div className="stat"><b>{count('OFFERED')}</b><span>Offers waiting</span></div>
        </div>
        {placement[0] && <p>🎉 Placed at <b>{placement[0].company_name}</b> as {placement[0].job_title} ({placement[0].package_lpa} LPA).</p>}
        <p className="muted">Skills: {me?.skills ?? '—'}. Offers are accepted by the placement officer on your behalf.</p>
      </div>
      <div className="card">
        <h2>Open jobs that fit your skills <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>(from Neo4j)</span></h2>
        <DataTable rows={rec?.jobs} empty="No open jobs to recommend." />
        <p><Link href="/jobs">Browse all jobs</Link> · <Link href="/applications">Apply or track applications</Link></p>
      </div>
    </>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  return user.role === 'student' ? <StudentHome /> : <OfficerDashboard />;
}

function OfficerDashboard() {
  const [s, setS] = useState(null);
  const [summary, setSummary] = useState([]);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      setS(await api('/api/stats'));
      setSummary(await api('/api/inspect?table=v_placement_summary'));
    } catch (e) { setMsg(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function resync() {
    setMsg('Rebuilding the graph from MySQL…');
    try {
      const r = await api('/api/resync', { method: 'POST' });
      setMsg(`Graph rebuilt from MySQL: ${JSON.stringify(r)}`);
    } catch (e) { setMsg(e.message); }
    load();
  }

  const my = s?.mysql, nj = s?.neo4j;
  return (
    <>
      <h1>PlaceGraph</h1>
      <p className="sub">A campus placement management system: a relational core (MySQL) with triggers and procedures, and a graph (Neo4j) for skill-based job matching, driven through one Next.js app.</p>

      <div className="card">
        <h2>How everything is connected</h2>
        <div className="flow">
          <div className="box"><b>Next.js UI</b><br /><span className="muted">forms + tables</span></div>
          <span className="arrow">→</span>
          <div className="box"><b>API routes</b><br /><span className="muted">/api/*</span></div>
          <span className="arrow">→</span>
          <div className="box"><b>Core</b><br /><span className="muted">lib/core.js</span></div>
          <span className="arrow">→</span>
          <div>
            <div className="box" style={{ marginBottom: 8 }}><span className="pill mysql">MySQL</span> tables · triggers · procedures<br /><span className="muted">source of truth</span></div>
            <div className="box"><span className="pill neo">Neo4j</span> students · skills · jobs graph<br /><span className="muted">mirrored after each commit</span></div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <h2 style={{ margin: 0 }}>Placement overview{' '}
            {s && (s.inSync ? <span className="pill ok">MySQL ⇄ Neo4j in sync</span> : <span className="pill bad">out of sync / unreachable</span>)}
          </h2>
          <span><button onClick={load}>↻ Refresh</button>{' '}<button onClick={resync}>Rebuild graph from MySQL</button></span>
        </div>
        {msg && <p className="muted">{msg}</p>}
        {s?.errors?.mysql && <p className="pill bad">MySQL: {s.errors.mysql}</p>}
        {s?.errors?.neo4j && <p className="pill bad">Neo4j: {s.errors.neo4j}</p>}
        {my && (
          <div className="grid g4">
            {[['students', 'Students'], ['placed', 'Placed'], ['companies', 'Companies'], ['open_jobs', 'Open jobs'], ['applications', 'Applications'], ['pending_offers', 'Pending offers'], ['avg_package', 'Avg package (LPA)'], ['top_package', 'Top package (LPA)']].map(([k, l]) => (
              <div className="stat" key={k}><b>{my[k]}</b><span>{l}</span></div>
            ))}
          </div>
        )}
        <h2 style={{ marginTop: 18 }}>Department-wise placement <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>(MySQL view v_placement_summary)</span></h2>
        <DataTable rows={summary} />
      </div>

      <div className="card">
        <h2>Live counts: MySQL rows vs Neo4j graph</h2>
        <div className="grid g2">
          <div>
            <p><span className="pill mysql">MySQL rows</span></p>
            <div className="grid g4">
              {my && [['departments', 'Departments'], ['students', 'Students'], ['companies', 'Companies'], ['jobs', 'Jobs'], ['skills', 'Skills'], ['applications', 'Applications'], ['placements', 'Placements'], ['audit_rows', 'Audit rows']].map(([k, l]) => (
                <div className="stat" key={k}><b>{my[k]}</b><span>{l}</span></div>
              ))}
            </div>
          </div>
          <div>
            <p><span className="pill neo">Neo4j graph</span></p>
            <div className="grid g4">
              {nj && [['Department', 'Department nodes'], ['Student', 'Student nodes'], ['Company', 'Company nodes'], ['Job', 'Job nodes'], ['Skill', 'Skill nodes']].map(([k, l]) => (
                <div className="stat" key={k}><b>{nj.nodes[k] ?? 0}</b><span>{l}</span></div>
              ))}
              {nj && [['APPLIED_TO', 'APPLIED_TO edges'], ['PLACED_AT', 'PLACED_AT edges'], ['HAS_SKILL', 'HAS_SKILL edges'], ['REQUIRES', 'REQUIRES edges']].map(([k, l]) => (
                <div className="stat" key={k}><b>{nj.rels[k] ?? 0}</b><span>{l}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Demo checklist (maps to the rubric)</h2>
        <ol>
          <li><Link href="/students">Create / Read / Update / Delete</Link> a student → each action shows the SQL executed and a Neo4j status badge.</li>
          <li>Open the <Link href="/inspector">DB Inspector</Link> (or the MySQL client) to prove the row really changed in the database.</li>
          <li><Link href="/applications">Apply, shortlist, accept an offer</Link> → procedures + triggers run; check <Link href="/placements">placements</Link> and <Link href="/inspector?table=audit_log">audit_log</Link>.</li>
          <li><Link href="/lab">Trigger Lab</Link> → code, BEFORE, fire, AFTER, explanation for every trigger and procedure.</li>
          <li><Link href="/graph">Graph</Link> → skill-based job recommendations from Neo4j; <Link href="/queries">Queries</Link> → nested SQL and Cypher.</li>
        </ol>
      </div>
    </>
  );
}
