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
    const maxResults = 20; // Limit results per page
    
    const cookieStore = cookies();
    const userId = cookieStore.get('userId')?.value || 'default-user';
    const tokens = await db.getTokens(userId);

    if (!tokens?.accessToken) {
      return NextResponse.json(
        { error: 'Please sign in again' },
        { status: 401 }
      );
    }

    const playlistId = params.playlistId;

    // First try to get videos from database
    const cachedVideos = await db.getPlaylistVideos(playlistId);
    
    // If we have cached videos and no pageToken is requested, return from cache
    if (cachedVideos.length > 0 && !pageToken) {
      return NextResponse.json({
        items: cachedVideos.map(video => ({
          id: video.id,
          title: video.title,
          description: video.description,
          thumbnailUrl: video.thumbnail_url,
          videoId: video.video_id,
          position: video.position
        })),
        totalResults: cachedVideos.length
      });
    }

    // If we need to fetch from YouTube, do it with pagination
    const response = await youtube.getPlaylistVideos(
      playlistId,
      tokens.accessToken,
      pageToken,
      maxResults
    );

    // Save playlist info if we have it
    try {
      const playlist = await youtube.getPlaylist(playlistId, tokens.accessToken);
      if (playlist?.id) {
        await db.savePlaylists(userId, [{
          playlist_id: playlist.id,
          name: playlist.snippet?.title || '',
          description: playlist.snippet?.description || '',
          thumbnail_url: playlist.snippet?.thumbnails?.medium?.url || '',
          video_count: playlist.contentDetails?.itemCount || 0
        }]);
      }
    } catch (error) {
      console.error('Error saving playlist:', error);
      // Continue even if playlist save fails
    }

    // Save videos to database in background
    if (response.items?.length) {
      Promise.resolve().then(async () => {
        try {
          await db.savePlaylistVideos(playlistId, response.items);
        } catch (error) {
          console.error('Error saving videos to database:', error);
        }
      });
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
    
    if (error instanceof GaxiosError) {
      if (error.response?.status === 404) {
        return NextResponse.json(
          { error: 'Playlist not found' },
          { status: 404 }
        );
      }
      if (error.response?.status === 504) {
        return NextResponse.json(
          { error: 'Request timeout. Please try with a smaller page size.' },
          { status: 504 }
        );
      }
    }

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