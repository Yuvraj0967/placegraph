// One-shot database setup (reads credentials ONLY from .env):
//   npm run db:setup
//  1. waits for the MySQL + Neo4j containers
//  2. runs docs/sql/01..04 inside MySQL (DDL, triggers, procedures, seed DML) as root
//  3. creates the demo accounts (2 officers + one account per student) with bcrypt-hashed passwords
//  4. builds the Neo4j graph from the freshly seeded MySQL data
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { requireEnv } from '../lib/env.js';
import { pool } from '../lib/db.js';
import { hashPassword } from '../lib/auth-hash.js';
import { resyncGraph, stats } from '../lib/core.js';
import { ping } from '../lib/graph.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const container = 'placegraph-mysql';
const sqlDir = path.join(process.cwd(), 'docs', 'sql');
const rootPassword = requireEnv('MYSQL_ROOT_PASSWORD');

// the root password travels in the environment of the docker exec, never on a command line
function mysqlCli(args, input) {
  return spawnSync('docker', ['exec', '-i', '-e', `MYSQL_PWD=${rootPassword}`, container, 'mysql', '-uroot', ...args], { input, encoding: 'utf8' });
}

console.log('Waiting for MySQL...');
for (let i = 0; ; i++) {
  if (mysqlCli(['-e', 'SELECT 1']).status === 0) break;
  if (i > 60) throw new Error('MySQL container did not become ready. Did you run `npm run db:up`?');
  await sleep(2000);
}

for (const file of ['01_ddl.sql', '02_triggers.sql', '03_procedures.sql', '04_dml_seed.sql']) {
  const r = mysqlCli(['--default-character-set=utf8mb4'], fs.readFileSync(path.join(sqlDir, file)));
  if (r.status !== 0) {
    console.error(r.stderr);
    throw new Error(`${file} failed`);
  }
  console.log(`  applied ${file}`);
}

// ---------------------------------------------------------------- demo accounts
// Login with the username OR the email. Passwords come from .env (DEMO_*); only bcrypt hashes are stored.
//   officers share DEMO_OFFICER_PASSWORD, students share DEMO_STUDENT_PASSWORD.
const officerPw = await hashPassword(requireEnv('DEMO_OFFICER_PASSWORD'));
const studentPw = await hashPassword(requireEnv('DEMO_STUDENT_PASSWORD'));
const officers = [
  ['officer', 'officer@college.edu'],
  ['tpo', 'tpo@college.edu'], // training & placement officer
];
for (const [username, email] of officers) {
  await pool.query('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)', [username, email, officerPw, 'officer']);
}
const [students] = await pool.query('SELECT student_id, name, email FROM students ORDER BY student_id');
for (const s of students) {
  const username = s.name.split(' ')[0].toLowerCase(); // "Meera Nair" -> meera
  await pool.query('INSERT INTO users (username, email, password_hash, role, student_id) VALUES (?, ?, ?, ?, ?)', [username, s.email, studentPw, 'student', s.student_id]);
}
console.log(`  created ${officers.length} officer and ${students.length} student accounts (usernames: ${officers.map((o) => o[0]).join(', ')}, ${students.map((s) => s.name.split(' ')[0].toLowerCase()).join(', ')})`);
console.log('  passwords: see DEMO_OFFICER_PASSWORD / DEMO_STUDENT_PASSWORD in .env');

console.log('Waiting for Neo4j...');
for (let i = 0; ; i++) {
  try {
    await ping();
    break;
  } catch (e) {
    if (i > 60) throw new Error('Neo4j did not become ready: ' + e.message);
    await sleep(2000);
  }
}

console.log('Building graph from MySQL:', await resyncGraph());
const s = await stats();
console.log('MySQL :', s.mysql);
console.log('Neo4j :', s.neo4j);
console.log(s.inSync ? 'OK: MySQL and Neo4j are in sync.' : 'WARNING: counts differ!');
process.exit(0);
