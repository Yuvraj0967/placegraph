import { respond } from '@/lib/http';
import * as core from '@/lib/core';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const idOf = (id) => (/^\d+$/.test(id) ? Number(id) : id);

// Updating and deleting is for placement officers only.
export const PUT = (req, { params }) =>
  respond(async () => {
    await requireUser('officer');
    const { resource, id } = await params;
    const body = await req.json().catch(() => ({}));
    return core.update(resource, idOf(id), body);
  });

export const DELETE = (_req, { params }) =>
  respond(async () => {
    const user = await requireUser('officer');
    const { resource, id } = await params;
    if (resource === 'users') await core.assertUserDeletable(idOf(id), user.user_id); // not yourself, not the last officer
    return core.remove(resource, idOf(id));
  });
