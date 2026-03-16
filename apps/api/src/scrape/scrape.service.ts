import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SsrfGuardService } from './ssrf-guard.service';
import { MetricsService } from '../metrics/metrics.service';
import type { ScrapeResponse, ScrapeJobData, JobPriority, ScrapeMethod } from '@scrape-platform/shared-types';

@Injectable()
export class ScrapeService {
  private readonly logger = new Logger(ScrapeService.name);
  private readonly pythonScraperUrl = process.env.PYTHON_SCRAPER_URL || 'https://scraper-production-b5dcf.up.railway.app';

  constructor(
    @InjectQueue('scrape') private readonly queue: Queue,
    private readonly ssrfGuard: SsrfGuardService,
    private readonly metrics: MetricsService,
  ) {}

  async addToQueue(url: string, method: ScrapeMethod = 'fast'): Promise<ScrapeResponse> {
    // SSRF validation
    await this.ssrfGuard.validateUrl(url);

    // Use Python scraper for 'fast' and 'full' methods
    if (method === 'fast' || method === 'full') {
      return this.callPythonScraper(url, method);
    }

    // Use NestJS worker for 'puppeteer' and 'static' methods
    return this.addToWorkerQueue(url, method);
  }

  private async callPythonScraper(url: string, method: ScrapeMethod): Promise<ScrapeResponse> {
    try {
      const endpoint = method === 'full' ? '/scrape-and-zip' : '/scrape';
      
      this.logger.log(`Calling Python scraper: ${this.pythonScraperUrl}${endpoint} for ${url}`);
      
      const response = await fetch(`${this.pythonScraperUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(`Python scraper returned ${response.status}`);
      }

      const data = await response.json();
      
      this.metrics.scrapeJobsTotal.inc({ status: 'completed' });
      this.logger.log(`Python scraper completed for ${url}: ${data.files_found || 0} files`);

      return {
        success: true,
        jobId: `python-${Date.now()}`,
        filesFound: data.files_found || 0,
        method,
      };
    } catch (error) {
      this.metrics.scrapeJobsTotal.inc({ status: 'failed' });
      this.logger.error(`Python scraper failed: ${(error as Error).message}`);
      // Fall back to worker queue
      this.logger.log(`Falling back to worker queue for ${url}`);
      return this.addToWorkerQueue(url, method);
    }
  }

  private async addToWorkerQueue(url: string, method: ScrapeMethod): Promise<ScrapeResponse> {
    const jobData: ScrapeJobData = {
      url,
      priority: 5 as JobPriority,
      requestedAt: new Date().toISOString(),
    };

    try {
      const job = await this.queue.add('scrape-job', { ...jobData, method }, {
        priority: 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      });

      this.metrics.scrapeJobsTotal.inc({ status: 'queued' });
      this.logger.log(`Job ${job.id} queued for ${url} (method: ${method})`);

      return {
        success: true,
        jobId: job.id as string,
        method,
      };
    } catch (error) {
      this.metrics.scrapeJobsTotal.inc({ status: 'failed' });
      this.logger.error(`Failed to queue job: ${(error as Error).message}`);
      throw new BadRequestException('Failed to queue scrape job');
    }
  }
}
