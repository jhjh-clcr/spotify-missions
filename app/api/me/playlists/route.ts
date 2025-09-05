import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { spotifyFetch } from '@/lib/spotify';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
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
    const playlists = await spotifyFetch(
      userId,
      'GET',
      '/me/playlists?limit=20',
      null
    );

    return NextResponse.json(playlists);
  } catch (error: any) {
    console.error('Playlists error:', error);
    return NextResponse.json(
      { error: 'Failed to get playlists', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    const { name = 'KPD Missions', description = 'Created for K-pop missions', public: isPublic = true } = await request.json();

    // Get user profile first
    const profile = await spotifyFetch(userId, 'GET', '/me', null);
    
    const playlist = await spotifyFetch(
      userId,
      'POST',
      `/users/${profile.id}/playlists`,
      {
        name,
        description,
        public: isPublic,
      }
    );

    return NextResponse.json(playlist);
  } catch (error: any) {
    console.error('Create playlist error:', error);
    return NextResponse.json(
      { error: 'Failed to create playlist', details: error.message },
      { status: 500 }
    );
  }
}
