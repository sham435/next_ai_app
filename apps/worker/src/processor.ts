import { Job } from 'bullmq';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';
import type { ScrapeJobData } from '@scrape-platform/shared-types';

const DOWNLOAD_DIR = path.resolve(process.env.DOWNLOAD_DIR || '/tmp/scraper-downloads');
const REQUEST_TIMEOUT = Number(process.env.REQUEST_TIMEOUT) || 10000;
const MAX_CONTENT_LENGTH = 10 * 1024 * 1024; // 10MB

export async function processJob(job: Job<ScrapeJobData>) {
  const { url } = job.data;
  const startTime = Date.now();

  logger.info(`Processing job ${job.id}: ${url}`, { jobId: job.id, url });

  try {
    // Stage 1: Fetch
    await job.updateProgress(20);
    logger.debug(`Fetching: ${url}`);

    const response = await axios.get(url, {
      timeout: REQUEST_TIMEOUT,
      maxContentLength: MAX_CONTENT_LENGTH,
      headers: {
        'User-Agent': 'ScraPlatform-Worker/1.0',
      },
    });

    // Stage 2: Parse
    await job.updateProgress(50);
    logger.debug(`Parsing HTML from: ${url}`);

    const $ = cheerio.load(response.data);
    const links: string[] = [];

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && /\.(ts|js|json|css|html)$/i.test(href)) {
        try {
          const resolved = href.startsWith('http') ? href : new URL(href, url).toString();
          links.push(resolved);
        } catch {
          // Skip invalid URLs
        }
      }
    });

    // Stage 3: Prepare download directory
    await job.updateProgress(70);

    if (!fs.existsSync(DOWNLOAD_DIR)) {
      fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
    }

    // Stage 4: Download files (limited batch)
    const downloadLimit = Math.min(links.length, 20);
    let downloadedCount = 0;

    for (let i = 0; i < downloadLimit; i++) {
      try {
        const fileUrl = links[i];
        const fileName = path.basename(new URL(fileUrl).pathname) || `file_${i}`;
        const filePath = path.join(DOWNLOAD_DIR, `${job.id}_${fileName}`);

        const fileResponse = await axios.get(fileUrl, {
          timeout: REQUEST_TIMEOUT,
          maxContentLength: MAX_CONTENT_LENGTH,
          responseType: 'arraybuffer',
        });

        fs.writeFileSync(filePath, fileResponse.data);
        downloadedCount++;

        const progress = 70 + (30 * (i + 1)) / downloadLimit;
        await job.updateProgress(Math.round(progress));
      } catch (err) {
        logger.warn(`Failed to download file: ${links[i]}`, {
          jobId: job.id,
          error: (err as Error).message,
        });
      }
    }

    await job.updateProgress(100);

    const duration = Date.now() - startTime;
    const result = {
      success: true,
      filesFound: links.length,
      filesDownloaded: downloadedCount,
      location: DOWNLOAD_DIR,
      duration,
    };

    logger.info(`Job ${job.id} completed: ${links.length} found, ${downloadedCount} downloaded in ${duration}ms`, {
      jobId: job.id,
      ...result,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = (error as Error).message;

    logger.error(`Job ${job.id} failed: ${errorMessage}`, {
      jobId: job.id,
      duration,
      error: errorMessage,
    });

    throw error;
  }
}
