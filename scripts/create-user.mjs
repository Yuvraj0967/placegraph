// Create a login:  node --env-file=.env scripts/create-user.mjs <email> <password> <officer|student> [student_id]
import { pool } from '../lib/db.js';
import { hashPassword } from '../lib/auth-hash.js';

const [email, password, role, studentId] = process.argv.slice(2);
if (!email || !password || !['officer', 'student'].includes(role)) {
  console.error('Usage: node --env-file=.env scripts/create-user.mjs <email> <password (min 8)> <officer|student> [student_id]');
  process.exit(1);
}
if (password.length < 8) { console.error('Password must be at least 8 characters.'); process.exit(1); }
try {
  await pool.query('INSERT INTO users (email, password_hash, role, student_id) VALUES (?, ?, ?, ?)', [email.toLowerCase(), await hashPassword(password), role, studentId ? Number(studentId) : null]);
  console.log(`Created ${role} account ${email.toLowerCase()}`);
} catch (e) {
  console.error('Could not create the account:', e.sqlMessage ?? e.message);
  process.exitCode = 1;
}
process.exit();
