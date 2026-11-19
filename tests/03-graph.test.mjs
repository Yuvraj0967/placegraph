// Graph (Neo4j) tests: the projection follows MySQL, recommendations and traversals work.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { call, asOfficer, asStudent } from './helpers.mjs';
import { run, close } from '../lib/graph.js';

after(() => close()); // otherwise the open driver keeps the process alive

test('MySQL and Neo4j are in sync', async () => {
  const stats = (await call(await asOfficer(), 'GET', '/api/stats')).body;
  assert.equal(stats.inSync, true);
  assert.equal(stats.neo4j.nodes.Student, stats.mysql.students);
  assert.equal(stats.neo4j.rels.APPLIED_TO, stats.mysql.applications);
  assert.equal(stats.neo4j.rels.PLACED_AT, stats.mysql.placements);
});

test('a student created through the API appears in Neo4j with department and skills, then disappears on delete', async () => {
  const o = await asOfficer();
  const res = await call(o, 'POST', '/api/students', { name: 'Graph Test', email: 'graph.test@college.edu', dept_id: 2, cgpa: 8.0, grad_year: 2026, skill_ids: [1, 6] });
  const id = res.body.data.student_id;
  try {
    const [row] = await run('MATCH (s:Student {id: $id})-[:IN_DEPT]->(d:Department) OPTIONAL MATCH (s)-[:HAS_SKILL]->(k:Skill) RETURN d.code AS dept, collect(k.name) AS skills', { id });
    assert.equal(row.dept, 'IT');
    assert.deepEqual(row.skills.sort(), ['Machine Learning', 'Python']);
  } finally {
    await call(o, 'DELETE', `/api/students/${id}`);
  }
  const gone = await run('MATCH (s:Student {id: $id}) RETURN count(s) AS n', { id });
  assert.equal(gone[0].n, 0);
});

test('accepting an offer through the API adds a PLACED_AT edge in Neo4j', async () => {
  // runs last on purpose: it changes data (resets with npm run db:setup)
  const o = await asOfficer();
  const res = await call(o, 'PUT', '/api/applications/7', { action: 'accept' }); // Rohan -> Software Engineer
  assert.equal(res.status, 200);
  assert.equal(res.body.graph.ok, true);
  const [row] = await run('MATCH (s:Student {id: 3})-[p:PLACED_AT]->(c:Company) RETURN c.name AS company, p.package AS pkg');
  assert.equal(row.company, 'TechNova');
  assert.equal(row.pkg, 12);
});

test('recommendations: skill-match ranking with missing skills (Cypher traversal + aggregation)', async () => {
  const s = await asStudent(); // Meera
  const rec = (await call(s, 'GET', '/api/graph/recommend?studentId=1')).body; // studentId ignored for students
  assert.ok(rec.jobs.length > 0);
  for (const j of rec.jobs) {
    assert.equal(j.skills_required - j.skills_matched, j.missing_skills.length);
  }
});

test('variable-length path: shortest path between two students exists', async () => {
  const rows = await run('MATCH (a:Student {id: 1}), (b:Student {id: 9}), p = shortestPath((a)-[*..6]-(b)) RETURN length(p) AS hops');
  assert.ok(rows[0].hops >= 2);
});
