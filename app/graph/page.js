'use client';
import { useEffect, useMemo, useState } from 'react';
import { api, DataTable } from '@/components/ui';
import { useAuth } from '@/components/Auth';

const COLORS = { Student: '#2f5bea', Job: '#e8590c', Company: '#2b8a3e', Skill: '#9c36b5', Department: '#868e96' };
const EDGE = { APPLIED_TO: '#e8590c', PLACED_AT: '#12805c', HAS_SKILL: '#9c36b5', REQUIRES: '#c2255c', POSTED: '#2b8a3e', IN_DEPT: '#adb5bd' };

/** Fruchterman-Reingold layout, computed once (the graph is small). */
function layout(nodes, edges, W, H) {
  const idx = new Map(nodes.map((n, i) => [`${n.label}:${n.id}`, i]));
  const n = nodes.length;
  const pts = nodes.map((_, i) => ({ x: W / 2 + Math.cos((i / n) * 6.283) * W * 0.3, y: H / 2 + Math.sin((i / n) * 6.283) * H * 0.3, dx: 0, dy: 0 }));
  const links = edges.map((e) => [idx.get(`${e.fromLabel}:${e.fromId}`), idx.get(`${e.toLabel}:${e.toId}`)]).filter(([a, b]) => a !== undefined && b !== undefined);
  const k = Math.sqrt((W * H) / Math.max(n, 1)) * 0.5;
  let t = W / 8;
  for (let it = 0; it < 300; it++) {
    for (const p of pts) { p.dx = 0; p.dy = 0; }
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const vx = pts[i].x - pts[j].x, vy = pts[i].y - pts[j].y;
        const d = Math.max(Math.hypot(vx, vy), 0.01);
        const f = (k * k) / d;
        pts[i].dx += (vx / d) * f; pts[i].dy += (vy / d) * f;
        pts[j].dx -= (vx / d) * f; pts[j].dy -= (vy / d) * f;
      }
    }
    for (const [a, b] of links) {
      const vx = pts[a].x - pts[b].x, vy = pts[a].y - pts[b].y;
      const d = Math.max(Math.hypot(vx, vy), 0.01);
      const f = (d * d) / k;
      pts[a].dx -= (vx / d) * f; pts[a].dy -= (vy / d) * f;
      pts[b].dx += (vx / d) * f; pts[b].dy += (vy / d) * f;
    }
    for (const p of pts) {
      p.dx += (W / 2 - p.x) * 0.2; p.dy += (H / 2 - p.y) * 0.2; // gentle gravity
      const d = Math.max(Math.hypot(p.dx, p.dy), 0.01);
      p.x += (p.dx / d) * Math.min(d, t); p.y += (p.dy / d) * Math.min(d, t);
      p.x = Math.max(60, Math.min(W - 60, p.x)); p.y = Math.max(40, Math.min(H - 30, p.y));
    }
    t *= 0.985;
  }
  return { pts, links, idx };
}

export default function GraphPage() {
  const { user } = useAuth();
  const isStudent = user.role === 'student';
  const [snap, setSnap] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [rec, setRec] = useState(null);
  const [error, setError] = useState('');
  const [hover, setHover] = useState(null);
  const W = 1100, H = 560;

  const load = async () => {
    try {
      if (isStudent) { setStudentId(String(user.student_id)); return; } // students only see their own matches (the API enforces this too)
      setSnap(await api('/api/graph/snapshot'));
      const m = await api('/api/students');
      setStudents(m);
      if (!studentId && m.length) setStudentId(String(m.find((x) => !x.is_placed)?.student_id ?? m[0].student_id));
    } catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  useEffect(() => {
    if (!studentId) return;
    api(`/api/graph/recommend?studentId=${studentId}`).then(setRec).catch((e) => setError(e.message));
  }, [studentId]);

  const g = useMemo(() => (snap ? layout(snap.nodes, snap.edges, W, H) : null), [snap]);

  return (
    <>
      <h1>{isStudent ? 'My job matches (Neo4j)' : 'Graph (Neo4j)'}</h1>
      <p className="sub">Everything below is read from Neo4j. Add a student, job or application on the other pages, then come back — the node/edge appears here.</p>
      {error && <p className="pill bad">{error}</p>}

      {!isStudent && <div className="card">
        <div className="toolbar">
          <span>{Object.entries(COLORS).map(([l, c]) => <span key={l} style={{ marginRight: 14 }}><span style={{ color: c }}>●</span> {l}</span>)}
            <span className="muted"> · edges: HAS_SKILL, REQUIRES, POSTED, IN_DEPT, APPLIED_TO (dashed = rejected/withdrawn), PLACED_AT (thick green)</span></span>
          <button onClick={load}>↻ Refresh</button>
        </div>
        <svg className="graph" viewBox={`0 0 ${W} ${H}`}>
          {g && snap.edges.map((e, i) => {
            const a = g.idx.get(`${e.fromLabel}:${e.fromId}`), b = g.idx.get(`${e.toLabel}:${e.toId}`);
            if (a === undefined || b === undefined) return null;
            return <line key={i} x1={g.pts[a].x} y1={g.pts[a].y} x2={g.pts[b].x} y2={g.pts[b].y}
              stroke={EDGE[e.type] ?? '#8a93a8'} strokeOpacity=".55" strokeWidth={e.type === 'PLACED_AT' ? 2.4 : 1.3}
              strokeDasharray={['REJECTED', 'WITHDRAWN'].includes(e.status) ? '4 3' : undefined} />;
          })}
          {g && snap.nodes.map((n, i) => (
            <g key={i} transform={`translate(${g.pts[i].x},${g.pts[i].y})`} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(null)}>
              <circle r={n.label === 'Skill' ? 6 : n.label === 'Department' ? 12 : 9} fill={COLORS[n.label]} />
              <text y={-13} textAnchor="middle" fontSize="10" fill="currentColor">{String(n.name).slice(0, 22)}</text>
            </g>
          ))}
        </svg>
        <p className="muted">{hover ? `${hover.label} #${hover.id}: ${hover.name}` : `${snap?.nodes.length ?? 0} nodes · ${snap?.edges.length ?? 0} relationships`}</p>
      </div>}

      <div className="card">
        <div className="toolbar">
          <h2 style={{ margin: 0 }}>{isStudent ? `Open jobs that fit your skills (${user.student_name})` : 'Job matches for a student (Cypher)'}</h2>
          {!isStudent && <select style={{ width: 300 }} value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            {students.map((m) => <option key={m.student_id} value={m.student_id}>{m.name} (CGPA {m.cgpa}{m.is_placed ? ', placed' : ''})</option>)}
          </select>}
        </div>
        <div className="grid">
          <div>
            <b>Best open jobs by skill match</b>
            <p className="muted" style={{ margin: '2px 0 6px' }}>Student → HAS_SKILL → Skill ← REQUIRES ← Job (jobs not applied to yet; missing_skills = the skill gap)</p>
            <DataTable rows={rec?.jobs} empty="No open jobs left to recommend." />
          </div>
          <div>
            <b>Peers with similar skills</b>
            <p className="muted" style={{ margin: '2px 0 6px' }}>Student → HAS_SKILL → Skill ← HAS_SKILL ← other Student</p>
            <DataTable rows={rec?.similar} empty="No peers share skills." />
          </div>
        </div>
      </div>
    </>
  );
}
