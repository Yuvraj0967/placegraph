import { respond } from '@/lib/http';
import * as core from '@/lib/core';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Updating and deleting is for placement officers only.
export const PUT = (req, { params }) =>
  respond(async () => {
    await requireUser('officer');
    const { resource, id } = await params;
    const body = await req.json().catch(() => ({}));
    return core.update(resource, /^\d+$/.test(id) ? Number(id) : id, body);
  });

export const DELETE = (_req, { params }) =>
  respond(async () => {
    await requireUser('officer');
    const { resource, id } = await params;
    return core.remove(resource, /^\d+$/.test(id) ? Number(id) : id);
  });
