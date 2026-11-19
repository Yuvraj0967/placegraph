# Test results

`latest.txt` is the real output of `npm run test:record`: it resets the database with `npm run db:setup`, runs the three suites in order and saves the output. Nothing here is hand-written.

| Suite | File | Covers |
|---|---|---|
| SQL (21) | `tests/01-sql.test.mjs` | constraints, guard triggers, auto placement, auto rejection, audit, procedures, views, FULLTEXT, transaction rollback. Each test runs in a transaction that is rolled back. |
| API (13) | `tests/02-api.test.mjs` | authentication, 401/403, student scoping, CRUD lifecycle, validation, workflow errors, search and filters, student applying. Needs the app running on port 3001. |
| Graph (5) | `tests/03-graph.test.mjs` | MySQL/Neo4j sync, projection of create/delete and accepted offers, recommendations, shortest path. Changes data, so it runs last. |

The suites expect a freshly seeded database: run `npm run db:setup` before `npm test`.

Other evidence in `docs/evidence/`: `trigger_demo_output.txt`, `procedure_demo_output.txt`, `nested_queries_output.txt`, `dml_demo_output.txt`, `create_tables_output.txt`, `explain_output.txt` (SQL scripts executed against the real MySQL container) and `crud_proof.txt` (MySQL and Neo4j state after each action performed through the website).
