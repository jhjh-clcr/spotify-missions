import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { spotifyFetch } from '@/lib/spotify';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> }
) {
  const { playlistId } = await params;
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
    const { trackId, uri } = await request.json();
    
    const trackUri = uri || `spotify:track:${trackId}`;
    
    const result = await spotifyFetch(
      userId,
      'POST',
      `/playlists/${playlistId}/tracks`,
      {
        uris: [trackUri],
      }
    );

    // Log completion
    await prisma.missionCompletion.create({
      data: {
        userId,
        missionId: 'add_playlist_' + trackId,
        status: 'SUCCESS',
        details: {
          playlistId,
          trackId,
          trackUri,
          snapshotId: result.snapshot_id,
        },
      },
    });

    return NextResponse.json({
      success: true,
      snapshot_id: result.snapshot_id,
    });
  } catch (error: any) {
    console.error('Add to playlist error:', error);
    
    // Log failure
    await prisma.missionCompletion.create({
      data: {
        userId,
        missionId: 'add_playlist_failed',
        status: 'FAILED',
        details: {
          error: error.message,
          playlistId,
        },
      },
    });
    
    return NextResponse.json(
      { error: 'Failed to add to playlist', details: error.message },
      { status: 500 }
    );
  }
}