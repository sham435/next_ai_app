import { NextResponse } from 'next/server';
import * as https from 'https';
import { URL } from 'url';

function fetchUrl(urlStr: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(urlStr);
    
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'ScrapePlatform/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 30000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    req.end();
  });
}

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

    const html = await fetchUrl(url);
    
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    
    const linkMatches = html.match(/href="(https:[^"]+)"/g) || [];
    const links = [...new Set(linkMatches.map(m => m.replace('href="', '').replace('"', '')))].slice(0, 50);
    
    const imageMatches = html.match(/src="(https:[^"]+)"/g) || [];
    const images = [...new Set(imageMatches.map(m => m.replace('src="', '').replace('"', '')))].slice(0, 20);
    
    const scriptMatches = html.match(/<script[^>]+src="(https:[^"]+)"/g) || [];
    const scriptsSet = new Set<string>();
    scriptMatches.forEach(m => {
      const match = m.match(/src="(https:[^"]+)"/);
      if (match) scriptsSet.add(match[1]);
    });
    const scripts = Array.from(scriptsSet).slice(0, 10);
    
    const styleMatches = html.match(/<link[^>]+href="(https:[^"]+\.css)"/g) || [];
    const stylesSet = new Set<string>();
    styleMatches.forEach(m => {
      const match = m.match(/href="(https:[^"]+\.css)"/);
      if (match) stylesSet.add(match[1]);
    });
    const styles = Array.from(stylesSet);

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
