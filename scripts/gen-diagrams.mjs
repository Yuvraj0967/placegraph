// Generates docs/er_diagram.svg (Chen notation) and docs/relational_schema.svg
//   node scripts/gen-diagrams.mjs   (npm run diagrams also renders PDF + PNG)
import fs from 'node:fs';
import path from 'node:path';

const out = path.join(process.cwd(), 'docs');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const rad = (d) => (d * Math.PI) / 180;

// ======================================================================= ER DIAGRAM
let svg = '';
const line = (x1, y1, x2, y2, extra = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#333" ${extra.includes('stroke-width') ? '' : 'stroke-width="1.5"'} ${extra}/>`;
const text = (x, y, t, extra = '') => `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" ${extra.includes('font-size') ? '' : 'font-size="14"'} ${extra}>${esc(t)}</text>`;

function entity(cx, cy, name, { weak = false } = {}) {
  const w = weak ? 200 : 150, h = 50;
  let s = `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" fill="#fff" stroke="#111" stroke-width="2"/>`;
  if (weak) s += `<rect x="${cx - w / 2 + 5}" y="${cy - h / 2 + 5}" width="${w - 10}" height="${h - 10}" fill="none" stroke="#111" stroke-width="1.5"/>`;
  return s + text(cx, cy, name, 'font-weight="700" font-size="15"');
}
function diamond(cx, cy, name, { ident = false } = {}) {
  const w = 110, h = 54;
  const pts = (k) => `${cx},${cy - h / 2 + k} ${cx + w / 2 - k * 1.9},${cy} ${cx},${cy + h / 2 - k} ${cx - w / 2 + k * 1.9},${cy}`;
  let s = `<polygon points="${pts(0)}" fill="#fff" stroke="#111" stroke-width="2"/>`;
  if (ident) s += `<polygon points="${pts(5)}" fill="none" stroke="#111" stroke-width="1.5"/>`;
  return s + text(cx, cy, name, 'font-weight="600" font-size="13"');
}
/** fan attributes around an entity; alternate rings avoid overlaps */
function attrs(cx, cy, list, angles, r = 130, alt = false) {
  let s = '';
  list.forEach((a, i) => {
    const rr = alt && i % 2 ? r * 1.5 : r;
    const x = cx + rr * Math.cos(rad(angles[i])), y = cy + rr * Math.sin(rad(angles[i]));
    const deco = a.key === 'pk' ? 'text-decoration="underline" font-weight="700"' : a.key === 'partial' ? 'style="text-decoration: underline dashed"' : '';
    s += line(cx, cy, x, y, 'stroke-width="1"');
    s += `<ellipse cx="${x}" cy="${y}" rx="${Math.max(44, a.n.length * 4.6 + 14)}" ry="19" fill="#fff" stroke="#111" stroke-width="1.5"/>`;
    s += text(x, y, a.n, deco + ' font-size="13"');
  });
  return s;
}
const pk = (n) => ({ n, key: 'pk' });
const part = (n) => ({ n, key: 'partial' });
const at = (n) => ({ n });

const P = {
  dept: [180, 330], belongs: [450, 330], student: [720, 330], hasSkill: [1000, 330], skill: [1280, 330],
  requires: [1280, 515], job: [1280, 700], posts: [1465, 700], company: [1700, 700],
  submits: [720, 515], app: [720, 700], forJob: [1000, 700], has: [720, 885], round: [720, 1060],
  results: [450, 700], placement: [180, 700], audit: [1500, 1080],
  user: [180, 1060], hasLogin: [450, 1060],
};

// relationship = entity --- diamond --- entity, with cardinalities near each entity
const near = (e, d, t = 0.38, off = 16) => {
  const dx = d[0] - e[0], dy = d[1] - e[1], len = Math.hypot(dx, dy);
  return [e[0] + dx * t - (dy / len) * off, e[1] + dy * t + (dx / len) * off];
};
const card = (p, t) => text(p[0], p[1], t, 'font-weight="700" fill="#b3261e" font-size="15"');
function rel(a, d, b, ca, cb, extra = '') {
  svg += line(...a, ...d, extra) + line(...d, ...b, extra);
  svg += card(near(a, d), ca) + card(near(b, d), cb);
}

rel(P.dept, P.belongs, P.student, '1', 'N');
rel(P.student, P.hasSkill, P.skill, 'M', 'N');
rel(P.skill, P.requires, P.job, 'M', 'N');
rel(P.company, P.posts, P.job, '1', 'N');
rel(P.student, P.submits, P.app, '1', 'N');
rel(P.app, P.forJob, P.job, 'N', '1');
rel(P.app, P.results, P.placement, '1', '1');
rel(P.user, P.hasLogin, P.student, '1', '1', 'stroke-dasharray="6 4"'); // optional: only student accounts link to a student
// identifying relationship (double line) application --has--> interview round (weak, total participation)
svg += line(P.app[0] - 3, P.app[1], P.has[0] - 3, P.has[1]) + line(P.app[0] + 3, P.app[1], P.has[0] + 3, P.has[1]);
svg += line(...P.has, ...P.round, 'stroke-width="3"');
svg += card(near(P.app, P.has), '1') + card(near(P.round, P.has), 'N');

svg += attrs(...P.dept, [pk('dept_id'), at('code'), at('name')], [225, 180, 135], 130);
svg += attrs(...P.student, [pk('student_id'), at('name'), at('email'), at('cgpa'), at('grad_year'), at('is_placed')], [205, 233, 261, 289, 317, 345], 125, true);
svg += attrs(...P.skill, [pk('skill_id'), at('name')], [-130, -50], 125);
svg += attrs(...P.company, [pk('company_id'), at('name'), at('industry'), at('location')], [-100, -45, 10, 65], 140);
svg += attrs(...P.job, [pk('job_id'), at('title'), at('package_lpa'), at('min_cgpa'), at('openings'), at('deadline')], [25, 52, 79, 106, 133, 160], 125, true);
svg += attrs(...P.app, [pk('application_id'), at('applied_on'), at('status')], [-135, -45, 135], 130);
svg += attrs(...P.round, [part('round_no'), at('round_type'), at('scheduled_on'), at('result'), { n: 'application_id (FK)', key: 'pk' }], [160, 125, 75, 30, -15], 165, true);
svg += attrs(...P.placement, [{ n: 'student_id (PK)', key: 'pk' }, at('package_lpa'), at('placed_on'), at('application_id')], [90, 135, 180, 225], 135);
svg += attrs(...P.user, [pk('user_id'), at('username'), at('email'), at('password_hash'), at('role'), { n: 'student_id (FK, optional)' }], [100, 135, 170, 205, 240, 275], 140, true);
svg += attrs(...P.audit, [pk('audit_id'), at('table_name'), at('action'), at('record_id'), at('old_data'), at('new_data'), at('changed_at')], [-150, -105, -60, -15, 30, 75, 120], 135, true);

svg += entity(...P.dept, 'DEPARTMENT') + entity(...P.student, 'STUDENT') + entity(...P.skill, 'SKILL') + entity(...P.company, 'COMPANY');
svg += entity(...P.user, 'USER');
svg += entity(...P.job, 'JOB') + entity(...P.app, 'APPLICATION') + entity(...P.placement, 'PLACEMENT') + entity(...P.audit, 'AUDIT_LOG');
svg += entity(...P.round, 'INTERVIEW_ROUND', { weak: true });
svg += diamond(...P.belongs, 'belongs to') + diamond(...P.hasSkill, 'has skill') + diamond(...P.requires, 'requires') + diamond(...P.posts, 'posts');
svg += diamond(...P.hasLogin, 'logs in as');
svg += diamond(...P.submits, 'submits') + diamond(...P.forJob, 'is for') + diamond(...P.results, 'results in') + diamond(...P.has, 'has', { ident: true });

const legend = `
<g transform="translate(40,40)">
  <text font-size="22" font-weight="700">PlaceGraph - ER Diagram (Chen notation)</text>
  <text y="24" font-size="13" fill="#555">Strong entities: DEPARTMENT, STUDENT, SKILL, COMPANY, JOB, APPLICATION, PLACEMENT, USER (own primary key; role = officer or student). Weak entity: INTERVIEW_ROUND (double box) - identified by APPLICATION + partial key round_no.</text>
  <text y="44" font-size="13" fill="#555">Double diamond = identifying relationship. Thick line = total participation. Underlined = primary key, dashed underline = partial key. M:N relationships (has skill, requires) become tables student_skills and job_skills.</text>
</g>`;
fs.writeFileSync(path.join(out, 'er_diagram.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-60 0 2000 1380" width="2000" height="1380" font-family="Segoe UI, Arial, sans-serif"><rect x="-60" width="100%" height="100%" fill="#fff"/>${legend}${svg}</svg>`);

// ======================================================================= RELATIONAL SCHEMA
const T = {
  departments: { x: 40, y: 100, cols: [['dept_id', 'INT', 'PK'], ['code', 'VARCHAR(10)', 'UQ'], ['name', 'VARCHAR(80)', '']] },
  students: { x: 420, y: 100, cols: [['student_id', 'INT', 'PK'], ['name', 'VARCHAR(100)', ''], ['email', 'VARCHAR(120)', 'UQ'], ['dept_id', 'INT', 'FK', 'departments'], ['cgpa', 'DECIMAL(4,2)', ''], ['grad_year', 'SMALLINT', ''], ['is_placed', 'TINYINT(1)', '']] },
  applications: { x: 800, y: 100, cols: [['application_id', 'INT', 'PK'], ['student_id', 'INT', 'FK', 'students'], ['job_id', 'INT', 'FK', 'jobs'], ['applied_on', 'DATE', ''], ['status', 'ENUM(7 values)', '']] },
  jobs: { x: 1180, y: 100, cols: [['job_id', 'INT', 'PK'], ['company_id', 'INT', 'FK', 'companies'], ['title', 'VARCHAR(100)', ''], ['package_lpa', 'DECIMAL(5,2)', ''], ['min_cgpa', 'DECIMAL(4,2)', ''], ['openings', 'INT', ''], ['deadline', 'DATE', '']] },
  companies: { x: 1560, y: 100, cols: [['company_id', 'INT', 'PK'], ['name', 'VARCHAR(100)', 'UQ'], ['industry', 'VARCHAR(60)', ''], ['location', 'VARCHAR(60)', '']] },
  placements: { x: 40, y: 400, cols: [['student_id', 'INT', 'PK,FK', 'students'], ['application_id', 'INT', 'UQ,FK', 'applications'], ['job_id', 'INT', 'FK', 'jobs'], ['package_lpa', 'DECIMAL(5,2)', ''], ['placed_on', 'DATE', '']] },
  student_skills: { x: 420, y: 400, cols: [['student_id', 'INT', 'PK,FK', 'students'], ['skill_id', 'INT', 'PK,FK', 'skills']] },
  interview_rounds: { x: 800, y: 400, cols: [['application_id', 'INT', 'PK,FK', 'applications'], ['round_no', 'INT', 'PK'], ['round_type', 'ENUM', ''], ['scheduled_on', 'DATE', ''], ['result', 'ENUM', '']] },
  job_skills: { x: 1180, y: 400, cols: [['job_id', 'INT', 'PK,FK', 'jobs'], ['skill_id', 'INT', 'PK,FK', 'skills']] },
  audit_log: { x: 1560, y: 400, cols: [['audit_id', 'BIGINT', 'PK'], ['table_name', 'VARCHAR(40)', ''], ['action', 'VARCHAR(20)', ''], ['record_id', 'VARCHAR(40)', ''], ['old_data', 'JSON', ''], ['new_data', 'JSON', ''], ['changed_at', 'TIMESTAMP', '']] },
  users: { x: 40, y: 640, cols: [['user_id', 'INT', 'PK'], ['username', 'VARCHAR(40)', 'UQ'], ['email', 'VARCHAR(120)', 'UQ'], ['password_hash', 'VARCHAR(100)', ''], ['role', "ENUM('officer','student')", ''], ['student_id', 'INT', 'UQ,FK', 'students'], ['created_at', 'TIMESTAMP', '']] },
  skills: { x: 800, y: 640, cols: [['skill_id', 'INT', 'PK'], ['name', 'VARCHAR(60)', 'UQ']] },
};
const TW = 340, RH = 26, HH = 32;
const box = (t) => ({ x: t.x, y: t.y, w: TW, h: HH + t.cols.length * RH });
let r = '';
const arrow = (pts) => {
  r += `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="#444" stroke-width="1.6" marker-end="url(#arr)"/>`;
};
const label = (x, y, t, anchor = 'middle') => { r += `<text x="${x}" y="${y}" font-size="11" fill="#b3261e" text-anchor="${anchor}">${esc(t)}</text>`; };
const B = (n) => box(T[n]);
const fkY = (n, col) => { const t = T[n]; return t.y + HH + t.cols.findIndex((c) => c[0] === col) * RH + RH / 2; };
const clamp = (v, b) => Math.max(b.y + HH + 10, Math.min(b.y + b.h - 10, v));

// horizontal neighbours: child FK row -> parent box edge
const h = (child, col, parent, label_) => {
  const c = B(child), p = B(parent), y = fkY(child, col);
  const left = c.x > p.x;
  const x1 = left ? c.x : c.x + c.w, x2 = left ? p.x + p.w : p.x, y2 = clamp(y, p);
  arrow([[x1, y], [x2, y2]]);
};
h('students', 'dept_id', 'departments', 'dept_id');
h('applications', 'student_id', 'students', 'student_id');
h('applications', 'job_id', 'jobs', 'job_id');
h('jobs', 'company_id', 'companies', 'company_id');
// vertical: child top -> parent bottom
const v = (child, parent, x, label_) => { arrow([[x, B(child).y], [x, B(parent).y + B(parent).h]]); label(x + 6, (B(child).y + B(parent).y + B(parent).h) / 2, label_, 'start'); };
v('student_skills', 'students', 520, 'student_id');
v('interview_rounds', 'applications', 900, 'application_id (weak entity owner, CASCADE)');
v('job_skills', 'jobs', 1280, 'job_id');
// elbows
arrow([[480, B('student_skills').y + B('student_skills').h], [480, 682], [800, 682]]); label(560, 676, 'skill_id');
arrow([[1280, B('job_skills').y + B('job_skills').h], [1280, 682], [1140, 682]]); label(1210, 676, 'skill_id');
arrow([[380, fkY('users', 'student_id')], [400, fkY('users', 'student_id')], [400, 290], [420, 290]]);
arrow([[210, 400], [210, 350], [450, 350], [450, 314]]); label(330, 344, 'student_id');
arrow([[210, B('placements').y + B('placements').h], [210, 612], [780, 612], [780, 245], [800, 245]]); label(500, 606, 'application_id');

for (const [name, t] of Object.entries(T)) {
  const b = box(t);
  r += `<g><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="6" fill="#fff" stroke="#1f3a8a" stroke-width="2"/>`;
  r += `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${HH}" rx="6" fill="#1f3a8a"/>`;
  r += `<text x="${b.x + 12}" y="${b.y + 21}" fill="#fff" font-weight="700" font-size="15">${name}${name === 'interview_rounds' ? '  (weak entity)' : ''}</text>`;
  t.cols.forEach(([c, type, k, ref], i) => {
    const y = b.y + HH + i * RH;
    const colr = k.includes('PK') ? '#b45309' : k.includes('FK') ? '#b3261e' : '#047857';
    r += `<line x1="${b.x}" y1="${y}" x2="${b.x + b.w}" y2="${y}" stroke="#dde3f0"/>`;
    if (k) r += `<text x="${b.x + 8}" y="${y + 18}" font-size="11" font-weight="700" fill="${colr}">${k}</text>`;
    r += `<text x="${b.x + 70}" y="${y + 18}" font-size="13" ${k.includes('PK') ? 'font-weight="700"' : ''}>${esc(c)}</text>`;
    r += `<text x="${b.x + 178}" y="${y + 18}" font-size="11" fill="#555">${esc(type)}</text>`;
    if (ref) r += `<text x="${b.x + 262}" y="${y + 18}" font-size="11" fill="#b3261e">→ ${esc(ref)}</text>`;
  });
  r += '</g>';
}
const head = `<text x="40" y="36" font-size="22" font-weight="700">PlaceGraph - Relational Schema (MySQL 8)</text>
<text x="40" y="56" font-size="13" fill="#555">PK = primary key, FK = foreign key (arrow points at the referenced table), UQ = unique. The red "→ table" on a row names the referenced table.</text>
<text x="40" y="74" font-size="13" fill="#555">Triggers: eligibility guard, status flow, auto placement, round result, user role rule, audit. Procedures: sp_apply, sp_update_application_status, sp_schedule_round, sp_set_round_result, sp_accept_offer, sp_student_report, sp_placement_stats.</text>`;
fs.writeFileSync(path.join(out, 'relational_schema.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1940 880" width="1940" height="880" font-family="Segoe UI, Arial, sans-serif"><defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10z" fill="#444"/></marker></defs><rect width="100%" height="100%" fill="#fff"/>${head}${r}</svg>`);
console.log('wrote er_diagram.svg and relational_schema.svg');
