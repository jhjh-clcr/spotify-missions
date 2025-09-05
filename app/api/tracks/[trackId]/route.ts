import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { spotifyFetch } from '@/lib/spotify';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  const { trackId } = await params;
  const cookieStore = await cookies();
  let userId = cookieStore.get('userId')?.value;
  if (!userId) {
    const user = await prisma.user.findFirst();
    if (user) userId = user.id; else return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const track = await spotifyFetch(userId!, 'GET', `/tracks/${trackId}`);
    return NextResponse.json({
      id: track.id,
      name: track.name,
      artists: track.artists?.map((a: any) => ({ id: a.id, name: a.name })) || [],
      album: track.album ? { id: track.album.id, name: track.album.name } : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch track', details: error.message }, { status: 500 });
  }
}

