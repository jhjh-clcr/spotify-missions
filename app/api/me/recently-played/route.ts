import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { spotifyFetch } from '@/lib/spotify';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const targetTrackId = searchParams.get('targetTrackId');
  const windowMinutesParam = searchParams.get('windowMinutes');
  const windowHoursParam = searchParams.get('windowHours');
  const windowMinutes = windowMinutesParam
    ? Number(windowMinutesParam)
    : (windowHoursParam ? Number(windowHoursParam) * 60 : 24 * 60);
  
  const cookieStore = await cookies();
  let userId = cookieStore.get('userId')?.value;

  // Fallback: get the first user if cookie is missing
  if (!userId) {
    const user = await prisma.user.findFirst();
    if (user) {
      userId = user.id;
    } else {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
  }

  try {
    const recentlyPlayed = await spotifyFetch(
      userId,
      'GET',
      '/me/player/recently-played?limit=50',
      null
    );

    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;
    
    let verified = false;
    let matchedTrack = null;

    if (targetTrackId && recentlyPlayed.items) {
      for (const item of recentlyPlayed.items) {
        const playedAt = new Date(item.played_at).getTime();
        if (item.track.id === targetTrackId && (now - playedAt) <= windowMs) {
          verified = true;
          matchedTrack = item;
          break;
        }
      }
    }

    // Log completion if targetTrackId was provided
    if (targetTrackId) {
      await prisma.missionCompletion.create({
        data: {
          userId,
          missionId: 'play_verify_' + targetTrackId,
          status: verified ? 'SUCCESS' : 'FAILED',
          details: {
            targetTrackId,
            windowMinutes,
            matchedTrack: matchedTrack ? {
              trackName: matchedTrack.track.name,
              playedAt: matchedTrack.played_at,
            } : null,
          },
        },
      });
    }

    return NextResponse.json({
      verified,
      items: recentlyPlayed.items,
      targetTrackId,
      windowMinutes,
    });
  } catch (error: any) {
    console.error('Recently played error:', error);
    return NextResponse.json(
      { error: 'Failed to get recently played', details: error.message },
      { status: 500 }
    );
  }
}
