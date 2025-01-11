'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search } from "lucide-react";
import { PlaylistCard } from "@/components/playlist/playlist-card";
import { VideoCard } from "@/components/playlist/video-card";
import { PlaylistSkeleton, VideoSkeleton } from "@/components/playlist/loading-skeletons";
import { useAuth } from "@/components/layout/client-layout";

interface PlaylistVideo {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  videoId: string;
  position: number;
}

interface Playlist {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  itemCount: number;
}

interface APIPlaylist {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  itemCount: number;
}

interface APIResponse {
  items: APIPlaylist[];
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  nextPageToken?: string;
}

interface ChannelInfo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  statistics: {
    subscriberCount: string;
    videoCount: string;
  };
}

export default function Home() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [videos, setVideos] = useState<PlaylistVideo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [isLoadingMoreVideos, setIsLoadingMoreVideos] = useState(false);
  const [channelId, setChannelId] = useState('');
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [hasMoreVideos, setHasMoreVideos] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [channelInfo, setChannelInfo] = useState<ChannelInfo | null>(null);
  const [isLoadingChannel, setIsLoadingChannel] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      console.log('User is authenticated, fetching playlists');
      fetchUserPlaylists();
    } else {
      console.log('User is not authenticated, clearing playlists');
      setPlaylists([]);
      setChannelInfo(null);
    }
  }, [isAuthenticated]);

  const fetchUserPlaylists = async () => {
    try {
      console.log('Starting fetchUserPlaylists', { channelId });
      setIsLoading(true);
      const url = channelId ? `/api/playlists?channelId=${channelId}` : '/api/playlists';
      console.log('Fetching playlists from:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: APIResponse = await response.json();
      console.log('Raw playlist data:', data);
      
      if (data?.items && Array.isArray(data.items)) {
        console.log('Processing playlist items:', data.items.length);
        const validPlaylists = data.items.map((item: APIPlaylist) => {
          console.log('Processing playlist item:', item);
          return {
            id: item.id,
            title: item.title,
            description: item.description,
            thumbnailUrl: item.thumbnailUrl,
            itemCount: item.itemCount
          };
        });
        
        console.log('Setting playlists:', validPlaylists);
        setPlaylists(validPlaylists);
      } else {
        console.error('Invalid playlist data structure:', data);
        toast({
          title: "Error",
          description: "Invalid playlist data received",
          variant: "destructive",
        });
        setPlaylists([]);
      }
    } catch (error) {
      console.error('Error fetching playlists:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch playlists",
        variant: "destructive",
      });
      setPlaylists([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlaylistVideos = async (playlist: Playlist, pageToken?: string) => {
    try {
      console.log('Starting fetchPlaylistVideos', { playlistId: playlist.id, pageToken });
      if (!pageToken) {
        setIsLoadingVideos(true);
        setSelectedPlaylist(playlist);
        setVideos([]);
      } else {
        setIsLoadingMoreVideos(true);
      }

      const url = `/api/playlists/${playlist.id}/videos${pageToken ? `?pageToken=${pageToken}` : ''}`;
      console.log('Fetching videos from:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Raw video data:', data);

      if (!data.error && Array.isArray(data.items)) {
        console.log('Processing video items:', data.items.length);
        const validVideos = data.items.map((video: PlaylistVideo) => {
          console.log('Processing video item:', video);
          return {
            id: video.id,
            title: video.title,
            description: video.description,
            thumbnailUrl: video.thumbnailUrl,
            videoId: video.videoId,
            position: video.position
          };
        });

        console.log('Setting videos:', validVideos);
        if (pageToken) {
          setVideos(prev => [...prev, ...validVideos]);
        } else {
          setVideos(validVideos);
        }
        setNextPageToken(data.nextPageToken);
        setHasMoreVideos(!!data.nextPageToken);
      } else {
        console.error('Invalid video data or error:', data);
        throw new Error(data.error || 'Failed to fetch videos');
      }
    } catch (error) {
      console.error('Error fetching playlist videos:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch videos",
        variant: "destructive",
      });
    } finally {
      if (!pageToken) {
        setIsLoadingVideos(false);
      } else {
        setIsLoadingMoreVideos(false);
      }
    }
  };

  const fetchChannelInfo = async (channelId: string) => {
    try {
      console.log('Starting fetchChannelInfo', { channelId });
      setIsLoadingChannel(true);
      const response = await fetch(`/api/channels/${channelId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Channel info data:', data);
      setChannelInfo(data);
    } catch (error) {
      console.error('Error fetching channel info:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch channel info",
        variant: "destructive",
      });
      setChannelInfo(null);
    } finally {
      setIsLoadingChannel(false);
    }
  };

  const handleChannelSearch = async () => {
    if (!channelId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a channel ID",
        variant: "destructive",
      });
      return;
    }

    console.log('Starting channel search for:', channelId);
    await fetchChannelInfo(channelId);
    await fetchUserPlaylists();
  };

  const loadMoreVideos = () => {
    if (selectedPlaylist && nextPageToken) {
      fetchPlaylistVideos(selectedPlaylist, nextPageToken);
    }
  };

  return (
    <div className="space-y-8">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background dark:from-primary/10 dark:via-zinc-900 dark:to-zinc-900 z-0" />
        <div className="relative z-10 max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            <span className="block bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">
              Playlist Pilot
            </span>
            <span className="block text-2xl mt-3 text-muted-foreground font-normal">
              Discover and manage your YouTube playlists with ease
            </span>
          </h1>
          {isAuthenticated && (
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="relative w-full max-w-xs">
                <Input
                  placeholder="Channel ID (optional)"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  disabled={isLoading || isLoadingChannel}
                  className="pl-10 h-11 transition-all focus:ring-2 focus:ring-primary/20 dark:bg-zinc-800/50 dark:focus:ring-primary/30"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <Button 
                onClick={handleChannelSearch} 
                disabled={isLoading || isLoadingChannel}
                size="lg"
                className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isLoading || isLoadingChannel ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Search Channel
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {channelInfo && (
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 p-4 rounded-lg border bg-card">
            <img
              src={channelInfo.thumbnailUrl}
              alt={channelInfo.title}
              className="w-16 h-16 rounded-full"
            />
            <div>
              <h3 className="text-lg font-semibold">{channelInfo.title}</h3>
              <p className="text-sm text-muted-foreground">
                {parseInt(channelInfo.statistics.subscriberCount).toLocaleString()} subscribers •{' '}
                {parseInt(channelInfo.statistics.videoCount).toLocaleString()} videos
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
            {Array(6).fill(0).map((_, i) => (
              <PlaylistSkeleton key={i} />
            ))}
          </div>
        ) : selectedPlaylist ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedPlaylist(null);
                  setVideos([]);
                  setNextPageToken(undefined);
                  setHasMoreVideos(false);
                }}
                className="gap-2 hover:bg-primary/5 -ml-4 transition-all duration-200 dark:hover:bg-primary/10"
              >
                ← Back to Playlists
              </Button>
              <h2 className="text-2xl font-bold dark:text-zinc-100">{selectedPlaylist.title}</h2>
            </div>
            
            <div className="space-y-8">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {isLoadingVideos ? (
                  Array(6).fill(0).map((_, i) => (
                    <VideoSkeleton key={i} />
                  ))
                ) : videos.length > 0 ? (
                  videos.map((video) => (
                    <VideoCard
                      key={video.id}
                      title={video.title}
                      description={video.description}
                      thumbnailUrl={video.thumbnailUrl}
                      videoId={video.videoId}
                    />
                  ))
                ) : (
                  <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-xl font-medium text-muted-foreground">No videos found in this playlist</p>
                    <p className="mt-2 text-sm text-muted-foreground">Try selecting a different playlist</p>
                  </div>
                )}
              </div>

              {hasMoreVideos && (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={loadMoreVideos}
                    disabled={isLoadingMoreVideos}
                    className="gap-2"
                  >
                    {isLoadingMoreVideos && <Loader2 className="h-4 w-4 animate-spin" />}
                    Load More Videos
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : playlists.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {playlists.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                title={playlist.title}
                description={playlist.description}
                thumbnailUrl={playlist.thumbnailUrl}
                videoCount={playlist.itemCount}
                onClick={() => fetchPlaylistVideos(playlist)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground">No playlists found</p>
            {isAuthenticated && (
              <p className="mt-2 text-sm text-muted-foreground">
                Try refreshing or enter a channel ID to fetch playlists
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
