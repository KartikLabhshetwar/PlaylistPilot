import { youtube } from '@/lib/youtube';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { GaxiosError } from 'gaxios';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const channelId = searchParams.get('channelId');
    const pageToken = searchParams.get('pageToken') || undefined;

    // If channelId is provided, we don't need authentication
    if (channelId) {
      if (!channelId.startsWith('UC')) {
        return NextResponse.json(
          { error: 'Invalid channel ID format. Channel ID should start with UC' },
          { status: 400 }
        );
      }

      try {
        const playlists = await youtube.getChannelPlaylists(channelId, pageToken);
        return NextResponse.json(playlists);
      } catch (error) {
        console.error('Error fetching channel playlists:', error);
        
        if (error instanceof Error) {
          if (error.message === 'Channel not found') {
            return NextResponse.json(
              { error: 'Channel not found' },
              { status: 404 }
            );
          }
          
          if (error.message === 'YouTube API key is not configured') {
            return NextResponse.json(
              { error: 'Server configuration error' },
              { status: 500 }
            );
          }
        }

        if (error instanceof GaxiosError) {
          const status = error.response?.status || 500;
          const message = error.response?.data?.error?.message || error.message;
          
          if (status === 403) {
            return NextResponse.json(
              { error: 'API quota exceeded or invalid API key' },
              { status: 403 }
            );
          }

          return NextResponse.json(
            { error: message },
            { status }
          );
        }

        return NextResponse.json(
          { error: 'Failed to fetch channel playlists' },
          { status: 500 }
        );
      }
    }

    // For user playlists, we need authentication
    const cookieStore = cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log('Checking tokens for user:', userId);
    
    // First check if we have tokens
    const tokens = await db.getTokens(userId);
    if (!tokens) {
      console.log('No tokens found, user needs to re-authenticate');
      return NextResponse.json(
        { error: 'Please sign in again', needsAuth: true },
        { status: 401 }
      );
    }

    console.log('Found tokens, getting valid access token');
    const accessToken = await youtube.getValidAccessToken(userId);
    console.log('Got valid access token, fetching playlists');
    
    const playlists = await youtube.getPlaylists(accessToken, pageToken);
    return NextResponse.json(playlists);
  } catch (error) {
    console.error('Error in playlists route:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message === 'No tokens found for user') {
        return NextResponse.json(
          { error: 'Please sign in again', needsAuth: true },
          { status: 401 }
        );
      }
    }
    
    if (error instanceof GaxiosError) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.error?.message || error.message;
      
      // If token is invalid, prompt for re-authentication
      if (status === 401) {
        return NextResponse.json(
          { error: 'Please sign in again', needsAuth: true },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: message },
        { status }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch playlists' },
      { status: 500 }
    );
  }
}