'use client';

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayCircle, ListVideo } from "lucide-react";

interface PlaylistCardProps {
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  videoCount: number;
  onClick: () => void;
}

export function PlaylistCard({
  title,
  description,
  thumbnailUrl,
  videoCount,
  onClick,
}: PlaylistCardProps) {
  return (
    <Card 
      className="group cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 duration-300"
      onClick={onClick}
    >
      <CardHeader className="space-y-4 p-5">
        <div className="aspect-video overflow-hidden rounded-md relative">
          <img
            src={thumbnailUrl || 'https://via.placeholder.com/320x180?text=No+Thumbnail'}
            alt={title}
            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 transition-all duration-300 group-hover:opacity-100 flex items-center justify-center">
            <PlayCircle className="h-12 w-12 text-white transform scale-90 transition-transform duration-300 group-hover:scale-100" />
          </div>
          <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded-md flex items-center gap-1.5">
            <ListVideo className="h-4 w-4 text-white" />
            <span className="text-white text-sm font-medium">{videoCount}</span>
          </div>
        </div>
        <div className="space-y-2.5">
          <CardTitle className="line-clamp-1 text-lg">{title}</CardTitle>
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {description || "No description"}
          </p>
        </div>
      </CardHeader>
    </Card>
  );
} 