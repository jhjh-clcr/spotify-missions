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
    const { albumId } = await request.json();
    if (!albumId) return NextResponse.json({ error: 'albumId is required' }, { status: 400 });

    await spotifyFetch(userId!, 'PUT', '/me/albums', { ids: [albumId] });

    await prisma.missionCompletion.create({
      data: {
        userId: userId!,
        missionId: 'pre_save_album_' + albumId,
        status: 'SUCCESS',
        details: { albumId, executedAt: new Date().toISOString() },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    await prisma.missionCompletion.create({
      data: {
        userId: userId!,
        missionId: 'pre_save_album_failed',
        status: 'FAILED',
        details: { error: error.message },
      },
    });
    return NextResponse.json({ error: 'Failed to pre-save album', details: error.message }, { status: 500 });
  }
}

