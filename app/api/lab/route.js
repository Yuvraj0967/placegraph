import { respond } from '@/lib/http';
import * as lab from '@/lib/lab';
import { requireUser } from '@/lib/auth';
export const dynamic = 'force-dynamic';

// GET  /api/lab                              -> scenario list
// GET  /api/lab?scenario=x&student_id=1...   -> { code, before }
// POST /api/lab { scenario, params }         -> { sql, result, after, graph }
export const GET = (req) =>
  respond(async () => {
    await requireUser('officer');
    const sp = new URL(req.url).searchParams;
    const id = sp.get('scenario');
    if (!id) return lab.list();
    return lab.prepare(id, Object.fromEntries(sp.entries()));
  });

export const POST = (req) =>
  respond(async () => {
    await requireUser('officer');
    const { scenario, params } = await req.json();
    return lab.fire(scenario, params ?? {});
  });
