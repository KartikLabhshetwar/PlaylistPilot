import { youtube } from '@/lib/youtube';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const url = youtube.getAuthUrl();
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate authentication URL' },
      { status: 500 }
    );
  }
} 