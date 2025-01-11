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

    const playlistId = params.playlistId;
    const response = await youtube.getPlaylistVideos(
      playlistId,
      tokens?.accessToken,
      pageToken
    );
    
    // Save videos to database
    await db.savePlaylistVideos(playlistId, response.items);

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

    return NextResponse.json(
      { error: 'Failed to fetch playlist videos' },
      { status: 500 }
    );
  }
} 