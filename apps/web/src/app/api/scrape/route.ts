import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Agent } from 'https';

const httpsAgent = new Agent({
  rejectUnauthorized: false,
});

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

    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'ScrapePlatform/1.0',
      },
      maxContentLength: 10 * 1024 * 1024,
      httpsAgent,
    });

    const $ = cheerio.load(response.data);
    
    const title = $('title').text() || $('h1').first().text() || '';
    const links: string[] = [];
    
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.startsWith('http')) {
        links.push(href);
      }
    });

    const images: string[] = [];
    $('img[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && src.startsWith('http')) {
        images.push(src);
      }
    });

    const scripts: string[] = [];
    $('script[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && src.startsWith('http')) {
        scripts.push(src);
      }
    });

    const styles: string[] = [];
    $('link[rel="stylesheet"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.startsWith('http')) {
        styles.push(href);
      }
    });

    return NextResponse.json({
      success: true,
      url,
      title: title.trim(),
      linksFound: links.length,
      filesFound: images.length + scripts.length + styles.length,
      resources: {
        links: links.slice(0, 50),
        images: images.slice(0, 20),
        scripts: scripts.slice(0, 10),
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
