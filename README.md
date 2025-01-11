# YouTube Playlist Pilot 🎵

A modern web application that helps you manage and view your YouTube playlists efficiently. Built with Next.js, TypeScript, and the YouTube Data API v3.

## Features

- 🔐 Secure Google OAuth2 authentication
- 📋 View all your created and saved playlists
- 🎥 Browse videos within each playlist
- 💾 Automatic caching of playlists and videos in database
- 🎨 Modern UI with loading states and notifications
- 🌐 Direct links to watch videos on YouTube

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Database**: PostgreSQL (with NeonDB)
- **Authentication**: Google OAuth 2.0
- **API**: YouTube Data API v3

## Prerequisites

Before you begin, ensure you have:

1. Node.js 18+ installed
2. A Google Cloud Project with YouTube Data API enabled
3. OAuth 2.0 credentials configured
4. A PostgreSQL database (we recommend NeonDB)

## Environment Variables

Create a `.env.local` file in the root directory with:

```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
REDIRECT_URI=http://localhost:3000/api/auth/callback
DATABASE_URL=your_postgres_connection_string
YOUTUBE_API_KEY=your_api_key
```

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/playlistpilot.git
   cd playlistpilot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## How It Works

1. **Authentication**:
   - Users log in with their Google account
   - The app requests access to YouTube data
   - Access tokens are securely stored in the database

2. **Playlist Management**:
   - Fetches both created and saved playlists
   - Displays playlist thumbnails, titles, and video counts
   - Caches playlist data to minimize API calls

3. **Video Browsing**:
   - Click on a playlist to view its videos
   - Videos show thumbnails, titles, and descriptions
   - One-click access to watch videos on YouTube

4. **Data Storage**:
   - Playlists and videos are cached in PostgreSQL
   - Automatic updates when fetching new data
   - Efficient querying for faster load times

## Database Schema

The application uses three main tables:

- `access_tokens`: Stores user authentication data
- `playlists`: Caches playlist information
- `playlist_videos`: Stores video details for each playlist

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/)
- [YouTube Data API](https://developers.google.com/youtube/v3)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
