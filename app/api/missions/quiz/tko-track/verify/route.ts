import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { spotifyFetch } from '@/lib/spotify';

export async function GET(_req: NextRequest) {
  const TRACK_ID = process.env.QUIZ_TKO_TRACK_ID || process.env.NEXT_PUBLIC_QUIZ_TKO_TRACK_ID || '0Q5VnK2DYzRyfqQRJuUtvi';
  const WINDOW_MINUTES = Number(process.env.QUIZ_TKO_TRACK_WINDOW_MINUTES || '10');

  const cookieStore = await cookies();
  let userId = cookieStore.get('userId')?.value;
  if (!userId) {
    const user = await prisma.user.findFirst();
    if (user) userId = user.id; else return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const data = await spotifyFetch(userId!, 'GET', '/me/player/recently-played?limit=50');
    const windowMs = WINDOW_MINUTES * 60 * 1000;
    const now = Date.now();

    let played = false;
    let playedAt: string | null = null;
    if (Array.isArray(data?.items)) {
      for (const item of data.items) {
        const id = item?.track?.id;
        const ts = item?.played_at ? new Date(item.played_at).getTime() : 0;
        if (id === TRACK_ID && ts && now - ts <= windowMs) {
          played = true;
          playedAt = item.played_at;
          break;
        }
      }
    }

    await prisma.missionCompletion.create({
      data: {
        userId: userId!,
        missionId: 'quiz_track_tko',
        status: played ? 'SUCCESS' : 'FAILED',
        details: { trackId: TRACK_ID, windowMinutes: WINDOW_MINUTES, played, playedAt },
      },
    });

    return NextResponse.json({ success: true, played, trackId: TRACK_ID, windowMinutes: WINDOW_MINUTES, playedAt });
  } catch (error: any) {
    await prisma.missionCompletion.create({
      data: {
        userId: userId!,
        missionId: 'quiz_track_tko_failed',
        status: 'FAILED',
        details: { error: error.message },
      },
    });
    return NextResponse.json({ error: 'Quiz verify failed', details: error.message }, { status: 500 });
  }
}

