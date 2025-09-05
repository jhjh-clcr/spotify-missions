import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { spotifyFetch } from '@/lib/spotify';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const idol = searchParams.get('q') || 'aespa';
  
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
    // Simplified query - just search by artist name
    const query = `artist:${idol}`;
    const searchResults = await spotifyFetch(
      userId,
      'GET',
      `/search?q=${encodeURIComponent(query)}&type=album,track&limit=10`,
      null
    );

    // Format results for UI
    const tracks = searchResults.tracks?.items?.map((track: any) => {
      const images = track.album?.images || [];
      const pick = images[images.length - 1] || images[0] || null; // prefer smaller
      return {
        id: track.id,
        name: track.name,
        uri: track.uri,
        artists: track.artists.map((a: any) => a.name),
        albumId: track.album?.id,
        albumName: track.album?.name,
        release_date: track.album?.release_date,
        image: pick?.url || null,
      };
    }) || [];

    const albums = searchResults.albums?.items?.map((album: any) => {
      const images = album.images || [];
      const pick = images[images.length - 1] || images[0] || null; // prefer smaller
      return {
        id: album.id,
        name: album.name,
        uri: album.uri,
        artists: album.artists.map((a: any) => a.name),
        release_date: album.release_date,
        image: pick?.url || null,
      };
    }) || [];

    return NextResponse.json({ tracks, albums });
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed', details: error.message },
      { status: 500 }
    );
  }
}
