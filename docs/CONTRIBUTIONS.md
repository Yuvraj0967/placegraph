# Contribution plan and evidence

**Fill in the real team details.** Nothing in this file has been verified by the software; it is a template for the team to complete truthfully.

| Member | Name | Register number (SRN) | Instructor approval recorded |
|---|---|---|---|
| A | _fill in_ | _fill in_ | _yes / no_ |
| B | _fill in_ | _fill in_ | _yes / no_ |

## Suggested split (both members must be able to explain both sides)

| Area | Suggested owner | Paths | Suggested branch |
|---|---|---|---|
| SQL model, constraints, triggers, procedures, views | Member A | `docs/sql/`, `tests/01-sql.test.mjs` | `feature/sql-model` |
| API, authentication, roles | Member A | `app/api/`, `lib/auth.js`, `lib/access.js`, `tests/02-api.test.mjs` | `feature/auth-api` |
| Graph model and Cypher | Member B | `lib/graph.js`, `docs/neo4j/`, `tests/03-graph.test.mjs` | `feature/graph` |
| UI pages, search/filters, dashboards | Member B | `app/*/page.js`, `components/` | `feature/ui` |
| Documentation, diagrams, evidence, review | Shared | `docs/`, `README.md`, `scripts/` | `docs/final-report` |

## Real contribution record (fill in from `git shortlog -sn --all`)

| Member | Commits | Database files changed | Application files changed | Reviews / PRs |
|---|---|---|---|---|
| A | | | | |
| B | | | | |

## Originality checklist

- [ ] Both members confirm that no tutorial, repository or other team's implementation was copied directly.
- [ ] External ideas and references actually used are listed here: _e.g. the structure of the documentation set and the requirements checklist was modelled on a classmate's public repository (RecallGraph); all code, schema, domain content and tests in this project were written for the placement domain._
- [ ] Each member has read and can explain the database and application files they claim.
- [ ] Each member can explain the schema, triggers, procedures, the authentication flow, the Cypher queries and the graph synchronisation.
- [ ] The course policy on AI-assisted work has been checked and any use disclosed as required. This project was built with an AI coding assistant; disclose that if the course asks for it.
- [ ] The instructor's title and team approval record is kept with the submission material.
