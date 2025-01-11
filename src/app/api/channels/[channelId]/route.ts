import { youtube } from '@/lib/youtube';
import { NextResponse } from 'next/server';
import { GaxiosError } from 'gaxios';

export async function GET(
  request: Request,
  { params }: { params: { channelId: string } }
) {
  try {
    const channelId = params.channelId;
    
    if (!channelId.startsWith('UC')) {
      return NextResponse.json(
        { error: 'Invalid channel ID format' },
        { status: 400 }
      );
    }

    const channelInfo = await youtube.getChannelInfo(channelId);
    return NextResponse.json(channelInfo);
  } catch (error) {
    console.error('Error fetching channel:', error);
    
    if (error instanceof GaxiosError) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.error?.message || error.message;
      return NextResponse.json({ error: message }, { status });
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch channel information' },
      { status: 500 }
    );
  }
} 