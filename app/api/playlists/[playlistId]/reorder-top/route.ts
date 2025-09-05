import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { spotifyFetch } from '@/lib/spotify';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> }
) {
  const { playlistId } = await params;
  const cookieStore = await cookies();
  let userId = cookieStore.get('userId')?.value;

  if (!userId) {
    const user = await prisma.user.findFirst();
    if (user) userId = user.id;
    else return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { trackId } = await request.json();
    if (!trackId) return NextResponse.json({ error: 'trackId is required' }, { status: 400 });

    // Find current index of the track in the playlist
    const tracks = await spotifyFetch(
      userId,
      'GET',
      `/playlists/${playlistId}/tracks?fields=items(track(id)),total&limit=100`
    );

    const items: any[] = tracks.items || [];
    const fromIndex = items.findIndex((it: any) => it.track?.id === trackId);
    if (fromIndex < 0) {
      return NextResponse.json({ error: 'Track not found in playlist' }, { status: 404 });
    }

    // Reorder: move that item to top (index 0)
    const result = await spotifyFetch(
      userId,
      'PUT',
      `/playlists/${playlistId}/tracks`,
      {
        range_start: fromIndex,
        insert_before: 0,
        range_length: 1,
      }
    );

    // Optional verify: fetch first item
    const verify = await spotifyFetch(
      userId,
      'GET',
      `/playlists/${playlistId}/tracks?fields=items(track(id))&limit=1`
    );
    const topId = verify.items?.[0]?.track?.id;
    const success = topId === trackId;

    await prisma.missionCompletion.create({
      data: {
        userId,
        missionId: 'reorder_top_' + trackId,
        status: success ? 'SUCCESS' : 'FAILED',
        details: {
          playlistId,
          trackId,
          snapshotId: result?.snapshot_id,
          topId,
        },
      },
    });

    return NextResponse.json({ success, snapshot_id: result?.snapshot_id, topId });
  } catch (error: any) {
    await prisma.missionCompletion.create({
      data: {
        userId: userId!,
        missionId: 'reorder_top_failed',
        status: 'FAILED',
        details: { error: error.message, playlistId },
      },
    });
    return NextResponse.json({ error: 'Failed to reorder', details: error.message }, { status: 500 });
  }
}

