import { respond } from '@/lib/http';
import * as q from '@/lib/queries';
import { requireUser } from '@/lib/auth';
export const dynamic = 'force-dynamic';

// GET /api/queries?kind=sql|cypher            -> list of queries (title + text)
// GET /api/queries?kind=...&id=2&studentId=3  -> run one and return rows
export const GET = (req) =>
  respond(async () => {
    await requireUser('officer');
    const sp = new URL(req.url).searchParams;
    const kind = sp.get('kind') === 'cypher' ? 'cypher' : 'sql';
    if (sp.get('id') === null) return kind === 'sql' ? q.sqlQueries() : q.cypherQueries();
    const params = Object.fromEntries(sp.entries());
    return { rows: await q.execute(kind, sp.get('id'), params) };
  });
