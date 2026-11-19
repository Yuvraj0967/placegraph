// =====================================================================
//  PlaceGraph  |  Neo4j / Cypher queries
//  The website's "Queries" page parses and runs these blocks.
//  Graph model:
//     (:Student)-[:IN_DEPT]->(:Department)
//     (:Student)-[:HAS_SKILL]->(:Skill)<-[:REQUIRES]-(:Job)<-[:POSTED]-(:Company)
//     (:Student)-[:APPLIED_TO {applicationId, status, appliedOn}]->(:Job)
//     (:Student)-[:PLACED_AT {package, role, placedOn}]->(:Company)
// =====================================================================

// @query Count nodes per label
MATCH (n) RETURN labels(n)[0] AS label, count(*) AS total ORDER BY total DESC;

// @query Jobs with their company and required skills
MATCH (c:Company)-[:POSTED]->(j:Job)
OPTIONAL MATCH (j)-[:REQUIRES]->(k:Skill)
RETURN c.name AS company, j.title AS job, j.package AS package_lpa, collect(k.name) AS required_skills
ORDER BY package_lpa DESC;

// @query Skill demand vs supply (jobs requiring a skill vs students having it)
MATCH (k:Skill)
OPTIONAL MATCH (k)<-[:REQUIRES]-(j:Job)
OPTIONAL MATCH (k)<-[:HAS_SKILL]-(s:Student)
RETURN k.name AS skill, count(DISTINCT j) AS jobs_requiring, count(DISTINCT s) AS students_with_skill
ORDER BY jobs_requiring DESC, skill;

// @query Job recommendations for a student (skill match, only jobs not yet applied to)
// @param studentId=7
MATCH (s:Student {id: $studentId}), (j:Job)<-[:POSTED]-(c:Company)
WHERE NOT (s)-[:APPLIED_TO]->(j) AND date(j.deadline) >= date()
OPTIONAL MATCH (j)-[:REQUIRES]->(k:Skill)
WITH s, j, c, collect(k) AS ks
WITH s, j, c, [x IN ks WHERE (s)-[:HAS_SKILL]->(x) | x.name] AS matched, [x IN ks | x.name] AS required
RETURN j.title AS job, c.name AS company, j.package AS package_lpa,
       size(matched) AS skills_matched, size(required) AS skills_required,
       [x IN required WHERE NOT x IN matched] AS missing_skills,
       s.cgpa >= j.minCgpa AS eligible
ORDER BY eligible DESC, skills_matched DESC, package_lpa DESC LIMIT 6;

// @query Skill gap: what a student must learn for a job
// @param studentId=7
// @param jobId=4
MATCH (s:Student {id: $studentId}), (j:Job {id: $jobId})-[:REQUIRES]->(k:Skill)
WHERE NOT (s)-[:HAS_SKILL]->(k)
RETURN s.name AS student, j.title AS job, collect(k.name) AS skills_to_learn;

// @query Students with similar skills (peers) for a student
// @param studentId=1
MATCH (s:Student {id: $studentId})-[:HAS_SKILL]->(k:Skill)<-[:HAS_SKILL]-(o:Student)
WHERE o <> s
RETURN o.name AS peer, o.placed AS placed, count(k) AS shared_skills, collect(k.name) AS skills
ORDER BY shared_skills DESC, peer LIMIT 5;

// @query Placements per company with average package
MATCH (s:Student)-[p:PLACED_AT]->(c:Company)
RETURN c.name AS company, count(s) AS students_placed, avg(p.package) AS avg_package_lpa
ORDER BY students_placed DESC, avg_package_lpa DESC;

// @query Application funnel (applications by status)
MATCH ()-[r:APPLIED_TO]->()
RETURN r.status AS status, count(*) AS applications
ORDER BY applications DESC;

// @query Unplaced students with the best CGPA
MATCH (s:Student {placed: false})-[:IN_DEPT]->(d:Department)
RETURN s.name AS student, d.code AS dept, s.cgpa AS cgpa
ORDER BY cgpa DESC LIMIT 5;

// @query Connection between two students through shared skills / jobs (shortest path)
// @param fromId=1
// @param toId=9
MATCH (a:Student {id: $fromId}), (b:Student {id: $toId}),
      p = shortestPath((a)-[*..6]-(b))
RETURN [n IN nodes(p) | coalesce(n.name, n.title)] AS path, length(p) AS hops;
