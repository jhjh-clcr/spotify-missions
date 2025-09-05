import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { spotifyFetch } from '@/lib/spotify';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  let userId = cookieStore.get('userId')?.value;
  if (!userId) {
    const user = await prisma.user.findFirst();
    if (user) userId = user.id; else return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { artistId } = await request.json();
    if (!artistId) return NextResponse.json({ error: 'artistId is required' }, { status: 400 });

    await spotifyFetch(userId!, 'PUT', `/me/following?type=artist&ids=${encodeURIComponent(artistId)}`);

    await prisma.missionCompletion.create({
      data: {
        userId: userId!,
        missionId: 'follow_artist_' + artistId,
        status: 'SUCCESS',
        details: { artistId },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    await prisma.missionCompletion.create({
      data: {
        userId: userId!,
        missionId: 'follow_artist_failed',
        status: 'FAILED',
        details: { error: error.message },
      },
    });
    return NextResponse.json({ error: 'Failed to follow artist', details: error.message }, { status: 500 });
  }
}

