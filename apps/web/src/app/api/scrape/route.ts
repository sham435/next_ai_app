import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    const validUrl = new URL(url);
    if (validUrl.protocol !== 'https:') {
      return NextResponse.json(
        { error: 'Only HTTPS URLs are accepted' },
        { status: 400 }
      );
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'ScrapePlatform/1.0',
      },
    });

    const html = await response.text();
    
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    
    const linkMatches = html.match(/href="(https:[^"]+)"/g) || [];
    const links = linkMatches.map(m => m.replace('href="', '').replace('"', '')).slice(0, 50);
    
    const imageMatches = html.match(/src="(https:[^"]+)"/g) || [];
    const images = imageMatches.map(m => m.replace('src="', '').replace('"', '')).slice(0, 20);
    
    const scriptMatches = html.match(/<script[^>]+src="(https:[^"]+)"/g) || [];
    const scripts = scriptMatches.map(m => {
      const match = m.match(/src="(https:[^"]+)"/);
      return match ? match[1] : null;
    }).filter(Boolean).slice(0, 10);
    
    const styleMatches = html.match(/<link[^>]+href="(https:[^"]+\.css)"/g) || [];
    const styles = styleMatches.map(m => {
      const match = m.match(/href="(https:[^"]+\.css)"/);
      return match ? match[1] : null;
    }).filter(Boolean);

    return NextResponse.json({
      success: true,
      url,
      title,
      linksFound: links.length,
      filesFound: images.length + scripts.length + styles.length,
      resources: {
        links,
        images,
        scripts,
        styles,
      },
      status: 'completed',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Scraping failed', 
        details: message,
        status: 500,
      },
      { status: 500 }
    );
  }
}
