import { google, youtube_v3 } from 'googleapis';
import { Credentials } from 'google-auth-library';
import { db } from './db';
import { GaxiosError } from 'gaxios';

interface TokenInfo {
  accessToken: string;
  refreshToken: string | null;
  expiryDate: number | null;
}

interface PlaylistItem {
  id: string;
  title: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  itemCount: number;
}

interface PlaylistResponse {
  items: PlaylistItem[];
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  nextPageToken?: string;
  prevPageToken?: string;
}

interface PlaylistVideoResponse {
  kind?: string;
  etag?: string;
  items: youtube_v3.Schema$PlaylistItem[];
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  nextPageToken?: string;
}

interface ChannelInfo {
  id: string;
  title: string | undefined | null;
  description: string | undefined | null;
  thumbnailUrl: string | undefined | null;
  statistics: youtube_v3.Schema$ChannelStatistics | undefined;
}

type YouTubePlaylist = youtube_v3.Schema$Playlist;

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const youtubeClient = google.youtube({
  version: 'v3'
});

const youtubeWithApiKey = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
});

async function refreshAccessToken(userId: string, refreshToken: string): Promise<Credentials> {
  try {
    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    const tokenInfo: TokenInfo = {
      accessToken: credentials.access_token!,
      refreshToken: credentials.refresh_token || refreshToken,
      expiryDate: credentials.expiry_date || null
    };

    await db.saveTokens(userId, tokenInfo);
    return credentials;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw error;
  }
}

export const youtube = {
  getAuthUrl(): string {
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
    });
  },

  async getToken(code: string): Promise<Credentials> {
    const { tokens } = await oauth2Client.getToken({
      code,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI
    });
    return tokens;
  },

  async getValidAccessToken(userId: string): Promise<string> {
    const tokens = await db.getTokens(userId);
    if (!tokens) {
      throw new Error('No tokens found for user');
    }

    // Check if token is expired or will expire soon (within 5 minutes)
    const expiryDate = tokens.expiryDate;
    const isExpired = expiryDate ? Date.now() >= expiryDate - 5 * 60 * 1000 : true;

    if (isExpired && tokens.refreshToken) {
      const newTokens = await refreshAccessToken(userId, tokens.refreshToken);
      return newTokens.access_token!;
    }

    return tokens.accessToken;
  },

  async getChannelInfo(channelId: string): Promise<ChannelInfo> {
    const response = await youtubeWithApiKey.channels.list({
      part: ['snippet', 'statistics'],
      id: [channelId],
    });

    if (!response.data.items?.length) {
      throw new Error('Channel not found');
    }

    const channel = response.data.items[0];
    return {
      id: channel.id!,
      title: channel.snippet?.title || null,
      description: channel.snippet?.description || null,
      thumbnailUrl: channel.snippet?.thumbnails?.default?.url || null,
      statistics: channel.statistics,
    };
  },

  async getChannelPlaylists(channelId: string, pageToken?: string): Promise<PlaylistResponse> {
    const response = await youtubeWithApiKey.playlists.list({
      part: ['snippet', 'contentDetails'],
      channelId: channelId,
      maxResults: 50,
      pageToken,
    });

    return {
      items: response.data.items?.map((item: youtube_v3.Schema$Playlist) => ({
        id: item.id!,
        title: item.snippet?.title || null,
        description: item.snippet?.description || null,
        thumbnailUrl: item.snippet?.thumbnails?.medium?.url || null,
        itemCount: item.contentDetails?.itemCount || 0,
      })) || [],
      pageInfo: {
        totalResults: response.data.pageInfo?.totalResults || 0,
        resultsPerPage: response.data.pageInfo?.resultsPerPage || 0
      },
      nextPageToken: response.data.nextPageToken ?? undefined,
    };
  },

  async getPlaylists(accessToken: string, pageToken?: string): Promise<PlaylistResponse> {
    oauth2Client.setCredentials({ access_token: accessToken });

    try {
      // Get user's own playlists
      const ownPlaylists = await youtubeClient.playlists.list({
        auth: oauth2Client,
        part: ['snippet', 'contentDetails'],
        mine: true,
        maxResults: 50,
        pageToken: pageToken
      });

      console.log('Own playlists response:', JSON.stringify(ownPlaylists.data, null, 2));

      // If we don't have own playlists, try getting playlists from the user's channel
      if (!ownPlaylists.data.items?.length) {
        console.log('No own playlists found, trying channel playlists');
        
        const channelResponse = await youtubeClient.channels.list({
          auth: oauth2Client,
          part: ['id'],
          mine: true
        });

        console.log('Channel response:', JSON.stringify(channelResponse.data, null, 2));

        const channelId = channelResponse.data.items?.[0]?.id;
        if (!channelId) {
          console.log('No channel ID found');
          return {
            items: [],
            pageInfo: {
              totalResults: 0,
              resultsPerPage: 0
            }
          };
        }

        // Get playlists from the user's channel
        const channelPlaylists = await youtubeClient.playlists.list({
          auth: oauth2Client,
          part: ['snippet', 'contentDetails'],
          channelId: channelId,
          maxResults: 50,
          pageToken: pageToken
        });

        console.log('Channel playlists response:', JSON.stringify(channelPlaylists.data, null, 2));

        // Map channel playlists to our format
        const items = channelPlaylists.data.items?.map((playlist: YouTubePlaylist) => ({
          id: playlist.id!,
          title: playlist.snippet?.title || null,
          description: playlist.snippet?.description || null,
          thumbnailUrl: playlist.snippet?.thumbnails?.medium?.url || null,
          itemCount: playlist.contentDetails?.itemCount || 0
        })) || [];

        return {
          items,
          pageInfo: {
            totalResults: channelPlaylists.data.pageInfo?.totalResults || 0,
            resultsPerPage: channelPlaylists.data.pageInfo?.resultsPerPage || 0
          },
          nextPageToken: channelPlaylists.data.nextPageToken || undefined,
          prevPageToken: channelPlaylists.data.prevPageToken || undefined
        };
      }

      // Map own playlists to our format
      const items = ownPlaylists.data.items?.map((playlist: YouTubePlaylist) => ({
        id: playlist.id!,
        title: playlist.snippet?.title || null,
        description: playlist.snippet?.description || null,
        thumbnailUrl: playlist.snippet?.thumbnails?.medium?.url || null,
        itemCount: playlist.contentDetails?.itemCount || 0
      })) || [];

      return {
        items,
        pageInfo: {
          totalResults: ownPlaylists.data.pageInfo?.totalResults || 0,
          resultsPerPage: ownPlaylists.data.pageInfo?.resultsPerPage || 0
        },
        nextPageToken: ownPlaylists.data.nextPageToken || undefined,
        prevPageToken: ownPlaylists.data.prevPageToken || undefined
      };
    } catch (error) {
      console.error('Error fetching playlists:', error);
      if (error instanceof GaxiosError) {
        const status = error.response?.status;
        if (status === 401) {
          throw new Error('Authentication failed');
        } else if (status === 403) {
          throw new Error('API quota exceeded or insufficient permissions');
        }
      }
      throw error;
    }
  },

  async getPlaylistVideos(
    playlistId: string,
    accessToken?: string,
    pageToken?: string
  ): Promise<PlaylistVideoResponse> {
    try {
      const client = accessToken ? youtubeClient : youtubeWithApiKey;
      if (accessToken) {
        oauth2Client.setCredentials({ access_token: accessToken });
      }

      const response = await client.playlistItems.list({
        auth: accessToken ? oauth2Client : process.env.YOUTUBE_API_KEY,
        part: ['snippet', 'contentDetails'],
        playlistId: playlistId,
        maxResults: 50,
        pageToken
      });

      const { data } = response;

      // Ensure we have a valid response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response from YouTube API');
      }

      // Return empty response if no items
      if (!data.items?.length) {
        return {
          kind: 'youtube#playlistItemListResponse',
          etag: '',
          items: [],
          pageInfo: {
            totalResults: 0,
            resultsPerPage: 0
          }
        };
      }

      // Validate and clean the response data
      const validatedItems = data.items
        .filter(item => item && item.id && item.snippet && item.contentDetails?.videoId)
        .map(item => {
          const description = item.snippet?.description;
          let validatedDescription: string | undefined;
          if (description === null || description === undefined) {
            validatedDescription = undefined;
          } else {
            validatedDescription = description;
          }

          return {
            ...item,
            snippet: {
              ...item.snippet,
              title: item.snippet?.title || 'Untitled Video',
              description: validatedDescription,
              thumbnails: {
                default: item.snippet?.thumbnails?.default || undefined,
                medium: item.snippet?.thumbnails?.medium || undefined,
                high: item.snippet?.thumbnails?.high || undefined,
                standard: item.snippet?.thumbnails?.standard || undefined,
                maxres: item.snippet?.thumbnails?.maxres || undefined
              },
              position: item.snippet?.position || 0
            },
            contentDetails: {
              videoId: item.contentDetails?.videoId || ''
            }
          };
        });

      const kind = data.kind === null ? undefined : data.kind;
      const etag = data.etag === null ? undefined : data.etag;
      const nextPageToken = data.nextPageToken === null ? undefined : data.nextPageToken;

      return {
        kind,
        etag,
        items: validatedItems,
        pageInfo: {
          totalResults: data.pageInfo?.totalResults || 0,
          resultsPerPage: data.pageInfo?.resultsPerPage || 0
        },
        nextPageToken
      };
    } catch (error) {
      console.error('Error fetching playlist videos:', error);
      if (error instanceof GaxiosError) {
        const status = error.response?.status;
        if (status === 404) {
          throw new Error('Playlist not found');
        } else if (status === 403) {
          throw new Error('API quota exceeded or insufficient permissions');
        } else if (status === 401) {
          throw new Error('Authentication failed');
        }
      }
      throw error;
    }
  },

  async getUserInfo(accessToken: string) {
    oauth2Client.setCredentials({ access_token: accessToken });
    
    try {
      const response = await youtubeClient.channels.list({
        auth: oauth2Client,
        part: ['snippet', 'id', 'contentDetails'],
        mine: true
      });

      const channel = response.data.items?.[0];
      if (!channel) return null;

      return {
        ...channel.snippet,
        channelId: channel.id,
        relatedPlaylists: channel.contentDetails?.relatedPlaylists
      };
    } catch (error) {
      console.error('Error fetching user info:', error);
      throw error;
    }
  },

  async getPlaylist(playlistId: string, accessToken: string) {
    oauth2Client.setCredentials({ access_token: accessToken });
    
    const response = await youtubeClient.playlists.list({
      auth: oauth2Client,
      part: ['snippet', 'contentDetails'],
      id: [playlistId]
    });

    return response.data.items?.[0];
  },
};