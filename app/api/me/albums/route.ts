import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { spotifyFetch } from '@/lib/spotify';
import { prisma } from '@/lib/db';

export async function PUT(request: NextRequest) {
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
    const { albumId } = await request.json();
    
    await spotifyFetch(
      userId,
      'PUT',
      '/me/albums',
      {
        ids: [albumId],
      }
    );

    // Log completion
    await prisma.missionCompletion.create({
      data: {
        userId,
        missionId: 'save_album_' + albumId,
        status: 'SUCCESS',
        details: {
          albumId,
          savedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Album saved to library',
    });
  } catch (error: any) {
    console.error('Save album error:', error);
    
    // Log failure
    await prisma.missionCompletion.create({
      data: {
        userId,
        missionId: 'save_album_failed',
        status: 'FAILED',
        details: {
          error: error.message,
        },
      },
    });
    
    return NextResponse.json(
      { error: 'Failed to save album', details: error.message },
      { status: 500 }
    );
  }
}