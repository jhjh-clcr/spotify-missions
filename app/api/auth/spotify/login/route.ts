import { NextResponse } from 'next/server';

export async function GET() {
  const scopes = [
    'user-read-recently-played',
    'playlist-modify-public',
    'playlist-modify-private',
    'user-library-modify',
    'playlist-read-private',
    'user-library-read',
    'ugc-image-upload',
    'user-follow-modify',
    'user-follow-read',
  ].join(' ');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    scope: scopes,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    state: Math.random().toString(36).substring(7),
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params}`;
  
  return NextResponse.redirect(authUrl);
}
