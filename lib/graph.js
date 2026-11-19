// Neo4j graph layer. MySQL is the source of truth; every change is projected here.
//
//   (:Student)-[:IN_DEPT]->(:Department)
//   (:Student)-[:HAS_SKILL]->(:Skill)<-[:REQUIRES]-(:Job)<-[:POSTED]-(:Company)
//   (:Student)-[:APPLIED_TO {applicationId, status, appliedOn}]->(:Job)
//   (:Student)-[:PLACED_AT {package, role}]->(:Company)
import neo4j from 'neo4j-driver';

import { requireEnv } from './env.js';

const getDriver = () =>
  (globalThis.__placeNeo ??= neo4j.driver(
    requireEnv('NEO4J_URI'),
    neo4j.auth.basic(requireEnv('NEO4J_USER'), requireEnv('NEO4J_PASSWORD')),
  ));

/** Convert neo4j Integers / nodes into plain JSON. */
function plain(v) {
  if (neo4j.isInt(v)) return v.toNumber();
  if (Array.isArray(v)) return v.map(plain);
  if (v && typeof v === 'object') {
    if (v.properties && v.labels) return { _label: v.labels[0], ...plain(v.properties) };
    if (v.properties && v.type) return { _type: v.type, ...plain(v.properties) };
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]));
  }
  return v;
}

export async function run(cypher, params = {}) {
  const session = getDriver().session();
  try {
    const res = await session.run(cypher, params);
    return res.records.map((r) => plain(r.toObject()));
  } finally {
    await session.close();
  }
}

/** Run several write statements in one transaction. */
async function write(statements) {
  const session = getDriver().session();
  try {
    await session.executeWrite(async (tx) => {
      for (const [cypher, params] of statements) await tx.run(cypher, params);
    });
  } finally {
    await session.close();
  }
}

/** Close the driver (tests and scripts need this so the process can exit). */
export const close = () => getDriver().close();

export const ping = () => getDriver().verifyConnectivity();

const withSkills = (row) => ({ ...row, skill_ids: row.skill_ids ?? [] });

// ------------------------------------------------------------------ upserts
const upserts = {
  departments: (d) => [['MERGE (x:Department {id: $dept_id}) SET x.code = $code, x.name = $name', d]],
  skills: (k) => [['MERGE (x:Skill {id: $skill_id}) SET x.name = $name', k]],
  companies: (c) => [['MERGE (x:Company {id: $company_id}) SET x.name = $name, x.industry = $industry, x.location = $location', c]],
  students: (r) => {
    const s = withSkills(r);
    return [
      [
        `MERGE (x:Student {id: $student_id})
         SET x.name = $name, x.email = $email, x.cgpa = $cgpa, x.gradYear = $grad_year, x.placed = ($is_placed = 1)`,
        s,
      ],
      ['MATCH (:Student {id: $student_id})-[r:IN_DEPT|HAS_SKILL]->() DELETE r', s],
      ['MATCH (x:Student {id: $student_id}), (d:Department {id: $dept_id}) MERGE (x)-[:IN_DEPT]->(d)', s],
      ['MATCH (x:Student {id: $student_id}) UNWIND $skill_ids AS sid MATCH (k:Skill {id: sid}) MERGE (x)-[:HAS_SKILL]->(k)', s],
    ];
  },
  jobs: (r) => {
    const j = withSkills(r);
    return [
      [
        `MERGE (x:Job {id: $job_id})
         SET x.title = $title, x.package = $package_lpa, x.minCgpa = $min_cgpa, x.openings = $openings, x.deadline = $deadline`,
        j,
      ],
      ['MATCH (x:Job {id: $job_id})-[r:REQUIRES]->() DELETE r', j],
      ['MATCH (:Company)-[r:POSTED]->(:Job {id: $job_id}) DELETE r', j],
      ['MATCH (c:Company {id: $company_id}), (x:Job {id: $job_id}) MERGE (c)-[:POSTED]->(x)', j],
      ['MATCH (x:Job {id: $job_id}) UNWIND $skill_ids AS sid MATCH (k:Skill {id: sid}) MERGE (x)-[:REQUIRES]->(k)', j],
    ];
  },
  applications: (a) => [
    [
      `MATCH (s:Student {id: $student_id}), (j:Job {id: $job_id})
       MERGE (s)-[r:APPLIED_TO {applicationId: $application_id}]->(j)
       SET r.status = $status, r.appliedOn = $applied_on`,
      a,
    ],
  ],
  placements: (p) => [
    [
      `MATCH (s:Student {id: $student_id}), (c:Company {id: $company_id})
       MERGE (s)-[r:PLACED_AT]->(c) SET r.package = $package_lpa, r.role = $job_title, r.placedOn = $placed_on`,
      p,
    ],
  ],
};

export const upsert = (resource, row) => write(upserts[resource](row));

// ------------------------------------------------------------------ deletes
const labelOf = { departments: 'Department', skills: 'Skill', companies: 'Company', students: 'Student', jobs: 'Job' };

export async function remove(resource, id) {
  if (resource === 'applications') {
    return write([['MATCH ()-[r:APPLIED_TO {applicationId: $id}]->() DELETE r', { id }]]);
  }
  // DETACH DELETE also removes every edge hanging off the node
  return write([[`MATCH (x:${labelOf[resource]} {id: $id}) DETACH DELETE x`, { id }]]);
}

// ------------------------------------------------------------------ full rebuild
export async function rebuild(d) {
  await write([['MATCH (n) DETACH DELETE n', {}]]);
  for (const label of ['Department', 'Skill', 'Company', 'Student', 'Job']) {
    await run(`CREATE CONSTRAINT ${label.toLowerCase()}_id IF NOT EXISTS FOR (n:${label}) REQUIRE n.id IS UNIQUE`);
  }
  const stmts = [];
  d.departments.forEach((r) => stmts.push(...upserts.departments(r)));
  d.skills.forEach((r) => stmts.push(...upserts.skills(r)));
  d.companies.forEach((r) => stmts.push(...upserts.companies(r)));
  d.students.forEach((r) => stmts.push(...upserts.students(r)));
  d.jobs.forEach((r) => stmts.push(...upserts.jobs(r)));
  d.applications.forEach((r) => stmts.push(...upserts.applications(r)));
  d.placements.forEach((r) => stmts.push(...upserts.placements(r)));
  await write(stmts);
}

// ------------------------------------------------------------------ analytics
export async function counts() {
  const nodes = await run('MATCH (n) RETURN labels(n)[0] AS label, count(*) AS n');
  const rels = await run('MATCH ()-[r]->() RETURN type(r) AS type, count(*) AS n');
  return {
    nodes: Object.fromEntries(nodes.map((r) => [r.label, r.n])),
    rels: Object.fromEntries(rels.map((r) => [r.type, r.n])),
  };
}

/** Job matches by skills, plus students with similar skill sets. */
export async function recommendations(studentId) {
  const jobs = await run(
    `MATCH (s:Student {id: $id}), (j:Job)<-[:POSTED]-(c:Company)
     WHERE NOT (s)-[:APPLIED_TO]->(j) AND date(j.deadline) >= date()
     OPTIONAL MATCH (j)-[:REQUIRES]->(k:Skill)
     WITH s, j, c, collect(k) AS ks
     WITH s, j, c, [x IN ks WHERE (s)-[:HAS_SKILL]->(x) | x.name] AS matched, [x IN ks | x.name] AS required
     RETURN j.id AS id, j.title AS job, c.name AS company, j.package AS package_lpa,
            size(matched) AS skills_matched, size(required) AS skills_required,
            [x IN required WHERE NOT x IN matched] AS missing_skills,
            s.cgpa >= j.minCgpa AS eligible
     ORDER BY eligible DESC, skills_matched DESC, package_lpa DESC LIMIT 6`,
    { id: studentId },
  );
  const similar = await run(
    `MATCH (s:Student {id: $id})-[:HAS_SKILL]->(k:Skill)<-[:HAS_SKILL]-(o:Student)
     WHERE o <> s
     RETURN o.id AS id, o.name AS student, o.placed AS placed, count(k) AS shared_skills, collect(k.name) AS skills
     ORDER BY shared_skills DESC, student LIMIT 5`,
    { id: studentId },
  );
  return { jobs, similar };
}

/** Nodes + edges for the graph visualisation. */
export async function snapshot() {
  const nodes = await run(
    `MATCH (n) RETURN labels(n)[0] AS label, n.id AS id, coalesce(n.title, n.name) AS name`,
  );
  const edges = await run(
    `MATCH (a)-[r]->(b)
     RETURN labels(a)[0] AS fromLabel, a.id AS fromId, type(r) AS type,
            labels(b)[0] AS toLabel, b.id AS toId, r.status AS status`,
  );
  return { nodes, edges };
}
