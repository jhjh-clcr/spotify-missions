import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    env: {
      SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID ? 'Set' : 'Missing',
      SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET ? 'Set' : 'Missing',
      SPOTIFY_REDIRECT_URI: process.env.SPOTIFY_REDIRECT_URI,
      DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Missing',
      JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Missing',
    },
    node_env: process.env.NODE_ENV,
  });
}