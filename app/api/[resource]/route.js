import { respond } from '@/lib/http';
import * as core from '@/lib/core';
import { requireUser } from '@/lib/auth';
import { authorizeList, authorizeCreate } from '@/lib/access';

export const dynamic = 'force-dynamic';

// GET /api/<resource>?q=text&status=...   (any signed-in user; students only see their own rows where it matters)
export const GET = (req, { params }) =>
  respond(async () => {
    const user = await requireUser();
    const { resource } = await params;
    const { scope } = authorizeList(user, resource);
    const opts = Object.fromEntries(new URL(req.url).searchParams.entries());
    return core.list(resource, { ...opts, scope });
  });

export const POST = (req, { params }) =>
  respond(async () => {
    const user = await requireUser();
    const { resource } = await params;
    return core.create(resource, authorizeCreate(user, resource, await req.json()));
  });
