import { respond } from '@/lib/http';
import * as core from '@/lib/core';
import { requireUser } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const POST = () => respond(async () => { await requireUser('officer'); return core.resyncGraph(); });
