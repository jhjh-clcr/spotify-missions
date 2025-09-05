import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { exchangeCodeForTokens } from '@/lib/spotify';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url));
  }

  try {
    const tokenData = await exchangeCodeForTokens(code);
    
    // Create or find user (simplified - no real auth)
    let user = await prisma.user.findFirst({
      where: { email: 'demo@user.com' }
    });
    
    if (!user) {
      user = await prisma.user.create({
        data: { email: 'demo@user.com' }
      });
    }

    // Delete existing token if exists
    await prisma.oAuthToken.deleteMany({
      where: {
        userId: user.id,
        provider: 'spotify',
      },
    });

    // Store new token
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
    
    await prisma.oAuthToken.create({
      data: {
        userId: user.id,
        provider: 'spotify',
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || '',
        scope: tokenData.scope,
        expiresAt,
      },
    });

    // Set user cookie
    const cookieStore = await cookies();
    cookieStore.set('userId', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return NextResponse.redirect(new URL('/', request.url));
  } catch (error) {
    console.error('Token exchange failed:', error);
    return NextResponse.redirect(new URL('/?error=token_exchange_failed', request.url));
  }
}