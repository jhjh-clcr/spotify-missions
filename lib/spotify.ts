import { prisma } from './db';
import axios from 'axios';

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

interface SpotifyTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
}

export async function exchangeCodeForTokens(code: string): Promise<SpotifyTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
  });

  const response = await axios.post(SPOTIFY_TOKEN_URL, params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  return response.data;
}

export async function refreshAccessToken(refreshToken: string): Promise<SpotifyTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
  });

  const response = await axios.post(SPOTIFY_TOKEN_URL, params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  return response.data;
}

export async function getValidToken(userId: string) {
  const token = await prisma.oAuthToken.findFirst({
    where: {
      userId,
      provider: 'spotify',
    },
  });

  if (!token) {
    throw new Error('No Spotify token found for user');
  }

  const now = new Date();
  const expiryBuffer = new Date(now.getTime() + 60000); // 1 minute buffer

  if (token.expiresAt < expiryBuffer) {
    try {
      const refreshedData = await refreshAccessToken(token.refreshToken);
      
      const newExpiresAt = new Date(now.getTime() + refreshedData.expires_in * 1000);
      
      const updatedToken = await prisma.oAuthToken.update({
        where: { id: token.id },
        data: {
          accessToken: refreshedData.access_token,
          expiresAt: newExpiresAt,
        },
      });

      return updatedToken.accessToken;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      throw new Error('Failed to refresh Spotify token');
    }
  }

  return token.accessToken;
}

export async function spotifyFetch(
  userId: string,
  method: string,
  endpoint: string,
  body?: any
) {
  const accessToken = await getValidToken(userId);
  
  const config: any = {
    method,
    url: `${SPOTIFY_API_BASE}${endpoint}`,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    config.data = body;
  }

  try {
    const response = await axios(config);
    return response.data;
  } catch (error: any) {
    console.error('Spotify API error:', error.response?.data || error.message);
    throw error;
  }
}