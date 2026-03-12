import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { ScrapeGateway } from './scrape.gateway';
import { MetricsService } from '../metrics/metrics.service';
import type { ScrapeJobData, ScrapeStage } from '@scrape-platform/shared-types';

@Processor('scrape')
export class ScrapeProcessor extends WorkerHost {
  private readonly logger = new Logger(ScrapeProcessor.name);

  constructor(
    private readonly gateway: ScrapeGateway,
    private readonly config: ConfigService,
    private readonly metrics: MetricsService,
  ) {
    super();
  }

  async process(job: Job<ScrapeJobData>) {
    const { url } = job.data;
    const jobId = job.id as string;
    const startTime = Date.now();

    this.logger.log(`Processing job ${jobId}: ${url}`);

    try {
      // Stage: Fetching
      this.emitStage(jobId, 20, 'fetching', 'Fetching page content...');
      await job.updateProgress(20);

      const timeout = this.config.get<number>('REQUEST_TIMEOUT', 10000);
      const response = await axios.get(url, {
        timeout,
        maxContentLength: 10 * 1024 * 1024, // 10MB max
        headers: {
          'User-Agent': 'ScraPlatform/1.0',
        },
      });

      // Stage: Parsing
      this.emitStage(jobId, 50, 'parsing', 'Parsing HTML content...');
      await job.updateProgress(50);

      const $ = cheerio.load(response.data);
      const links: string[] = [];

      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && (href.endsWith('.ts') || href.endsWith('.js') || href.endsWith('.json'))) {
          links.push(href.startsWith('http') ? href : new URL(href, url).toString());
        }
      });

      // Stage: Downloading
      this.emitStage(jobId, 70, 'downloading', `Found ${links.length} files. Preparing download...`);
      await job.updateProgress(70);

      const downloadDir = path.resolve(
        this.config.get('DOWNLOAD_DIR', './download'),
      );

      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
      }

      // Stage: Complete
      const duration = Date.now() - startTime;
      this.emitStage(jobId, 100, 'complete', `Done! Found ${links.length} files.`);
      await job.updateProgress(100);

      const result = {
        jobId,
        success: true,
        filesFound: links.length,
        location: downloadDir,
        duration,
      };

      this.gateway.emitComplete(jobId, result);
      this.metrics.scrapeJobsTotal.inc({ status: 'completed' });
      this.metrics.scrapeJobDuration.observe(duration / 1000);

      this.logger.log(`Job ${jobId} completed: ${links.length} files in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = (error as Error).message;

      this.logger.error(`Job ${jobId} failed: ${errorMessage}`);
      this.metrics.scrapeJobsTotal.inc({ status: 'failed' });

      this.gateway.emitComplete(jobId, {
        jobId,
        success: false,
        filesFound: 0,
        location: '',
        duration,
        error: errorMessage,
      });

      throw error;
    }
  }

  private emitStage(jobId: string, progress: number, stage: ScrapeStage, message: string) {
    this.gateway.emitProgress(jobId, progress, stage, message);
  }
}
