import { Injectable, OnModuleInit } from '@nestjs/common';
import { collectDefaultMetrics, Registry, Counter, Histogram } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  public readonly register = new Registry();

  public readonly scrapeJobsTotal = new Counter({
    name: 'scrape_jobs_total',
    help: 'Total number of scrape jobs submitted',
    labelNames: ['status'],
    registers: [this.register],
  });

  public readonly scrapeJobDuration = new Histogram({
    name: 'scrape_job_duration_seconds',
    help: 'Duration of scrape jobs in seconds',
    buckets: [0.5, 1, 2, 5, 10, 30, 60],
    registers: [this.register],
  });

  onModuleInit() {
    collectDefaultMetrics({ register: this.register });
  }
}
