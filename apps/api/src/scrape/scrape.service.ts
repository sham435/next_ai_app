import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SsrfGuardService } from './ssrf-guard.service';
import { MetricsService } from '../metrics/metrics.service';
import type { ScrapeResponse, ScrapeJobData, JobPriority } from '@scrape-platform/shared-types';

@Injectable()
export class ScrapeService {
  private readonly logger = new Logger(ScrapeService.name);

  constructor(
    @InjectQueue('scrape') private readonly queue: Queue,
    private readonly ssrfGuard: SsrfGuardService,
    private readonly metrics: MetricsService,
  ) {}

  async addToQueue(url: string, priority: number = 5): Promise<ScrapeResponse> {
    // SSRF validation
    await this.ssrfGuard.validateUrl(url);

    const jobData: ScrapeJobData = {
      url,
      priority: priority as JobPriority,
      requestedAt: new Date().toISOString(),
    };

    try {
      const job = await this.queue.add('scrape-job', jobData, {
        priority,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      });

      this.metrics.scrapeJobsTotal.inc({ status: 'queued' });
      this.logger.log(`Job ${job.id} queued for ${url}`);

      return {
        success: true,
        jobId: job.id as string,
      };
    } catch (error) {
      this.metrics.scrapeJobsTotal.inc({ status: 'failed' });
      this.logger.error(`Failed to queue job: ${(error as Error).message}`);
      throw new BadRequestException('Failed to queue scrape job');
    }
  }
}
