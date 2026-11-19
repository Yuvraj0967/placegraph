// Creates .env with RANDOM secrets from .env.example if it does not exist yet.
//   npm run init     (npm run setup calls this first)
import fs from 'node:fs';
import crypto from 'node:crypto';

if (fs.existsSync('.env')) {
  console.log('.env already exists - keeping it.');
  process.exit(0);
}
const rand = (n = 18) => crypto.randomBytes(n).toString('base64url');
let text = fs.readFileSync('.env.example', 'utf8');
const secrets = {
  MYSQL_ROOT_PASSWORD: rand(),
  MYSQL_PASSWORD: rand(),
  NEO4J_PASSWORD: rand(),
  JWT_SECRET: crypto.randomBytes(48).toString('hex'),
  DEMO_OFFICER_PASSWORD: rand(9),
  DEMO_STUDENT_PASSWORD: rand(9),
};
for (const [k, v] of Object.entries(secrets)) text = text.replace(new RegExp(`^${k}=.*$`, 'm'), `${k}=${v}`);
fs.writeFileSync('.env', text, { mode: 0o600 });
console.log('Created .env with random secrets (it is git-ignored). Demo passwords are DEMO_OFFICER_PASSWORD / DEMO_STUDENT_PASSWORD inside it.');
