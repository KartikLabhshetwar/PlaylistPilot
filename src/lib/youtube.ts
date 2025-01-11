import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { GaxiosError } from 'gaxios';

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.REDIRECT_URI
);

export const youtube = {
  getAuthUrl() {
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube.force-ssl'
      ],
      prompt: 'consent',
    });
  },

  async getToken(code: string) {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  },

  async getPlaylists(accessToken: string) {
    try {
      // Set credentials before creating YouTube client
      oauth2Client.setCredentials({
        access_token: accessToken
      });

      const youtube = google.youtube({
        version: 'v3',
        auth: oauth2Client // Use the authenticated client
      });
    
      const response = await youtube.playlists.list({
        part: ['snippet', 'contentDetails', 'status'],
        mine: true,
        maxResults: 50
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching playlists:', error);
      if (error instanceof GaxiosError) {
        if (error.response?.status === 403) {
          throw new Error('Quota exceeded or permission denied');
        }
        if (error.response?.status === 401) {
          throw new Error('Authentication token expired');
        }
      }
      throw error;
    }
  },

  async getPlaylistsByChannelId(channelId: string, apiKey: string) {
    try {
      const youtube = google.youtube({
        version: 'v3',
        auth: apiKey // Use API key for public data
      });
    
      const response = await youtube.playlists.list({
        part: ['snippet', 'contentDetails', 'status'],
        channelId,
        maxResults: 50
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching channel playlists:', error);
      if (error instanceof GaxiosError) {
        if (error.response?.status === 403) {
          throw new Error('API key invalid or quota exceeded');
        }
        if (error.response?.status === 404) {
          throw new Error('Channel not found');
        }
      }
      throw error;
    }
  },

  async getPlaylistItems(playlistId: string, accessToken?: string, apiKey?: string) {
    const youtube = google.youtube('v3');
    
    try {
      if (accessToken) {
        oauth2Client.setCredentials({ access_token: accessToken });
      }

      const response = await youtube.playlistItems.list({
        part: ['snippet', 'contentDetails', 'status'],
        playlistId,
        maxResults: 50,
        ...(accessToken ? {} : { key: apiKey }),
        fields: 'items(snippet(title,description,thumbnails/medium,position,resourceId),contentDetails/videoId,status)'
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching playlist items:', error);
      throw error;
    }
  }
};