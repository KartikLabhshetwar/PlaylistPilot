'use client';

import { Button } from "@/components/ui/button";
import { User, LogOut, Moon, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "next-themes";
import Image from 'next/image';

interface UserInfo {
  title: string;
  thumbnails?: {
    default?: {
      url: string;
      width: number;
      height: number;
    };
    medium?: {
      url: string;
      width: number;
      height: number;
    };
  };
}

interface HeaderProps {
  userInfo: UserInfo | null;
  isLoading: boolean;
  onLogin: () => void;
  onLogout: () => void;
}

export function Header({ userInfo, isLoading, onLogin, onLogout }: HeaderProps) {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Get the best available thumbnail URL
  const getProfileImage = () => {
    if (!userInfo?.thumbnails) return null;
    return userInfo.thumbnails.medium?.url || userInfo.thumbnails.default?.url || null;
  };

  const profileImage = getProfileImage();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:bg-zinc-900/95 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">
              Playlist Pilot
            </h2>
          </div>
          <div className="flex items-center gap-4">
            {isLoading ? (
              <Skeleton className="h-9 w-9 rounded-full" />
            ) : userInfo ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative h-9 w-9 rounded-full overflow-hidden ring-1 ring-border hover:ring-primary transition-colors"
                  >
                    {profileImage ? (
                      <Image
                        src={profileImage}
                        alt={userInfo.title}
                        fill
                        className="object-cover"
                        sizes="36px"
                        priority
                        onError={(e) => {
                          // Fallback to user icon if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const fallback = document.createElement('div');
                            fallback.className = 'flex items-center justify-center w-full h-full';
                            fallback.innerHTML = '<svg class="h-5 w-5" viewBox="0 0 24 24"><use href="#user-icon"></use></svg>';
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 dark:bg-zinc-900 dark:border-zinc-800">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none dark:text-zinc-100">{userInfo.title}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        YouTube Account
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="dark:bg-zinc-800" />
                  <DropdownMenuItem 
                    onClick={toggleTheme}
                    className="gap-2 text-muted-foreground cursor-pointer hover:text-foreground dark:hover:text-zinc-100"
                  >
                    {theme === 'dark' ? (
                      <>
                        <Sun className="h-4 w-4" />
                        <span>Light Mode</span>
                      </>
                    ) : (
                      <>
                        <Moon className="h-4 w-4" />
                        <span>Dark Mode</span>
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={onLogout} 
                    className="gap-2 text-red-600 cursor-pointer dark:text-red-400 dark:hover:text-red-300"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                onClick={onLogin}
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isLoading}
              >
                <User className="h-4 w-4" />
                Sign in with Google
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
} 