import { NextResponse } from 'next/server';

/** Wrap an API handler: JSON out, readable errors in. */
export async function respond(fn) {
  try {
    return NextResponse.json(await fn());
  } catch (e) {
    const status = e.status || 500;
    if (status === 500) console.error(e);
    return NextResponse.json({ error: e.message }, { status });
  }
}
