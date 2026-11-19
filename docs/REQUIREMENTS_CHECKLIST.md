# Course requirement checklist (evidence-based)

Source: the course brief "DBMS Experiential Learning – Level 3 Project" (requirements 1-17). Status reflects the source code and real output in `docs/`. **Needs human** is not a software gap: the team must supply authentic academic or demonstration evidence. Fill in the team facts before submission.

| Req | Item | Status | Evidence or gap |
|---|---|---|---|
| 1 | Title unique within the section | Needs human | Confirm "PlaceGraph - placement cell management" with the instructor / compare with other teams. |
| 1 | Meaningful real-world problem, beyond simple CRUD | Met | PROJECT_REPORT §1; triggers that act on their own, graph job matching. |
| 2 | Two-member, instructor-approved team | Needs human | Names, register numbers and approval go in CONTRIBUTIONS.md. |
| 2 | Defined responsibilities; both do DB and app work | Needs human | Template in CONTRIBUTIONS.md; each member must do and be able to explain both sides. |
| 3 | Practical database design and implementation | Met | `docs/sql/`, diagrams, DATA_DICTIONARY.md. |
| 3 | Option 1: SQL (PostgreSQL/MySQL) | Met | MySQL 8.4 in `docker-compose.yml`; `docs/sql/01-08`. |
| 3 | Option 1: NoSQL | Met | Neo4j 5 in `docker-compose.yml`; `lib/graph.js`, graph tests. |
| 3 | Two or more appropriate paradigms | Met | PROJECT_REPORT §5. |
| 4 | ER diagram and relational conversion | Met | `er_diagram.pdf/svg`, `relational_schema.pdf/svg`, PROJECT_REPORT §§6-7. |
| 4 | Entities/tables, attributes | Met | ER diagram, DATA_DICTIONARY.md (generated). |
| 4 | Primary and foreign keys | Met | Diagrams, `01_ddl.sql`, dictionary. |
| 4 | Relationships and constraints | Met | Cardinalities in ER; PK/FK/UNIQUE/CHECK listed in dictionary. |
| 4 | NoSQL data model | Met | PROJECT_REPORT §10, `lib/graph.js`. |
| 4 | Collections/documents/indexes where applicable | Met | Neo4j uses nodes and edges (no collections); id uniqueness constraints per label. |
| 4 | Embeddings/metadata/retrieval strategy where applicable | N/A | No vectors used (Option 1); retrieval is exact SQL/FULLTEXT/Cypher, explained in §5. |
| 5 | Execute DDL | Met | `npm run db:setup` applies `01_ddl.sql`; `evidence/create_tables_output.txt`. |
| 5 | CREATE | Met | 12 tables, 2 views in `01_ddl.sql`. |
| 5 | ALTER | Met | ADD INDEX/CHECK/FULLTEXT, ADD/MODIFY/DROP COLUMN in `01_ddl.sql`. |
| 5 | DROP | Met | `DROP DATABASE IF EXISTS`, scratch `DROP TABLE` in `01_ddl.sql`. |
| 5 | PK/FK/constraints | Met | Same file; SQL tests reject violations. |
| 5 | Indexes | Met | B-tree and FULLTEXT; `evidence/explain_output.txt`. |
| 5 | Views | Met | `v_placement_summary`, `v_job_pipeline`; Dashboard. |
| 6 | INSERT / UPDATE / DELETE / SELECT | Met | `04_dml_seed.sql`, `05_dml_demo.sql`, API routes, CRUD screenshots. |
| 6 | JOIN | Met | Application list, `05_dml_demo.sql`, `evidence/dml_demo_output.txt`. |
| 6 | GROUP BY / HAVING / ORDER BY / aggregates | Met | `05_dml_demo.sql`, views, nested queries. |
| 6 | Subqueries | Met | `06_nested_queries.sql` (8 queries), `evidence/nested_queries_output.txt`. |
| 7 | At least four advanced SQL concepts | Met | Transactions, views, stored procedures, triggers, FULLTEXT/indexing (PROJECT_REPORT §9). |
| 7 | At least one advanced NoSQL concept | Met | Variable-length shortestPath, aggregation, pattern predicates (`lib/graph.js`, `cypher_queries.cypher`). |
| 7 | Transactions | Met | `lib/core.js` BEGIN/COMMIT/ROLLBACK; rollback test. |
| 7 | Views | Met | See above; SQL view test. |
| 7 | Stored procedures/functions | Met | 7 procedures in `03_procedures.sql`, called by the API; SQL tests. |
| 7 | Triggers | Met | 16 triggers in `02_triggers.sql`; Trigger Lab; before/after evidence. |
| 7 | Indexing / full-text search | Met | FULLTEXT used by search boxes; EXPLAIN output. |
| 7 | NoSQL aggregation | Met | Skill demand vs supply, placements per company (Cypher). |
| 7 | Vector similarity search example | N/A | Optional alternative; project uses SQL + graph. |
| 8 | Optional semantic search for text-heavy data | N/A | Deliberately not used; data is structured, matching is exact (§5). |
| 9 | Functional Next.js web app | Met | `npm run build` passes; screenshots of the running app. |
| 9 | UI interacts with database functions | Met | Pages call `/api/*` which call procedures and queries; banners show the SQL. |
| 9 | Forms, tables, search, filters, dashboards | Met | CrudPage forms, tables, search box, filters; officer dashboard; student home. |
| 10 | Backend/API database integration | Met | Route Handlers, `lib/core.js`; API tests. |
| 10 | No hard-coded credentials/sensitive config | Met | `lib/env.js`, `.env.example` placeholders, random `.env` via `npm run init`, compose interpolation, limited app DB user. |
| 10 | Environment variables | Met | `.env`, `lib/env.js`, scripts use `--env-file=.env`. |
| 11 | Backend authentication | Met | bcrypt + JWT cookie, `/api/auth`; 401 tests. |
| 11 | Minimum two domain roles | Met | `officer` and `student`; 403 tests; student scoping. |
| 12 | Database-level input validation | Met | CHECK/FK/UNIQUE/ENUM/triggers; 21 SQL tests. |
| 12 | Data consistency and integrity | Met | Transactions, trigger-maintained derived data, audit; rollback test. |
| 13 | Objectives | Met | PROJECT_REPORT §2. |
| 13 | Functional requirements | Met | §3. |
| 13 | ER diagram | Met | §6. |
| 13 | Relational schema | Met | §7. |
| 13 | Database choice and justification | Met | §5 (no performance claims made). |
| 13 | Data dictionary/schema | Met | DATA_DICTIONARY.md, §8. |
| 13 | SQL/NoSQL implementation | Met | §§9-10. |
| 13 | Important queries | Met | §11 and evidence files. |
| 13 | System architecture | Met | §4. |
| 13 | Application screenshots | Met | `docs/screenshots/`, §14. |
| 13 | Testing results | Met | `docs/test-results/latest.txt`: 39 pass, 0 fail, §15. |
| 13 | Conclusion | Met | §17. |
| 14 | Maintain source in Git/GitHub | Partial | Local git repository with commits; the team must push it to GitHub (GIT_GUIDE.md). |
| 14 | Individual contribution commits | Needs human | Each member must commit their own genuine work. |
| 14 | Suitable README | Met | `README.md` (setup, run, roles, scripts, evidence). |
| 15 | Show ER/design and relational schema | Needs human | Artifacts ready; live demo is the team's. |
| 15 | Show DB implementation and queries/operations | Needs human | Scripts, Trigger Lab and evidence ready. |
| 15 | Show Next.js UI and database integration | Needs human | App, tests and screenshots ready. |
| 15 | Show advanced features and test cases | Needs human | VIVA_NOTES.md, `npm test`. |
| 15 | Show individual member contributions | Needs human | Real commits and review history required. |
| 16 | Original design and implementation | Needs human | Both members must attest; see the originality checklist in CONTRIBUTIONS.md. |
| 16 | No direct copying of project/tutorial/repository | Needs human | List every reference actually used (CONTRIBUTIONS.md). |
| 16 | Substantially distinct from similar-domain teams | Needs human | Compare with other teams in the section. |
| 17 | Beyond CRUD | Met | Triggers, procedures, graph matching, audit, role rules. |
| 17 | Connect concepts, design, implementation, web app | Met | Report §§9-12 mapped to files; tests exercise the whole stack. |
| 17 | Justified SQL/NoSQL choice | Met | §5. |

**Verification summary.** `npm run db:setup` applies all SQL and builds the graph; `npm run build` compiles; `npm test` passes 39/39 on a freshly seeded database; `npm run evidence` produced the screenshots and transcripts in `docs/`. Not covered: keyboard/screen-reader review, a second operating system, the live course demonstration, and any instructor approval record.
