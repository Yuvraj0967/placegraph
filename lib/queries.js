// Loads the demo queries straight from the documentation files, so the website
// runs exactly what is printed in the project documentation (single source of truth).
//
//   docs/sql/06_nested_queries.sql          ->  "-- @query Title"
//   docs/neo4j/cypher_queries.cypher         ->  "// @query Title" (+ "// @param name=default")
import fs from 'node:fs';
import path from 'node:path';
import { pool } from './db.js';
import { run } from './graph.js';

function parse(file, prefix) {
  const text = fs.readFileSync(path.join(process.cwd(), 'docs', file), 'utf8');
  const blocks = [];
  let cur = null;
  for (const line of text.split(/\r?\n/)) {
    const q = line.match(new RegExp(`^${prefix}\\s*@query\\s+(.*)$`));
    if (q) {
      cur = { id: blocks.length, title: q[1].trim(), params: {}, lines: [] };
      blocks.push(cur);
      continue;
    }
    if (!cur) continue;
    const p = line.match(new RegExp(`^${prefix}\\s*@param\\s+(\\w+)=(.*)$`));
    if (p) cur.params[p[1]] = p[2].trim();
    else cur.lines.push(line);
  }
  return blocks.map(({ lines, ...b }) => ({
    ...b,
    text: lines.join('\n').replace(/^\s*(--|\/\/)\s*=+.*$/gm, '').trim(),
  }));
}

export const sqlQueries = () => parse('sql/06_nested_queries.sql', '--');
export const cypherQueries = () => parse('neo4j/cypher_queries.cypher', '//');

export async function execute(kind, id, params = {}) {
  const list = kind === 'sql' ? sqlQueries() : cypherQueries();
  const q = list[Number(id)];
  if (!q) throw new Error('Unknown query');
  const text = q.text.replace(/;\s*$/, '');
  if (kind === 'sql') {
    if (!/^\s*select/i.test(text)) throw new Error('Only SELECT statements can be run here');
    const [rows] = await pool.query(text);
    return rows;
  }
  const merged = {};
  for (const [k, def] of Object.entries(q.params)) {
    const v = params[k] ?? def;
    merged[k] = /^-?\d+$/.test(String(v)) ? Number(v) : v;
  }
  return run(text, merged);
}
