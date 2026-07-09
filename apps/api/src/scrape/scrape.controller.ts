import { Controller, Post, Body, UseGuards, Logger, Get, Param, Res, Query } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ScrapeService } from './scrape.service';
import { ScrapeDto } from './dto/scrape.dto';
import type { ScrapeResponse } from '@scrape-platform/shared-types';
import { Request, Response } from 'express';
import { Public } from '../auth/public.decorator';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, JobType } from 'bullmq';

const SCRAPER_URL = () => process.env.SCRAPER_SERVICE_URL || 'https://scraper-production-c44d.up.railway.app';

@Controller('scrape')
@UseGuards(ThrottlerGuard)
export class ScrapeController {
  private readonly logger = new Logger(ScrapeController.name);

  constructor(
    private readonly scrapeService: ScrapeService,
    @InjectQueue('scrape') private scrapeQueue: Queue,
  ) {}

  @Post()
  async scrape(@Body() dto: ScrapeDto): Promise<ScrapeResponse> {
    this.logger.log(`Scrape request for: ${dto.url} (method: ${dto.method || 'fast'})`);
    return this.scrapeService.addToQueue(dto.url, dto.method);
  }

  @Get('jobs')
  async listJobs(@Query('status') status?: string, @Query('limit') limit?: string) {
    const statuses: JobType[] = status
      ? [status as JobType]
      : ['waiting', 'active', 'completed', 'failed'];
    const jobs = await this.scrapeQueue.getJobs(statuses, 0, Number(limit) || 20);
    return {
      total: jobs.length,
      jobs: jobs.map(j => ({
        id: j.id,
        name: j.name,
        data: j.data,
        status: (j as any).status || j.failedReason ? 'failed' : 'completed',
        progress: j.progress,
        timestamp: j.timestamp,
        processedOn: j.processedOn,
        finishedOn: j.finishedOn,
        failedReason: j.failedReason,
      })),
    };
  }

  @Get('jobs/:id')
  async getJob(@Param('id') id: string) {
    const job = await this.scrapeQueue.getJob(id);
    if (!job) {
      return { error: 'Job not found' };
    }
    return {
      id: job.id,
      name: job.name,
      data: job.data,
      status: (job as any).status || job.failedReason ? 'failed' : 'completed',
      progress: job.progress,
      returnvalue: job.returnvalue,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace,
    };
  }

  @Post('download')
  async downloadAndZip(@Body() body: { url: string }, @Res() res: any) {
    try {
      const response = await fetch(`${SCRAPER_URL()}/scrape-and-zip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        return res.status(500).json({ error: 'Failed to create download' });
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      res.set({
        'Content-Type': 'application/zip',
        'Content-Disposition': response.headers.get('Content-Disposition') || 'attachment; filename=scraped.zip',
        'Content-Length': buffer.length,
      });
      res.end(buffer);
    } catch (error) {
      this.logger.error('Download error:', error);
      res.status(500).json({ error: 'Failed to create download' });
    }
  }

  @Get('list/*path')
  async listFiles(@Param('path') path: string) {
    try {
      const url = decodeURIComponent(path);
      const response = await fetch(`${SCRAPER_URL()}/files/${encodeURIComponent(url)}`);
      if (!response.ok) return { error: 'Failed to list files' };
      return response.json();
    } catch (error) {
      return { error: 'Failed to list files' };
    }
  }

  @Public()
  @Get('health')
  health() {
    return { status: 'ok', service: 'scrape-api' };
  }
}
