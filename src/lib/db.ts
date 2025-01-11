import { Pool } from 'pg';
import { youtube_v3 } from 'googleapis';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Initialize tables
const initTables = `
  CREATE TABLE IF NOT EXISTS access_tokens (
    user_id VARCHAR(255) PRIMARY KEY,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expiry_date BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS playlists (
    playlist_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    video_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES access_tokens(user_id)
  );

  CREATE TABLE IF NOT EXISTS playlist_videos (
    id VARCHAR(255) PRIMARY KEY,
    playlist_id VARCHAR(255) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    video_id VARCHAR(255) NOT NULL,
    position INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (playlist_id) REFERENCES playlists(playlist_id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);
  CREATE INDEX IF NOT EXISTS idx_playlist_videos_playlist_id ON playlist_videos(playlist_id);
`;

// Initialize database tables before exporting db operations
let tablesInitialized = false;
const initializeDb = async () => {
  if (!tablesInitialized) {
    try {
      // Only create tables if they don't exist
      await pool.query(initTables);
      tablesInitialized = true;
      console.log('Database tables initialized successfully');
    } catch (err) {
      console.error('Error initializing database tables:', err);
      throw err;
    }
  }
};

interface TokenInfo {
  accessToken: string;
  refreshToken?: string | null;
  expiryDate?: number | null;
}

export interface DbPlaylist {
  playlist_id: string;
  name: string;
  description: string;
  thumbnail_url: string;
  video_count: number;
}

// Database operations
export const db = {
  async init() {
    await initializeDb();
  },

  async saveTokens(userId: string, tokens: TokenInfo) {
    try {
      await initializeDb(); // Ensure tables exist
      const result = await pool.query(
        `INSERT INTO access_tokens (user_id, access_token, refresh_token, expiry_date, updated_at) 
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) 
         ON CONFLICT (user_id) DO UPDATE SET 
         access_token = $2,
         refresh_token = COALESCE($3, access_tokens.refresh_token),
         expiry_date = $4,
         updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [userId, tokens.accessToken, tokens.refreshToken, tokens.expiryDate]
      );
      console.log('Tokens saved successfully:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('Error saving tokens:', error);
      throw error;
    }
  },

  async getTokens(userId: string): Promise<TokenInfo | null> {
    try {
      await initializeDb(); // Ensure tables exist
      const result = await pool.query(
        'SELECT access_token, refresh_token, expiry_date FROM access_tokens WHERE user_id = $1',
        [userId]
      );
      
      if (result.rows.length === 0) {
        console.log('No tokens found for user:', userId);
        return null;
      }
      
      const tokens = {
        accessToken: result.rows[0].access_token,
        refreshToken: result.rows[0].refresh_token,
        expiryDate: result.rows[0].expiry_date,
      };
      console.log('Retrieved tokens for user:', userId);
      return tokens;
    } catch (error) {
      console.error('Error retrieving tokens:', error);
      throw error;
    }
  },

  async savePlaylists(userId: string, playlists: DbPlaylist[]) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const playlist of playlists) {
        await client.query(
          `INSERT INTO playlists (playlist_id, name, description, thumbnail_url, video_count, user_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (playlist_id) 
           DO UPDATE SET 
             name = EXCLUDED.name,
             description = EXCLUDED.description,
             thumbnail_url = EXCLUDED.thumbnail_url,
             video_count = EXCLUDED.video_count`,
          [playlist.playlist_id, playlist.name, playlist.description, playlist.thumbnail_url, playlist.video_count, userId]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async savePlaylistVideos(playlistId: string, videos: youtube_v3.Schema$PlaylistItem[]) {
    await initializeDb();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM playlist_videos WHERE playlist_id = $1', [playlistId]);
      
      for (const video of videos) {
        if (video.id && video.snippet?.title && video.contentDetails?.videoId) {
          await client.query(
            'INSERT INTO playlist_videos (id, playlist_id, title, description, thumbnail_url, video_id, position) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [
              video.id,
              playlistId,
              video.snippet.title,
              video.snippet.description || null,
              video.snippet.thumbnails?.medium?.url || null,
              video.contentDetails.videoId,
              video.snippet.position || 0,
            ]
          );
        }
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async getPlaylistVideos(playlistId: string) {
    await initializeDb();
    const result = await pool.query(
      'SELECT * FROM playlist_videos WHERE playlist_id = $1 ORDER BY position',
      [playlistId]
    );
    return result.rows;
  },

  async getPlaylist(playlistId: string) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM playlists WHERE id = $1',
        [playlistId]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }
}; 