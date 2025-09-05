import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { spotifyFetch } from '@/lib/spotify';

export async function GET(_req: NextRequest) {
  const QUIZ_ALBUM_ID = process.env.QUIZ_TKO_ALBUM_ID || process.env.NEXT_PUBLIC_QUIZ_TKO_ALBUM_ID || '0YaLbDxHTeZLT3CpDunKuT';

  const cookieStore = await cookies();
  let userId = cookieStore.get('userId')?.value;
  if (!userId) {
    const user = await prisma.user.findFirst();
    if (user) userId = user.id; else return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const arr = await spotifyFetch(userId!, 'GET', `/me/albums/contains?ids=${encodeURIComponent(QUIZ_ALBUM_ID)}`);
    const saved = Array.isArray(arr) ? Boolean(arr[0]) : false;

    await prisma.missionCompletion.create({
      data: {
        userId: userId!,
        missionId: 'quiz_album_tko',
        status: saved ? 'SUCCESS' : 'FAILED',
        details: { albumId: QUIZ_ALBUM_ID, saved },
      },
    });

    return NextResponse.json({ success: true, saved, albumId: QUIZ_ALBUM_ID });
  } catch (error: any) {
    await prisma.missionCompletion.create({
      data: {
        userId: userId!,
        missionId: 'quiz_album_tko_failed',
        status: 'FAILED',
        details: { error: error.message },
      },
    });
    return NextResponse.json({ error: 'Quiz verify failed', details: error.message }, { status: 500 });
  }
}

