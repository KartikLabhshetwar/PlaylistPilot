'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Playlist {
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      medium: {
        url: string;
      };
    };
  };
  contentDetails: {
    itemCount: number;
  };
}

export default function Home() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [channelId, setChannelId] = useState('');

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/google');
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error during login:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlaylists = async () => {
    try {
      setIsLoading(true);
      const url = channelId 
        ? `/api/playlists?channelId=${channelId}`
        : '/api/playlists';
      const response = await fetch(url);
      const data = await response.json();
      setPlaylists(data.items || []);
    } catch (error) {
      console.error('Error fetching playlists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserPlaylists = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/playlists');
      const data = await response.json();
      
      if (data.error) {
        console.error('Error:', data.error);
        return;
      }
      
      setPlaylists(data.items || []);
    } catch (error) {
      console.error('Error fetching playlists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center justify-center space-y-8">
          <h1 className="text-4xl font-bold tracking-tight">YouTube Playlist Retriever</h1>
          
          <div className="flex flex-col gap-4 w-full max-w-md">
            <Button 
              onClick={handleLogin}
              variant="default"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Login with Google"}
            </Button>

            <Button 
              onClick={fetchUserPlaylists}
              variant="outline"
              disabled={isLoading}
            >
              Fetch My Playlists
            </Button>

            <div className="flex gap-2">
              <Input
                placeholder="Channel ID (optional)"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
              />
              <Button onClick={fetchPlaylists} disabled={isLoading}>
                Fetch Playlists
              </Button>
            </div>
          </div>

          <div className="w-full mt-8">
            {playlists.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {playlists.map((playlist) => (
                  <Card key={playlist.id}>
                    <CardHeader>
                      <CardTitle>{playlist.snippet.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="aspect-video relative mb-4">
                        <img
                          src={playlist.snippet.thumbnails.medium.url}
                          alt={playlist.snippet.title}
                          className="object-cover rounded-md"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {playlist.snippet.description}
                      </p>
                      <p className="text-sm mt-2">
                        {playlist.contentDetails.itemCount} videos
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="w-full">
                <CardContent className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">
                    Please login to view your playlists
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
