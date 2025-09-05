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
    const { showId } = await request.json();
    if (!showId) return NextResponse.json({ error: 'showId is required' }, { status: 400 });

    await spotifyFetch(userId!, 'PUT', '/me/shows', { ids: [showId] });

    await prisma.missionCompletion.create({
      data: {
        userId: userId!,
        missionId: 'save_show_' + showId,
        status: 'SUCCESS',
        details: { showId, savedAt: new Date().toISOString() },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    await prisma.missionCompletion.create({
      data: {
        userId: userId!,
        missionId: 'save_show_failed',
        status: 'FAILED',
        details: { error: error.message },
      },
    });
    return NextResponse.json({ error: 'Failed to save show', details: error.message }, { status: 500 });
  }
}

