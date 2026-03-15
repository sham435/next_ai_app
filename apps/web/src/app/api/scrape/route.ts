import { NextResponse } from 'next/server';
import * as http from 'http';
import { URL } from 'url';

function fetchUrl(urlStr: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(urlStr);
    const isHttps = parsedUrl.protocol === 'https:';
    const module = isHttps ? require('https') : http;
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*',
      },
      timeout: 30000,
      rejectUnauthorized: false,
    };

    const req = module.request(options, (res) => {
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
    if (validUrl.protocol !== 'https:' && validUrl.protocol !== 'http:') {
      return NextResponse.json({ error: 'Only HTTP/HTTPS URLs are accepted' }, { status: 400 });
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
    const styles = extractLinks(/<link[^>]+href=["'][^"']+\.css["'][^>]*>/gi, baseUrl).slice(0, 20);

    return NextResponse.json({
      success: true,
      url,
      title,
      linksFound: links.length,
      filesFound: images.length + scripts.length + styles.length,
      resources: { links, images, scripts, styles },
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
