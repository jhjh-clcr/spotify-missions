import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { spotifyFetch } from '@/lib/spotify';
import { prisma } from '@/lib/db';

export async function PUT(request: NextRequest) {
  const cookieStore = await cookies();
  let userId = cookieStore.get('userId')?.value;
  if (!userId) {
    const user = await prisma.user.findFirst();
    if (user) userId = user.id; else return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { episodeId } = await request.json();
    if (!episodeId) return NextResponse.json({ error: 'episodeId is required' }, { status: 400 });

    await spotifyFetch(userId!, 'PUT', '/me/episodes', { ids: [episodeId] });

    await prisma.missionCompletion.create({
      data: {
        userId: userId!,
        missionId: 'save_episode_' + episodeId,
        status: 'SUCCESS',
        details: { episodeId, savedAt: new Date().toISOString() },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    await prisma.missionCompletion.create({
      data: {
        userId: userId!,
        missionId: 'save_episode_failed',
        status: 'FAILED',
        details: { error: error.message },
      },
    });
    return NextResponse.json({ error: 'Failed to save episode', details: error.message }, { status: 500 });
  }
}

