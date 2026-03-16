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
    await this.ssrfGuard.validateUrl(url);

    // If auto/fast method, use fallback chain
    if (method === 'fast' || method === 'auto') {
      return this.fallbackScrape(url);
    }

    // Specific method requested
    if (method === 'static') {
      return this.callPythonScraperStatic(url);
    }

    if (method === 'puppeteer') {
      return this.addToWorkerQueue(url, 'puppeteer');
    }

    if (method === 'selenium') {
      return this.callPythonSelenium(url);
    }

    if (method === 'crawl4ai') {
      return this.callPythonCrawl4AI(url);
    }

    // Default: use fallback chain
    return this.fallbackScrape(url);
  }

  private async fallbackScrape(url: string): Promise<ScrapeResponse> {
    const methods = [
      { name: 'static', fn: () => this.callPythonScraperStatic(url) },
      { name: 'crawl4ai', fn: () => this.callPythonCrawl4AI(url) },
      { name: 'puppeteer', fn: () => this.addToWorkerQueue(url, 'puppeteer') },
      { name: 'selenium', fn: () => this.callPythonSelenium(url) },
    ];

    let lastError = '';

    for (const { name, fn } of methods) {
      try {
        this.logger.log(`Trying ${name} for ${url}`);
        const result = await fn();
        
        if (result.success) {
          this.logger.log(`${name} succeeded for ${url}`);
          this.metrics.scrapeJobsTotal.inc({ status: 'completed' });
          return { ...result, method: name as ScrapeMethod };
        }
      } catch (error) {
        lastError = (error as Error).message;
        this.logger.warn(`${name} failed for ${url}: ${lastError}`);
        this.metrics.scrapeJobsTotal.inc({ status: 'failed' });
        // Continue to next method
      }
    }

    this.logger.error(`All scrape methods failed for ${url}: ${lastError}`);
    throw new BadRequestException(`All scrape methods failed: ${lastError}`);
  }

  private async callPythonScraperStatic(url: string): Promise<ScrapeResponse> {
    const response = await fetch(`${this.pythonScraperUrl}/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error(`Static scraper returned ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      jobId: `python-static-${Date.now()}`,
      filesFound: data.files_found || 0,
      method: 'static',
    };
  }

  private async callPythonSelenium(url: string): Promise<ScrapeResponse> {
    const response = await fetch(`${this.pythonScraperUrl}/scrape/selenium`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, scroll: true }),
    });

    if (!response.ok) {
      throw new Error(`Selenium scraper returned ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      jobId: `python-selenium-${Date.now()}`,
      filesFound: data.files_found || 0,
      method: 'selenium',
    };
  }

  private async callPythonCrawl4AI(url: string): Promise<ScrapeResponse> {
    const response = await fetch(`${this.pythonScraperUrl}/scrape/crawl4ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, max_depth: 1, max_pages: 5 }),
    });

    if (!response.ok) {
      throw new Error(`Crawl4AI scraper returned ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      jobId: `python-crawl4ai-${Date.now()}`,
      filesFound: data.files_found || 0,
      method: 'crawl4ai',
    };
  }

  private async addToWorkerQueue(url: string, method: ScrapeMethod): Promise<ScrapeResponse> {
    const jobData: ScrapeJobData = {
      url,
      priority: 5 as JobPriority,
      requestedAt: new Date().toISOString(),
    };

    const job = await this.queue.add('scrape-job', { ...jobData, method }, {
      priority: 5,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
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
  }
}
