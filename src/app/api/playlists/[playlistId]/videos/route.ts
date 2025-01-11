import { youtube } from '@/lib/youtube';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { GaxiosError } from 'gaxios';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { playlistId: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pageToken = searchParams.get('pageToken') || undefined;
    
    const cookieStore = cookies();
    const userId = cookieStore.get('userId')?.value || 'default-user';
    const tokens = await db.getTokens(userId);

    // Check if we have valid tokens
    if (!tokens?.accessToken) {
      return NextResponse.json(
        { error: 'Please sign in again' },
        { status: 401 }
      );
    }

    const playlistId = params.playlistId;
    
    // First, ensure the playlist exists in the database
    const playlist = await youtube.getPlaylist(playlistId, tokens.accessToken);
    if (playlist && playlist.id) {
      await db.savePlaylists(userId, [{
        playlist_id: playlist.id,
        name: playlist.snippet?.title || '',
        description: playlist.snippet?.description || '',
        thumbnail_url: playlist.snippet?.thumbnails?.medium?.url || '',
        video_count: playlist.contentDetails?.itemCount || 0
      }]);
    }

    // Now fetch and save the videos
    const response = await youtube.getPlaylistVideos(
      playlistId,
      tokens.accessToken,
      pageToken
    );
    
    // Save videos to database
    if (response.items) {
      await db.savePlaylistVideos(playlistId, response.items);
    }

    return NextResponse.json({
      items: response.items?.map(video => ({
        id: video.id,
        title: video.snippet?.title,
        description: video.snippet?.description,
        thumbnailUrl: video.snippet?.thumbnails?.medium?.url,
        videoId: video.contentDetails?.videoId,
        position: video.snippet?.position
      })) || [],
      nextPageToken: response.nextPageToken,
      totalResults: response.pageInfo.totalResults
    });
  } catch (error) {
    console.error('Error fetching playlist videos:', error);
    
    if (error instanceof GaxiosError && error.response?.status === 404) {
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404 }
      );
    }

    // Type guard for Error objects
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch playlist videos' },
      { status: 500 }
    );
  }
} 