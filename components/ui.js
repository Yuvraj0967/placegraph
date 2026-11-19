'use client';

export async function api(url, options) {
  const res = await fetch(url, { cache: 'no-store', headers: { 'Content-Type': 'application/json' }, ...options });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

const show = (v) => (v === null || v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));

/** Generic table for arbitrary rows (used by Inspector and Queries). */
export function DataTable({ rows, empty = 'No rows', baseline }) {
  if (!rows?.length) return <p className="muted">{empty}</p>;
  const cols = Object.keys(rows[0]);
  // rows not present in `baseline` (the BEFORE snapshot) are highlighted as new / changed
  const seen = baseline ? new Set(baseline.map((r) => JSON.stringify(r))) : null;
  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={seen && !seen.has(JSON.stringify(r)) ? 'changed' : ''}>
              {cols.map((c) => (
                <td key={c} className={typeof r[c] === 'object' && r[c] ? 'wrap' : ''}>{show(r[c])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Banner shown after every write: proves MySQL + Neo4j were both updated and shows the SQL that ran. */
export function Notice({ notice, inspectTable }) {
  if (!notice) return null;
  if (notice.error) return <div className="notice bad"><b>✖ {notice.error}</b></div>;
  const g = notice.graph;
  return (
    <div className="notice ok">
      <b>✔ {notice.message}</b>
      <div className="row">
        <span className="pill mysql">MySQL ✔ committed</span>
        {g?.ok ? <span className="pill neo">Neo4j ✔ graph updated</span> : <span className="pill bad">Neo4j ✖ {g?.error}</span>}
        {inspectTable && <a href={`/inspector?table=${inspectTable}`}>Verify in DB Inspector →</a>}
        <a href="/inspector?table=audit_log">See trigger audit log →</a>
      </div>
      {notice.sql?.map((s, i) => (
        <code key={i} className="sql" style={{ display: 'block' }}>{s}</code>
      ))}
    </div>
  );
}
