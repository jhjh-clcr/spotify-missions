import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import axios from 'axios';
import { getValidToken } from '@/lib/spotify';
import { readFile } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db';

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
    const contentType = request.headers.get('content-type') || '';
    let imageBase64: string | null = null;
    let assetKey: string | null = null;

    if (contentType.includes('application/json')) {
      const body = await request.json();
      imageBase64 = body.imageBase64 || body.base64 || null;
      assetKey = body.assetKey || (body.useDefault ? (process.env.NEXT_PUBLIC_OFFICIAL_COVER || 'official-cover.jpg') : null);
      if (imageBase64 && imageBase64.startsWith('data:image')) {
        const idx = imageBase64.indexOf('base64,');
        if (idx >= 0) imageBase64 = imageBase64.substring(idx + 7);
      }
    } else if (contentType.includes('image/jpeg')) {
      // Accept raw base64 with image/jpeg header
      const raw = await request.text();
      imageBase64 = raw || null;
    }

    // If no base64 provided, fall back to official asset in /public
    if (!imageBase64) {
      const rel = (assetKey || process.env.NEXT_PUBLIC_OFFICIAL_COVER || 'official-cover.jpg').replace(/^\/+/, '');
      const filePath = path.join(process.cwd(), 'public', rel);
      try {
        const buf = await readFile(filePath);
        imageBase64 = buf.toString('base64');
      } catch (e: any) {
        return NextResponse.json({ error: 'Official cover asset not found', details: filePath }, { status: 400 });
      }
    }

    const token = await getValidToken(userId);
    const url = `https://api.spotify.com/v1/playlists/${playlistId}/images`;
    // Spotify expects base64 JPEG as the body with Content-Type: image/jpeg
    await axios.put(url, imageBase64, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'image/jpeg',
      },
      // Do not transform payload
      transformRequest: [(data) => data],
      maxBodyLength: Infinity,
    });

    await prisma.missionCompletion.create({
      data: {
        userId,
        missionId: 'set_playlist_cover_' + playlistId,
        status: 'SUCCESS',
        details: { playlistId, size: imageBase64.length, assetKey: assetKey || 'inline' },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    await prisma.missionCompletion.create({
      data: {
        userId: userId!,
        missionId: 'set_playlist_cover_failed',
        status: 'FAILED',
        details: { error: error.message, playlistId },
      },
    });
    return NextResponse.json({ error: 'Failed to set playlist image', details: error.message }, { status: 500 });
  }
}
