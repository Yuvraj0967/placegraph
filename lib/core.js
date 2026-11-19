// =====================================================================
//  THE CORE. Everything (UI, API routes, setup scripts) goes through here.
//
//   UI --> API route --> core --> 1) MySQL  (tables, triggers, stored procedures)
//                              \-> 2) Neo4j (graph projection of what changed)
//
//  MySQL is the system of record. After each successful SQL write the affected
//  row is re-read from MySQL and mirrored into Neo4j. Workflow resources
//  (applications, interview rounds) change several rows through triggers, so
//  those trigger a full graph rebuild from MySQL (the data set is small).
//  The response tells the UI whether both stores were updated, plus the SQL that ran.
// =====================================================================
import { pool, format } from './db.js';
import * as graph from './graph.js';
import { resources, inspectable } from './resources.js';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Translate MySQL errors (constraints, SIGNAL from triggers/procedures) into readable messages. */
export function friendly(err) {
  if (err instanceof HttpError) return err;
  if (err.errno === 1062) return new HttpError(409, `Duplicate value - that already exists (${err.sqlMessage}).`);
  if (err.errno === 1451) return new HttpError(409, 'Cannot delete: other records still reference this row (foreign key RESTRICT).');
  if (err.errno === 1452) return new HttpError(400, 'Invalid reference: the related record does not exist.');
  if (err.errno === 3819) return new HttpError(400, 'A CHECK constraint was violated (e.g. CGPA must be 0-10).');
  if (err.errno === 1048) return new HttpError(400, 'A required field is missing.');
  if (err.sqlState === '45000') return new HttpError(400, err.sqlMessage); // raised by our triggers/procedures
  return err;
}

function getResource(name) {
  const r = resources[name];
  if (!r) throw new HttpError(404, `Unknown resource "${name}"`);
  return r;
}

/** Whitelist + normalise the incoming body. '' -> NULL, numeric fields -> numbers. */
function clean(r, body = {}) {
  const out = {};
  for (const f of r.fields) {
    if (!(f in body)) continue;
    let v = body[f];
    if (typeof v === 'string') v = v.trim();
    if (v === '' || v === undefined) v = null;
    if (v !== null && r.numeric?.includes(f)) {
      v = Number(v);
      if (!Number.isFinite(v)) throw new HttpError(400, `"${f}" must be a number`);
    }
    out[f] = v;
  }
  return out;
}

function checkRequired(r, data, partial) {
  for (const f of r.required ?? []) {
    if (partial && !(f in data)) continue;
    if (data[f] === null || data[f] === undefined) throw new HttpError(400, `"${f}" is required`);
  }
}

/** Run + record a SQL statement (the recorded text is shown in the UI). */
async function exec(conn, sqlLog, sql, params = []) {
  sqlLog.push(format(sql, params).replace(/\s+/g, ' ').trim());
  const [res] = await conn.query(sql, params);
  return res;
}

async function syncGraph(fn) {
  try {
    await fn();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

const parseKey = (id) => {
  const m = String(id).match(/^(\d+)-(\d+)$/);
  if (!m) throw new HttpError(400, 'Invalid interview round id');
  return [Number(m[1]), Number(m[2])];
};

async function fetchOne(conn, r, id) {
  if (r.composite) {
    const [a, n] = parseKey(id);
    const [rows] = await conn.query(`${r.base} WHERE r.application_id = ? AND r.round_no = ?`, [a, n]);
    return rows[0];
  }
  const [rows] = await conn.query(`${r.base} WHERE ${r.alias}.${r.pk} = ?`, [id]);
  return rows[0];
}

/** Replace the M:N links (student_skills / job_skills) with the submitted skill ids. */
async function setLinks(conn, sql, r, id, ids) {
  if (!r.links || ids === undefined) return;
  const list = [...new Set((ids ?? []).map(Number).filter(Boolean))];
  await exec(conn, sql, `DELETE FROM ${r.links.table} WHERE ${r.links.key} = ?`, [id]);
  if (list.length) {
    await exec(conn, sql, `INSERT INTO ${r.links.table} (${r.links.key}, skill_id) VALUES ${list.map((s) => `(${id}, ${s})`).join(', ')}`);
  }
}

/** Workflow resources touch many rows through triggers: rebuild the whole graph. */
const FULL_SYNC = new Set(['applications', 'rounds']);
const projectToGraph = (name, row) => (FULL_SYNC.has(name) ? resyncGraph() : graph.upsert(name, row));

/** Search = FULLTEXT (MATCH ... AGAINST) when every word has 3+ letters and one table is searched, otherwise LIKE. */
function searchClause(cols, q) {
  const words = String(q).split(/\s+/).map((w) => w.replace(/[^\p{L}\p{N}_]/gu, '')).filter(Boolean);
  if (!words.length) return null;
  const oneTable = new Set(cols.map((c) => c.split('.')[0])).size === 1; // MATCH needs the columns of ONE table with a FULLTEXT index
  if (oneTable && words.every((w) => w.length >= 3)) {
    return { sql: `MATCH(${cols.join(', ')}) AGAINST(? IN BOOLEAN MODE)`, params: [words.map((w) => `+${w}*`).join(' ')] };
  }
  const like = words.map(() => `(${cols.map((c) => `${c} LIKE ?`).join(' OR ')})`).join(' AND ');
  return { sql: like, params: words.flatMap((w) => cols.map(() => `%${w}%`)) };
}

// ------------------------------------------------------------------ READ
// opts: { q: search text, <filter name>: value, scope: { student_id } }
export async function list(name, opts = {}) {
  const r = getResource(name);
  const where = [];
  const params = [];
  if (opts.scope && r.scopeCol) { where.push(`${r.scopeCol} = ?`); params.push(opts.scope.student_id); }
  if (opts.q && r.search) {
    const s = searchClause(r.search, opts.q);
    if (s) { where.push(s.sql); params.push(...s.params); }
  }
  for (const [key, col] of Object.entries(r.filters ?? {})) {
    if (opts[key] !== undefined && opts[key] !== '') { where.push(`${col} = ?`); params.push(opts[key]); }
  }
  const [rows] = await pool.query(
    `${r.base}${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY ${r.order ?? `${r.alias}.${r.pk} DESC`}`,
    params,
  );
  return rows;
}

// ------------------------------------------------------------------ CREATE
export async function create(name, body) {
  const r = getResource(name);
  if (r.readOnly) throw new HttpError(405, 'Placements are created automatically when an offer is accepted');
  const sql = [];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let id;

    if (name === 'applications') {
      const sid = Number(body.student_id), jid = Number(body.job_id);
      if (!sid || !jid) throw new HttpError(400, 'student and job are required');
      await exec(conn, sql, 'CALL sp_apply(?, ?, @new_id)', [sid, jid]);
      id = (await conn.query('SELECT @new_id AS id'))[0][0].id;
    } else if (name === 'rounds') {
      const app = Number(body.application_id);
      if (!app || !body.round_type || !body.scheduled_on) throw new HttpError(400, 'application, round type and date are required');
      await exec(conn, sql, 'CALL sp_schedule_round(?, ?, ?, @new_round)', [app, body.round_type, body.scheduled_on]);
      const [[o]] = await conn.query('SELECT @new_round AS n');
      id = `${app}-${o.n}`;
    } else {
      const data = clean(r, body);
      checkRequired(r, data, false);
      const cols = Object.keys(data);
      const res = await exec(conn, sql, `INSERT INTO ${r.table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, cols.map((c) => data[c]));
      id = res.insertId;
      await setLinks(conn, sql, r, id, body.skill_ids ?? []);
    }

    await conn.commit();
    const row = await fetchOne(conn, r, id);
    return { data: row, sql, graph: await syncGraph(() => projectToGraph(name, row)) };
  } catch (e) {
    await conn.rollback().catch(() => {});
    throw friendly(e);
  } finally {
    conn.release();
  }
}

// ------------------------------------------------------------------ UPDATE
const STATUS_OF = { shortlist: 'SHORTLISTED', offer: 'OFFERED', reject: 'REJECTED', withdraw: 'WITHDRAWN' };

export async function update(name, id, body) {
  const r = getResource(name);
  if (r.readOnly) throw new HttpError(405, 'Placements are read-only');
  const sql = [];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (!(await fetchOne(conn, r, id))) throw new HttpError(404, 'Record not found');

    if (name === 'applications') {
      // workflow actions are stored procedures; triggers do the rest
      if (body.action === 'accept') await exec(conn, sql, 'CALL sp_accept_offer(?)', [id]);
      else if (STATUS_OF[body.action]) await exec(conn, sql, 'CALL sp_update_application_status(?, ?)', [id, STATUS_OF[body.action]]);
      else throw new HttpError(400, 'Unknown action (use shortlist, offer, accept, reject or withdraw)');
    } else if (name === 'rounds') {
      const [app, round] = parseKey(id);
      if (!['PASSED', 'FAILED'].includes(body.result)) throw new HttpError(400, 'result must be PASSED or FAILED');
      await exec(conn, sql, 'CALL sp_set_round_result(?, ?, ?)', [app, round, body.result]);
    } else {
      const data = clean(r, body);
      checkRequired(r, data, true);
      const cols = Object.keys(data);
      if (cols.length) {
        await exec(conn, sql, `UPDATE ${r.table} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE ${r.pk} = ?`, [...cols.map((c) => data[c]), id]);
      }
      await setLinks(conn, sql, r, id, body.skill_ids);
    }

    await conn.commit();
    const row = await fetchOne(conn, r, id);
    return { data: row, sql, graph: await syncGraph(() => projectToGraph(name, row)) };
  } catch (e) {
    await conn.rollback().catch(() => {});
    throw friendly(e);
  } finally {
    conn.release();
  }
}

// ------------------------------------------------------------------ DELETE
export async function remove(name, id) {
  const r = getResource(name);
  if (r.readOnly) throw new HttpError(405, 'Placements are read-only');
  const sql = [];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const before = await fetchOne(conn, r, id);
    if (!before) throw new HttpError(404, 'Record not found');
    if (r.composite) {
      const [a, n] = parseKey(id);
      await exec(conn, sql, `DELETE FROM ${r.table} WHERE application_id = ? AND round_no = ?`, [a, n]);
    } else {
      await exec(conn, sql, `DELETE FROM ${r.table} WHERE ${r.pk} = ?`, [id]);
    }
    await conn.commit();
    // deleting applications/rounds/students can cascade into placements: rebuild for those
    const full = FULL_SYNC.has(name) || name === 'students';
    return { data: before, sql, graph: await syncGraph(() => (full ? resyncGraph() : graph.remove(name, id))) };
  } catch (e) {
    await conn.rollback().catch(() => {});
    throw friendly(e);
  } finally {
    conn.release();
  }
}

// ------------------------------------------------------------------ SYNC / STATS / INSPECT
/** Rebuild the whole graph from MySQL (used by setup, workflow actions and the "Rebuild" button). */
export async function resyncGraph() {
  const names = ['departments', 'skills', 'companies', 'students', 'jobs', 'applications', 'placements'];
  const data = Object.fromEntries(await Promise.all(names.map(async (n) => [n, await list(n)])));
  await graph.rebuild(data);
  return Object.fromEntries(names.map((n) => [n, data[n].length]));
}

export async function stats() {
  const out = { mysql: null, neo4j: null, inSync: false, errors: {} };
  try {
    const [[row]] = await pool.query(
      `SELECT (SELECT COUNT(*) FROM departments)  AS departments,
              (SELECT COUNT(*) FROM students)     AS students,
              (SELECT COUNT(*) FROM students WHERE is_placed = 1) AS placed,
              (SELECT COUNT(*) FROM companies)    AS companies,
              (SELECT COUNT(*) FROM jobs)         AS jobs,
              (SELECT COUNT(*) FROM jobs WHERE deadline >= CURDATE() AND openings > 0) AS open_jobs,
              (SELECT COUNT(*) FROM skills)       AS skills,
              (SELECT COUNT(*) FROM applications) AS applications,
              (SELECT COUNT(*) FROM applications WHERE status = 'OFFERED') AS pending_offers,
              (SELECT COUNT(*) FROM placements)   AS placements,
              (SELECT IFNULL(ROUND(AVG(package_lpa), 2), 0) FROM placements) AS avg_package,
              (SELECT IFNULL(MAX(package_lpa), 0) FROM placements) AS top_package,
              (SELECT COUNT(*) FROM audit_log)    AS audit_rows`,
    );
    out.mysql = row;
  } catch (e) {
    out.errors.mysql = e.message;
  }
  try {
    out.neo4j = await graph.counts();
  } catch (e) {
    out.errors.neo4j = e.message;
  }
  if (out.mysql && out.neo4j) {
    const n = out.neo4j.nodes;
    const rel = out.neo4j.rels;
    out.inSync =
      (n.Department ?? 0) === out.mysql.departments &&
      (n.Student ?? 0) === out.mysql.students &&
      (n.Company ?? 0) === out.mysql.companies &&
      (n.Job ?? 0) === out.mysql.jobs &&
      (n.Skill ?? 0) === out.mysql.skills &&
      (rel.APPLIED_TO ?? 0) === out.mysql.applications &&
      (rel.PLACED_AT ?? 0) === out.mysql.placements;
  }
  return out;
}

export async function inspect(table) {
  const sql = inspectable[table];
  if (!sql) throw new HttpError(404, 'Unknown table');
  const [rows] = await pool.query(sql);
  return rows;
}
