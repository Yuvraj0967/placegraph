import { respond } from '@/lib/http';
import * as graph from '@/lib/graph';
import { requireUser } from '@/lib/auth';
export const dynamic = 'force-dynamic';

// Officers can look up any student; a student only ever gets their own recommendations.
export const GET = (req) =>
  respond(async () => {
    const user = await requireUser();
    const asked = Number(new URL(req.url).searchParams.get('studentId'));
    return graph.recommendations(user.role === 'student' ? user.student_id : asked);
  });
