'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, Notice } from './ui';
import { useAuth } from './Auth';

/**
 * Generic Create / Read / Update / Delete page.
 *  idKey:   name of the id column of the rows (e.g. 'student_id')
 *  fields:  [{ name, label, type: 'text'|'number'|'email'|'date'|'select'|'multi', from, value, optionLabel,
 *              choices, filter, step, min, max, default, required, createOnly, editOnly }]
 *  columns: [{ key, label, render?: (row) => node }]
 *  rowActions: [{ label, method, body, message, show: (row) => bool }]   (officers only)
 *  searchable: shows a search box (FULLTEXT / LIKE on the server)
 *  filters:   [{ name, label, options: ['A','B'] | [{ value, label }] }] sent as query parameters
 *  studentCanCreate: students may use the create form (e.g. apply for a job); fields with officerOnly are hidden for them
 */
export default function CrudPage({
  resource, idKey, title, blurb, columns, fields, canCreate = true, canEdit = true, canDelete = true,
  rowActions = [], createLabel = 'Add new', singular = 'record', searchable = false, filters = [], studentCanCreate = false,
}) {
  const { user } = useAuth();
  const isOfficer = user.role === 'officer';
  canCreate = canCreate && (isOfficer || studentCanCreate);
  canEdit = canEdit && isOfficer;
  canDelete = canDelete && isOfficer;
  rowActions = isOfficer ? rowActions : [];
  const [q, setQ] = useState('');
  const [filterVals, setFilterVals] = useState({});
  const [rows, setRows] = useState([]);
  const [options, setOptions] = useState({});
  const [form, setForm] = useState(null); // { mode, id, values }
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams();
      if (q.trim()) qs.set('q', q.trim());
      for (const [k, v] of Object.entries(filterVals)) if (v) qs.set(k, v);
      setRows(await api(`/api/${resource}${qs.size ? `?${qs}` : ''}`));
      const sources = [...new Set(fields.filter((f) => f.from).map((f) => f.from))];
      const loaded = {};
      await Promise.all(sources.map(async (s) => (loaded[s] = await api(`/api/${s}`))));
      setOptions(loaded);
    } catch (e) {
      setNotice({ error: e.message });
    }
  }, [resource, fields, q, filterVals]);

  // reload when the search text / filters change (search waits 300 ms after typing stops)
  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const emptyValue = (f) => (f.type === 'multi' ? [] : f.default ?? '');
  const openCreate = () => {
    const values = {};
    fields.forEach((f) => { if (!f.editOnly) values[f.name] = emptyValue(f); });
    setForm({ mode: 'create', values });
  };
  const openEdit = (row) => {
    const values = {};
    fields.forEach((f) => { if (!f.createOnly) values[f.name] = row[f.name] ?? emptyValue(f); });
    setForm({ mode: 'edit', id: row[idKey], values });
  };
  const setValue = (name, v) => setForm((fm) => ({ ...fm, values: { ...fm.values, [name]: v } }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const creating = form.mode === 'create';
      const res = await api(creating ? `/api/${resource}` : `/api/${resource}/${form.id}`, {
        method: creating ? 'POST' : 'PUT',
        body: JSON.stringify(form.values),
      });
      setNotice({ ...res, message: creating ? `Created ${singular} in the database` : `Updated ${singular} in the database` });
      setForm(null);
      await load();
    } catch (err) {
      setNotice({ error: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function act(row, method, message, body, confirmText) {
    if (confirmText && !confirm(confirmText)) return;
    try {
      const res = await api(`/api/${resource}/${row[idKey]}`, { method, body: method === 'PUT' ? JSON.stringify(body ?? {}) : undefined });
      setNotice({ ...res, message });
      await load();
    } catch (err) {
      setNotice({ error: err.message });
    }
  }

  const visible = fields.filter((f) => (form?.mode === 'create' ? !f.editOnly : !f.createOnly) && (isOfficer || !f.officerOnly));

  const input = (f) => {
    const v = form.values[f.name];
    if (f.type === 'multi') {
      const chosen = new Set((v ?? []).map(Number));
      return (
        <div className="checks">
          {(options[f.from] ?? []).map((o) => (
            <label key={o[f.value]} className="check">
              <input type="checkbox" id={`${f.name}-${o[f.value]}`} checked={chosen.has(o[f.value])}
                onChange={(e) => {
                  const next = new Set(chosen);
                  e.target.checked ? next.add(o[f.value]) : next.delete(o[f.value]);
                  setValue(f.name, [...next]);
                }} />
              {f.optionLabel(o)}
            </label>
          ))}
        </div>
      );
    }
    if (f.type === 'select') {
      const opts = f.choices ? f.choices.map((c) => ({ v: c, l: c })) : (options[f.from] ?? []).filter(f.filter ?? (() => true)).map((o) => ({ v: o[f.value], l: f.optionLabel(o) }));
      return (
        <select id={f.name} required={f.required} value={v ?? ''} onChange={(e) => setValue(f.name, e.target.value)}>
          <option value="">{f.required ? '— choose —' : '— none —'}</option>
          {opts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      );
    }
    return (
      <input id={f.name} type={f.type ?? 'text'} required={f.required} min={f.min} max={f.max} step={f.step}
        value={v ?? ''} onChange={(e) => setValue(f.name, e.target.value)} />
    );
  };

  return (
    <>
      <h1>{title}</h1>
      <p className="sub">{blurb}</p>
      <Notice notice={notice} inspectTable={resource === 'rounds' ? 'interview_rounds' : resource} />

      {form && (
        <form className="card" onSubmit={submit}>
          <h2>{form.mode === 'create' ? createLabel : `Edit ${singular} #${form.id}`}</h2>
          <div className="formgrid">
            {visible.map((f) => (
              <div key={f.name} style={f.type === 'multi' ? { gridColumn: '1 / -1' } : undefined}>
                <label htmlFor={f.name}>{f.label}{f.required && ' *'}</label>
                {input(f)}
              </div>
            ))}
          </div>
          <button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>{' '}
          <button type="button" onClick={() => setForm(null)}>Cancel</button>
        </form>
      )}

      <div className="card">
        <div className="toolbar">
          <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {searchable && <input aria-label="Search" placeholder="Search…" style={{ width: 220 }} value={q} onChange={(e) => setQ(e.target.value)} />}
            {filters.map((fl) => (
              <select key={fl.name} aria-label={fl.label} style={{ width: 'auto' }} value={filterVals[fl.name] ?? ''} onChange={(e) => setFilterVals({ ...filterVals, [fl.name]: e.target.value })}>
                <option value="">{fl.label}: all</option>
                {fl.options.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
              </select>
            ))}
            <span className="muted">{rows.length} row(s) read from MySQL</span>
          </span>
          <span>
            <button onClick={load}>↻ Refresh</button>{' '}
            {canCreate && <button className="primary" onClick={openCreate}>＋ {createLabel}</button>}
          </span>
        </div>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}{(canEdit || canDelete || rowActions.length > 0) && <th>Actions</th>}</tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row[idKey]} className={row.overdue || row.expired ? 'overdue' : ''}>
                  {columns.map((c) => <td key={c.key}>{c.render ? c.render(row) : row[c.key] ?? '—'}</td>)}
                  {(canEdit || canDelete || rowActions.length > 0) && (
                    <td className="actions">
                      {rowActions.filter((a) => a.show(row)).map((a) => (
                        <button key={a.label} onClick={() => act(row, a.method ?? 'PUT', a.message, a.body)}>{a.label}</button>
                      ))}
                      {canEdit && <button onClick={() => openEdit(row)}>Edit</button>}
                      {canDelete && (
                        <button className="danger"
                          onClick={() => act(row, 'DELETE', `Deleted ${singular} from the database`, undefined, `Delete this ${singular}? This cannot be undone.`)}>
                          Delete
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={columns.length + 1} className="muted">No records yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
