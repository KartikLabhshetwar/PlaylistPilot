'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { useToast } from "@/hooks/use-toast";

interface UserInfo {
  title: string;
  thumbnails?: {
    default?: {
      url: string;
    };
  };
}

interface AuthContextType {
  userInfo: UserInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const response = await fetch('/api/user');
      const data = await response.json();
      
      if (!data.error && data.snippet) {
        setUserInfo(data.snippet);
        if (!isInitialized) {
          toast({
            title: `Welcome back, ${data.snippet.title}!`,
            description: "Successfully logged in.",
          });
        }
      } else {
        setUserInfo(null);
      }
    } catch (error) {
      console.error('Error checking login status:', error);
      setUserInfo(null);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  };

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/google');
      const data = await response.json();
      if (data.url) {
        sessionStorage.setItem('redirectUrl', window.location.pathname);
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error during login:', error);
      toast({
        title: "Login Failed",
        description: "Could not connect to Google. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await fetch('/api/auth/logout', { method: 'POST' });
      setUserInfo(null);
      toast({
        title: "👋 Goodbye!",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      console.error('Error during logout:', error);
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const redirectUrl = sessionStorage.getItem('redirectUrl');
    if (redirectUrl) {
      sessionStorage.removeItem('redirectUrl');
      if (userInfo && window.location.pathname !== redirectUrl) {
        window.location.pathname = redirectUrl;
      }
    }
  }, [userInfo]);

  const authValue = {
    userInfo,
    isLoading,
    isAuthenticated: !!userInfo,
    login: handleLogin,
    logout: handleLogout,
  };

  return (
    <AuthContext.Provider value={authValue}>
      <div className="flex flex-col min-h-screen">
        <Header
          userInfo={userInfo}
          isLoading={isLoading}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {children}
        </main>
        <Footer />
      </div>
    </AuthContext.Provider>
  );
} 