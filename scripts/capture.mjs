// Drives the REAL website in Edge, performs the demo, and saves evidence:
//   docs/screenshots/*.png        UI screenshots (each step of CRUD / workflow / triggers / procedures)
//   docs/evidence/crud_proof.txt  MySQL + Neo4j output captured right after each UI action
// Needs: the app on http://localhost:3001, containers running, Microsoft Edge installed.
//   npm run db:setup && npm run evidence
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE_URL || 'http://localhost:3001';
const root = process.cwd();
const shots = path.join(root, 'docs', 'screenshots');
const evid = path.join(root, 'docs', 'evidence');
fs.mkdirSync(shots, { recursive: true });
fs.mkdirSync(evid, { recursive: true });
for (const f of fs.readdirSync(shots)) if (f.endsWith('.png')) fs.rmSync(path.join(shots, f));

const edge = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
if (!edge) throw new Error('Edge/Chrome not found');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mysql = (sql) => spawnSync('docker', ['exec', '-i', '-e', `MYSQL_PWD=${process.env.MYSQL_ROOT_PASSWORD}`, 'placegraph-mysql', 'mysql', '-uroot', '-t', 'placegraph', '-e', sql], { encoding: 'utf8' }).stdout;
const log = [];
const proof = (title, sql) => log.push(`\n### ${title}\nmysql> ${sql}\n${mysql(sql)}`);
const { run: cypher } = await import('../lib/graph.js');
const neo = async (q) => JSON.stringify(await cypher(q));

const browser = await puppeteer.launch({ executablePath: edge, headless: true, defaultViewport: { width: 1400, height: 900 }, args: ['--no-sandbox'] });
const page = await browser.newPage();
page.on('dialog', (d) => d.accept());
let n = 0;
const shot = async (name) => {
  await sleep(700);
  await page.screenshot({ path: path.join(shots, `${String(++n).padStart(2, '0')}_${name}.png`), fullPage: true });
  console.log('  shot', name);
};
const go = async (p) => {
  await page.goto(BASE + p, { waitUntil: 'networkidle0' });
  await page.addStyleTag({ content: 'nav.top{position:static !important}' }); // sticky nav would repeat mid-page in full-page shots
  await sleep(500);
};
const clickText = async (selector, text) => {
  const h = await page.evaluateHandle((sel, t) => [...document.querySelectorAll(sel)].find((e) => e.innerText.trim().includes(t)), selector, text);
  if (!h.asElement()) throw new Error(`no ${selector} with "${text}"`);
  await h.asElement().click();
};
const clickInRow = async (rowTexts, label) => {
  const texts = [].concat(rowTexts);
  const h = await page.evaluateHandle((rt, l) => {
    const tr = [...document.querySelectorAll('tbody tr')].find((r) => rt.every((t) => r.innerText.includes(t)));
    return tr && [...tr.querySelectorAll('button')].find((b) => b.innerText.trim() === l);
  }, texts, label);
  if (!h.asElement()) throw new Error(`row "${texts.join(' + ')}" has no ${label} button`);
  await h.asElement().click();
};
const waitNotice = async () => { await page.waitForSelector('.notice', { timeout: 15000 }); await sleep(900); };
const selectByText = async (sel, text) => {
  const v = await page.$eval(sel, (el, t) => [...el.options].find((o) => o.text.includes(t))?.value, text);
  if (!v) throw new Error(`no option with "${text}" in ${sel}`);
  await page.select(sel, v);
};
const setValue = async (sel, v) => { await page.$eval(sel, (el) => { el.value = ''; }); await page.type(sel, v); };

const loginUI = async (email, password) => {
  await page.waitForSelector('#email');
  await page.type('#email', email);
  await page.type('#password', password);
  await clickText('button', 'Sign in');
};

// ----------------------------------------------------------------- authentication
console.log('Login');
await go('/'); // not signed in yet: the login form is shown
await page.waitForSelector('#email');
await shot('login_screen');
await page.type('#email', 'officer'); // usernames work as well as emails
await page.type('#password', 'this-is-the-wrong-password');
await clickText('button', 'Sign in');
await page.waitForSelector('.notice.bad');
await shot('login_wrong_password_rejected');
await page.$eval('#password', (el) => { el.value = ''; });
await page.type('#password', process.env.DEMO_OFFICER_PASSWORD);
await clickText('button', 'Sign in');
await page.waitForSelector('nav.top');

// ----------------------------------------------------------------- overview pages (placement officer)
console.log('Overview');
await go('/'); await shot('dashboard_mysql_neo4j_in_sync');
await go('/students'); await shot('students_read');

// ----------------------------------------------------------------- CRUD through the UI (students)
console.log('CRUD: create');
log.push('=== CRUD THROUGH THE WEBSITE, VERIFIED IN THE DATABASE ===');
proof('BEFORE: students table (latest 3)', 'SELECT student_id, name, email, cgpa, is_placed FROM students ORDER BY student_id DESC LIMIT 3');
log.push('Neo4j Student nodes before: ' + (await neo('MATCH (s:Student) RETURN count(s) AS students')));
await clickText('button', 'Add student');
await page.type('#name', 'Demo Student');
await page.type('#email', 'demo.student@college.edu');
await page.select('#dept_id', '1');
await page.type('#cgpa', '8.2');
await page.click('#skill_ids-1'); // Python
await page.click('#skill_ids-3'); // SQL
await shot('crud_1_create_form');
await clickText('button', 'Save');
await waitNotice();
await shot('crud_2_create_result_sql_and_neo4j_banner');
proof('AFTER CREATE: row exists in MySQL', "SELECT student_id, name, email, dept_id, cgpa, is_placed FROM students WHERE email = 'demo.student@college.edu'");
proof('AFTER CREATE: its skills (M:N link rows)', "SELECT * FROM student_skills WHERE student_id = (SELECT student_id FROM students WHERE email='demo.student@college.edu')");
proof('AFTER CREATE: trigger wrote an audit row', 'SELECT audit_id, table_name, action, record_id, new_data FROM audit_log ORDER BY audit_id DESC LIMIT 1');
log.push('Neo4j after create: ' + (await neo("MATCH (s:Student {email:'demo.student@college.edu'})-[:HAS_SKILL]->(k:Skill) RETURN s.name AS student, collect(k.name) AS skills")));
await go('/inspector?table=students'); await shot('crud_3_create_verified_in_db_inspector');

console.log('CRUD: update');
await go('/students');
await clickInRow('Demo Student', 'Edit');
await setValue('#cgpa', '8.9');
await page.click('#skill_ids-6'); // + Machine Learning
await shot('crud_4_update_form');
await clickText('button', 'Save');
await waitNotice();
await shot('crud_5_update_result');
proof('AFTER UPDATE: MySQL has the new CGPA', "SELECT student_id, name, cgpa FROM students WHERE email = 'demo.student@college.edu'");
proof('AFTER UPDATE: trigger stored old vs new', "SELECT action, old_data, new_data FROM audit_log WHERE table_name='students' ORDER BY audit_id DESC LIMIT 1");
log.push('Neo4j after update: ' + (await neo("MATCH (s:Student {email:'demo.student@college.edu'}) RETURN s.cgpa AS cgpa")));
await go('/inspector?table=audit_log'); await shot('crud_6_update_audit_log_trigger');

console.log('CRUD: delete');
await go('/students');
await clickInRow('Demo Student', 'Delete');
await waitNotice();
await shot('crud_7_delete_result');
proof('AFTER DELETE: student is gone from MySQL', "SELECT COUNT(*) AS rows_with_that_email FROM students WHERE email = 'demo.student@college.edu'");
proof('AFTER DELETE: skill links were cascade-deleted', 'SELECT COUNT(*) AS orphan_links FROM student_skills WHERE student_id NOT IN (SELECT student_id FROM students)');
log.push('Neo4j after delete: ' + (await neo("MATCH (s:Student {email:'demo.student@college.edu'}) RETURN count(s) AS nodes")));
await go('/inspector?table=students'); await shot('crud_8_delete_verified_in_db_inspector');

// ----------------------------------------------------------------- integrity
console.log('Integrity');
await go('/companies');
await clickInRow('TechNova', 'Delete');
await waitNotice();
await shot('integrity_company_with_jobs_cannot_be_deleted');

// ----------------------------------------------------------------- recruitment workflow through the UI
console.log('Workflow');
await go('/applications');
await clickText('button', 'New application');
await page.select('#student_id', '7'); // Arjun Reddy, CGPA 6.8
await page.select('#job_id', '1');     // Software Engineer, min 7.5
await clickText('button', 'Save');
await waitNotice();
await shot('workflow_1_trigger_rejects_ineligible_cgpa');

await go('/applications');
await clickText('button', 'New application');
await page.select('#student_id', '6'); // Meera Nair 7.2
await page.select('#job_id', '2');     // QA Engineer min 6.5
await clickText('button', 'Save');
await waitNotice();
await shot('workflow_2_applied_via_sp_apply');
proof('AFTER APPLY: new application row', 'SELECT application_id, student_id, job_id, status FROM applications ORDER BY application_id DESC LIMIT 2');
proof('AFTER APPLY: audit row from trigger', 'SELECT audit_id, table_name, action, record_id, new_data FROM audit_log ORDER BY audit_id DESC LIMIT 1');

await go('/applications');
await clickInRow(['Meera Nair', 'QA Engineer'], 'Shortlist');
await waitNotice();
await shot('workflow_3_shortlisted_via_procedure');

await go('/interviews');
await clickText('button', 'Schedule round');
await selectByText('#application_id', 'Meera Nair'); // Meera's new application
await page.select('#round_type', 'TECHNICAL');
await clickText('button', 'Save');
await waitNotice();
await shot('workflow_4_round_scheduled_via_sp_schedule_round_weak_entity');
proof('AFTER SCHEDULE: weak-entity row (application_id, round_no) + application moved to INTERVIEW', "SELECT r.*, a.status AS application_status FROM interview_rounds r JOIN applications a USING (application_id) WHERE a.student_id = 6");

await go('/applications');
proof('BEFORE ACCEPT: Sneha Iyer (student 4), offered Data Analyst', 'SELECT application_id, job_id, status FROM applications WHERE student_id = 4; SELECT student_id, is_placed FROM students WHERE student_id = 4; SELECT job_id, title, openings FROM jobs WHERE job_id = 3; SELECT COUNT(*) AS placements FROM placements');
await clickInRow(['Sneha Iyer', 'Data Analyst'], 'Accept offer');
await waitNotice();
await shot('workflow_5_offer_accepted_trigger_creates_placement');
proof('AFTER ACCEPT: trigger created the placement', 'SELECT * FROM placements WHERE student_id = 4');
proof('AFTER ACCEPT: student marked placed, opening used up', 'SELECT student_id, is_placed FROM students WHERE student_id = 4; SELECT job_id, title, openings FROM jobs WHERE job_id = 3');
proof('AFTER ACCEPT: sp_accept_offer withdrew her other application', 'SELECT application_id, job_id, status FROM applications WHERE student_id = 4');
proof('AFTER ACCEPT: audit trail (PLACED)', "SELECT audit_id, table_name, action, record_id, new_data FROM audit_log WHERE action = 'PLACED'");
log.push('Neo4j after accept: ' + (await neo("MATCH (s:Student {id:4})-[p:PLACED_AT]->(c:Company) RETURN s.name AS student, c.name AS company, p.package AS package_lpa")));
await go('/placements'); await shot('workflow_6_placements_page');

// ----------------------------------------------------------------- Users page (officer): usernames
console.log('Users');
await go('/users'); await shot('users_page_usernames_and_roles');
proof('Accounts in MySQL (only a bcrypt hash is stored, never the password)', "SELECT user_id, username, email, role, student_id, LEFT(password_hash, 7) AS hash_prefix FROM users ORDER BY user_id LIMIT 6");
await clickText('button', 'Add account');
await page.type('#username', 'demo.officer');
await page.type('#email', 'demo.officer@college.edu');
await page.type('#password', 'a-demo-password-1');
await page.select('#role', 'officer');
await shot('users_add_account_form');
await clickText('button', 'Save');
await waitNotice();
await shot('users_account_created_hash_hidden_in_banner');
proof('AFTER CREATE account', "SELECT user_id, username, role, student_id FROM users WHERE username = 'demo.officer'");
await clickInRow('demo.officer', 'Delete');
await waitNotice();
proof('AFTER DELETE account', "SELECT COUNT(*) AS rows_for_demo_officer FROM users WHERE username = 'demo.officer'");

// ----------------------------------------------------------------- Trigger & Procedure Lab
console.log('Lab');
for (const [tab, btn, name] of [
  ['Apply for a job: INSERT', 'Run the statement', 'lab_trigger_applications_insert_guard'],
  ['Accept an offer: UPDATE', 'Run the statement', 'lab_trigger_accept_offer_auto_placement'],
  ['Fail an interview round', 'Run the statement', 'lab_trigger_failed_round_auto_reject'],
  ['Audit trigger: UPDATE on students', 'Run the statement', 'lab_trigger_students_audit'],
  ['CALL sp_apply', 'Execute the procedure', 'lab_procedure_sp_apply'],
  ['CALL sp_update_application_status', 'Execute the procedure', 'lab_procedure_sp_update_application_status'],
  ['CALL sp_schedule_round', 'Execute the procedure', 'lab_procedure_sp_schedule_round'],
  ['CALL sp_accept_offer', 'Execute the procedure', 'lab_procedure_sp_accept_offer'],
  ['CALL sp_student_report', 'Execute the procedure', 'lab_procedure_sp_student_report'],
  ['CALL sp_placement_stats', 'Execute the procedure', 'lab_procedure_sp_placement_stats'],
]) {
  await go('/lab');
  await clickText('.tabs button', tab);
  await page.waitForSelector('pre', { timeout: 10000 });
  await sleep(1200);
  if (name === 'lab_trigger_accept_offer_auto_placement') await shot('lab_before_state_and_trigger_code');
  await clickText('button', btn);
  await page.waitForFunction(() => document.body.innerText.includes('Explanation'), { timeout: 15000 });
  await shot(name);
}

// ----------------------------------------------------------------- graph, queries, inspector
console.log('Graph / queries');
await go('/graph'); await sleep(900); await shot('neo4j_graph_and_job_recommendations');
await go('/queries');
for (const q of ['Students whose CGPA is above their own', 'Students who have ALL skills required']) {
  const h = await page.evaluateHandle((t) => [...document.querySelectorAll('.qitem')].find((e) => e.innerText.includes(t)).querySelector('button.primary'), q);
  await h.asElement().click();
}
await sleep(900);
await shot('nested_sql_queries_executed');
await go('/inspector?table=triggers'); await shot('database_triggers_list');
await go('/inspector?table=procedures'); await shot('database_stored_procedures_list');
await go('/'); await shot('dashboard_final_in_sync');

// ----------------------------------------------------------------- search and filters (officer)
console.log('Search / filters');
await go('/jobs');
await page.type('input[aria-label="Search"]', 'cloud');
await sleep(1200);
await shot('search_jobs_fulltext_cloud');
await go('/applications');
await page.select('select[aria-label="Status"]', 'OFFERED');
await sleep(1200);
await shot('filter_applications_status_offered');
await go('/students');
await page.select('select[aria-label="Status"]', '0');
await page.type('input[aria-label="Search"]', 'me');
await sleep(1200);
await shot('search_and_filter_students_unplaced');

// ----------------------------------------------------------------- second role: a student
console.log('Student session');
await clickText('button', 'Sign out');
await page.waitForSelector('#email');
await loginUI('meera', process.env.DEMO_STUDENT_PASSWORD);
await page.waitForSelector('nav.top');
await go('/'); await sleep(900); await shot('student_role_my_dashboard');
await go('/jobs'); await shot('student_role_jobs_read_only');
await go('/applications');
await clickText('button', 'New application');
await selectByText('#job_id', 'Design Engineer');
await shot('student_role_apply_form_no_student_picker');
await clickText('button', 'Save');
await waitNotice();
await shot('student_role_applied_as_herself');
proof('Student applied: row belongs to Meera (student 6)', 'SELECT application_id, student_id, job_id, status FROM applications WHERE student_id = 6 ORDER BY application_id');
await go('/graph'); await sleep(900); await shot('student_role_job_matches_from_neo4j');
await go('/students'); await sleep(900); await shot('student_role_own_row_only');
await go('/inspector'); await sleep(900); await shot('student_role_officer_page_403');
const forbidden = await page.evaluate(async () => {
  const out = {};
  for (const [m, u] of [['GET', '/api/stats'], ['GET', '/api/inspect?table=users'], ['DELETE', '/api/jobs/1'], ['POST', '/api/students']]) {
    const r = await fetch(u, { method: m, headers: { 'content-type': 'application/json' }, body: m === 'POST' ? '{}' : undefined });
    out[m + ' ' + u] = r.status;
  }
  return out;
});
log.push('\n### Student session: officer-only API calls (HTTP status)\n' + JSON.stringify(forbidden, null, 2));
await clickText('button', 'Sign out');

fs.writeFileSync(path.join(evid, 'crud_proof.txt'), log.join('\n') + '\n');
await browser.close();
console.log('done:', n, 'screenshots');
process.exit(0);
