import { respond } from '@/lib/http';
import * as graph from '@/lib/graph';
import { requireUser } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const GET = () => respond(async () => { await requireUser('officer'); return graph.snapshot(); });
