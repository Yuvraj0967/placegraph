'use client';
import { useEffect, useState } from 'react';
import { api, DataTable } from '@/components/ui';

function QueryList({ kind, title, badge }) {
  const [items, setItems] = useState([]);
  const [out, setOut] = useState({}); // id -> { rows | error }
  const [params, setParams] = useState({});

  useEffect(() => { api(`/api/queries?kind=${kind}`).then(setItems).catch((e) => setOut({ _: { error: e.message } })); }, [kind]);

  async function run(q) {
    try {
      const qs = new URLSearchParams({ kind, id: q.id, ...(params[q.id] ?? {}) });
      const { rows } = await api(`/api/queries?${qs}`);
      setOut((o) => ({ ...o, [q.id]: { rows } }));
    } catch (e) {
      setOut((o) => ({ ...o, [q.id]: { error: e.message } }));
    }
  }

  return (
    <div className="card">
      <h2>{badge} {title}</h2>
      {out._?.error && <p className="pill bad">{out._.error}</p>}
      {items.map((q) => (
        <div className="qitem" key={q.id}>
          <b>{q.title}</b>
          <pre>{q.text}</pre>
          <div className="toolbar" style={{ marginTop: 8 }}>
            <span style={{ display: 'flex', gap: 8 }}>
              {Object.entries(q.params).map(([k, def]) => (
                <input key={k} style={{ width: 120 }} placeholder={`${k}=${def}`} title={k}
                  onChange={(e) => setParams((p) => ({ ...p, [q.id]: { ...(p[q.id] ?? {}), [k]: e.target.value } }))} />
              ))}
            </span>
            <button className="primary" onClick={() => run(q)}>▶ Run</button>
          </div>
          {out[q.id]?.error && <p className="pill bad">{out[q.id].error}</p>}
          {out[q.id]?.rows && <DataTable rows={out[q.id].rows} empty="Query ran — 0 rows returned." />}
        </div>
      ))}
    </div>
  );
}

export default function QueriesPage() {
  return (
    <>
      <h1>Queries</h1>
      <p className="sub">These are the exact queries stored in <code>docs/sql/06_nested_queries.sql</code> and <code>docs/neo4j/cypher_queries.cypher</code> — executed live.</p>
      <QueryList kind="sql" title="Nested SQL queries (MySQL)" badge={<span className="pill mysql">MySQL</span>} />
      <QueryList kind="cypher" title="Cypher queries (Neo4j)" badge={<span className="pill neo">Neo4j</span>} />
    </>
  );
}
