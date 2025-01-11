import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from './db';

export interface AuthResult {
  userId: string;
  accessToken: string;
  error?: NextResponse;
}

export async function authenticateRequest(): Promise<AuthResult | NextResponse> {
  const cookieStore = cookies();
  const userId = cookieStore.get('userId')?.value;

  if (!userId) {
    return NextResponse.json(
      { error: 'Not authenticated', isLoggedIn: false },
      { status: 401 }
    );
  }

  try {
    const tokens = await db.getTokens(userId);
    
    if (!tokens || !tokens.accessToken) {
      return NextResponse.json(
        { error: 'Access token not found', isLoggedIn: false },
        { status: 401 }
      );
    }

    return {
      userId,
      accessToken: tokens.accessToken
    };
  } catch (err) {
    console.error('Authentication error:', err);
    return NextResponse.json(
      { error: 'Authentication failed', isLoggedIn: false },
      { status: 401 }
    );
  }
} 