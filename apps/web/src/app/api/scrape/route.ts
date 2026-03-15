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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
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
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const validUrl = new URL(url);
    if (validUrl.protocol !== 'https:') {
      return NextResponse.json({ error: 'Only HTTPS URLs are accepted' }, { status: 400 });
    }

    const html = await fetchUrl(url);
    
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    
    const baseUrl = `${validUrl.protocol}//${validUrl.host}`;
    
    const extractLinks = (pattern: RegExp, base: string): string[] => {
      const matches = html.match(pattern) || [];
      const links: string[] = [];
      matches.forEach((m: string) => {
        const hrefMatch = m.match(/(?:href|src)=["']([^"']+)["']/i);
        if (hrefMatch) {
          let href = hrefMatch[1];
          if (href.startsWith('//')) {
            href = base + href.substring(1);
          } else if (href.startsWith('/')) {
            href = base + href;
          }
          if (href.startsWith('http')) {
            links.push(href);
          }
        }
      });
      return [...new Set(links)];
    };

    const links = extractLinks(/<a[^>]+href=["'][^"']+["']/gi, baseUrl).slice(0, 50);
    const images = extractLinks(/<img[^>]+src=["'][^"']+["']/gi, baseUrl).slice(0, 30);
    const scripts = extractLinks(/<script[^>]+src=["'][^"']+["']/gi, baseUrl).slice(0, 20);
    const styles = extractLinks(/<link[^>]+(?:href|rel=["']stylesheet["'])[^>]*>/gi, baseUrl).filter((h: string) => h.endsWith('.css')).slice(0, 20);
    
    const metaDescription = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    const metaAuthor = html.match(/<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["']/i);

    return NextResponse.json({
      success: true,
      url,
      title,
      description: metaDescription ? metaDescription[1] : '',
      author: metaAuthor ? metaAuthor[1] : '',
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
      { error: 'Scraping failed', details: message, status: 500 },
      { status: 500 }
    );
  }
}
