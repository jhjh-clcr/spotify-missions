import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Try to connect to database
    const userCount = await prisma.user.count();
    
    return NextResponse.json({
      success: true,
      database: 'Connected',
      userCount,
      databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Missing',
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      database: 'Failed to connect',
      error: error.message,
      databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Missing',
    });
  }
}