import { youtube } from '@/lib/youtube';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { GaxiosError } from 'gaxios';

export async function GET() {
  try {
    const cookieStore = cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated', isLoggedIn: false },
        { status: 401 }
      );
    }

    try {
      const accessToken = await youtube.getValidAccessToken(userId);
      const userInfo = await youtube.getUserInfo(accessToken);
      
      if (!userInfo) {
        return NextResponse.json(
          { error: 'No user info found', isLoggedIn: false },
          { status: 401 }
        );
      }

      return NextResponse.json({ 
        snippet: userInfo,
        isLoggedIn: true 
      });
    } catch (err) {
      console.error('Error fetching user info:', err);
      
      if (err instanceof Error && err.message.includes('No tokens found')) {
        return NextResponse.json(
          { error: 'Please sign in again', isLoggedIn: false },
          { status: 401 }
        );
      }

      // Handle other API errors
      if (err instanceof GaxiosError) {
        return NextResponse.json(
          { error: 'YouTube API error', isLoggedIn: false },
          { status: err.response?.status || 500 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch user info', isLoggedIn: false },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error('Critical error in user route:', err);
    return NextResponse.json(
      { error: 'Internal server error', isLoggedIn: false },
      { status: 500 }
    );
  }
} 