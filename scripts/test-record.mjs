// Reset the data, run every test suite and save the REAL output to docs/test-results/latest.txt
//   npm run test:record      (needs: containers up and the app running on :3001)
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const sh = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8', shell: process.platform === 'win32' });
fs.mkdirSync('docs/test-results', { recursive: true });

const reset = sh('npm', ['run', 'db:setup']);
const run = sh('node', ['--env-file=.env', '--test', '--test-concurrency=1', 'tests/01-sql.test.mjs', 'tests/02-api.test.mjs', 'tests/03-graph.test.mjs']);
const header = `PlaceGraph test run - ${new Date().toISOString()}\nnode ${process.version} on ${process.platform}\nData was reset first with "npm run db:setup" (exit ${reset.status}).\n\n`;
fs.writeFileSync('docs/test-results/latest.txt', header + run.stdout + (run.stderr ? '\n--- stderr ---\n' + run.stderr : ''));
console.log(run.stdout.split('\n').filter((l) => /^# (tests|pass|fail|skipped)/.test(l)).join('\n'));
sh('npm', ['run', 'db:setup']); // leave a clean database behind
process.exit(run.status ?? 1);
