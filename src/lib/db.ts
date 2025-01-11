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
    token TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS playlists (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    item_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES access_tokens(user_id)
  );

  CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);
`;

// Initialize database tables before exporting db operations
let tablesInitialized = false;
const initializeDb = async () => {
  if (!tablesInitialized) {
    try {
      await pool.query(initTables);
      tablesInitialized = true;
      console.log('Database tables initialized successfully');
    } catch (err) {
      console.error('Error initializing database tables:', err);
      throw err;
    }
  }
};

// Database operations
export const db = {
  async saveAccessToken(userId: string, accessToken: string) {
    await initializeDb(); // Ensure tables exist
    await pool.query(
      'INSERT INTO access_tokens (user_id, token) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET token = $2',
      [userId, accessToken]
    );
  },

  async getAccessToken(userId: string) {
    await initializeDb(); // Ensure tables exist
    const result = await pool.query('SELECT token FROM access_tokens WHERE user_id = $1', [userId]);
    if (result.rows.length > 0) {
      return result.rows[0].token;
    }
    return null;
  },

  async savePlaylists(userId: string, playlists: youtube_v3.Schema$Playlist[]) {
    await initializeDb(); // Ensure tables exist
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM playlists WHERE user_id = $1', [userId]);
      
      for (const playlist of playlists) {
        if (playlist.id && playlist.snippet?.title) {
          await client.query(
            'INSERT INTO playlists (id, user_id, title, description, thumbnail_url, item_count) VALUES ($1, $2, $3, $4, $5, $6)',
            [
              playlist.id,
              userId,
              playlist.snippet.title,
              playlist.snippet.description || null,
              playlist.snippet.thumbnails?.medium?.url || null,
              playlist.contentDetails?.itemCount || 0,
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
  }
}; 