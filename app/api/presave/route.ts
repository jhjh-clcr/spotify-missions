import { NextRequest, NextResponse } from 'next/server';

// Lightweight placeholder to register a pre-save intent (no DB persistence in MVP)
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { albumId, prereleaseUrl, releaseAt } = body || {};
  if (!albumId && !prereleaseUrl) {
    return NextResponse.json({ error: 'albumId or prereleaseUrl required' }, { status: 400 });
  }
  return NextResponse.json({ ok: true, albumId, prereleaseUrl, releaseAt });
}

