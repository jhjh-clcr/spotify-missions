import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { spotifyFetch } from '@/lib/spotify';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> }
) {
  const { playlistId } = await params;
  const cookieStore = await cookies();
  let userId = cookieStore.get('userId')?.value;
  if (!userId) {
    const user = await prisma.user.findFirst();
    if (user) userId = user.id; else return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // Read desired visibility from body (default public: true)
    let isPublic = true;
    try {
      const body = await request.json();
      if (typeof body?.public === 'boolean') isPublic = body.public;
    } catch {}

    // Follow playlist
    await spotifyFetch(userId!, 'PUT', `/playlists/${playlistId}/followers`, { public: isPublic });

    // Verify by checking whether current user follows the playlist
    const profile = await spotifyFetch(userId!, 'GET', '/me');
    const arr = await spotifyFetch(userId!, 'GET', `/playlists/${playlistId}/followers/contains?ids=${encodeURIComponent(profile.id)}`);
    const followed = Array.isArray(arr) ? Boolean(arr[0]) : false;

    await prisma.missionCompletion.create({
      data: {
        userId: userId!,
        missionId: `follow_playlist_${playlistId}`,
        status: followed ? 'SUCCESS' : 'FAILED',
        details: { playlistId, public: isPublic, verified: followed },
      },
    });

    return NextResponse.json({ success: true, followed, public: isPublic });
  } catch (error: any) {
    await prisma.missionCompletion.create({
      data: {
        userId: userId!,
        missionId: 'follow_playlist_failed',
        status: 'FAILED',
        details: { error: error.message, playlistId },
      },
    });
    return NextResponse.json({ error: 'Failed to follow playlist', details: error.message }, { status: 500 });
  }
}
