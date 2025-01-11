'use client';

import { PlayCircle } from "lucide-react";

interface VideoCardProps {
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  videoId: string;
}

export function VideoCard({ title, description, thumbnailUrl, videoId }: VideoCardProps) {
  return (
    <a
      href={`https://youtube.com/watch?v=${videoId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
    >
      <div className="aspect-video w-full overflow-hidden bg-muted relative">
        <img
          src={thumbnailUrl || 'https://via.placeholder.com/320x180?text=No+Thumbnail'}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <PlayCircle className="w-12 h-12 text-white opacity-90" />
        </div>
      </div>
      <div className="flex flex-col space-y-1.5 p-4">
        <h3 className="font-semibold leading-tight tracking-tight group-hover:text-primary transition-colors duration-200 line-clamp-2">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
        )}
      </div>
    </a>
  );
} 