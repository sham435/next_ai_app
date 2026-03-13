import { Worker, Queue, QueueEvents, ConnectionOptions } from 'bullmq';
import Redis from 'ioredis';
import { processJob } from './processor';
import { logger } from './logger';

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
}) as unknown as ConnectionOptions;

const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY) || 5;

const worker = new Worker('scrape', processJob, {
  connection,
  concurrency: CONCURRENCY,
  limiter: {
    max: Number(process.env.RATE_LIMIT_MAX) || 50,
    duration: Number(process.env.RATE_LIMIT_DURATION) || 60000,
  },
});

const queueEvents = new QueueEvents('scrape', { connection });

worker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed`, {
    jobId: job.id,
  });
});

worker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed: ${err.message}`, {
    jobId: job?.id,
    error: err.message,
  });
});

worker.on('stalled', (jobId) => {
  logger.warn(`Job ${jobId} stalled`, { jobId });
});

worker.on('error', (err) => {
  logger.error(`Worker error: ${err.message}`, { error: err.message });
});

async function shutdown() {
  logger.info('Shutting down worker...');
  await worker.close();
  await queueEvents.close();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

logger.info(`Worker started with concurrency=${CONCURRENCY}`);
