// Runs the documentation SQL scripts in the real MySQL container and stores their output
// (the "execution screenshots" as text): docs/evidence/*.txt
//   npm run evidence:sql      (each demo is run on a freshly reset database; run `npm run db:setup` afterwards to resync Neo4j)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const sqlDir = path.join(root, 'docs', 'sql');
const out = path.join(root, 'docs', 'evidence');
fs.mkdirSync(out, { recursive: true });

const run = (input) =>
  spawnSync('docker', ['exec', '-i', '-e', `MYSQL_PWD=${process.env.MYSQL_ROOT_PASSWORD}`, 'placegraph-mysql', 'mysql', '-uroot', '-t', '--force'], { input, encoding: 'utf8' });
const clean = (s) => s.split('\n').filter((l) => !l.includes('Using a password')).join('\n');

/** Start each demo from the pristine seeded database (like `npm run db:setup`, without the graph). */
const reset = () => {
  for (const f of ['01_ddl.sql', '02_triggers.sql', '03_procedures.sql', '04_dml_seed.sql']) run(fs.readFileSync(path.join(sqlDir, f), 'utf8'));
};

const tables = ['departments', 'students', 'companies', 'jobs', 'skills', 'student_skills', 'job_skills', 'applications', 'interview_rounds', 'placements', 'audit_log'];
const createSql = 'USE placegraph;\nSHOW TABLES;\n' + tables.map((t) => `SHOW CREATE TABLE ${t}\\G\nDESCRIBE ${t};`).join('\n');

const explainSql = `USE placegraph;
-- Full-text index (MATCH ... AGAINST) vs a leading-wildcard LIKE that cannot use an index
EXPLAIN SELECT job_id, title FROM jobs WHERE MATCH(title) AGAINST('+engineer*' IN BOOLEAN MODE);
EXPLAIN SELECT job_id, title FROM jobs WHERE title LIKE '%engineer%';
-- Secondary index on applications.status (idx_app_status)
EXPLAIN SELECT application_id FROM applications WHERE status = 'OFFERED';
-- Join using primary/foreign keys
EXPLAIN SELECT s.name, j.title FROM applications a JOIN students s ON s.student_id = a.student_id JOIN jobs j ON j.job_id = a.job_id WHERE a.status = 'OFFERED';
SHOW INDEX FROM jobs;
SHOW INDEX FROM applications;`;

const jobs = [
  ['explain_output.txt', explainSql],
  ['create_tables_output.txt', createSql],
  ['dml_demo_output.txt', fs.readFileSync(path.join(sqlDir, '05_dml_demo.sql'), 'utf8')],
  ['nested_queries_output.txt', 'USE placegraph;\n' + fs.readFileSync(path.join(sqlDir, '06_nested_queries.sql'), 'utf8')],
  ['trigger_demo_output.txt', fs.readFileSync(path.join(sqlDir, '07_trigger_demo.sql'), 'utf8')],
  ['procedure_demo_output.txt', fs.readFileSync(path.join(sqlDir, '08_procedure_demo.sql'), 'utf8')],
];

for (const [file, sql] of jobs) {
  if (/trigger_demo|procedure_demo|dml_demo|nested/.test(file)) reset();
  const r = run(sql);
  const header = `-- Output of running ${file.replace('_output.txt', '')} against MySQL 8.4 (container placegraph-mysql)\n-- Generated ${new Date().toISOString()}\n\n`;
  fs.writeFileSync(path.join(out, file), header + clean(r.stdout) + (r.stderr ? '\n-- messages --\n' + clean(r.stderr) : ''));
  console.log('wrote', file);
}
