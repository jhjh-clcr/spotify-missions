import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { spotifyFetch } from '@/lib/spotify';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ids = searchParams.get('ids');
  if (!ids) return NextResponse.json({ error: 'ids is required' }, { status: 400 });

  const cookieStore = await cookies();
  let userId = cookieStore.get('userId')?.value;
  if (!userId) {
    const user = await prisma.user.findFirst();
    if (user) userId = user.id; else return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const result = await spotifyFetch(userId!, 'GET', `/me/shows/contains?ids=${encodeURIComponent(ids)}`);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to check shows', details: error.message }, { status: 500 });
  }
}

