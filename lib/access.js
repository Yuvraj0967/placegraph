// Role rules, enforced on the server for every request (hiding a button in the UI is not security).
//   officer: everything.
//   student: read jobs/companies/skills/departments; read ONLY their own student row,
//            applications, interview rounds and placement; apply for jobs as themselves.
import { HttpError } from './core.js';

const STUDENT_READ_ALL = new Set(['jobs', 'companies', 'skills', 'departments']);
const STUDENT_READ_OWN = new Set(['students', 'applications', 'rounds', 'placements']);

/** Returns { scope } for list calls: scope.student_id limits rows to the student's own. */
export function authorizeList(user, resource) {
  if (user.role === 'officer' || STUDENT_READ_ALL.has(resource)) return {};
  if (STUDENT_READ_OWN.has(resource)) return { scope: { student_id: user.student_id } };
  throw new HttpError(403, 'You do not have permission to view this');
}

/** Returns the (possibly adjusted) body for create calls. */
export function authorizeCreate(user, resource, body) {
  if (user.role === 'officer') return body;
  if (resource === 'applications') return { ...body, student_id: user.student_id }; // students can only apply as themselves
  throw new HttpError(403, 'Only a placement officer can create this');
}
