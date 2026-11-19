# Endpoint-to-UI map

`<resource>` is one of `students, companies, jobs, skills, departments, applications, rounds, placements`.

| Method and endpoint | UI element | Access |
|---|---|---|
| GET /api/auth | Page session gate | Public |
| POST /api/auth | Login form | Public |
| DELETE /api/auth | "Sign out" button | Signed in |
| GET /api/<resource>?q=&status=... | Tables, search box, filters | Officer: all rows. Student: jobs, companies, skills, departments in full; students, applications, rounds, placements only their own |
| POST /api/<resource> | "Add" forms | Officer. Student: only `applications` (as themselves) |
| PUT /api/<resource>/[id] | Edit form; row buttons (Shortlist, Make offer, Accept offer, Reject, Mark PASSED/FAILED) | Officer |
| DELETE /api/<resource>/[id] | Delete buttons | Officer |
| GET /api/graph/recommend?studentId= | Graph page, student "Job matches" and dashboard | Officer (any student); student (own, id ignored) |
| GET /api/graph/snapshot | Graph drawing | Officer |
| GET /api/stats | Officer dashboard | Officer |
| POST /api/resync | "Rebuild graph from MySQL" | Officer |
| GET /api/inspect?table= | DB Inspector | Officer |
| GET /api/queries | Queries page (nested SQL and Cypher) | Officer |
| GET, POST /api/lab | Trigger Lab | Officer |
