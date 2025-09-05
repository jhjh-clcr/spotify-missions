import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  let userId = cookieStore.get('userId')?.value;

  // Fallback: get the first user if cookie is missing
  if (!userId) {
    const user = await prisma.user.findFirst();
    if (user) {
      userId = user.id;
    }
  }

  if (!userId) {
    return NextResponse.json({ completions: [] });
  }

  try {
    const completions = await prisma.missionCompletion.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Format completions for the UI
    const formatted = completions.map((c) => {
      const details = c.details as any;
      const missionType = c.missionId.split('_').slice(0, -1).join('_').toUpperCase();
      
      return {
        time: new Date(c.createdAt).toLocaleString(),
        mission: missionType,
        target: details.targetTrackId || details.trackId || details.albumId || c.missionId.split('_').pop(),
        status: c.status
      };
    });

    return NextResponse.json({ completions: formatted });
  } catch (error) {
    console.error('Failed to fetch completions:', error);
    return NextResponse.json({ completions: [] });
  }
}
