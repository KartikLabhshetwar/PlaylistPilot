import { youtube } from '@/lib/youtube';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GaxiosError } from 'gaxios';

export async function GET(request: Request) {
  try {
    console.log('Initializing database...');
    await db.init();
    console.log('Database initialized');

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      console.error('No authorization code provided');
      return NextResponse.json(
        { error: 'No authorization code provided' },
        { status: 400 }
      );
    }

    console.log('Getting tokens from authorization code...');
    const tokens = await youtube.getToken(code);
    console.log('Tokens received');
    
    if (!tokens.access_token) {
      console.error('Failed to get access token');
      return NextResponse.json(
        { error: 'Failed to get access token' },
        { status: 400 }
      );
    }

    // Calculate expiry date (tokens.expiry_date is in milliseconds)
    const expiryDate = tokens.expiry_date || Date.now() + 3600 * 1000; // Default 1 hour expiry

    // In a real app, you'd want to associate this with a real user ID
    const userId = 'default-user';
    console.log('Saving tokens for user:', userId);
    
    try {
      await db.saveTokens(userId, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiryDate: expiryDate,
      });
      console.log('Tokens saved successfully');
    } catch (dbError) {
      console.error('Error saving tokens:', dbError);
      return NextResponse.json(
        { error: 'Failed to save authentication tokens' },
        { status: 500 }
      );
    }

    console.log('Setting userId cookie');
    const cookieStore = cookies();
    cookieStore.set('userId', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    
    console.log('Redirecting to home page');
    return NextResponse.redirect(new URL('/', request.url));
  } catch (error) {
    console.error('Error in callback:', error);
    
    if (error instanceof GaxiosError) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.error?.message || error.message;
      return NextResponse.json(
        { error: message },
        { status }
      );
    }
    
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
} 