'use client';

import { Skeleton } from "@/components/ui/skeleton";

export function PlaylistSkeleton() {
  return (
    <div className="space-y-3">
      <div className="aspect-video w-full">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
      <Skeleton className="h-4 w-[250px]" />
      <Skeleton className="h-4 w-[200px]" />
      <Skeleton className="h-4 w-[100px]" />
    </div>
  );
}

export function VideoSkeleton() {
  return (
    <div className="space-y-3">
      <div className="aspect-video w-full">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
      <Skeleton className="h-4 w-[250px]" />
      <Skeleton className="h-4 w-[200px]" />
    </div>
  );
}

export function PlaylistGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array(count).fill(0).map((_, i) => (
        <PlaylistSkeleton key={i} />
      ))}
    </div>
  );
}

export function VideoGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array(count).fill(0).map((_, i) => (
        <VideoSkeleton key={i} />
      ))}
    </div>
  );
} 