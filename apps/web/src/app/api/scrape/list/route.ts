import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter required' },
        { status: 400 }
      );
    }
    
    const apiUrl = process.env.API_URL || 'https://api.up.railway.app';
    
    const response = await fetch(`${apiUrl}/scrape/list/${encodeURIComponent(url)}`);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to list files' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to list files' },
      { status: 500 }
    );
  }
}
