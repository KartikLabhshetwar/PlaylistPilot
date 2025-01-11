import { youtube } from '@/lib/youtube';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');

    const cookieStore = cookies();
    const userId = cookieStore.get('userId')?.value;
    console.log('User ID from cookie:', userId);

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    let playlists;
    try {
      const accessToken = await db.getAccessToken(userId);
      console.log('Access token retrieved:', !!accessToken);
      
      if (!accessToken) {
        return NextResponse.json(
          { error: 'Access token not found' },
          { status: 401 }
        );
      }
      
      playlists = await youtube.getPlaylists(accessToken);
      console.log('Playlists fetched:', playlists?.items?.length);
      
      if (playlists?.items) {
        await db.savePlaylists(userId, playlists.items);
        console.log('Playlists saved to database');
      }

      return NextResponse.json(playlists);
    } catch (error) {
      console.error('Detailed error:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in playlists route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch playlists' },
      { status: 500 }
    );
  }
} 