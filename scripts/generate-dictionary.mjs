// Generates docs/DATA_DICTIONARY.md from the REAL installed catalog (information_schema).
//   npm run db:dictionary
import fs from 'node:fs';
import { pool } from '../lib/db.js';

const db = process.env.MYSQL_DATABASE;
const q = async (sql, p = []) => (await pool.query(sql, p))[0];
const md = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const table = (head, rows) => `| ${head.join(' | ')} |\n|${head.map(() => '---').join('|')}|\n${rows.map((r) => `| ${r.map(md).join(' | ')} |`).join('\n')}\n`;

const tables = await q("SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME", [db]);
let out = `# Data dictionary\n\nGenerated from the installed MySQL catalog (\`information_schema\`) by \`npm run db:dictionary\` on ${new Date().toISOString().slice(0, 10)}. Do not edit by hand; re-run the script after schema changes.\n\n`;

for (const { t } of tables) {
  const cols = await q(
    `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT, EXTRA FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`, [db, t]);
  const fks = await q(
    `SELECT k.CONSTRAINT_NAME, GROUP_CONCAT(k.COLUMN_NAME ORDER BY k.ORDINAL_POSITION) AS cols, k.REFERENCED_TABLE_NAME AS ref,
            GROUP_CONCAT(k.REFERENCED_COLUMN_NAME ORDER BY k.ORDINAL_POSITION) AS refcols, r.DELETE_RULE, r.UPDATE_RULE
     FROM information_schema.KEY_COLUMN_USAGE k
     JOIN information_schema.REFERENTIAL_CONSTRAINTS r ON r.CONSTRAINT_SCHEMA = k.TABLE_SCHEMA AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
     WHERE k.TABLE_SCHEMA = ? AND k.TABLE_NAME = ? AND k.REFERENCED_TABLE_NAME IS NOT NULL
     GROUP BY k.CONSTRAINT_NAME, k.REFERENCED_TABLE_NAME, r.DELETE_RULE, r.UPDATE_RULE`, [db, t]);
  const checks = await q(
    `SELECT c.CONSTRAINT_NAME, c.CHECK_CLAUSE FROM information_schema.CHECK_CONSTRAINTS c
     JOIN information_schema.TABLE_CONSTRAINTS tc ON tc.CONSTRAINT_SCHEMA = c.CONSTRAINT_SCHEMA AND tc.CONSTRAINT_NAME = c.CONSTRAINT_NAME
     WHERE tc.TABLE_SCHEMA = ? AND tc.TABLE_NAME = ?`, [db, t]);
  const idx = await q(
    `SELECT INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols, IF(NON_UNIQUE = 0, 'unique', 'non-unique') AS uniq, INDEX_TYPE
     FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? GROUP BY INDEX_NAME, NON_UNIQUE, INDEX_TYPE ORDER BY INDEX_NAME`, [db, t]);

  out += `## ${t}\n\n` + table(['Column', 'Type', 'Null', 'Key', 'Default', 'Extra'], cols.map((c) => [c.COLUMN_NAME, c.COLUMN_TYPE, c.IS_NULLABLE, c.COLUMN_KEY, c.COLUMN_DEFAULT ?? '', c.EXTRA]));
  if (fks.length) out += `\nForeign keys\n\n` + table(['Name', 'Columns', 'References', 'On delete', 'On update'], fks.map((f) => [f.CONSTRAINT_NAME, f.cols, `${f.ref}(${f.refcols})`, f.DELETE_RULE, f.UPDATE_RULE]));
  if (checks.length) out += `\nCHECK constraints\n\n` + table(['Name', 'Rule'], checks.map((c) => [c.CONSTRAINT_NAME, c.CHECK_CLAUSE]));
  out += `\nIndexes\n\n` + table(['Name', 'Columns', 'Unique', 'Type'], idx.map((i) => [i.INDEX_NAME, i.cols, i.uniq, i.INDEX_TYPE]));
  out += '\n';
}

const views = await q('SELECT TABLE_NAME AS name FROM information_schema.VIEWS WHERE TABLE_SCHEMA = ? ORDER BY 1', [db]);
const trig = await q('SELECT TRIGGER_NAME AS name, ACTION_TIMING AS timing, EVENT_MANIPULATION AS event, EVENT_OBJECT_TABLE AS tbl FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = ? ORDER BY EVENT_OBJECT_TABLE, TRIGGER_NAME', [db]);
const routines = await q('SELECT ROUTINE_NAME AS name, ROUTINE_TYPE AS type FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ? ORDER BY 1', [db]);
const [[counts]] = await pool.query(
  `SELECT (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE') AS tables,
          (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = ?) AS constraints`, [db, db]);

out += `## Views\n\n${views.map((v) => `- \`${v.name}\``).join('\n')}\n\n## Triggers (${trig.length})\n\n` + table(['Name', 'Timing', 'Event', 'Table'], trig.map((t) => [t.name, t.timing, t.event, t.tbl]));
out += `\n## Stored procedures\n\n${routines.map((r) => `- \`${r.name}\` (${r.type})`).join('\n')}\n\n## Totals\n\n${counts.tables} tables, ${views.length} views, ${trig.length} triggers, ${routines.length} routines, ${counts.constraints} table constraints (PK, FK, UNIQUE, CHECK).\n`;

fs.writeFileSync('docs/DATA_DICTIONARY.md', out);
console.log(`wrote docs/DATA_DICTIONARY.md - ${counts.tables} tables, ${views.length} views, ${trig.length} triggers, ${routines.length} routines`);
process.exit(0);
